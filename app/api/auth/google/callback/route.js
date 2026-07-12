import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  console.log('=== CALLBACK INICIADO ===')
  console.log('Code existe:', !!code)
  console.log('State (user_id):', state)

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    console.log('Tokens obtenidos:', JSON.stringify(tokens))

    // Obtener email del usuario de Google
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const email = profile.data.emailAddress

    console.log('Email Gmail:', email)
    console.log('Guardando en Supabase con user_id:', state)

    // Guardar tokens en Supabase
    const { data, error } = await supabase.from('conexiones_correo').upsert({
      user_id: state,
      proveedor: 'gmail',
      email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      activa: true
    }, { onConflict: 'user_id,proveedor' })

    console.log('Resultado Supabase:', data)
    console.log('Error Supabase:', error)

    return Response.redirect('http://localhost:3000/dashboard?gmail=conectado')
  } catch (error) {
    console.error('Error completo:', error.message)
    return Response.redirect('http://localhost:3000/dashboard?gmail=error')
  }
}
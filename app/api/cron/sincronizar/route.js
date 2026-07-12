import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  // Verificar token de seguridad
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (token !== process.env.CRON_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Obtener todos los usuarios con Gmail conectado
    const { data: conexiones } = await supabase
      .from('conexiones_correo')
      .select('user_id')
      .eq('proveedor', 'gmail')
      .eq('activa', true)

    if (!conexiones || conexiones.length === 0) {
      return Response.json({ ok: true, mensaje: 'No hay usuarios con Gmail conectado' })
    }

    let totalProcesados = 0

    for (const conexion of conexiones) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sincronizar-correos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: conexion.user_id })
        })
        const data = await response.json()
        if (data.ok) totalProcesados += data.procesados || 0
      } catch (e) {
        console.error('Error sincronizando usuario:', conexion.user_id, e.message)
      }
    }

    return Response.json({
      ok: true,
      usuarios: conexiones.length,
      transacciones: totalProcesados
    })

  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
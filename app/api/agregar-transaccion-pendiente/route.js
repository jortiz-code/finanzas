import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { user_id, cuenta_id, categoria_id, monto, descripcion, fecha, tipo, origen, clasificado_por, confianza_ia } = await request.json()

    const { data, error } = await supabase
      .from('transacciones_pendientes')
      .insert({
        user_id,
        cuenta_id,
        categoria_id,
        monto,
        descripcion,
        fecha,
        tipo,
        origen,
        clasificado_por,
        confianza_ia,
        estado: 'pendiente'
      })
      .select()

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true, transaccion: data[0] })

  } catch (error) {
    console.error('Error:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}

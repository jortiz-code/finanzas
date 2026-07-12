import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { id, accion, categoria_id, descripcion, monto } = await request.json()
    // accion: 'confirmar', 'rechazar', 'editar'

    if (accion === 'confirmar') {
      // Obtener transacción pendiente
      const { data: pendiente } = await supabase
        .from('transacciones_pendientes')
        .select('*')
        .eq('id', id)
        .single()

      // Mover a transacciones confirmadas
      const { data: transaccion, error: errorInsert } = await supabase
        .from('transacciones')
        .insert({
          user_id: pendiente.user_id,
          cuenta_id: pendiente.cuenta_id,
          categoria_id: pendiente.categoria_id,
          monto: pendiente.monto,
          descripcion: pendiente.descripcion,
          fecha: pendiente.fecha,
          tipo: pendiente.tipo,
          origen: pendiente.origen,
          clasificado_por: pendiente.clasificado_por,
          confianza_ia: pendiente.confianza_ia
        })
        .select()

      if (errorInsert) {
        return Response.json({ ok: false, error: errorInsert.message }, { status: 500 })
      }

      // Eliminar de pendientes
      await supabase.from('transacciones_pendientes').delete().eq('id', id)

      return Response.json({ ok: true, mensaje: 'Transacción confirmada', transaccion: transaccion[0] })

    } else if (accion === 'editar') {
      // Editar pendiente
      const { error } = await supabase
        .from('transacciones_pendientes')
        .update({
          categoria_id,
          descripcion,
          monto,
          modificada_por_usuario: true
        })
        .eq('id', id)

      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 })
      }

      return Response.json({ ok: true, mensaje: 'Transacción editada' })

    } else if (accion === 'rechazar') {
      // Eliminar de pendientes
      const { error } = await supabase
        .from('transacciones_pendientes')
        .delete()
        .eq('id', id)

      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 })
      }

      return Response.json({ ok: true, mensaje: 'Transacción rechazada' })
    }

  } catch (error) {
    console.error('Error:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
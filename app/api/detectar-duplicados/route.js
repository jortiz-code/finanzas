import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { user_id } = await request.json()

    // Obtener todas las transacciones del usuario
    const { data: transacciones } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', user_id)
      .order('fecha', { ascending: false })

    const duplicados = []

    // Buscar transacciones duplicadas (misma fecha, monto y descripción similar)
    for (let i = 0; i < transacciones.length; i++) {
      for (let j = i + 1; j < transacciones.length; j++) {
        const t1 = transacciones[i]
        const t2 = transacciones[j]

        // Verificar si son duplicados
        const fechasProximas = Math.abs(
          new Date(t1.fecha) - new Date(t2.fecha)
        ) / (1000 * 60 * 60 * 24) <= 1 // Máximo 1 día de diferencia

        const montoIgual = t1.monto === t2.monto
        const tipoIgual = t1.tipo === t2.tipo
        const descripcionSimilar = 
          t1.descripcion.toLowerCase().includes(t2.descripcion.toLowerCase().substring(0, 5)) ||
          t2.descripcion.toLowerCase().includes(t1.descripcion.toLowerCase().substring(0, 5))

        if (fechasProximas && montoIgual && tipoIgual && descripcionSimilar) {
          duplicados.push({
            transaccion_1: t1.id,
            transaccion_2: t2.id,
            descripcion_1: t1.descripcion,
            descripcion_2: t2.descripcion,
            monto: t1.monto,
            fecha_1: t1.fecha,
            fecha_2: t2.fecha
          })
        }
      }
    }

    return Response.json({
      ok: true,
      duplicados_encontrados: duplicados.length,
      duplicados
    })

  } catch (error) {
    console.error('Error detectando duplicados:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
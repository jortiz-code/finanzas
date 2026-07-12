import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { user_id } = await request.json()

    const mesActual = new Date().getMonth() + 1
    const añoActual = new Date().getFullYear()

    // Obtener presupuestos del mes
    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('*, categorias(nombre, icono)')
      .eq('user_id', user_id)
      .eq('mes', mesActual)
      .eq('año', añoActual)

    if (!presupuestos || presupuestos.length === 0) {
      return Response.json({ ok: true, alertas: [] })
    }

    // Obtener gastos por categoría del mes
    const { data: gastos } = await supabase
      .rpc('get_gastos_por_categoria', {
        p_user_id: user_id,
        p_mes: mesActual,
        p_año: añoActual
      })

    const alertasGeneradas = []

    for (const presupuesto of presupuestos) {
      const gasto = gastos?.find(g => g.categoria_id === presupuesto.categoria_id)
      const gastado = gasto?.total_gastado || 0
      const porcentaje = (gastado / presupuesto.monto) * 100

      if (porcentaje >= 100) {
        // Sobrepasó el presupuesto
        await supabase.from('alertas').insert({
          user_id,
          tipo: 'presupuesto_superado',
          resuelta: false
        })
        alertasGeneradas.push({
          categoria: presupuesto.categorias?.nombre,
          tipo: 'superado',
          porcentaje: Math.round(porcentaje)
        })
      } else if (porcentaje >= 80) {
        // Cerca del límite
        await supabase.from('alertas').insert({
          user_id,
          tipo: 'presupuesto_80',
          resuelta: false
        })
        alertasGeneradas.push({
          categoria: presupuesto.categorias?.nombre,
          tipo: 'cerca',
          porcentaje: Math.round(porcentaje)
        })
      }
    }

    return Response.json({ ok: true, alertas: alertasGeneradas })

  } catch (error) {
    console.error('Error verificando presupuestos:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
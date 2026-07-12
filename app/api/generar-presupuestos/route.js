import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  try {
    const { user_id } = await request.json()

    const mesActual = new Date().getMonth() + 1
    const añoActual = new Date().getFullYear()

    // Obtener historial de gastos últimos 3 meses
    const { data: gastos } = await supabase
      .from('transacciones')
      .select('monto, categoria_id, categorias(nombre, tipo)')
      .eq('user_id', user_id)
      .eq('tipo', 'gasto')
      .eq('es_transferencia_interna', false)
      .gte('fecha', new Date(añoActual, mesActual - 4, 1).toISOString())

    // Obtener categorías
    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user_id)

    if (!gastos || !categorias) {
      return Response.json({ ok: false, mensaje: 'No hay datos suficientes' })
    }

    // Agrupar gastos por categoría
    const gastosPorCategoria = {}
    for (const gasto of gastos) {
      const nombre = gasto.categorias?.nombre
      if (!nombre) continue
      if (!gastosPorCategoria[nombre]) gastosPorCategoria[nombre] = []
      gastosPorCategoria[nombre].push(gasto.monto)
    }

    const resumen = Object.entries(gastosPorCategoria).map(([nombre, montos]) => ({
      categoria: nombre,
      promedio: Math.round(montos.reduce((a, b) => a + b, 0) / montos.length),
      veces: montos.length
    }))

    if (resumen.length === 0) {
      return Response.json({ ok: false, mensaje: 'No hay historial de gastos suficiente' })
    }

    // IA sugiere presupuestos
    const respuesta = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Eres un asesor financiero chileno. Basándote en el historial de gastos del usuario, sugiere presupuestos mensuales razonables.

Historial de gastos promedio por categoría (últimos 3 meses):
${JSON.stringify(resumen, null, 2)}

Sugiere un presupuesto mensual para cada categoría. El presupuesto debe ser ligeramente menor al promedio para incentivar el ahorro, pero realista.

Responde SOLO con JSON sin markdown:
[
  {"categoria": "Alimentación", "monto": 150000},
  {"categoria": "Transporte", "monto": 80000}
]

Solo incluye categorías que tengan historial de gastos.`
      }]
    })

    const sugerencias = JSON.parse(respuesta.content[0].text)

    // Guardar presupuestos sugeridos
    for (const sugerencia of sugerencias) {
      const categoria = categorias.find(
        c => c.nombre.toLowerCase() === sugerencia.categoria.toLowerCase()
      )
      if (!categoria) continue

      await supabase.from('presupuestos').upsert({
        user_id,
        categoria_id: categoria.id,
        monto: sugerencia.monto,
        mes: mesActual,
        año: añoActual,
        tipo: categoria.tipo
      }, { onConflict: 'user_id,categoria_id,mes,año' })
    }

    return Response.json({ ok: true, sugerencias: sugerencias.length })

  } catch (error) {
    console.error('Error generando presupuestos:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
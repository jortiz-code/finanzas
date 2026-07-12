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
    const { user_id, mes, año } = await request.json()

    const { data: kpis } = await supabase.rpc('get_kpis', {
      p_user_id: user_id,
      p_mes: mes,
      p_año: año
    })

    const { data: gastos_categoria } = await supabase.rpc('get_gastos_por_categoria', {
      p_user_id: user_id,
      p_mes: mes,
      p_año: año
    })

    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('*, categorias(nombre)')
      .eq('user_id', user_id)
      .eq('mes', mes)
      .eq('año', año)

    const gastosText = gastos_categoria?.map(g => `- ${g.nombre}: $${g.total_gastado}`).join('\n') || 'Sin gastos'
    const presupuestosText = presupuestos?.map(p => `- ${p.categorias?.nombre}: $${p.monto}`).join('\n') || 'Sin presupuestos'

    const prompt = `Analiza y dame 5 recomendaciones de ahorro.

DATOS:
- Ingresos: $${kpis?.total_ingresos || 0}
- Gastos: $${kpis?.total_gastos || 0}
- Balance: $${(kpis?.total_ingresos || 0) - (kpis?.total_gastos || 0)}

GASTOS POR CATEGORÍA:
${gastosText}

PRESUPUESTOS:
${presupuestosText}

Responde solo JSON: {"recomendaciones": [{"categoria": "nombre", "problema": "texto", "accion": "texto", "ahorro_potencial": 50000}], "ahorro_total_potencial": 200000, "mensaje_motivacional": "texto"}`

    const recomendaciones = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const resultado = JSON.parse(recomendaciones.content[0].text.replace(/```json|```/g, '').trim())

    return Response.json({
      ok: true,
      recomendaciones: resultado.recomendaciones || [],
      ahorro_potencial: resultado.ahorro_total_potencial,
      mensaje: resultado.mensaje_motivacional
    })

  } catch (error) {
    console.error('Error generando recomendaciones:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
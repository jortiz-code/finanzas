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

    const { data: transacciones } = await supabase
      .from('transacciones')
      .select('*, categorias(nombre)')
      .eq('user_id', user_id)
      .eq('tipo', 'gasto')
      .gte('fecha', `${año}-${String(mes).padStart(2, '0')}-01`)
      .lte('fecha', `${año}-${String(mes).padStart(2, '0')}-31`)
      .order('monto', { ascending: false })
      .limit(20)

    const topGastos = gastos_categoria?.slice(0, 5).map(g => `- ${g.nombre}: $${g.total_gastado}`).join('\n') || 'Sin datos'
    const topTransacciones = transacciones?.slice(0, 5).map(t => `- ${t.descripcion}: $${t.monto}`).join('\n') || 'Sin datos'

    const ahorro = kpis?.total_ingresos ? ((kpis.total_ingresos - kpis.total_gastos) / kpis.total_ingresos * 100).toFixed(1) : 0

    const prompt = `Genera resumen mensual de finanzas.

DATOS:
- Ingresos: $${kpis?.total_ingresos || 0}
- Gastos: $${kpis?.total_gastos || 0}
- Balance: $${(kpis?.total_ingresos || 0) - (kpis?.total_gastos || 0)}
- Ahorro: ${ahorro}%

TOP GASTOS:
${topGastos}

TRANSACCIONES:
${topTransacciones}

Responde solo JSON: {"titulo": "texto", "analisis": "texto", "positivos": ["p1", "p2"], "mejoras": ["m1", "m2"], "meta_proxima": "texto", "motivacion": "texto"}`

    const resumen = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const resultado = JSON.parse(resumen.content[0].text.replace(/```json|```/g, '').trim())

    return Response.json({
      ok: true,
      titulo: resultado.titulo,
      analisis: resultado.analisis,
      positivos: resultado.positivos || [],
      mejoras: resultado.mejoras || [],
      meta_proxima: resultado.meta_proxima,
      motivacion: resultado.motivacion,
      mes: `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes - 1]} ${año}`
    })

  } catch (error) {
    console.error('Error generando resumen:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
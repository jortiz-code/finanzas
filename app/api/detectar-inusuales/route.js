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

    // Obtener gastos del mes actual
    const { data: gastos_actual } = await supabase
      .from('transacciones')
      .select('*, categorias(nombre)')
      .eq('user_id', user_id)
      .eq('tipo', 'gasto')
      .gte('fecha', `${año}-${String(mes).padStart(2, '0')}-01`)
      .lte('fecha', `${año}-${String(mes).padStart(2, '0')}-31`)
      .order('monto', { ascending: false })

    // Obtener gastos últimos 3 meses para promedio
    const { data: gastos_historicos } = await supabase
      .from('transacciones')
      .select('*, categorias(nombre)')
      .eq('user_id', user_id)
      .eq('tipo', 'gasto')
      .gte('fecha', `${año - (mes <= 3 ? 1 : 0)}-${String(mes <= 3 ? mes + 9 : mes - 3).padStart(2, '0')}-01`)
      .lt('fecha', `${año}-${String(mes).padStart(2, '0')}-01`)

    // Agrupar por categoría
    const gastosPorCategoria = {}
    gastos_actual?.forEach(g => {
      const cat = g.categorias?.nombre || 'Sin categoría'
      if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = []
      gastosPorCategoria[cat].push(g)
    })

    // Calcular promedios históricos
    const promediosHistoricos = {}
    gastos_historicos?.forEach(g => {
      const cat = g.categorias?.nombre || 'Sin categoría'
      if (!promediosHistoricos[cat]) promediosHistoricos[cat] = []
      promediosHistoricos[cat].push(g.monto)
    })

    // Usar IA para detectar inusuales
    const analisis = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Analiza estos gastos mensuales y detecta cuáles son INUSUALES (mucho más altos que el promedio histórico).

GASTOS ESTE MES:
${JSON.stringify(gastosPorCategoria, null, 2)}

PROMEDIO HISTÓRICO (últimos 3 meses):
${JSON.stringify(promediosHistoricos, null, 2)}

Responde SOLO con JSON sin markdown:
{
  "inusuales": [
    {
      "categoria": "nombre",
      "gasto_actual": 150000,
      "promedio_historico": 50000,
      "diferencia_porcentaje": 200,
      "razon": "Explicación breve"
    }
  ],
  "resumen": "Resumen general"
}`
      }]
    })

    const resultado = JSON.parse(analisis.content[0].text.replace(/```json|```/g, '').trim())

    return Response.json({
      ok: true,
      inusuales: resultado.inusuales || [],
      resumen: resultado.resumen
    })

  } catch (error) {
    console.error('Error detectando inusuales:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
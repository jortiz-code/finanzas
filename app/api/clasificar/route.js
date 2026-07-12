import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  try {
    const { descripcion, categorias } = await request.json()

    console.log('Clasificando:', descripcion)
    console.log('API Key existe:', !!process.env.ANTHROPIC_API_KEY)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
content: `Eres un clasificador de gastos financieros para Chile.
          
Clasifica este gasto en una de las categorías disponibles.

Gasto: "${descripcion}"

Categorías disponibles:
${categorias}

Responde SOLO con un JSON así, sin texto adicional y sin bloques de código markdown:
{
  "categoria": "nombre exacto de la categoría sin paréntesis ni tipo",
  "confianza": 0.95,
  "necesita_revision": false
}

Si no estás seguro usa confianza menor a 0.7 y necesita_revision: true.`
        }
      ]
    })

    const texto = response.content[0].text
    console.log('Respuesta IA:', texto)
    const limpio = texto.replace(/```json|```/g, '').trim()
    const resultado = JSON.parse(limpio)
    return Response.json(resultado) 

  } catch (error) {
    console.error('Error completo:', error.message)
    return Response.json({
      categoria: null,
      confianza: 0,
      necesita_revision: true
    }, { status: 200 })
  }
}
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { execSync } from 'child_process'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const archivo = formData.get('archivo')
    const user_id = formData.get('user_id')
    const cuenta_id = formData.get('cuenta_id')
    const password = formData.get('password')

    if (!archivo) {
      return Response.json({ ok: false, mensaje: 'No se recibió archivo' })
    }

    const bytes = await archivo.arrayBuffer()
    let buffer = Buffer.from(bytes)
    const nombreArchivo = archivo.name.toLowerCase()

    // Si es PDF con contraseña, desencriptarlo con qpdf
    if (nombreArchivo.endsWith('.pdf') && password) {
      const tempInput = `/tmp/input_${Date.now()}.pdf`
      const tempOutput = `/tmp/output_${Date.now()}.pdf`

      try {
        writeFileSync(tempInput, buffer)
        execSync(`/opt/homebrew/bin/qpdf --password=${password} --decrypt ${tempInput} ${tempOutput}`)
        buffer = readFileSync(tempOutput)
        unlinkSync(tempInput)
        unlinkSync(tempOutput)
      } catch (e) {
        console.error('Error desencriptando PDF:', e.message)
        try { unlinkSync(tempInput) } catch {}
        try { unlinkSync(tempOutput) } catch {}
        return Response.json({ ok: false, mensaje: 'Contraseña incorrecta o PDF inválido' })
      }
    }

    let textoCartola = ''

    if (nombreArchivo.endsWith('.pdf')) {
      const base64 = buffer.toString('base64')

      const respuesta = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: `Extrae TODAS las transacciones de esta cartola bancaria chilena.

Responde SOLO con JSON sin markdown y sin bloques de código:
{
  "banco": "nombre del banco",
  "cuenta": "tipo de cuenta",
  "transacciones": [
    {
      "fecha": "2024-01-15",
      "descripcion": "Descripción del movimiento",
      "monto": 15000,
      "tipo": "gasto",
      "saldo": 500000
    }
  ]
}

REGLAS:
- fecha formato YYYY-MM-DD
- monto siempre positivo
- tipo es "gasto" o "ingreso"
- incluye TODAS las transacciones sin excepción
- NO uses bloques de código markdown`
            }
          ]
        }]
      })

      textoCartola = respuesta.content[0].text.replace(/```json|```/g, '').trim()

    } else if (nombreArchivo.endsWith('.xlsx') || nombreArchivo.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const hoja = workbook.Sheets[workbook.SheetNames[0]]
      const datos = XLSX.utils.sheet_to_csv(hoja)

      const respuesta = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Extrae TODAS las transacciones de esta cartola bancaria chilena en formato CSV.

CSV:
${datos.substring(0, 5000)}

Responde SOLO con JSON sin markdown y sin bloques de código:
{
  "banco": "nombre del banco",
  "cuenta": "tipo de cuenta",
  "transacciones": [
    {
      "fecha": "2024-01-15",
      "descripcion": "Descripción del movimiento",
      "monto": 15000,
      "tipo": "gasto",
      "saldo": 500000
    }
  ]
}

REGLAS:
- fecha formato YYYY-MM-DD
- monto siempre positivo
- tipo es "gasto" o "ingreso"
- incluye TODAS las transacciones sin excepción
- NO uses bloques de código markdown`
        }]
      })

      textoCartola = respuesta.content[0].text.replace(/```json|```/g, '').trim()
    } else {
      return Response.json({ ok: false, mensaje: 'Formato no soportado. Usa PDF o Excel.' })
    }

    const cartola = JSON.parse(textoCartola)

    if (!cartola.transacciones || cartola.transacciones.length === 0) {
      return Response.json({ ok: false, mensaje: 'No se encontraron transacciones' })
    }

    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user_id)

    let importadas = 0
    let duplicadas = 0

    for (const trans of cartola.transacciones) {
      const { data: existente } = await supabase
        .from('transacciones')
        .select('id')
        .eq('user_id', user_id)
        .eq('fecha', trans.fecha)
        .eq('monto', trans.monto)
        .eq('descripcion', trans.descripcion)
        .single()

      if (existente) {
        duplicadas++
        continue
      }

      const { data: reglas } = await supabase
        .from('reglas_ia')
        .select('*')
        .eq('user_id', user_id)
        .ilike('patron', `%${trans.descripcion}%`)
        .limit(1)

      let categoria_id = null
      let clasificado_por = null
      let necesita_revision = true
      let confianza_ia = null

      if (reglas && reglas.length > 0) {
        categoria_id = reglas[0].categoria_id
        clasificado_por = 'regla'
        confianza_ia = 1.0
        necesita_revision = false
      } else if (categorias && categorias.length > 0) {
        const listaCategorias = categorias.map(c => c.nombre).join('\n')

        const clasificacion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Clasifica este gasto en una categoría.
Gasto: "${trans.descripcion}"
Categorías:
${listaCategorias}
Responde SOLO con JSON sin markdown:
{"categoria": "nombre exacto", "confianza": 0.95, "necesita_revision": false}`
          }]
        })

        const resultado = JSON.parse(clasificacion.content[0].text.replace(/```json|```/g, '').trim())
        const categoriaEncontrada = categorias.find(
          c => c.nombre.toLowerCase() === resultado.categoria?.toLowerCase()
        )

        if (categoriaEncontrada) {
          categoria_id = categoriaEncontrada.id
          clasificado_por = 'ia'
          confianza_ia = resultado.confianza
          necesita_revision = resultado.necesita_revision
        }
      }

      const { data: transaccion, error } = await supabase
        .from('transacciones')
        .insert({
          user_id,
          cuenta_id: cuenta_id || null,
          categoria_id,
          monto: trans.monto,
          descripcion: trans.descripcion,
          fecha: trans.fecha,
          tipo: trans.tipo,
          origen: 'cartola',
          clasificado_por,
          confianza_ia,
          necesita_revision
        })
        .select()

      if (!error) {
        importadas++

        if (necesita_revision && transaccion?.[0]) {
          await supabase.from('alertas').insert({
            user_id,
            transaccion_id: transaccion[0].id,
            tipo: categoria_id ? 'baja_confianza' : 'sin_clasificar'
          })
        }
      }
    }

    return Response.json({
      ok: true,
      importadas,
      duplicadas,
      total: cartola.transacciones.length,
      banco: cartola.banco,
      mensaje: `${importadas} transacciones importadas, ${duplicadas} duplicadas omitidas`
    })

  } catch (error) {
    console.error('Error importando cartola:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
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

    // Desencriptar PDF si tiene contraseña
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
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: `Extrae TODAS las transacciones de esta cartola bancaria chilena.
Responde SOLO con JSON sin markdown:
{
  "banco": "nombre del banco",
  "transacciones": [
    {"fecha": "2024-01-15", "descripcion": "Descripción", "monto": 15000, "tipo": "gasto"}
  ]
}
REGLAS: fecha YYYY-MM-DD, monto positivo, tipo "gasto" o "ingreso", NO uses markdown`
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
          content: `Extrae TODAS las transacciones de esta cartola en CSV.
CSV: ${datos.substring(0, 5000)}
Responde SOLO con JSON sin markdown:
{
  "banco": "nombre del banco",
  "transacciones": [
    {"fecha": "2024-01-15", "descripcion": "Descripción", "monto": 15000, "tipo": "gasto"}
  ]
}
REGLAS: fecha YYYY-MM-DD, monto positivo, tipo "gasto" o "ingreso", NO uses markdown`
        }]
      })

      textoCartola = respuesta.content[0].text.replace(/```json|```/g, '').trim()
    }

    const cartola = JSON.parse(textoCartola)

    if (!cartola.transacciones || cartola.transacciones.length === 0) {
      return Response.json({ ok: false, mensaje: 'No se encontraron transacciones en la cartola' })
    }

    // Obtener fechas de la cartola
    const fechas = cartola.transacciones.map(t => t.fecha).sort()
    const fechaInicio = fechas[0]
    const fechaFin = fechas[fechas.length - 1]

    // Obtener transacciones del sistema en ese período
    const { data: transaccionesSistema } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', user_id)
      .eq('cuenta_id', cuenta_id)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)

    const diferencias = []
    const coincidencias = []

    // Comparar cartola vs sistema
    for (const transCartola of cartola.transacciones) {
      const match = transaccionesSistema?.find(t =>
        t.fecha === transCartola.fecha &&
        Math.abs(t.monto - transCartola.monto) < 1 &&
        t.tipo === transCartola.tipo
      )

      if (match) {
        coincidencias.push({
          fecha: transCartola.fecha,
          descripcion: transCartola.descripcion,
          monto: transCartola.monto,
          tipo: transCartola.tipo
        })
      } else {
        diferencias.push({
          fecha: transCartola.fecha,
          descripcion: transCartola.descripcion,
          monto: transCartola.monto,
          tipo: transCartola.tipo,
          problema: 'en_cartola_no_en_sistema'
        })
      }
    }

    // Buscar transacciones en el sistema que no están en la cartola
    for (const transSistema of (transaccionesSistema || [])) {
      const match = cartola.transacciones.find(t =>
        t.fecha === transSistema.fecha &&
        Math.abs(t.monto - transSistema.monto) < 1 &&
        t.tipo === transSistema.tipo
      )

      if (!match) {
        diferencias.push({
          fecha: transSistema.fecha,
          descripcion: transSistema.descripcion,
          monto: transSistema.monto,
          tipo: transSistema.tipo,
          problema: 'en_sistema_no_en_cartola',
          transaccion_id: transSistema.id
        })
      }
    }

    return Response.json({
      ok: true,
      banco: cartola.banco,
      periodo: { desde: fechaInicio, hasta: fechaFin },
      total_cartola: cartola.transacciones.length,
      total_sistema: transaccionesSistema?.length || 0,
      coincidencias: coincidencias.length,
      diferencias,
      mensaje: diferencias.length === 0
        ? '✅ Todo concilia perfectamente'
        : `⚠️ Se encontraron ${diferencias.length} diferencias`
    })

  } catch (error) {
    console.error('Error conciliando:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
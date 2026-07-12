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

    if (!archivo) {
      return Response.json({ ok: false, mensaje: 'No se recibió archivo' })
    }

    // Obtener la contraseña guardada
    const { data: config } = await supabase
      .from('configuracion_usuarios')
      .select('cartola_password')
      .eq('user_id', user_id)
      .single()

    const password = config?.cartola_password

    const bytes = await archivo.arrayBuffer()
    let buffer = Buffer.from(bytes)
    const nombreArchivo = archivo.name.toLowerCase()

    // Desencriptar PDF si tiene contraseña y está disponible
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
        console.error('Error desencriptando:', e.message)
        try { unlinkSync(tempInput) } catch {}
        try { unlinkSync(tempOutput) } catch {}
        return Response.json({ ok: false, mensaje: 'Error desencriptando cartola' })
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
REGLAS: fecha YYYY-MM-DD, monto positivo, tipo "gasto" o "ingreso"`
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
          content: `Extrae transacciones de esta cartola en CSV.
CSV: ${datos.substring(0, 5000)}
Responde JSON: {"banco": "nombre", "transacciones": [{"fecha": "2024-01-15", "descripcion": "Desc", "monto": 15000, "tipo": "gasto"}]}`
        }]
      })

      textoCartola = respuesta.content[0].text.replace(/```json|```/g, '').trim()
    }

    const cartola = JSON.parse(textoCartola)

    if (!cartola.transacciones || cartola.transacciones.length === 0) {
      return Response.json({ ok: false, mensaje: 'Sin transacciones' })
    }

    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user_id)

    let importadas = 0
    let duplicadas = 0
    let diferencias = []

    // Obtener transacciones existentes para comparación
    const fechas = cartola.transacciones.map(t => t.fecha).sort()
    const fechaInicio = fechas[0]
    const fechaFin = fechas[fechas.length - 1]

    const { data: transaccionesSistema } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', user_id)
      .eq('cuenta_id', cuenta_id)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)

    // Procesar cada transacción de la cartola
    for (const trans of cartola.transacciones) {
      // Buscar si ya existe
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

      // Buscar si está en el sistema pero con diferencia
      const enSistema = transaccionesSistema?.find(t =>
        t.fecha === trans.fecha &&
        Math.abs(t.monto - trans.monto) < 1 &&
        t.tipo === trans.tipo
      )

      if (enSistema) {
        continue // Ya existe, no importar
      }

      // Clasificar y guardar
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
            content: `Clasifica: "${trans.descripcion}"
Categorías: ${listaCategorias}
Responde JSON: {"categoria": "nombre", "confianza": 0.95}`
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
          necesita_revision = resultado.confianza < 0.8
        }
      }

      const { data: transaccion, error } = await supabase
        .from('transacciones')
        .insert({
          user_id,
          cuenta_id,
          categoria_id,
          monto: trans.monto,
          descripcion: trans.descripcion,
          fecha: trans.fecha,
          tipo: trans.tipo,
          origen: 'cartola_auto',
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
            tipo: 'baja_confianza'
          })
        }
      }
    }

    // Detectar diferencias (en sistema pero no en cartola)
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
          monto: transSistema.monto
        })
      }
    }

    return Response.json({
      ok: true,
      banco: cartola.banco,
      importadas,
      duplicadas,
      diferencias: diferencias.length,
      mensaje: `${importadas} importadas, ${duplicadas} duplicadas, ${diferencias.length} diferencias`
    })

  } catch (error) {
    console.error('Error procesando:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
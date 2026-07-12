import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

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

    console.log('=== SINCRONIZANDO CORREOS ===', user_id)

    const { data: conexion, error: errorConexion } = await supabase
      .from('conexiones_correo')
      .select('*')
      .eq('user_id', user_id)
      .eq('proveedor', 'gmail')
      .eq('activa', true)
      .single()

    if (errorConexion || !conexion) {
      return Response.json({ ok: false, mensaje: 'Gmail no conectado' })
    }

    const { data: cuentas } = await supabase
      .from('cuentas')
      .select('*')
      .eq('user_id', user_id)
      .not('email_origen', 'is', null)

    if (!cuentas || cuentas.length === 0) {
      return Response.json({ ok: false, mensaje: 'No hay cuentas con email configurado' })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: conexion.access_token,
      refresh_token: conexion.refresh_token
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const emailsOrigen = cuentas.map(c => `from:${c.email_origen}`).join(' OR ')
    const query = `(${emailsOrigen}) newer_than:7d`

    console.log('Query Gmail:', query)

    const { data: mensajes } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20
    })

    if (!mensajes.messages || mensajes.messages.length === 0) {
      return Response.json({ ok: true, procesados: 0, mensaje: 'No hay correos nuevos' })
    }

    console.log('Correos encontrados:', mensajes.messages.length)

    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user_id)

    let procesados = 0
    let errores = 0

    for (const mensaje of mensajes.messages) {
      try {
        const { data: correo } = await gmail.users.messages.get({
          userId: 'me',
          id: mensaje.id,
          format: 'full'
        })

        let texto = ''
        const payload = correo.payload

        if (payload.body?.data) {
          texto = Buffer.from(payload.body.data, 'base64').toString('utf-8')
        } else if (payload.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              texto += Buffer.from(part.body.data, 'base64').toString('utf-8')
            }
          }
        }

        if (!texto) continue

        const remitente = payload.headers?.find(h => h.name === 'From')?.value || ''

        const { data: existente } = await supabase
          .from('transacciones')
          .select('id')
          .eq('user_id', user_id)
          .eq('descripcion', `gmail_${mensaje.id}`)
          .single()

        if (existente) continue

        const extraccion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Eres un extractor de datos de correos bancarios chilenos.

Analiza este correo y extrae la información de la transacción.

Correo:
${texto.substring(0, 2000)}

Responde SOLO con JSON sin markdown:
{
  "es_transaccion": true,
  "monto": 15000,
  "comercio": "Uber",
  "fecha": "2024-01-15",
  "tipo": "gasto",
  "descripcion": "Pago Uber",
  "es_transferencia_interna": false
}

Si NO es una transacción bancaria responde: {"es_transaccion": false}

REGLAS:
- monto siempre número sin puntos ni comas
- tipo es "gasto", "ingreso" o "transferencia"
- fecha formato YYYY-MM-DD
- comercio es el nombre del negocio
- es_transferencia_interna es true cuando el dinero se mueve entre cuentas propias del mismo usuario`
          }]
        })

        const datos = JSON.parse(extraccion.content[0].text)
        if (!datos.es_transaccion) continue

        const cuentaMatch = cuentas.find(c =>
          remitente.toLowerCase().includes(c.email_origen.toLowerCase())
        )

        const { data: reglas } = await supabase
          .from('reglas_ia')
          .select('*')
          .eq('user_id', user_id)
          .ilike('patron', `%${datos.comercio}%`)
          .limit(1)

        let categoria_id = null
        let clasificado_por = null
        let confianza_ia = null
        let necesita_revision = true

        if (datos.es_transferencia_interna) {
          necesita_revision = false
          clasificado_por = 'sistema'
        } else if (reglas && reglas.length > 0) {
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
Gasto: "${datos.descripcion} - ${datos.comercio}"
Categorías:
${listaCategorias}
Responde SOLO con JSON sin markdown:
{"categoria": "nombre exacto", "confianza": 0.95, "necesita_revision": false}`
            }]
          })

          const resultadoClasificacion = JSON.parse(clasificacion.content[0].text)
          const categoriaEncontrada = categorias.find(
            c => c.nombre.toLowerCase() === resultadoClasificacion.categoria?.toLowerCase()
          )

          if (categoriaEncontrada) {
            categoria_id = categoriaEncontrada.id
            clasificado_por = 'ia'
            confianza_ia = resultadoClasificacion.confianza
            necesita_revision = resultadoClasificacion.necesita_revision
          }
        }

        const { data: transaccion, error: errorTrans } = await supabase
          .from('transacciones')
          .insert({
            user_id,
            cuenta_id: cuentaMatch?.id || null,
            categoria_id,
            monto: datos.monto,
            descripcion: datos.descripcion,
            fecha: datos.fecha,
            tipo: datos.tipo,
            es_transferencia_interna: datos.es_transferencia_interna || false,
            origen: 'automatico',
            clasificado_por,
            confianza_ia,
            necesita_revision: datos.es_transferencia_interna ? false : necesita_revision
          })
          .select()

        if (errorTrans) {
          console.error('Error guardando transacción:', errorTrans)
          errores++
          continue
        }

        if (necesita_revision && !datos.es_transferencia_interna && transaccion?.[0]) {
          await supabase.from('alertas').insert({
            user_id,
            transaccion_id: transaccion[0].id,
            tipo: categoria_id ? 'baja_confianza' : 'sin_clasificar'
          })
        }

        procesados++
        console.log('Transacción guardada:', datos.descripcion, datos.monto)

      } catch (e) {
        console.error('Error procesando correo:', e.message)
        errores++
      }
    }

    return Response.json({
      ok: true,
      procesados,
      errores,
      mensaje: `${procesados} transacciones importadas`
    })

  } catch (error) {
    console.error('Error sincronizando:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
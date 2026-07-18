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

// Le da más tiempo a esta función antes de que Vercel la corte.
// Por defecto son 10s, lo cual no alcanza si hay que procesar varios
// correos (cada uno implica llamadas a Gmail y a la IA).
export const maxDuration = 60

// Extrae el texto de un correo, soportando estructuras anidadas (multipart/alternative
// dentro de multipart/mixed, etc). Prioriza texto plano; si no existe, usa el HTML
// y le quita las etiquetas.
function extraerTextoCorreo(payload) {
  let textoPlano = ''
  let textoHtml = ''

  function recorrer(part) {
    if (!part) return
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textoPlano += Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      textoHtml += Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.parts) {
      for (const sub of part.parts) recorrer(sub)
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) recorrer(part)
  } else if (payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      textoHtml = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    } else {
      textoPlano = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }
  }

  if (textoPlano.trim()) return textoPlano

  if (textoHtml.trim()) {
    return textoHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&aacute;/g, 'á')
      .replace(/&eacute;/g, 'é')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú')
      .replace(/&ntilde;/g, 'ñ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return ''
}

export async function POST(request) {
  try {
    const { user_id, ventana, cuenta_id } = await request.json()
    const ventanaBusqueda = ventana || '7d'

    console.log('=== SINCRONIZANDO CORREOS ===', user_id, cuenta_id ? `(solo cuenta ${cuenta_id})` : '(todas las cuentas)')

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

    const { data: todasLasCuentas } = await supabase
      .from('cuentas')
      .select('*')
      .eq('user_id', user_id)

    // La columna `emails` puede venir como string JSON (texto) o como array real (jsonb),
    // dependiendo del tipo de columna en Supabase. Normalizamos siempre a array.
    const parsearEmails = (valor) => {
      if (Array.isArray(valor)) return valor
      if (typeof valor === 'string' && valor.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(valor)
          return Array.isArray(parsed) ? parsed : []
        } catch (e) {
          return []
        }
      }
      return []
    }

    const cuentasNormalizadas = (todasLasCuentas || []).map(c => ({
      ...c,
      emailsArray: parsearEmails(c.emails)
    }))

    // Filtramos en JS las cuentas que tengan al menos un email configurado,
    // ya sea en el array `emails` (flujo nuevo) o en `email_origen` (flujo antiguo)
    let cuentas = cuentasNormalizadas.filter(c => {
      const tieneEmails = c.emailsArray.length > 0
      const tieneEmailOrigen = !!c.email_origen
      return tieneEmails || tieneEmailOrigen
    })

    // Si se pidió sincronizar solo una cuenta específica, filtramos a esa nada más
    if (cuenta_id) {
      cuentas = cuentas.filter(c => c.id === cuenta_id)
    }

    if (!cuentas || cuentas.length === 0) {
      return Response.json({
        ok: false,
        mensaje: cuenta_id ? 'Esa cuenta no tiene emails configurados' : 'No hay cuentas con email configurado'
      })
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

    // Juntamos todos los correos posibles de todas las cuentas (array emails + email_origen legacy)
    const todosLosEmails = []
    for (const c of cuentas) {
      for (const e of c.emailsArray) {
        if (e) todosLosEmails.push(e)
      }
      if (c.email_origen) {
        todosLosEmails.push(c.email_origen)
      }
    }
    const emailsUnicos = [...new Set(todosLosEmails)]

    if (emailsUnicos.length === 0) {
      return Response.json({ ok: false, mensaje: 'No hay correos configurados en las cuentas' })
    }

    const emailsOrigen = emailsUnicos.map(e => `from:${e}`).join(' OR ')
    const query = `(${emailsOrigen}) newer_than:${ventanaBusqueda}`

    console.log('Query Gmail:', query)

    const { data: mensajes } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
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

        const texto = extraerTextoCorreo(correo.payload)

        if (!texto) {
          console.log(`[${mensaje.id}] SALTADO: sin texto extraíble`)
          continue
        }

        const remitente = correo.payload.headers?.find(h => h.name === 'From')?.value || ''

        const { data: existente } = await supabase
          .from('transacciones')
          .select('id')
          .eq('user_id', user_id)
          .eq('origen_id', mensaje.id)
          .maybeSingle()

        if (existente) {
          console.log(`[${mensaje.id}] SALTADO: ya existe (duplicado)`)
          continue
        }

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
        if (!datos.es_transaccion) {
          console.log(`[${mensaje.id}] SALTADO: IA dice que no es transacción`)
          continue
        }

        // Match de cuenta: revisa tanto el array emails como email_origen (legacy)
        const cuentaMatch = cuentas.find(c => {
          const emailsDeCuenta = [...c.emailsArray]
          if (c.email_origen) emailsDeCuenta.push(c.email_origen)

          return emailsDeCuenta.some(e =>
            e && remitente.toLowerCase().includes(e.toLowerCase())
          )
        })

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
            origen_id: mensaje.id,
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
        console.error('Error procesando correo:', mensaje.id, '-', e?.message || e)
        if (e?.error) console.error('Detalle del error:', JSON.stringify(e.error))
        if (e?.status) console.error('Status:', e.status)
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
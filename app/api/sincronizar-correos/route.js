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

    // Freno de emergencia: si una corrida anterior tuvo muchos errores
    // seguidos, el sistema se pausa solo hasta que alguien lo revise y
    // reactive manualmente, para evitar gastar de más por un bug no previsto.
    const { data: estadoSync } = await supabase
      .from('sync_estado')
      .select('*')
      .eq('id', 1)
      .single()

    if (estadoSync?.pausado) {
      console.log('SINCRONIZACIÓN PAUSADA:', estadoSync.motivo)
      return Response.json({
        ok: false,
        pausado: true,
        mensaje: `Sincronización pausada automáticamente: ${estadoSync.motivo || 'errores repetidos'}. Ve a Configuración para reactivarla.`
      })
    }

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

    // Traemos TODOS los IDs de correos que coincidan (con paginación), sin
    // procesarlos todavía. Esto es barato (no gasta IA), así que podemos
    // permitirnos revisar un rango amplio sin arriesgar timeout.
    let idsEncontrados = []
    let pageToken = undefined
    const TOPE_SEGURIDAD_IDS = 200

    do {
      const { data: pagina } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
        pageToken
      })

      if (pagina.messages) {
        idsEncontrados.push(...pagina.messages.map(m => m.id))
      }
      pageToken = pagina.nextPageToken

    } while (pageToken && idsEncontrados.length < TOPE_SEGURIDAD_IDS)

    if (idsEncontrados.length === 0) {
      return Response.json({ ok: true, procesados: 0, mensaje: 'No hay correos nuevos' })
    }

    console.log('Correos encontrados (total):', idsEncontrados.length)

    // Revisamos en bloque cuáles de esos IDs YA FUERON REVISADOS antes
    // (hayan resultado en una transacción o no). Antes solo chequeábamos
    // contra `transacciones`, lo que hacía que los correos promocionales
    // (descartados por la IA) se re-analizaran en cada corrida del cron,
    // gastando IA sin necesidad.
    const { data: yaExistentes } = await supabase
      .from('correos_gmail_procesados')
      .select('mensaje_id')
      .eq('user_id', user_id)
      .in('mensaje_id', idsEncontrados)

    const idsYaGuardados = new Set((yaExistentes || []).map(t => t.mensaje_id))
    const idsNuevos = idsEncontrados.filter(id => !idsYaGuardados.has(id))

    console.log('Correos ya guardados:', idsYaGuardados.size, '| Correos nuevos por procesar:', idsNuevos.length)

    if (idsNuevos.length === 0) {
      return Response.json({
        ok: true,
        procesados: 0,
        mensaje: `${idsEncontrados.length} correos encontrados, todos ya estaban importados`
      })
    }

    // Procesamos los más antiguos primero (Gmail los devuelve del más nuevo
    // al más viejo, así que invertimos el orden).
    idsNuevos.reverse()

    // Tope de correos NUEVOS a procesar en esta corrida, para no exceder el
    // tiempo máximo de la función. Si quedan más, el usuario puede volver a
    // apretar "Activar" y esta vez avanzará con los siguientes (los ya
    // guardados se saltan rápido).
    const TOPE_PROCESAMIENTO_IA = 15
    const idsAProcesar = idsNuevos.slice(0, TOPE_PROCESAMIENTO_IA)
    const idsPendientesParaSiguienteCorrida = idsNuevos.length - idsAProcesar.length

    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user_id)

    let procesados = 0
    let errores = 0

    for (const mensajeId of idsAProcesar) {
      try {
        const { data: correo } = await gmail.users.messages.get({
          userId: 'me',
          id: mensajeId,
          format: 'full'
        })

        const texto = extraerTextoCorreo(correo.payload)

        if (!texto) {
          console.log(`[${mensajeId}] SALTADO: sin texto extraíble`)
          await supabase.from('correos_gmail_procesados').upsert({
            user_id, mensaje_id: mensajeId, es_transaccion: false
          }, { onConflict: 'user_id,mensaje_id' })
          continue
        }

        const remitente = correo.payload.headers?.find(h => h.name === 'From')?.value || ''
        const asunto = correo.payload.headers?.find(h => h.name === 'Subject')?.value || ''

        // Filtro gratuito #1: palabras típicas de correos promocionales/marketing
        // en el asunto. Si aparece alguna, casi seguro no es un aviso de transacción.
        const PALABRAS_PROMOCIONALES = [
          'promoción', 'promocion', 'oferta', 'descuento', 'cyber', 'sorteo',
          'concurso', 'boletín', 'boletin', 'newsletter', 'cupón', 'cupon',
          'regalo', 'invitación', 'invitacion', 'webinar', 'encuesta',
          'conoce', 'descubre', 'nueva tarjeta', 'black friday', 'liquidación',
          'liquidacion', 'gift card', 'beneficios exclusivos', 'suscríbete',
          'suscribete', 'gana', 'ganador'
        ]
        const asuntoLower = asunto.toLowerCase()
        const pareceSpamPromocional = PALABRAS_PROMOCIONALES.some(p => asuntoLower.includes(p))

        if (pareceSpamPromocional) {
          console.log(`[${mensajeId}] SALTADO: asunto parece promocional ("${asunto}") (sin gastar IA)`)
          await supabase.from('correos_gmail_procesados').upsert({
            user_id, mensaje_id: mensajeId, es_transaccion: false
          }, { onConflict: 'user_id,mensaje_id' })
          continue
        }

        // Filtro gratuito #2: un correo de transacción real SIEMPRE menciona
        // un monto en dinero (ej: $15.000, $1.500.99). Si no aparece nada así,
        // es muy probable que sea promocional/informativo sin transacción.
        const tieneMontoAparente = /\$\s?\d[\d.,]*\d|\d[\d.,]*\d\s?(?:CLP|pesos)/i.test(texto)
        if (!tieneMontoAparente) {
          console.log(`[${mensajeId}] SALTADO: sin monto aparente, probablemente no es transacción (sin gastar IA)`)
          await supabase.from('correos_gmail_procesados').upsert({
            user_id, mensaje_id: mensajeId, es_transaccion: false
          }, { onConflict: 'user_id,mensaje_id' })
          continue
        }

        const extraccion = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
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

        const textoRespuestaExtraccion = extraccion.content[0].text.replace(/```json|```/g, '').trim()
        const datos = JSON.parse(textoRespuestaExtraccion)
        if (!datos.es_transaccion) {
          console.log(`[${mensajeId}] SALTADO: IA dice que no es transacción`)
          await supabase.from('correos_gmail_procesados').upsert({
            user_id, mensaje_id: mensajeId, es_transaccion: false
          }, { onConflict: 'user_id,mensaje_id' })
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
            model: 'claude-haiku-4-5-20251001',
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

          const textoRespuestaClasificacion = clasificacion.content[0].text.replace(/```json|```/g, '').trim()
          const resultadoClasificacion = JSON.parse(textoRespuestaClasificacion)
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
            origen_id: mensajeId,
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

        await supabase.from('correos_gmail_procesados').upsert({
          user_id, mensaje_id: mensajeId, es_transaccion: true
        }, { onConflict: 'user_id,mensaje_id' })

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
        console.error('Error procesando correo:', mensajeId, '-', e?.message || e)
        if (e?.error) console.error('Detalle del error:', JSON.stringify(e.error))
        if (e?.status) console.error('Status:', e.status)
        errores++

        // Red de seguridad SOLO para errores de parseo (bugs de código que
        // siempre van a fallar igual, como el de markdown que tuvimos).
        // Errores de la API (falta de crédito, rate limit, etc.) NO se
        // marcan como procesados, para que se reintenten automáticamente
        // una vez se resuelva el problema (ej: cuando recargues crédito).
        const esErrorDeParseo = e instanceof SyntaxError
        if (esErrorDeParseo) {
          try {
            await supabase.from('correos_gmail_procesados').upsert({
              user_id, mensaje_id: mensajeId, es_transaccion: false
            }, { onConflict: 'user_id,mensaje_id' })
          } catch (e2) {
            console.error('No se pudo marcar como procesado tras error:', mensajeId)
          }
        }
      }
    }

    // Freno de emergencia: si hubo demasiados errores en esta corrida,
    // pausamos la sincronización automáticamente hasta revisión manual.
    const UMBRAL_ERRORES_PARA_PAUSAR = 5
    if (errores >= UMBRAL_ERRORES_PARA_PAUSAR) {
      await supabase.from('sync_estado').upsert({
        id: 1,
        pausado: true,
        motivo: `${errores} errores en una sola corrida (${new Date().toLocaleString('es-CL')})`,
        updated_at: new Date().toISOString()
      })
      console.log('SINCRONIZACIÓN PAUSADA AUTOMÁTICAMENTE por exceso de errores')
    }

    return Response.json({
      ok: true,
      procesados,
      errores,
      pendientes: idsPendientesParaSiguienteCorrida,
      mensaje: idsPendientesParaSiguienteCorrida > 0
        ? `${procesados} transacciones importadas. Quedan ${idsPendientesParaSiguienteCorrida} correos más por revisar — aprieta "Activar" de nuevo para seguir.`
        : `${procesados} transacciones importadas`
    })

  } catch (error) {
    console.error('Error sincronizando:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
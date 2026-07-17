'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Configuracion() {
  const [usuario, setUsuario] = useState(null)
  const [conexion, setConexion] = useState(null)
  const [loadingGmail, setLoadingGmail] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [resultadoSync, setResultadoSync] = useState(null)

  const [rut, setRut] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'
    setUsuario(user)

    const { data: conex } = await supabase
      .from('conexiones_correo')
      .select('*')
      .eq('user_id', user.id)
      .eq('proveedor', 'gmail')
      .eq('activa', true)
      .single()
    setConexion(conex || null)
    setLoadingGmail(false)

    const { data } = await supabase
      .from('configuracion_usuarios')
      .select('cartola_password')
      .eq('user_id', user.id)
      .single()

    if (data?.cartola_password) {
      setGuardado(true)
    }
  }

  // --- Gmail ---
  const conectarGmail = () => {
    if (!usuario) return
    window.location.href = `/api/auth/google?user_id=${usuario.id}`
  }

  const desconectarGmail = async () => {
    if (!confirm('¿Desconectar tu cuenta de Gmail?')) return
    await supabase
      .from('conexiones_correo')
      .update({ activa: false })
      .eq('user_id', usuario.id)
      .eq('proveedor', 'gmail')
    cargarTodo()
  }

  const sincronizarAhora = async () => {
    setSincronizando(true)
    setResultadoSync(null)
    try {
      const response = await fetch('/api/sincronizar-correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: usuario.id })
      })
      const data = await response.json()
      setResultadoSync(data)
    } catch (e) {
      setResultadoSync({ ok: false, mensaje: 'Error al sincronizar' })
    }
    setSincronizando(false)
  }

  // --- RUT / cartola password ---
  const extraerUltimos4 = (rutValor) => {
    const limpio = rutValor.replace(/\D/g, '')
    return limpio.slice(-4)
  }

  const guardarRut = async () => {
    if (!rut) return

    const password = extraerUltimos4(rut)
    if (password.length !== 4) {
      alert('RUT inválido')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('configuracion_usuarios')
      .upsert({
        user_id: user.id,
        cartola_password: password
      }, { onConflict: 'user_id' })

    if (!error) {
      setGuardado(true)
      setRut('')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">⚙️ Configuración</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Conexiones y automatización de cartolas</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="self-start sm:self-auto bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition text-sm sm:text-base"
          >
            ← Volver
          </button>
        </div>

        {/* Conexión Gmail */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl">
              📧
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold">Gmail</h2>
              <p className="text-gray-400 text-sm mt-1">
                Detecta transacciones automáticamente leyendo correos de tus bancos
              </p>
            </div>
          </div>

          {loadingGmail ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : conexion ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <p className="text-green-400 text-sm font-medium truncate">Conectado: {conexion.email}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={sincronizarAhora}
                  disabled={sincronizando}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-xl transition text-sm sm:text-base"
                >
                  {sincronizando ? '🔄 Sincronizando...' : '🔄 Sincronizar ahora'}
                </button>
                <button
                  onClick={desconectarGmail}
                  className="bg-gray-800 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded-xl transition text-sm sm:text-base"
                >
                  Desconectar
                </button>
              </div>

              {resultadoSync && (
                <div className={`mt-4 p-3 rounded-xl text-sm ${resultadoSync.ok ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                  {resultadoSync.mensaje || (resultadoSync.ok ? 'Sincronización completa' : 'Error al sincronizar')}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                <p className="text-gray-500 text-sm">No conectado</p>
              </div>
              <button
                onClick={conectarGmail}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition text-sm sm:text-base"
              >
                Conectar Gmail
              </button>
            </div>
          )}
        </div>

        {/* RUT / Automatización de cartolas */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 space-y-6">

          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4">🔐 Tu RUT</h2>
            <p className="text-gray-400 text-sm mb-3">
              Ingresa tu RUT para que el sistema extraiga automáticamente los últimos 4 dígitos y desencripte tus cartolas PDF.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  RUT (con o sin puntos y guión)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 19.279.611-K o 19279611K"
                  value={rut}
                  onChange={e => {
                    setRut(e.target.value)
                    setGuardado(false)
                  }}
                  disabled={guardado}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-base"
                />
                {rut && (
                  <p className="text-sm mt-2 text-gray-400">
                    Contraseña automática: <span className="text-blue-400 font-mono">{extraerUltimos4(rut)}</span>
                  </p>
                )}
              </div>

              {guardado ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRut('')
                      setGuardado(false)
                    }}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-xl transition text-sm sm:text-base"
                  >
                    ✏️ Cambiar RUT
                  </button>
                </div>
              ) : (
                <button
                  onClick={guardarRut}
                  disabled={loading || !rut}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-xl transition text-sm sm:text-base"
                >
                  {loading ? 'Guardando...' : '🔒 Guardar'}
                </button>
              )}

              {guardado && (
                <p className="text-green-400 text-sm">✅ RUT guardado</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">🤖 Automatización activada</h2>
            <p className="text-gray-400 text-sm mb-4">
              El sistema detectará automáticamente:
            </p>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>✅ Correos del banco con cartolas adjuntas</p>
              <p>✅ Desencriptará el PDF con tus últimos 4 dígitos</p>
              <p>✅ Importará todas las transacciones automáticamente</p>
              <p>✅ Conciliará con tus registros</p>
              <p>✅ Te notificará si hay diferencias</p>
              <p>✅ Todo sin que hagas nada</p>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              ℹ️ Tu RUT se guarda de forma segura. La IA lo usa para extraer automáticamente los últimos 4 dígitos como contraseña de tus cartolas.
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}
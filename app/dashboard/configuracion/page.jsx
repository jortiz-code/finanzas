'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Configuracion() {
  const [usuario, setUsuario] = useState(null)
  const [conexion, setConexion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [resultadoSync, setResultadoSync] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
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
    setLoading(false)
  }

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
    cargarDatos()
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

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-xl">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">⚙️ Configuración</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Conexiones y preferencias</p>
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

          {conexion ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <p className="text-green-400 text-sm font-medium">Conectado: {conexion.email}</p>
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

        {/* Nota sobre sincronización automática */}
        <div className="bg-gray-900 rounded-2xl p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-2">ℹ️ Sobre la sincronización automática</h2>
          <p className="text-gray-400 text-sm">
            Por ahora, la sincronización se ejecuta manualmente con el botón "Sincronizar ahora".
            La sincronización automática periódica (cada cierta cantidad de minutos) todavía no está configurada.
          </p>
        </div>

      </div>
    </div>
  )
}
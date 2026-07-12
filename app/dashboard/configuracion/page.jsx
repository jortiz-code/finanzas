'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Configuracion() {
  const [rut, setRut] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarConfig()
  }, [])

  const cargarConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('configuracion_usuarios')
      .select('cartola_password')
      .eq('user_id', user.id)
      .single()

    if (data?.cartola_password) {
      setGuardado(true)
    }
  }

  const extraerUltimos4 = (rut) => {
    const limpio = rut.replace(/\D/g, '')
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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">⚙️ Configuración</h1>
            <p className="text-gray-400 mt-1">Automatización de cartolas</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            ← Volver
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold mb-4">🔐 Tu RUT</h2>
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
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-xl transition"
                  >
                    ✏️ Cambiar RUT
                  </button>
                </div>
              ) : (
                <button
                  onClick={guardarRut}
                  disabled={loading || !rut}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-xl transition"
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
            <h2 className="text-xl font-semibold mb-4">🤖 Automatización activada</h2>
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
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esRegistro, setEsRegistro] = useState(false)

  const handleAuth = async () => {
    setLoading(true)
    setMensaje('')

    if (esRegistro) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMensaje(error.message)
      else setMensaje('Revisa tu correo para confirmar tu cuenta')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMensaje('Correo o contraseña incorrectos')
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-2">
          {esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
        </h1>
        <p className="text-gray-400 mb-6">Tu sistema de finanzas personal</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {mensaje && (
            <p className="text-sm text-yellow-400">{mensaje}</p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading ? 'Cargando...' : esRegistro ? 'Registrarse' : 'Entrar'}
          </button>

          <button
            onClick={() => setEsRegistro(!esRegistro)}
            className="w-full text-gray-400 hover:text-white text-sm transition"
          >
            {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  )
}
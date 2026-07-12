'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verificarUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        window.location.href = '/dashboard'
      } else {
        setUsuario(null)
        setLoading(false)
      }
    }
    verificarUser()
  }, [])

  if (loading) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-900 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 backdrop-blur-md bg-gray-950/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">
            💰 <span className="text-orange-500">Finanzas</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/auth?modo=login'}
              className="px-6 py-2 rounded-xl border border-gray-700 hover:border-orange-500 transition"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => window.location.href = '/auth?modo=signup'}
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 transition font-semibold"
            >
              Registrarse
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Controla tus finanzas con <span className="text-orange-500">Inteligencia Artificial</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Importa tus cartolas bancarias, clasifica gastos automáticamente y obtén recomendaciones de ahorro impulsadas por IA.
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <button
              onClick={() => window.location.href = '/auth?modo=signup'}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-lg transition"
            >
              Empezar Gratis
            </button>
            <button
              onClick={() => window.location.href = '/auth?modo=login'}
              className="px-8 py-4 border border-orange-500 text-orange-500 hover:bg-orange-500/10 rounded-xl font-bold text-lg transition"
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 px-8 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">¿Por qué elegir Finanzas?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">📂</p>
              <h3 className="text-2xl font-bold mb-3">Importa Cartolas</h3>
              <p className="text-gray-300">Sube PDFs y Excel de tu banco. La IA lee automáticamente y clasifica cada transacción.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">🤖</p>
              <h3 className="text-2xl font-bold mb-3">IA Inteligente</h3>
              <p className="text-gray-300">Clasifica gastos automáticamente, detecta duplicados y genera recomendaciones de ahorro.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">📊</p>
              <h3 className="text-2xl font-bold mb-3">Reportes Detallados</h3>
              <p className="text-gray-300">Visualiza tus gastos con gráficos, presupuestos y análisis inteligentes mes a mes.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">⚠️</p>
              <h3 className="text-2xl font-bold mb-3">Alertas Inteligentes</h3>
              <p className="text-gray-300">Recibe notificaciones de gastos inusuales, presupuestos superados y transacciones duplicadas.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">🔄</p>
              <h3 className="text-2xl font-bold mb-3">Conciliación Automática</h3>
              <p className="text-gray-300">Compara automáticamente tu cartola con tus registros para detectar diferencias.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-orange-500 transition">
              <p className="text-4xl mb-4">💡</p>
              <h3 className="text-2xl font-bold mb-3">Recomendaciones</h3>
              <p className="text-gray-300">Obtén sugerencias personalizadas para ahorrar dinero y mejorar tus finanzas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="py-20 px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-orange-600 to-orange-500 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">¿Listo para controlar tus finanzas?</h2>
          <p className="text-lg text-orange-100 mb-8">Comienza gratis hoy mismo. Sin tarjeta de crédito requerida.</p>
          <button
            onClick={() => window.location.href = '/auth?modo=signup'}
            className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition"
          >
            Crear Cuenta Ahora
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8 px-8 text-center text-gray-400">
        <p>&copy; 2024 Finanzas. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
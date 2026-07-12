'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Inteligencia() {
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [duplicados, setDuplicados] = useState([])
  const [inusuales, setInusuales] = useState([])
  const [recomendaciones, setRecomendaciones] = useState([])

  const mesActual = new Date().getMonth() + 1
  const añoActual = new Date().getFullYear()

  useEffect(() => {
    cargarInteligencia()
  }, [])

  const cargarInteligencia = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    setLoading(true)

    try {
      // Cargar resumen mensual
      const resRes = await fetch('/api/resumen-mensual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, mes: mesActual, año: añoActual })
      })
      const resData = await resRes.json()
      if (resData.ok) setResumen(resData)

      // Cargar duplicados
      const dupRes = await fetch('/api/detectar-duplicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      })
      const dupData = await dupRes.json()
      if (dupData.ok) setDuplicados(dupData.duplicados)

      // Cargar inusuales
      const inuRes = await fetch('/api/detectar-inusuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, mes: mesActual, año: añoActual })
      })
      const inuData = await inuRes.json()
      if (inuData.ok) setInusuales(inuData.inusuales)

      // Cargar recomendaciones
      const recRes = await fetch('/api/recomendaciones-ahorro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, mes: mesActual, año: añoActual })
      })
      const recData = await recRes.json()
      if (recData.ok) setRecomendaciones({
        lista: recData.recomendaciones,
        ahorro_potencial: recData.ahorro_potencial,
        mensaje: recData.mensaje
      })
    } catch (e) {
      console.error('Error cargando:', e)
    }

    setLoading(false)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(monto)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🧠 Inteligencia Financiera</h1>
            <p className="text-gray-400 mt-1">Análisis avanzado con IA</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            ← Volver
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-900 p-2 rounded-xl w-fit">
          {['resumen', 'duplicados', 'inusuales', 'recomendaciones'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg transition capitalize font-semibold ${
                tab === t
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'resumen' ? '📊 Resumen' : t === 'duplicados' ? '🔄 Duplicados' : t === 'inusuales' ? '⚠️ Inusuales' : '💡 Recomendaciones'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">🤖 Analizando tus finanzas con IA...</p>
          </div>
        ) : (

          <>
            {/* RESUMEN MENSUAL */}
            {tab === 'resumen' && resumen && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-8 text-white">
                  <h2 className="text-3xl font-bold mb-2">{resumen.titulo}</h2>
                  <p className="text-orange-100">{resumen.mes}</p>
                </div>

                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold mb-4">📈 Análisis</h3>
                  <p className="text-gray-300 leading-relaxed">{resumen.analisis}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4 text-green-400">✅ Puntos Positivos</h3>
                    <ul className="space-y-2">
                      {resumen.positivos?.map((p, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4 text-yellow-400">📌 Áreas de Mejora</h3>
                    <ul className="space-y-2">
                      {resumen.mejoras?.map((m, i) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-yellow-400 mt-1">→</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-2 text-blue-400">🎯 Meta para el Próximo Mes</h3>
                  <p className="text-gray-300 text-lg">{resumen.meta_proxima}</p>
                </div>

                <div className="bg-purple-900/20 border border-purple-700 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-2 text-purple-400">💪 Motivación</h3>
                  <p className="text-gray-300 italic">{resumen.motivacion}</p>
                </div>
              </div>
            )}

            {/* DUPLICADOS */}
            {tab === 'duplicados' && (
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-6">🔍 Transacciones Duplicadas</h2>
                  
                  {duplicados.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-lg">✅ No se encontraron transacciones duplicadas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {duplicados.map((d, i) => (
                        <div key={i} className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4">
                          <p className="font-semibold text-yellow-400 mb-3">Posible duplicado #{i + 1}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-400 text-sm">Transacción 1</p>
                              <p className="text-white font-semibold">{d.descripcion_1}</p>
                              <p className="text-gray-400 text-sm">{d.fecha_1} - {formatMonto(d.monto)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Transacción 2</p>
                              <p className="text-white font-semibold">{d.descripcion_2}</p>
                              <p className="text-gray-400 text-sm">{d.fecha_2} - {formatMonto(d.monto)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INUSUALES */}
            {tab === 'inusuales' && (
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <h2 className="text-2xl font-bold mb-4">⚠️ Gastos Inusuales</h2>
                  
                  {inusuales.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-lg">✅ Todos tus gastos están dentro de lo normal</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inusuales.map((g, i) => (
                        <div key={i} className="bg-red-900/20 border border-red-700 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-lg text-red-400">{g.categoria}</h3>
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                              +{g.diferencia_porcentaje}%
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-gray-400 text-sm">Gasto actual</p>
                              <p className="font-bold text-lg">{formatMonto(g.gasto_actual)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Promedio histórico</p>
                              <p className="font-bold text-lg">{formatMonto(g.promedio_historico)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Diferencia</p>
                              <p className="font-bold text-lg text-red-400">{formatMonto(g.gasto_actual - g.promedio_historico)}</p>
                            </div>
                          </div>
                          <p className="text-gray-300">{g.razon}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECOMENDACIONES */}
            {tab === 'recomendaciones' && recomendaciones.lista && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-2">💰 Ahorro Potencial</h2>
                  <p className="text-4xl font-bold">{formatMonto(recomendaciones.ahorro_potencial)}</p>
                  <p className="text-green-100 mt-2">{recomendaciones.mensaje}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {recomendaciones.lista?.map((r, i) => (
                    <div key={i} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-orange-600 transition">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg">{r.categoria}</h3>
                        <span className="bg-green-600/30 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                          {formatMonto(r.ahorro_potencial)}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-1">Problema:</p>
                        <p className="text-gray-200">{r.problema}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-sm mb-1">Acción:</p>
                        <p className="text-orange-400 font-semibold">{r.accion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
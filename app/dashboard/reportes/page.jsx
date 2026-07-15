'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Reportes() {
  const [gastosCategoria, setGastosCategoria] = useState([])
  const [gastosMes, setGastosMes] = useState([])
  const [vistaActual, setVistaActual] = useState('personal')
  const [loading, setLoading] = useState(true)

  const mesActual = new Date().getMonth() + 1
  const añoActual = new Date().getFullYear()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const { data: gastos } = await supabase.rpc('get_gastos_por_categoria', {
      p_user_id: user.id,
      p_mes: mesActual,
      p_año: añoActual
    })

    const meses = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(añoActual, mesActual - 1 - i, 1)
      const mes = fecha.getMonth() + 1
      const año = fecha.getFullYear()
      const nombre = fecha.toLocaleString('es-CL', { month: 'short' })

      const { data: gastosMesData } = await supabase.rpc('get_kpis', {
        p_user_id: user.id,
        p_mes: mes,
        p_año: año
      })

      meses.push({
        mes: nombre,
        gastos: gastosMesData?.total_gastos || 0,
        ingresos: gastosMesData?.total_ingresos || 0
      })
    }

    setGastosCategoria(gastos || [])
    setGastosMes(meses)
    setLoading(false)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(monto)
  }

  const datosTorta = gastosCategoria
    .filter(g => g.total_gastado > 0 && g.tipo === vistaActual)
    .slice(0, 8)
    .map(g => ({
      name: g.nombre,
      value: g.total_gastado,
      color: g.color || '#3b82f6'
    }))

  const totalGastos = datosTorta.reduce((a, b) => a + b.value, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">📈 Reportes</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Análisis de tus finanzas</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition self-start sm:self-auto text-sm sm:text-base"
          >
            ← Volver
          </button>
        </div>

        {/* Selector personal / empresarial */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setVistaActual('personal')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap text-sm sm:text-base ${vistaActual === 'personal' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            👤 Personal
          </button>
          <button
            onClick={() => setVistaActual('empresarial')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap text-sm sm:text-base ${vistaActual === 'empresarial' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            🏢 Empresarial
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="space-y-6">

            {/* Gráfico torta - gastos por categoría */}
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-6">Gastos por categoría este mes</h2>
              {datosTorta.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay gastos este mes</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={datosTorta}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {datosTorta.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMonto(value)}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
                        labelStyle={{ color: 'white' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Leyenda */}
                  <div className="space-y-2 w-full md:min-w-48 md:w-auto">
                    {datosTorta.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-300 truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold flex-shrink-0">
                          {Math.round((item.value / totalGastos) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico barras - últimos 6 meses */}
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-6">Últimos 6 meses</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gastosMes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} width={45} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => formatMonto(value)}
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top categorías */}
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Top categorías del mes</h2>
              <div className="space-y-3">
                {gastosCategoria
                  .filter(g => g.total_gastado > 0 && g.tipo === vistaActual)
                  .slice(0, 5)
                  .map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-400 text-sm w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-xl flex-shrink-0">{g.icono}</span>
                        <span className="truncate">{g.nombre}</span>
                      </div>
                      <span className="font-semibold text-red-400 text-sm sm:text-base whitespace-nowrap flex-shrink-0">{formatMonto(g.total_gastado)}</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
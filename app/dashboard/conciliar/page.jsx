'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Conciliar() {
  const [cuentas, setCuentas] = useState([])
  const [archivo, setArchivo] = useState(null)
  const [cuentaId, setCuentaId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    cargarCuentas()
  }, [])

  const cargarCuentas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'
    const { data } = await supabase.from('cuentas').select('*')
    setCuentas(data || [])
  }

  const conciliar = async () => {
    if (!archivo || !cuentaId) return
    setLoading(true)
    setResultado(null)

    const { data: { user } } = await supabase.auth.getUser()

    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('user_id', user.id)
    formData.append('cuenta_id', cuentaId)
    if (password) formData.append('password', password)

    try {
      const response = await fetch('/api/conciliar', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      setResultado(data)
    } catch (e) {
      setResultado({ ok: false, error: e.message })
    }

    setLoading(false)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto)
  }

  const esPDF = archivo?.name.toLowerCase().endsWith('.pdf')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🔍 Conciliación</h1>
            <p className="text-gray-400 mt-1">Compara tu cartola con los registros del sistema</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            ← Volver
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-6 mb-6">

          <div>
            <label className="text-gray-400 text-sm mb-2 block">¿Qué cuenta quieres conciliar?</label>
            <select
              value={cuentaId}
              onChange={e => setCuentaId(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una cuenta</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — {c.banco}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Cartola del banco (PDF o Excel)</label>
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => document.getElementById('fileInput').click()}
            >
              {archivo ? (
                <div>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-white font-medium">{archivo.name}</p>
                  <p className="text-gray-400 text-sm mt-1">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-gray-400">Click para seleccionar archivo</p>
                  <p className="text-gray-600 text-sm mt-1">PDF o Excel (.xlsx, .xls)</p>
                </div>
              )}
            </div>
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.xlsx,.xls"
              className="hidden"
              onChange={e => {
                setArchivo(e.target.files[0])
                setPassword('')
                setResultado(null)
              }}
            />
          </div>

          {esPDF && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Contraseña del PDF <span className="text-gray-600">(si está protegido)</span>
              </label>
              <input
                type="password"
                placeholder="Ej: últimos 4 dígitos de tu RUT"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={conciliar}
            disabled={loading || !archivo || !cuentaId}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl transition font-semibold"
          >
            {loading ? '🤖 Analizando...' : '🔍 Conciliar'}
          </button>
        </div>

        {/* Resultado */}
        {resultado && resultado.ok && (
          <div className="space-y-4">

            {/* Resumen */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Resumen</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">En cartola</p>
                  <p className="text-2xl font-bold mt-1">{resultado.total_cartola}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">En sistema</p>
                  <p className="text-2xl font-bold mt-1">{resultado.total_sistema}</p>
                </div>
                <div className="bg-green-900/30 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Coinciden</p>
                  <p className="text-2xl font-bold mt-1 text-green-400">{resultado.coincidencias}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${resultado.diferencias?.length > 0 ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
                  <p className="text-gray-400 text-sm">Diferencias</p>
                  <p className={`text-2xl font-bold mt-1 ${resultado.diferencias?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {resultado.diferencias?.length || 0}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Período: {resultado.periodo?.desde} al {resultado.periodo?.hasta}
              </p>
            </div>

            {/* Diferencias */}
            {resultado.diferencias?.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4 text-red-400">⚠️ Diferencias encontradas</h2>
                <div className="space-y-3">
                  {resultado.diferencias.map((d, i) => (
                    <div key={i} className={`rounded-xl p-4 ${d.problema === 'en_cartola_no_en_sistema' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-red-900/20 border border-red-800'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{d.descripcion}</p>
                          <p className="text-gray-400 text-sm mt-1">{d.fecha}</p>
                          <p className={`text-xs mt-1 ${d.problema === 'en_cartola_no_en_sistema' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {d.problema === 'en_cartola_no_en_sistema'
                              ? '📄 Está en la cartola pero no en el sistema'
                              : '💻 Está en el sistema pero no en la cartola'}
                          </p>
                        </div>
                        <p className={`font-bold ${d.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                          {formatMonto(d.monto)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.diferencias?.length === 0 && (
              <div className="bg-green-900/20 border border-green-700 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-green-400 font-semibold text-xl">Todo concilia perfectamente</p>
                <p className="text-gray-400 mt-2">No hay diferencias entre la cartola y el sistema</p>
              </div>
            )}

          </div>
        )}

        {resultado && !resultado.ok && (
          <div className="bg-red-900/30 border border-red-700 rounded-2xl p-6">
            <p className="text-red-400 font-semibold">❌ Error al conciliar</p>
            <p className="text-gray-400 text-sm mt-1">{resultado.mensaje || resultado.error}</p>
          </div>
        )}

      </div>
    </div>
  )
}
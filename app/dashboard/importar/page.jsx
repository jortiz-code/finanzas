'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Importar() {
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

  const importar = async () => {
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
      const response = await fetch('/api/importar-cartola', {
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

  const esPDF = archivo?.name.toLowerCase().endsWith('.pdf')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">📂 Importar Cartola</h1>
            <p className="text-gray-400 mt-1">Sube tu cartola en PDF o Excel</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            ← Volver
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-6">

          {/* Selector de cuenta */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">¿De qué cuenta es la cartola?</label>
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

          {/* Upload archivo */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Archivo de cartola (PDF o Excel)</label>
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => document.getElementById('fileInput').click()}
            >
              {archivo ? (
                <div>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-white font-medium">{archivo.name}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
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

          {/* Contraseña PDF */}
          {esPDF && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Contraseña del PDF <span className="text-gray-600">(si está protegido)</span>
              </label>
              <input
                type="password"
                placeholder="Ej: tu RUT sin puntos ni guión"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-gray-600 text-xs mt-1">
                Normalmente es tu RUT sin puntos ni dígito verificador
              </p>
            </div>
          )}

          {/* Botón importar */}
          <button
            onClick={importar}
            disabled={loading || !archivo || !cuentaId}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl transition font-semibold"
          >
            {loading ? '🤖 Procesando con IA...' : '📂 Importar cartola'}
          </button>

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-xl p-4 ${resultado.ok ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
              {resultado.ok ? (
                <div>
                  <p className="text-green-400 font-semibold text-lg">✅ Importación exitosa</p>
                  {resultado.banco && (
                    <p className="text-gray-400 text-sm mt-1">Banco: {resultado.banco}</p>
                  )}
                  <div className="mt-3 space-y-1 text-sm">
                    <p>📥 Importadas: <span className="text-white font-semibold">{resultado.importadas}</span></p>
                    <p>⚠️ Duplicadas omitidas: <span className="text-white font-semibold">{resultado.duplicadas}</span></p>
                    <p>📊 Total en cartola: <span className="text-white font-semibold">{resultado.total}</span></p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-400 font-semibold">❌ Error al importar</p>
                  <p className="text-gray-400 text-sm mt-1">{resultado.mensaje || resultado.error}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Info */}
        <div className="bg-gray-900 rounded-2xl p-6 mt-6">
          <h2 className="font-semibold mb-3">ℹ️ ¿Cómo funciona?</h2>
          <div className="space-y-2 text-gray-400 text-sm">
            <p>1. Descarga tu cartola desde el sitio web de tu banco</p>
            <p>2. Selecciona la cuenta correspondiente</p>
            <p>3. Sube el archivo PDF o Excel</p>
            <p>4. Si el PDF tiene contraseña, ingrésala</p>
            <p>5. La IA lee y clasifica todas las transacciones automáticamente</p>
            <p>6. Las transacciones duplicadas se omiten automáticamente</p>
          </div>
        </div>

      </div>
    </div>
  )
}
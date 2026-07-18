'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Cuentas() {
  const [cuentas, setCuentas] = useState([])
  const [bancos, setBancos] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usuario, setUsuario] = useState(null)
  const [activando, setActivando] = useState(null) // id de cuenta en proceso, o 'todas'
  const [resultados, setResultados] = useState({}) // { [cuentaId o 'todas']: mensaje }
  const [form, setForm] = useState({
    nombre: '',
    banco: '',
    tipo: 'corriente'
  })

  useEffect(() => {
    cargarCuentas()
    cargarBancos()
  }, [])

  const cargarBancos = async () => {
    const { data } = await supabase.from('bancos').select('*').order('nombre')
    setBancos(data || [])
  }

  const cargarCuentas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'
    setUsuario(user)

    const { data } = await supabase
      .from('cuentas')
      .select('*')
      .order('created_at', { ascending: false })

    setCuentas(data || [])
  }

  const agregarCuenta = async () => {
    if (!form.nombre || !form.banco) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const bancoSeleccionado = bancos.find(b => b.nombre === form.banco)
    const emailsArray = bancoSeleccionado?.emails ? JSON.parse(bancoSeleccionado.emails) : []

    const { error } = await supabase.from('cuentas').insert({
      nombre: form.nombre,
      banco: form.banco,
      tipo: form.tipo,
      emails: emailsArray,
      user_id: user.id,
      activa: true
    })

    if (!error) {
      setForm({ nombre: '', banco: '', tipo: 'corriente' })
      setMostrarForm(false)
      cargarCuentas()
    }
    setLoading(false)
  }

  const eliminarCuenta = async (id) => {
    await supabase.from('cuentas').delete().eq('id', id)
    cargarCuentas()
  }

  // Sincroniza con ventana amplia (30 días) una cuenta específica
  const activarCuenta = async (cuenta) => {
    if (!usuario) return
    setActivando(cuenta.id)
    setResultados(prev => ({ ...prev, [cuenta.id]: null }))

    try {
      const response = await fetch('/api/sincronizar-correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: usuario.id, cuenta_id: cuenta.id, ventana: '30d' })
      })
      const data = await response.json()
      setResultados(prev => ({
        ...prev,
        [cuenta.id]: data.mensaje || (data.ok ? 'Listo' : 'Error al activar')
      }))
    } catch (e) {
      setResultados(prev => ({ ...prev, [cuenta.id]: 'Error al activar' }))
    }

    setActivando(null)
  }

  // Sincroniza con ventana amplia (30 días) todas las cuentas
  const activarTodas = async () => {
    if (!usuario) return
    setActivando('todas')
    setResultados(prev => ({ ...prev, todas: null }))

    try {
      const response = await fetch('/api/sincronizar-correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: usuario.id, ventana: '30d' })
      })
      const data = await response.json()
      setResultados(prev => ({
        ...prev,
        todas: data.mensaje || (data.ok ? 'Listo' : 'Error al activar')
      }))
    } catch (e) {
      setResultados(prev => ({ ...prev, todas: 'Error al activar' }))
    }

    setActivando(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Mis Cuentas</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Administra tus bancos y tarjetas</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition text-sm sm:text-base"
            >
              ← Volver
            </button>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition text-sm sm:text-base whitespace-nowrap"
            >
              + Agregar cuenta
            </button>
          </div>
        </div>

        {/* Activar todas */}
        {cuentas.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="font-semibold text-purple-300">⚡ Activar todas las cuentas</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Busca transacciones del último mes en todas tus cuentas de una vez
                </p>
              </div>
              <button
                onClick={activarTodas}
                disabled={activando === 'todas'}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-xl transition text-sm sm:text-base whitespace-nowrap"
              >
                {activando === 'todas' ? '🔄 Activando...' : '⚡ Activar todas'}
              </button>
            </div>
            {resultados.todas && (
              <p className="text-purple-300 text-sm mt-3">{resultados.todas}</p>
            )}
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Nueva cuenta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Nombre de la cuenta</label>
                <input
                  placeholder="Ej: Cuenta corriente BCI"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Banco</label>
                <select
                  value={form.banco}
                  onChange={e => setForm({...form, banco: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="">Selecciona un banco</option>
                  {bancos.map(b => (
                    <option key={b.id} value={b.nombre}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Tipo de cuenta</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="corriente">Cuenta corriente</option>
                  <option value="vista">Cuenta vista</option>
                  <option value="credito">Tarjeta de crédito</option>
                  <option value="debito">Tarjeta de débito</option>
                  <option value="prepago">Tarjeta prepago</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={agregarCuenta}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl transition"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de cuentas */}
        {cuentas.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 sm:p-12 text-center">
            <p className="text-4xl mb-4">🏦</p>
            <p className="text-gray-400">No tienes cuentas agregadas aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cuentas.map(cuenta => (
              <div key={cuenta.id} className="bg-gray-900 rounded-2xl p-5 sm:p-6">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{cuenta.nombre}</h3>
                    <p className="text-blue-400 mt-1 truncate">{cuenta.banco}</p>
                    <p className="text-gray-400 text-sm mt-1 capitalize">{cuenta.tipo}</p>
                  </div>
                  <button
                    onClick={() => eliminarCuenta(cuenta.id)}
                    className="text-gray-600 hover:text-red-400 transition text-xl flex-shrink-0"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => activarCuenta(cuenta)}
                    disabled={activando === cuenta.id}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-xl transition text-sm"
                  >
                    {activando === cuenta.id ? '🔄 Activando...' : '⚡ Activar (buscar último mes)'}
                  </button>
                  {resultados[cuenta.id] && (
                    <p className="text-purple-300 text-xs mt-2">{resultados[cuenta.id]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

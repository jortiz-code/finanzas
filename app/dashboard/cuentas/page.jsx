'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const BANCOS_CHILE = [
  'Banco de Chile', 'Santander', 'BCI', 'Banco Estado',
  'Scotiabank', 'Itaú', 'Falabella', 'Ripley',
  'Mach', 'Tenpo', 'Mercado Pago', 'Otro'
]

export default function Cuentas() {
  const [cuentas, setCuentas] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    banco: '',
    tipo: 'corriente',
    email_origen: ''
  })

  useEffect(() => {
    cargarCuentas()
  }, [])

  const cargarCuentas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

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

    const { error } = await supabase.from('cuentas').insert({
      ...form,
      user_id: user.id
    })

    if (!error) {
      setForm({ nombre: '', banco: '', tipo: 'corriente', email_origen: '' })
      setMostrarForm(false)
      cargarCuentas()
    }
    setLoading(false)
  }

  const eliminarCuenta = async (id) => {
    await supabase.from('cuentas').delete().eq('id', id)
    cargarCuentas()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mis Cuentas</h1>
            <p className="text-gray-400 mt-1">Administra tus bancos y tarjetas</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
            >
              ← Volver
            </button>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition"
            >
              + Agregar cuenta
            </button>
          </div>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Nueva cuenta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Nombre de la cuenta</label>
                <input
                  placeholder="Ej: Cuenta corriente BCI"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Banco</label>
                <select
                  value={form.banco}
                  onChange={e => setForm({...form, banco: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un banco</option>
                  {BANCOS_CHILE.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Tipo de cuenta</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="corriente">Cuenta corriente</option>
                  <option value="vista">Cuenta vista</option>
                  <option value="credito">Tarjeta de crédito</option>
                  <option value="debito">Tarjeta de débito</option>
                  <option value="prepago">Tarjeta prepago</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Correo del banco <span className="text-gray-600">(opcional)</span>
                </label>
                <input
                  placeholder="Ej: notificaciones@bci.cl"
                  value={form.email_origen}
                  onChange={e => setForm({...form, email_origen: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
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
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🏦</p>
            <p className="text-gray-400">No tienes cuentas agregadas aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cuentas.map(cuenta => (
              <div key={cuenta.id} className="bg-gray-900 rounded-2xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{cuenta.nombre}</h3>
                    <p className="text-blue-400 mt-1">{cuenta.banco}</p>
                    <p className="text-gray-400 text-sm mt-1 capitalize">{cuenta.tipo}</p>
                    {cuenta.email_origen && (
                      <p className="text-gray-600 text-xs mt-2">{cuenta.email_origen}</p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarCuenta(cuenta.id)}
                    className="text-gray-600 hover:text-red-400 transition text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
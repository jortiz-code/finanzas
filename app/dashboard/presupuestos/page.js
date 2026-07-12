'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Presupuestos() {
  const [presupuestos, setPresupuestos] = useState([])
  const [gastosCategoria, setGastosCategoria] = useState([])
  const [categorias, setCategorias] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [vistaActual, setVistaActual] = useState('personal')
  const [form, setForm] = useState({
    categoria_id: '',
    monto: '',
    tipo: 'personal'
  })

  const mesActual = new Date().getMonth() + 1
  const añoActual = new Date().getFullYear()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const [{ data: pres }, { data: cats }, { data: gastos }] = await Promise.all([
      supabase.from('presupuestos')
        .select('*, categorias(nombre, color, icono, tipo)')
        .eq('mes', mesActual)
        .eq('año', añoActual)
        .order('created_at'),
      supabase.from('categorias').select('*').order('nombre'),
      supabase.rpc('get_gastos_por_categoria', {
        p_user_id: (await supabase.auth.getUser()).data.user.id,
        p_mes: mesActual,
        p_año: añoActual
      })
    ])

    setPresupuestos(pres || [])
    setCategorias(cats || [])
    setGastosCategoria(gastos || [])
    setLoading(false)
  }

  const agregarPresupuesto = async () => {
    if (!form.categoria_id || !form.monto) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('presupuestos').upsert({
      user_id: user.id,
      categoria_id: form.categoria_id,
      monto: parseFloat(form.monto),
      mes: mesActual,
      año: añoActual,
      tipo: form.tipo
    }, { onConflict: 'user_id,categoria_id,mes,año' })

    if (!error) {
      setForm({ categoria_id: '', monto: '', tipo: 'personal' })
      setMostrarForm(false)
      cargarDatos()
    }
  }

  const eliminarPresupuesto = async (id) => {
    await supabase.from('presupuestos').delete().eq('id', id)
    cargarDatos()
  }

  const generarConIA = async () => {
    setGenerando(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const response = await fetch('/api/generar-presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      })
      const data = await response.json()
      if (data.ok) cargarDatos()
    } catch (e) {
      console.error('Error generando presupuestos:', e)
    }
    setGenerando(false)
  }

  const verificarPresupuestos = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const response = await fetch('/api/verificar-presupuestos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    })

    const data = await response.json()

    if (data.alertas?.length > 0) {
      const mensajes = data.alertas.map(a =>
        a.tipo === 'superado'
          ? `⚠️ ${a.categoria}: superaste el presupuesto (${a.porcentaje}%)`
          : `🟡 ${a.categoria}: vas en el ${a.porcentaje}% del presupuesto`
      ).join('\n')
      alert(mensajes)
    } else {
      alert('✅ Todos los presupuestos están bajo control')
    }
  }

  const getGastado = (categoria_id) => {
    const gasto = gastosCategoria.find(g => g.categoria_id === categoria_id)
    return gasto?.total_gastado || 0
  }

  const getPorcentaje = (gastado, presupuesto) => {
    if (!presupuesto) return 0
    return Math.min((gastado / presupuesto) * 100, 100)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto)
  }

  const presupuestosFiltrados = presupuestos.filter(
    p => p.categorias?.tipo === vistaActual
  )

  const mesNombre = new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🎯 Presupuestos</h1>
            <p className="text-gray-400 mt-1 capitalize">{mesNombre}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
            >
              ← Volver
            </button>
            <button
              onClick={verificarPresupuestos}
              className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-xl transition"
            >
              🔔 Verificar alertas
            </button>
            <button
              onClick={generarConIA}
              disabled={generando}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              {generando ? '🤖 Generando...' : '🤖 Sugerir con IA'}
            </button>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Selector personal / empresarial */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setVistaActual('personal')}
            className={`px-4 py-2 rounded-xl transition ${vistaActual === 'personal' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            👤 Personal
          </button>
          <button
            onClick={() => setVistaActual('empresarial')}
            className={`px-4 py-2 rounded-xl transition ${vistaActual === 'empresarial' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            🏢 Empresarial
          </button>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Nuevo presupuesto</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="personal">Personal</option>
                  <option value="empresarial">Empresarial</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Categoría</label>
                <select
                  value={form.categoria_id}
                  onChange={e => setForm({...form, categoria_id: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.filter(c => c.tipo === form.tipo).map(c => (
                    <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Monto (CLP)</label>
                <input
                  type="number"
                  placeholder="Ej: 200000"
                  value={form.monto}
                  onChange={e => setForm({...form, monto: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={agregarPresupuesto}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl transition"
              >
                Guardar
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

        {/* Lista de presupuestos */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : presupuestosFiltrados.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-white font-semibold text-xl">Sin presupuestos</p>
            <p className="text-gray-400 mt-2">Agrega uno manualmente o usa la IA para sugerirlos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {presupuestosFiltrados.map(p => {
              const gastado = getGastado(p.categoria_id)
              const porcentaje = getPorcentaje(gastado, p.monto)
              const sobrepasado = gastado > p.monto

              return (
                <div key={p.id} className="bg-gray-900 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.categorias?.icono}</span>
                      <div>
                        <p className="font-semibold">{p.categorias?.nombre}</p>
                        <p className="text-gray-400 text-sm">
                          {formatMonto(gastado)} de {formatMonto(p.monto)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold ${sobrepasado ? 'text-red-400' : porcentaje > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {sobrepasado ? '⚠️ ' : ''}{Math.round(porcentaje)}%
                      </p>
                      <button
                        onClick={() => eliminarPresupuesto(p.id)}
                        className="text-gray-600 hover:text-red-400 transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${sobrepasado ? 'bg-red-500' : porcentaje > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>

                  {sobrepasado && (
                    <p className="text-red-400 text-sm mt-2">
                      ⚠️ Sobrepasaste el presupuesto por {formatMonto(gastado - p.monto)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
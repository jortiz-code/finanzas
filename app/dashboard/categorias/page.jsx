'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIAS_DEFAULT = [
  { nombre: 'Alimentación', tipo: 'personal', color: '#f97316', icono: '🍔' },
  { nombre: 'Transporte', tipo: 'personal', color: '#3b82f6', icono: '🚗' },
  { nombre: 'Supermercado', tipo: 'personal', color: '#22c55e', icono: '🛒' },
  { nombre: 'Salud', tipo: 'personal', color: '#ec4899', icono: '💊' },
  { nombre: 'Entretenimiento', tipo: 'personal', color: '#a855f7', icono: '🎬' },
  { nombre: 'Ropa', tipo: 'personal', color: '#eab308', icono: '👕' },
  { nombre: 'Educación', tipo: 'personal', color: '#06b6d4', icono: '📚' },
  { nombre: 'Hogar', tipo: 'personal', color: '#84cc16', icono: '🏠' },
  { nombre: 'Servicios', tipo: 'personal', color: '#64748b', icono: '💡' },
  { nombre: 'Otros Personal', tipo: 'personal', color: '#94a3b8', icono: '📦' },
  { nombre: 'Proveedores', tipo: 'empresarial', color: '#f97316', icono: '🏭' },
  { nombre: 'Marketing', tipo: 'empresarial', color: '#3b82f6', icono: '📣' },
  { nombre: 'Software', tipo: 'empresarial', color: '#a855f7', icono: '💻' },
  { nombre: 'Oficina', tipo: 'empresarial', color: '#22c55e', icono: '🏢' },
  { nombre: 'Sueldos', tipo: 'empresarial', color: '#ec4899', icono: '👥' },
  { nombre: 'Otros Empresarial', tipo: 'empresarial', color: '#94a3b8', icono: '📦' },
]

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoDefaults, setCargandoDefaults] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'personal',
    color: '#3b82f6',
    icono: '📦'
  })

  useEffect(() => {
    cargarCategorias()
  }, [])

  const cargarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('tipo', { ascending: true })

    setCategorias(data || [])
  }

  const cargarDefaults = async () => {
    setCargandoDefaults(true)
    const { data: { user } } = await supabase.auth.getUser()

    const inserts = CATEGORIAS_DEFAULT.map(c => ({ ...c, user_id: user.id }))
    await supabase.from('categorias').insert(inserts)
    cargarCategorias()
    setCargandoDefaults(false)
  }

  const agregarCategoria = async () => {
    if (!form.nombre) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('categorias').insert({ ...form, user_id: user.id })
    setForm({ nombre: '', tipo: 'personal', color: '#3b82f6', icono: '📦' })
    setMostrarForm(false)
    cargarCategorias()
    setLoading(false)
  }

  const eliminarCategoria = async (id) => {
    await supabase.from('categorias').delete().eq('id', id)
    cargarCategorias()
  }

  const personales = categorias.filter(c => c.tipo === 'personal')
  const empresariales = categorias.filter(c => c.tipo === 'empresarial')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Categorías</h1>
            <p className="text-gray-400 mt-1">Organiza tus gastos personales y empresariales</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
            >
              ← Volver
            </button>
            {categorias.length === 0 && (
              <button
                onClick={cargarDefaults}
                disabled={cargandoDefaults}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl transition"
              >
                {cargandoDefaults ? 'Cargando...' : '✨ Cargar categorías base'}
              </button>
            )}
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition"
            >
              + Nueva
            </button>
          </div>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Nueva categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                <label className="text-gray-400 text-sm mb-1 block">Ícono (emoji)</label>
                <input
                  placeholder="Ej: 🏋️"
                  value={form.icono}
                  onChange={e => setForm({...form, icono: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({...form, color: e.target.value})}
                  className="w-full bg-gray-800 rounded-xl px-4 py-2 outline-none h-12"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={agregarCategoria}
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

        {/* Categorías personales */}
        {personales.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">👤 Personal</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {personales.map(cat => (
                <div
                  key={cat.id}
                  className="bg-gray-900 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icono}</span>
                    <div>
                      <p className="font-medium text-sm">{cat.nombre}</p>
                      <div
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarCategoria(cat.id)}
                    className="text-gray-600 hover:text-red-400 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorías empresariales */}
        {empresariales.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">🏢 Empresarial</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {empresariales.map(cat => (
                <div
                  key={cat.id}
                  className="bg-gray-900 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icono}</span>
                    <div>
                      <p className="font-medium text-sm">{cat.nombre}</p>
                      <div
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarCategoria(cat.id)}
                    className="text-gray-600 hover:text-red-400 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {categorias.length === 0 && (
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🏷️</p>
            <p className="text-gray-400 mb-4">No tienes categorías aún</p>
            <p className="text-gray-600 text-sm">Carga las categorías base o crea las tuyas</p>
          </div>
        )}

      </div>
    </div>
  )
}
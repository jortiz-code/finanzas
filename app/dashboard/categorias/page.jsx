'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIAS_DEFAULT = [
  { nombre: 'Alimentación', tipo: 'personal', color: '#FF2E9A', icono: '🍔' },
  { nombre: 'Transporte', tipo: 'personal', color: '#00E5FF', icono: '🚗' },
  { nombre: 'Supermercado', tipo: 'personal', color: '#7B61FF', icono: '🛒' },
  { nombre: 'Salud', tipo: 'personal', color: '#FF2E9A', icono: '💊' },
  { nombre: 'Entretenimiento', tipo: 'personal', color: '#7B61FF', icono: '🎬' },
  { nombre: 'Ropa', tipo: 'personal', color: '#FFB800', icono: '👕' },
  { nombre: 'Educación', tipo: 'personal', color: '#00E5FF', icono: '📚' },
  { nombre: 'Hogar', tipo: 'personal', color: '#7B61FF', icono: '🏠' },
  { nombre: 'Servicios', tipo: 'personal', color: '#5A6288', icono: '💡' },
  { nombre: 'Otros Personal', tipo: 'personal', color: '#5A6288', icono: '📦' },
  { nombre: 'Proveedores', tipo: 'empresarial', color: '#FF2E9A', icono: '🏭' },
  { nombre: 'Marketing', tipo: 'empresarial', color: '#00E5FF', icono: '📣' },
  { nombre: 'Software', tipo: 'empresarial', color: '#7B61FF', icono: '💻' },
  { nombre: 'Oficina', tipo: 'empresarial', color: '#FFB800', icono: '🏢' },
  { nombre: 'Sueldos', tipo: 'empresarial', color: '#FF2E9A', icono: '👥' },
  { nombre: 'Otros Empresarial', tipo: 'empresarial', color: '#5A6288', icono: '📦' },
]

function EstilosGlobales() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      .font-display { font-family: 'Chakra Petch', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .font-body { font-family: 'Inter', sans-serif; }
      .glow-cian { box-shadow: 0 0 0 1px rgba(0,229,255,0.25), 0 0 24px -4px rgba(0,229,255,0.35); }
      .glow-magenta { box-shadow: 0 0 0 1px rgba(255,46,154,0.25), 0 0 24px -4px rgba(255,46,154,0.35); }
      .glow-violeta { box-shadow: 0 0 0 1px rgba(123,97,255,0.25), 0 0 24px -4px rgba(123,97,255,0.35); }
      ::-webkit-scrollbar { height: 6px; width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #262E4A; border-radius: 999px; }
    `}</style>
  )
}

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoDefaults, setCargandoDefaults] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'personal',
    color: '#00E5FF',
    icono: '📦',
    categoria_padre_id: ''
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
      .order('nombre', { ascending: true })

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

  const abrirFormularioSubcategoria = (categoriaPadre) => {
    setForm({
      nombre: '',
      tipo: categoriaPadre.tipo,
      color: categoriaPadre.color,
      icono: '📦',
      categoria_padre_id: categoriaPadre.id
    })
    setMostrarForm(true)
  }

  const abrirFormularioNueva = () => {
    setForm({ nombre: '', tipo: 'personal', color: '#00E5FF', icono: '📦', categoria_padre_id: '' })
    setMostrarForm(true)
  }

  const agregarCategoria = async () => {
    if (!form.nombre) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('categorias').insert({
      nombre: form.nombre,
      tipo: form.tipo,
      color: form.color,
      icono: form.icono,
      categoria_padre_id: form.categoria_padre_id || null,
      user_id: user.id
    })
    setForm({ nombre: '', tipo: 'personal', color: '#00E5FF', icono: '📦', categoria_padre_id: '' })
    setMostrarForm(false)
    cargarCategorias()
    setLoading(false)
  }

  const eliminarCategoria = async (cat) => {
    const tieneSubs = categorias.some(c => c.categoria_padre_id === cat.id)
    const mensaje = tieneSubs
      ? `"${cat.nombre}" tiene subcategorías. Al eliminarla, también se eliminan todas sus subcategorías. ¿Continuar?`
      : `¿Eliminar "${cat.nombre}"?`

    if (!confirm(mensaje)) return
    await supabase.from('categorias').delete().eq('id', cat.id)
    cargarCategorias()
  }

  // Solo categorías principales (sin padre) para mostrar el listado y como opciones de "padre"
  const principales = categorias.filter(c => !c.categoria_padre_id)
  const subcategoriasDe = (categoriaId) => categorias.filter(c => c.categoria_padre_id === categoriaId)

  const personales = principales.filter(c => c.tipo === 'personal')
  const empresariales = principales.filter(c => c.tipo === 'empresarial')

  const opcionesPadre = principales.filter(c => c.tipo === form.tipo)

  const renderCategoria = (cat) => {
    const subs = subcategoriasDe(cat.id)
    return (
      <div key={cat.id} className="bg-[#131829] rounded-2xl border border-[#262E4A] overflow-hidden">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">{cat.icono}</span>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate font-display">{cat.nombre}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                {subs.length > 0 && (
                  <span className="text-[#5A6288] text-xs font-mono ml-1">{subs.length} sub</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => abrirFormularioSubcategoria(cat)}
              className="text-[#5A6288] hover:text-[#00E5FF] transition text-sm px-1.5"
              title="Agregar subcategoría"
            >
              +
            </button>
            <button
              onClick={() => eliminarCategoria(cat)}
              className="text-[#5A6288] hover:text-[#FF2E9A] transition text-lg px-1"
            >
              ×
            </button>
          </div>
        </div>

        {subs.length > 0 && (
          <div className="border-t border-[#262E4A] bg-[#0B0E1A]/50 divide-y divide-[#1B2138]">
            {subs.map(sub => (
              <div key={sub.id} className="pl-8 pr-4 py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#5A6288] text-xs">└</span>
                  <span className="text-base flex-shrink-0">{sub.icono}</span>
                  <p className="text-xs sm:text-sm truncate text-[#C7CCE3]">{sub.nombre}</p>
                </div>
                <button
                  onClick={() => eliminarCategoria(sub)}
                  className="text-[#5A6288] hover:text-[#FF2E9A] transition text-base flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white p-4 sm:p-6 lg:p-8 font-body">
      <EstilosGlobales />
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Categorías</h1>
            <p className="text-[#8891B0] mt-1 text-sm sm:text-base">Organiza tus gastos personales y empresariales</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-[#131829] hover:bg-[#1B2138] border border-[#262E4A] px-4 py-2 rounded-xl transition text-sm sm:text-base"
            >
              ← Volver
            </button>
            {categorias.length === 0 && (
              <button
                onClick={cargarDefaults}
                disabled={cargandoDefaults}
                className="bg-[#00E5FF] hover:bg-[#33ebff] text-[#0B0E1A] font-semibold px-4 py-2 rounded-xl transition glow-cian text-sm sm:text-base"
              >
                {cargandoDefaults ? 'Cargando...' : '✨ Cargar categorías base'}
              </button>
            )}
            <button
              onClick={abrirFormularioNueva}
              className="bg-[#7B61FF] hover:bg-[#8f79ff] px-4 py-2 rounded-xl transition glow-violeta text-sm sm:text-base"
            >
              + Nueva
            </button>
          </div>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-1 font-display">
              {form.categoria_padre_id ? 'Nueva subcategoría' : 'Nueva categoría'}
            </h2>
            {form.categoria_padre_id && (
              <p className="text-[#8891B0] text-sm mb-4">
                Subcategoría de: {principales.find(c => c.id === form.categoria_padre_id)?.icono} {principales.find(c => c.id === form.categoria_padre_id)?.nombre}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                />
              </div>

              {!form.categoria_padre_id && (
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({...form, tipo: e.target.value, categoria_padre_id: ''})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                  >
                    <option value="personal">Personal</option>
                    <option value="empresarial">Empresarial</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">
                  Categoría padre <span className="text-[#5A6288]">(opcional)</span>
                </label>
                <select
                  value={form.categoria_padre_id}
                  onChange={e => setForm({...form, categoria_padre_id: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                >
                  <option value="">Ninguna (es categoría principal)</option>
                  {opcionesPadre.map(c => (
                    <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Ícono (emoji)</label>
                <input
                  placeholder="Ej: 🏋️"
                  value={form.icono}
                  onChange={e => setForm({...form, icono: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({...form, color: e.target.value})}
                  className="w-full bg-[#0B0E1A] rounded-xl px-2 py-2 outline-none h-12 border border-[#262E4A]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={agregarCategoria}
                disabled={loading}
                className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Categorías personales */}
        {personales.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">👤 Personal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {personales.map(cat => renderCategoria(cat))}
            </div>
          </div>
        )}

        {/* Categorías empresariales */}
        {empresariales.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">🏢 Empresarial</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {empresariales.map(cat => renderCategoria(cat))}
            </div>
          </div>
        )}

        {categorias.length === 0 && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-8 sm:p-12 text-center">
            <p className="text-4xl mb-4">🏷️</p>
            <p className="text-[#8891B0] mb-4">No tienes categorías aún</p>
            <p className="text-[#5A6288] text-sm">Carga las categorías base o crea las tuyas</p>
          </div>
        )}

      </div>
    </div>
  )
}

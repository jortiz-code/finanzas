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

const ICONOS_TIPO_DEFAULT = {
  personal: '👤',
  empresarial: '🏢'
}

// Íconos curados para categorías/tipos de finanzas
const ICONOS_DISPONIBLES = [
  '🍔', '🍕', '🍜', '🍱', '☕', '🍺', '🍷', '🥗',
  '🚗', '🚕', '🚌', '🚲', '✈️', '⛽', '🚆', '🛵',
  '🛒', '🛍️', '👕', '👟', '💄', '👜', '💍', '🧴',
  '🏠', '🛋️', '🔧', '💡', '🧹', '🛁', '🔑', '🪴',
  '💊', '🏥', '💉', '🦷', '🏋️', '🧘', '👓', '🩺',
  '🎬', '🎮', '🎵', '🎨', '🎉', '🎭', '📸', '🎳',
  '📚', '🎓', '✏️', '🏫', '📖', '🧮', '🔬', '🖥️',
  '📱', '💻', '🌐', '📺', '🔌', '☁️', '🖨️', '⌚',
  '💰', '💳', '🏦', '📈', '📉', '💸', '🪙', '💵',
  '🏭', '📣', '🏢', '👥', '📦', '🛠️', '📋', '🗂️',
  '👶', '🐶', '🐱', '🎁', '👨‍👩‍👧', '🧸', '🎈', '🐾',
  '✈️', '🏖️', '🗺️', '🧳', '🏔️', '🚢', '🎡', '🌴',
  '⚡', '🔥', '💧', '🗑️', '📡', '🛡️', '⭐', '📌'
]

function SelectorIcono({ valor, onSeleccionar }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">{valor || '📦'}</span>
          <span className="text-[#8891B0] text-sm">Elegir ícono</span>
        </span>
        <span className="text-[#5A6288]">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="absolute z-10 mt-2 w-full bg-[#131829] border border-[#262E4A] rounded-xl p-3 shadow-2xl max-h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {ICONOS_DISPONIBLES.map((icono, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onSeleccionar(icono); setAbierto(false) }}
                className={`text-xl p-1.5 rounded-lg hover:bg-[#1B2138] transition ${valor === icono ? 'bg-[#7B61FF]/20 ring-1 ring-[#7B61FF]' : ''}`}
              >
                {icono}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargandoDefaults, setCargandoDefaults] = useState(false)

  // 'eleccion' | 'categoria' | 'tipo' | null (null = cerrado)
  const [panelActivo, setPanelActivo] = useState(null)

  const [formCategoria, setFormCategoria] = useState({
    nombre: '', tipo: 'personal', color: '#00E5FF', icono: '📦'
  })
  const [formTipo, setFormTipo] = useState({ nombre: '', icono: '🗂️' })

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true })
    setCategorias(cats || [])

    const { data: tipos } = await supabase
      .from('tipos_categoria')
      .select('*')
      .order('created_at', { ascending: true })
    setTiposPersonalizados(tipos || [])
  }

  const cargarDefaults = async () => {
    setCargandoDefaults(true)
    const { data: { user } } = await supabase.auth.getUser()

    const inserts = CATEGORIAS_DEFAULT.map(c => ({ ...c, user_id: user.id }))
    await supabase.from('categorias').insert(inserts)
    cargarTodo()
    setCargandoDefaults(false)
  }

  // Lista combinada de tipos: los fijos (personal/empresarial) + los que el
  // usuario haya creado en tipos_categoria + cualquiera que aparezca en
  // categorías existentes (por seguridad, en caso de datos antiguos)
  const tiposExistentes = [...new Set([
    'personal',
    'empresarial',
    ...tiposPersonalizados.map(t => t.nombre),
    ...categorias.map(c => c.tipo)
  ])]

  const obtenerIconoTipo = (tipo) => {
    if (ICONOS_TIPO_DEFAULT[tipo]) return ICONOS_TIPO_DEFAULT[tipo]
    const encontrado = tiposPersonalizados.find(t => t.nombre === tipo)
    return encontrado?.icono || '🗂️'
  }

  const abrirEleccion = () => setPanelActivo('eleccion')

  const abrirFormCategoria = () => {
    setFormCategoria({ nombre: '', tipo: tiposExistentes[0] || 'personal', color: '#00E5FF', icono: '📦' })
    setPanelActivo('categoria')
  }

  const abrirFormTipo = () => {
    setFormTipo({ nombre: '', icono: '🗂️' })
    setPanelActivo('tipo')
  }

  const guardarCategoria = async () => {
    if (!formCategoria.nombre) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('categorias').insert({
      nombre: formCategoria.nombre,
      tipo: formCategoria.tipo,
      color: formCategoria.color,
      icono: formCategoria.icono,
      user_id: user.id
    })

    setPanelActivo(null)
    cargarTodo()
    setLoading(false)
  }

  const guardarTipo = async () => {
    const nombreLimpio = formTipo.nombre.trim().toLowerCase()
    if (!nombreLimpio) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('tipos_categoria').insert({
      user_id: user.id,
      nombre: nombreLimpio,
      icono: formTipo.icono || '🗂️'
    })

    if (error) {
      alert(error.code === '23505' ? 'Ya existe un tipo con ese nombre' : 'Error al guardar')
      setLoading(false)
      return
    }

    setPanelActivo(null)
    cargarTodo()
    setLoading(false)
  }

  const eliminarCategoria = async (cat) => {
    if (!confirm(`¿Eliminar "${cat.nombre}"?`)) return
    await supabase.from('categorias').delete().eq('id', cat.id)
    cargarTodo()
  }

  const eliminarTipo = async (tipo) => {
    const tieneCategorias = categorias.some(c => c.tipo === tipo.nombre)
    if (tieneCategorias) {
      alert('Este tipo tiene categorías dentro. Elimina o mueve esas categorías primero.')
      return
    }
    if (!confirm(`¿Eliminar el tipo "${tipo.nombre}"?`)) return
    await supabase.from('tipos_categoria').delete().eq('id', tipo.id)
    cargarTodo()
  }

  const categoriasPorTipo = tiposExistentes
    .map(tipo => ({ tipo, items: categorias.filter(c => c.tipo === tipo) }))
    .filter(grupo => grupo.items.length > 0)

  return (
    <div className="min-h-screen bg-[#0B0E1A] text-white p-4 sm:p-6 lg:p-8 font-body">
      <EstilosGlobales />
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Categorías</h1>
            <p className="text-[#8891B0] mt-1 text-sm sm:text-base">Organiza tus gastos por tipo</p>
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
              onClick={abrirEleccion}
              className="bg-[#7B61FF] hover:bg-[#8f79ff] px-4 py-2 rounded-xl transition glow-violeta text-sm sm:text-base"
            >
              + Nueva
            </button>
          </div>
        </div>

        {/* Panel de elección: ¿categoría o tipo? */}
        {panelActivo === 'eleccion' && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">¿Qué quieres agregar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={abrirFormCategoria}
                className="bg-[#0B0E1A] border border-[#262E4A] hover:border-[#00E5FF] rounded-2xl p-5 text-left transition group"
              >
                <p className="text-3xl mb-2">🏷️</p>
                <p className="font-semibold font-display group-hover:text-[#00E5FF] transition">Nueva categoría</p>
                <p className="text-[#8891B0] text-sm mt-1">Ej: Gimnasio, Mascotas, Netflix</p>
              </button>
              <button
                onClick={abrirFormTipo}
                className="bg-[#0B0E1A] border border-[#262E4A] hover:border-[#7B61FF] rounded-2xl p-5 text-left transition group"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="font-semibold font-display group-hover:text-[#7B61FF] transition">Nuevo tipo</p>
                <p className="text-[#8891B0] text-sm mt-1">Ej: Inversiones, Familiar, Ahorro</p>
              </button>
            </div>
            <button
              onClick={() => setPanelActivo(null)}
              className="mt-4 text-[#8891B0] hover:text-white text-sm transition"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Formulario: Nueva categoría */}
        {panelActivo === 'categoria' && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">Nueva categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={formCategoria.nombre}
                  onChange={e => setFormCategoria({...formCategoria, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                <select
                  value={formCategoria.tipo}
                  onChange={e => setFormCategoria({...formCategoria, tipo: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base capitalize"
                >
                  {tiposExistentes.map(t => (
                    <option key={t} value={t} className="capitalize">{obtenerIconoTipo(t)} {t}</option>
                  ))}
                </select>
                <p className="text-[#5A6288] text-xs mt-1">¿No está el tipo que buscas? Créalo primero con "+ Nueva → Nuevo tipo"</p>
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Ícono</label>
                <SelectorIcono
                  valor={formCategoria.icono}
                  onSeleccionar={(icono) => setFormCategoria({...formCategoria, icono})}
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Color</label>
                <input
                  type="color"
                  value={formCategoria.color}
                  onChange={e => setFormCategoria({...formCategoria, color: e.target.value})}
                  className="w-full bg-[#0B0E1A] rounded-xl px-2 py-2 outline-none h-12 border border-[#262E4A]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={guardarCategoria}
                disabled={loading}
                className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setPanelActivo(null)}
                className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulario: Nuevo tipo */}
        {panelActivo === 'tipo' && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">Nuevo tipo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre del tipo</label>
                <input
                  placeholder="Ej: Inversiones"
                  value={formTipo.nombre}
                  onChange={e => setFormTipo({...formTipo, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Ícono</label>
                <SelectorIcono
                  valor={formTipo.icono}
                  onSeleccionar={(icono) => setFormTipo({...formTipo, icono})}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={guardarTipo}
                disabled={loading}
                className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setPanelActivo(null)}
                className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tipos sin categorías todavía (creados pero vacíos) */}
        {tiposPersonalizados.filter(t => !categorias.some(c => c.tipo === t.nombre)).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-[#8891B0]">Tipos sin categorías aún</h2>
            <div className="flex flex-wrap gap-2">
              {tiposPersonalizados.filter(t => !categorias.some(c => c.tipo === t.nombre)).map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-[#131829] border border-[#262E4A] rounded-xl px-3 py-2">
                  <span>{t.icono}</span>
                  <span className="capitalize text-sm">{t.nombre}</span>
                  <button onClick={() => eliminarTipo(t)} className="text-[#5A6288] hover:text-[#FF2E9A] transition">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorías agrupadas por tipo */}
        {categoriasPorTipo.map(grupo => (
          <div key={grupo.tipo} className="mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display capitalize">
              {obtenerIconoTipo(grupo.tipo)} {grupo.tipo}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {grupo.items.map(cat => (
                <div
                  key={cat.id}
                  className="bg-[#131829] rounded-2xl p-4 flex justify-between items-center border border-[#262E4A]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl flex-shrink-0">{cat.icono}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate font-display">{cat.nombre}</p>
                      <div
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarCategoria(cat)}
                    className="text-[#5A6288] hover:text-[#FF2E9A] transition flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {categorias.length === 0 && tiposPersonalizados.length === 0 && (
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

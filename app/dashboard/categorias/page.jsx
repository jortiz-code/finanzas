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

const ICONOS_TIPO = {
  personal: '👤',
  empresarial: '🏢'
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
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoDefaults, setCargandoDefaults] = useState(false)
  const [creandoTipoNuevo, setCreandoTipoNuevo] = useState(false)
  const [nuevoTipoTexto, setNuevoTipoTexto] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'personal',
    color: '#00E5FF',
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

  // Tipos existentes (sacados de tus categorías), siempre incluyendo
  // personal/empresarial como base aunque aún no tengas categorías creadas.
  const tiposExistentes = [...new Set(['personal', 'empresarial', ...categorias.map(c => c.tipo)])]

  const abrirFormularioNueva = () => {
    setForm({ nombre: '', tipo: tiposExistentes[0] || 'personal', color: '#00E5FF', icono: '📦' })
    setCreandoTipoNuevo(false)
    setNuevoTipoTexto('')
    setMostrarForm(true)
  }

  const manejarCambioTipo = (valor) => {
    if (valor === '__nuevo__') {
      setCreandoTipoNuevo(true)
      return
    }
    setCreandoTipoNuevo(false)
    setForm({ ...form, tipo: valor })
  }

  const confirmarNuevoTipo = () => {
    const tipoLimpio = nuevoTipoTexto.trim().toLowerCase()
    if (!tipoLimpio) return
    setForm({ ...form, tipo: tipoLimpio })
    setCreandoTipoNuevo(false)
    setNuevoTipoTexto('')
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
      user_id: user.id
    })
    setForm({ nombre: '', tipo: tiposExistentes[0] || 'personal', color: '#00E5FF', icono: '📦' })
    setMostrarForm(false)
    cargarCategorias()
    setLoading(false)
  }

  const eliminarCategoria = async (cat) => {
    if (!confirm(`¿Eliminar "${cat.nombre}"?`)) return
    await supabase.from('categorias').delete().eq('id', cat.id)
    cargarCategorias()
  }

  // Agrupar categorías por tipo, dinámicamente (no solo personal/empresarial)
  const categoriasPorTipo = tiposExistentes
    .map(tipo => ({
      tipo,
      items: categorias.filter(c => c.tipo === tipo)
    }))
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
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">Nueva categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                />
              </div>

              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                {creandoTipoNuevo ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      placeholder="Ej: Inversiones"
                      value={nuevoTipoTexto}
                      onChange={e => setNuevoTipoTexto(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarNuevoTipo() } }}
                      className="flex-1 bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
                    />
                    <button
                      onClick={confirmarNuevoTipo}
                      className="bg-[#7B61FF] hover:bg-[#8f79ff] px-4 rounded-xl transition text-sm flex-shrink-0"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.tipo}
                    onChange={e => manejarCambioTipo(e.target.value)}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base capitalize"
                  >
                    {tiposExistentes.map(t => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                    <option value="__nuevo__">+ Crear nuevo tipo...</option>
                  </select>
                )}
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

        {/* Categorías agrupadas por tipo (dinámico) */}
        {categoriasPorTipo.map(grupo => (
          <div key={grupo.tipo} className="mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display capitalize">
              {ICONOS_TIPO[grupo.tipo] || '🗂️'} {grupo.tipo}
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

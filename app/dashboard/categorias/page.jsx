'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const ICONOS_TIPO_DEFAULT = {
  personal: '👤',
  empresarial: '🏢'
}

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
        <div className="absolute z-20 mt-2 w-full bg-[#131829] border border-[#262E4A] rounded-xl p-3 shadow-2xl max-h-48 overflow-y-auto">
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

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])
  const [loading, setLoading] = useState(false)

  const [panelActivo, setPanelActivo] = useState(null) // 'eleccion' | 'categoria' | 'tipo' | null
  const [categoriaEditandoId, setCategoriaEditandoId] = useState(null)
  const [tipoEditandoId, setTipoEditandoId] = useState(null)
  const [tipoArrastrado, setTipoArrastrado] = useState(null)
  const [tipoSobrevolado, setTipoSobrevolado] = useState(null)
  const [categoriaArrastrada, setCategoriaArrastrada] = useState(null)
  const [categoriasPreview, setCategoriasPreview] = useState(null) // null = no se está arrastrando
  const huboDropValido = useRef(false)

  const [formCategoria, setFormCategoria] = useState({
    nombre: '', tipo: '', color: '#00E5FF', icono: '📦'
  })
  const [formTipo, setFormTipo] = useState({ nombre: '', icono: '🗂️' })

  useEffect(() => {
    cargarTodo()
  }, [])

  // Red de seguridad: si por algún motivo el navegador no dispara el evento
  // de "terminar arrastre" sobre el elemento original (puede pasar si React
  // lo desmonta a mitad de camino), esto limpia el estado igual para que
  // nunca quede una tarjeta pegada en opaca.
  useEffect(() => {
    const limpiarEstadoArrastre = () => {
      setCategoriaArrastrada(null)
      setCategoriasPreview(null)
      setTipoArrastrado(null)
      setTipoSobrevolado(null)
    }
    document.addEventListener('dragend', limpiarEstadoArrastre)
    document.addEventListener('drop', limpiarEstadoArrastre)
    return () => {
      document.removeEventListener('dragend', limpiarEstadoArrastre)
      document.removeEventListener('drop', limpiarEstadoArrastre)
    }
  }, [])

  const cargarTodo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    setCategorias(cats || [])

    const { data: tipos } = await supabase
      .from('tipos_categoria')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    setTiposPersonalizados(tipos || [])
  }

  // Tipos existentes: 100% derivados de la base de datos, sin valores fijos
  const tiposExistentes = [...new Set([
    ...tiposPersonalizados.map(t => t.nombre),
    ...categorias.map(c => c.tipo)
  ])]

  useEffect(() => {
    if (!formCategoria.tipo && tiposExistentes.length > 0) {
      setFormCategoria(f => ({ ...f, tipo: tiposExistentes[0] }))
    }
  }, [tiposExistentes.length])

  const obtenerIconoTipo = (tipo) => {
    if (ICONOS_TIPO_DEFAULT[tipo]) return ICONOS_TIPO_DEFAULT[tipo]
    return tiposPersonalizados.find(t => t.nombre === tipo)?.icono || '🗂️'
  }

  const abrirEleccion = () => setPanelActivo('eleccion')

  const abrirFormCategoria = () => {
    setCategoriaEditandoId(null)
    setFormCategoria({ nombre: '', tipo: tiposExistentes[0] || '', color: '#00E5FF', icono: '📦' })
    setPanelActivo('categoria')
  }

  const abrirFormCategoriaConTipo = (tipo) => {
    setCategoriaEditandoId(null)
    setFormCategoria({ nombre: '', tipo, color: '#00E5FF', icono: '📦' })
    setPanelActivo('categoria')
  }

  const abrirEditarCategoria = (cat) => {
    setCategoriaEditandoId(cat.id)
    setFormCategoria({ nombre: cat.nombre, tipo: cat.tipo, color: cat.color || '#00E5FF', icono: cat.icono || '📦' })
    setPanelActivo('categoria')
  }

  const abrirFormTipo = () => {
    setTipoEditandoId(null)
    setFormTipo({ nombre: '', icono: '🗂️' })
    setPanelActivo('tipo')
  }

  const abrirEditarTipo = (tipo) => {
    setTipoEditandoId(tipo.id)
    setFormTipo({ nombre: tipo.nombre, icono: tipo.icono || '🗂️' })
    setPanelActivo('tipo')
  }

  const guardarCategoria = async () => {
    if (!formCategoria.nombre || !formCategoria.tipo) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (categoriaEditandoId) {
      await supabase.from('categorias').update({
        nombre: formCategoria.nombre,
        tipo: formCategoria.tipo,
        color: formCategoria.color,
        icono: formCategoria.icono
      }).eq('id', categoriaEditandoId)
    } else {
      await supabase.from('categorias').insert({
        nombre: formCategoria.nombre,
        tipo: formCategoria.tipo,
        color: formCategoria.color,
        icono: formCategoria.icono,
        user_id: user.id
      })
    }

    setCategoriaEditandoId(null)
    setPanelActivo(null)
    cargarTodo()
    setLoading(false)
  }

  const guardarTipo = async () => {
    const nombreLimpio = formTipo.nombre.trim().toLowerCase()
    if (!nombreLimpio) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (tipoEditandoId) {
      const tipoActual = tiposPersonalizados.find(t => t.id === tipoEditandoId)
      const nombreViejo = tipoActual?.nombre

      const { error } = await supabase.from('tipos_categoria').update({
        nombre: nombreLimpio,
        icono: formTipo.icono || '🗂️'
      }).eq('id', tipoEditandoId)

      if (error) {
        alert(error.code === '23505' ? 'Ya existe un tipo con ese nombre' : 'Error al guardar')
        setLoading(false)
        return
      }

      // Si el nombre cambió, actualizamos también las categorías que
      // pertenecían a ese tipo (están vinculadas por nombre, no por ID)
      if (nombreViejo && nombreViejo !== nombreLimpio) {
        await supabase.from('categorias')
          .update({ tipo: nombreLimpio })
          .eq('user_id', user.id)
          .eq('tipo', nombreViejo)
      }
    } else {
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
    }

    setTipoEditandoId(null)
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

  // --- Arrastrar y soltar para reordenar tipos (en vivo, estilo Notion) ---

  const manejarDragStart = (nombreTipo) => {
    setTipoArrastrado(nombreTipo)
  }

  const manejarDragOver = (e, nombreTipo) => {
    e.preventDefault()
    if (!tipoArrastrado || tipoArrastrado === nombreTipo) return

    setTipoSobrevolado(nombreTipo)

    // Reordena en vivo: mueve el tipo arrastrado a la posición actual del
    // que está sobrevolando, para que los demás bloques se acomoden solos
    // antes de soltar el mouse.
    setTiposPersonalizados(prev => {
      const nombres = prev.map(t => t.nombre)
      const indiceOrigen = nombres.indexOf(tipoArrastrado)
      const indiceDestino = nombres.indexOf(nombreTipo)
      if (indiceOrigen === -1 || indiceDestino === -1 || indiceOrigen === indiceDestino) return prev

      const nuevaLista = [...prev]
      const [item] = nuevaLista.splice(indiceOrigen, 1)
      nuevaLista.splice(indiceDestino, 0, item)
      return nuevaLista
    })
  }

  const manejarDragEnd = async () => {
    // Al soltar, el arreglo ya refleja el orden final (se fue actualizando
    // en vivo durante el arrastre) — solo falta guardarlo en Supabase.
    const listaFinal = tiposPersonalizados
    setTipoArrastrado(null)
    setTipoSobrevolado(null)

    await Promise.all(
      listaFinal.map((t, i) =>
        supabase.from('tipos_categoria').update({ orden: i }).eq('id', t.id)
      )
    )
  }

  // --- Arrastrar y soltar para categorías: reordenar y mover entre tipos ---

  const manejarDragStartCategoria = (catId) => {
    setCategoriaArrastrada(catId)
    setCategoriasPreview(categorias) // copia de trabajo, solo visual por ahora
    huboDropValido.current = false
  }

  const manejarDragOverCategoria = (e, catDestino) => {
    e.preventDefault()
    e.stopPropagation()
    if (!categoriaArrastrada || categoriaArrastrada === catDestino.id) return

    setCategoriasPreview(prev => {
      const base = prev || categorias
      const indiceOrigen = base.findIndex(c => c.id === categoriaArrastrada)
      const indiceDestino = base.findIndex(c => c.id === catDestino.id)
      if (indiceOrigen === -1 || indiceDestino === -1 || indiceOrigen === indiceDestino) return base

      const origen = base[indiceOrigen]
      // Solo mostramos la vista previa en vivo si es el mismo tipo — mover
      // de tipo durante el hover haría que la tarjeta se desmonte a mitad
      // del arrastre.
      if (origen.tipo !== catDestino.tipo) return base

      // Intercambiamos posiciones (A y B se cambian el lugar) en vez de
      // insertar-y-desplazar, para que en una grilla el movimiento sea
      // predecible y no salte en diagonal.
      const lista = [...base]
      ;[lista[indiceOrigen], lista[indiceDestino]] = [lista[indiceDestino], lista[indiceOrigen]]
      return lista
    })
  }

  // El cambio de TIPO también se aplica solo sobre la previsualización —
  // recién se confirma de verdad en manejarDragEndCategoria.
  const manejarDropEnCategoria = (e, catDestino) => {
    e.preventDefault()
    e.stopPropagation()
    if (!categoriaArrastrada || categoriaArrastrada === catDestino.id) return
    huboDropValido.current = true

    setCategoriasPreview(prev => {
      const base = prev || categorias
      const indiceOrigen = base.findIndex(c => c.id === categoriaArrastrada)
      const indiceDestino = base.findIndex(c => c.id === catDestino.id)
      if (indiceOrigen === -1 || indiceDestino === -1) return base

      const lista = [...base]
      const [item] = lista.splice(indiceOrigen, 1)
      item.tipo = catDestino.tipo
      lista.splice(indiceDestino, 0, item)
      return lista
    })
  }

  const manejarDropEnGrupoVacio = (e, tipoDestino) => {
    e.preventDefault()
    if (!categoriaArrastrada) return
    huboDropValido.current = true

    setCategoriasPreview(prev => {
      const base = prev || categorias
      const lista = [...base]
      const indiceOrigen = lista.findIndex(c => c.id === categoriaArrastrada)
      if (indiceOrigen === -1) return base
      const [item] = lista.splice(indiceOrigen, 1)
      item.tipo = tipoDestino
      lista.push(item)
      return lista
    })
  }

  const manejarDragEndCategoria = async () => {
    const seSoltoEnLugarValido = huboDropValido.current
    const listaPreview = categoriasPreview

    setCategoriaArrastrada(null)
    setCategoriasPreview(null)
    huboDropValido.current = false

    // Si no soltaste en un lugar válido, no confirmamos nada — todo vuelve
    // a como estaba (ya que dejamos de usar la previsualización).
    if (!seSoltoEnLugarValido || !listaPreview) return

    setCategorias(listaPreview)

    await Promise.all(
      listaPreview.map((c, i) =>
        supabase.from('categorias').update({ tipo: c.tipo, orden: i }).eq('id', c.id)
      )
    )
  }

  // Mientras se arrastra, se muestra la previsualización; si no, los datos reales
  const categoriasVisibles = categoriasPreview || categorias

  const categoriasPorTipo = tiposExistentes
    .map(tipo => ({ tipo, items: categoriasVisibles.filter(c => c.tipo === tipo) }))

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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
            <div className="bg-[#131829] border border-[#262E4A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl glow-violeta">
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
          </div>
        )}

        {/* Formulario: Nueva categoría */}
        {panelActivo === 'categoria' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
            <div className="bg-[#131829] border border-[#262E4A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto glow-violeta">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">{categoriaEditandoId ? 'Editar categoría' : 'Nueva categoría'}</h2>
              {tiposExistentes.length === 0 ? (
                <div className="bg-[#0B0E1A] border border-dashed border-[#262E4A] rounded-xl p-4 text-center">
                  <p className="text-[#8891B0] text-sm">Primero necesitas crear un tipo.</p>
                  <button onClick={abrirFormTipo} className="mt-2 text-[#7B61FF] hover:underline text-sm">Crear tipo →</button>
                </div>
              ) : (
                <>
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
                  </div>
                  <div>
                    <label className="text-[#8891B0] text-sm mb-1 block">Ícono</label>
                    <SelectorIcono valor={formCategoria.icono} onSeleccionar={(icono) => setFormCategoria({...formCategoria, icono})} />
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
                    {loading ? 'Guardando...' : categoriaEditandoId ? 'Guardar cambios' : 'Guardar'}
                  </button>
                </div>
              </>
              )}
              <button
                onClick={() => { setPanelActivo(null); setCategoriaEditandoId(null) }}
                className="mt-4 bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulario: Nuevo tipo */}
        {panelActivo === 'tipo' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
            <div className="bg-[#131829] border border-[#262E4A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto glow-violeta">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display">{tipoEditandoId ? 'Editar tipo' : 'Nuevo tipo'}</h2>
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
                  <SelectorIcono valor={formTipo.icono} onSeleccionar={(icono) => setFormTipo({...formTipo, icono})} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={guardarTipo}
                  disabled={loading}
                  className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
                >
                  {loading ? 'Guardando...' : tipoEditandoId ? 'Guardar cambios' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setPanelActivo(null); setTipoEditandoId(null) }}
                  className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categorías agrupadas por tipo (siempre se muestran todos los tipos) */}
        {categoriasPorTipo.map(grupo => {
          const esTipoPersonalizado = tiposPersonalizados.some(t => t.nombre === grupo.tipo)
          const tipoVacio = grupo.items.length === 0

          return (
            <div
              key={grupo.tipo}
              className={`mb-8 rounded-2xl transition-all duration-300 ease-out ${tipoArrastrado === grupo.tipo ? 'opacity-40 scale-[0.98]' : ''}`}
              draggable={esTipoPersonalizado}
              onDragStart={() => esTipoPersonalizado && manejarDragStart(grupo.tipo)}
              onDragOver={(e) => esTipoPersonalizado && manejarDragOver(e, grupo.tipo)}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={manejarDragEnd}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold font-display capitalize flex items-center gap-2">
                  {esTipoPersonalizado && (
                    <span className="text-[#5A6288] cursor-grab active:cursor-grabbing select-none" title="Arrastra para reordenar">⠿</span>
                  )}
                  {obtenerIconoTipo(grupo.tipo)} {grupo.tipo}
                  {tipoVacio && <span className="text-[#5A6288] text-xs font-normal font-mono">(sin categorías)</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirFormCategoriaConTipo(grupo.tipo)}
                    className="bg-[#131829] hover:bg-[#1B2138] border border-[#262E4A] hover:border-[#00E5FF] text-[#00E5FF] px-3 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap"
                  >
                    + Nueva categoría
                  </button>
                  {esTipoPersonalizado && (
                    <button
                      onClick={() => abrirEditarTipo(tiposPersonalizados.find(t => t.nombre === grupo.tipo))}
                      className="text-[#5A6288] hover:text-[#00E5FF] transition text-sm px-1"
                      title="Editar tipo"
                    >
                      ✏️
                    </button>
                  )}
                  {esTipoPersonalizado && tipoVacio && (
                    <button
                      onClick={() => eliminarTipo(tiposPersonalizados.find(t => t.nombre === grupo.tipo))}
                      className="text-[#5A6288] hover:text-[#FF2E9A] transition text-sm px-1"
                      title="Eliminar tipo"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {tipoVacio ? (
                <div
                  className="bg-[#131829]/50 border border-dashed border-[#262E4A] rounded-2xl p-6 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => manejarDropEnGrupoVacio(e, grupo.tipo)}
                >
                  <p className="text-[#5A6288] text-sm">Aún no tienes categorías en "{grupo.tipo}"</p>
                  {categoriaArrastrada && (
                    <p className="text-[#7B61FF] text-xs mt-1">Suelta aquí para mover a este tipo</p>
                  )}
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => manejarDropEnGrupoVacio(e, grupo.tipo)}
                >
                  {grupo.items.map(cat => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); manejarDragStartCategoria(cat.id) }}
                      onDragOver={(e) => manejarDragOverCategoria(e, cat)}
                      onDragEnd={(e) => { e.stopPropagation(); manejarDragEndCategoria() }}
                      onDrop={(e) => manejarDropEnCategoria(e, cat)}
                      className={`bg-[#131829] rounded-2xl p-4 flex justify-between items-center border border-[#262E4A] cursor-grab active:cursor-grabbing transition-all duration-200 ${categoriaArrastrada === cat.id ? 'opacity-40 scale-[0.97]' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#5A6288] text-xs select-none">⠿</span>
                        <span className="text-2xl flex-shrink-0">{cat.icono}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate font-display">{cat.nombre}</p>
                          <div
                            className="w-3 h-3 rounded-full mt-1"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => abrirEditarCategoria(cat)}
                          className="text-[#5A6288] hover:text-[#00E5FF] transition text-sm px-1"
                          title="Editar categoría"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => eliminarCategoria(cat)}
                          className="text-[#5A6288] hover:text-[#FF2E9A] transition"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {tiposExistentes.length === 0 && !panelActivo && (
          <div className="bg-[#131829] border border-[#262E4A] rounded-2xl p-8 sm:p-12 text-center">
            <p className="text-4xl mb-4">🏷️</p>
            <p className="text-[#8891B0] mb-4">No tienes ningún tipo ni categoría todavía</p>
            <p className="text-[#5A6288] text-sm mb-4">Empieza creando un tipo (ej: Personal, Hogar) y luego sus categorías</p>
            <button
              onClick={abrirEleccion}
              className="bg-[#7B61FF] hover:bg-[#8f79ff] px-6 py-2 rounded-xl transition glow-violeta"
            >
              + Crear el primero
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

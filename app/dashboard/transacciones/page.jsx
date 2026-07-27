'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { clasificarTransaccion } from '@/lib/clasificar'

// Flag temporal: la IA no está clasificando bien las categorías, así que
// por ahora la desactivamos y las transacciones sin categoría manual
// quedan como "necesita revisión". Para reactivarla, cambiar a true.
const IA_CLASIFICACION_ACTIVADA = false

const ICONOS_TIPO_DEFAULT = { personal: '👤', empresarial: '🏢' }

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

// Modal para crear una categoría o un tipo nuevo, sin salir de la página
function ModalNuevaCategoria({ onCerrar, onCategoriaCreada, onTipoCreado }) {
  const [panel, setPanel] = useState('eleccion')
  const [loading, setLoading] = useState(false)
  const [tiposExistentes, setTiposExistentes] = useState(['personal', 'empresarial'])
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])
  const [mensajeExito, setMensajeExito] = useState('')

  const [formCategoria, setFormCategoria] = useState({
    nombre: '', tipo: 'personal', color: '#00E5FF', icono: '📦'
  })
  const [formTipo, setFormTipo] = useState({ nombre: '', icono: '🗂️' })

  const cargarTipos = async () => {
    const { data: cats } = await supabase.from('categorias').select('tipo')
    const { data: tipos } = await supabase.from('tipos_categoria').select('*')
    setTiposPersonalizados(tipos || [])
    const combinados = [...new Set([
      'personal', 'empresarial',
      ...(tipos || []).map(t => t.nombre),
      ...(cats || []).map(c => c.tipo)
    ])]
    setTiposExistentes(combinados)
    return combinados
  }

  useEffect(() => {
    cargarTipos().then(combinados => {
      setFormCategoria(f => ({ ...f, tipo: combinados[0] || 'personal' }))
    })
  }, [])

  const obtenerIconoTipo = (tipo) => {
    if (ICONOS_TIPO_DEFAULT[tipo]) return ICONOS_TIPO_DEFAULT[tipo]
    return tiposPersonalizados.find(t => t.nombre === tipo)?.icono || '🗂️'
  }

  const guardarCategoria = async () => {
    if (!formCategoria.nombre) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('categorias').insert({
      nombre: formCategoria.nombre,
      tipo: formCategoria.tipo,
      color: formCategoria.color,
      icono: formCategoria.icono,
      user_id: user.id
    }).select().single()

    setLoading(false)
    if (error) {
      alert('Error al guardar la categoría: ' + error.message)
      return
    }
    if (data) onCategoriaCreada(data)
  }

  const guardarTipo = async () => {
    const nombreLimpio = formTipo.nombre.trim().toLowerCase()
    if (!nombreLimpio) {
      alert('Escribe un nombre para el tipo')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('tipos_categoria').insert({
      user_id: user.id,
      nombre: nombreLimpio,
      icono: formTipo.icono || '🗂️'
    })

    setLoading(false)
    if (error) {
      alert(error.code === '23505' ? 'Ya existe un tipo con ese nombre' : 'Error al guardar: ' + error.message)
      return
    }

    await cargarTipos()
    onTipoCreado(nombreLimpio)
    setFormTipo({ nombre: '', icono: '🗂️' })
    setMensajeExito(`✅ Tipo "${nombreLimpio}" creado`)
    setPanel('eleccion')
    setTimeout(() => setMensajeExito(''), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-body">
      <div className="bg-[#131829] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#262E4A] shadow-2xl max-h-[90vh] overflow-y-auto glow-violeta">

        {panel === 'eleccion' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-white">¿Qué quieres agregar?</h2>
            {mensajeExito && (
              <div className="bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] text-sm rounded-xl px-4 py-2 mb-4">
                {mensajeExito}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPanel('categoria')}
                className="bg-[#0B0E1A] border border-[#262E4A] hover:border-[#00E5FF] rounded-2xl p-5 text-left transition group"
              >
                <p className="text-3xl mb-2">🏷️</p>
                <p className="font-semibold font-display text-white group-hover:text-[#00E5FF] transition">Nueva categoría</p>
                <p className="text-[#8891B0] text-sm mt-1">Ej: Gimnasio, Mascotas, Netflix</p>
              </button>
              <button
                onClick={() => setPanel('tipo')}
                className="bg-[#0B0E1A] border border-[#262E4A] hover:border-[#7B61FF] rounded-2xl p-5 text-left transition group"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="font-semibold font-display text-white group-hover:text-[#7B61FF] transition">Nuevo tipo</p>
                <p className="text-[#8891B0] text-sm mt-1">Ej: Inversiones, Familiar, Ahorro</p>
              </button>
            </div>
            <button onClick={onCerrar} className="mt-4 text-[#8891B0] hover:text-white text-sm transition">
              Cancelar
            </button>
          </>
        )}

        {panel === 'categoria' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-white">Nueva categoría</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={formCategoria.nombre}
                  onChange={e => setFormCategoria({...formCategoria, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                <select
                  value={formCategoria.tipo}
                  onChange={e => setFormCategoria({...formCategoria, tipo: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base capitalize"
                >
                  {tiposExistentes.map(t => (
                    <option key={t} value={t}>{obtenerIconoTipo(t)} {t}</option>
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
            <div className="flex gap-3 mt-5">
              <button
                onClick={guardarCategoria}
                disabled={loading}
                className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setPanel('eleccion')} className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition text-white">
                ← Volver
              </button>
            </div>
          </>
        )}

        {panel === 'tipo' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-white">Nuevo tipo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Nombre del tipo</label>
                <input
                  placeholder="Ej: Inversiones"
                  value={formTipo.nombre}
                  onChange={e => setFormTipo({...formTipo, nombre: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                />
              </div>
              <div>
                <label className="text-[#8891B0] text-sm mb-1 block">Ícono</label>
                <SelectorIcono valor={formTipo.icono} onSeleccionar={(icono) => setFormTipo({...formTipo, icono})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={guardarTipo}
                disabled={loading}
                className="bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 px-6 py-2 rounded-xl transition glow-violeta"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setPanel('eleccion')} className="bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] px-6 py-2 rounded-xl transition text-white">
                ← Volver
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default function Transacciones() {
  const [transacciones, setTransacciones] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filtroBanco, setFiltroBanco] = useState('todos')
  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'gasto',
    cuenta_id: '',
    categoria_id: ''
  })

  const [transaccionEditandoId, setTransaccionEditandoId] = useState(null)
  const [formEditar, setFormEditar] = useState({
    descripcion: '', monto: '', fecha: '', tipo: 'gasto', cuenta_id: '', categoria_id: ''
  })
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false)
  const [origenModalCategoria, setOrigenModalCategoria] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const { data: trans } = await supabase
      .from('transacciones')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100)

    const { data: cuen } = await supabase.from('cuentas').select('*')
    const { data: cats } = await supabase.from('categorias').select('*')

    const transConRelaciones = trans?.map(t => {
      const cuenta = cuen?.find(c => c.id === t.cuenta_id)
      const categoria = cats?.find(c => c.id === t.categoria_id)
      return { ...t, cuentas: cuenta, categorias: categoria }
    }) || []

    setTransacciones(transConRelaciones)
    setCuentas(cuen || [])
    setCategorias(cats || [])
    return cats || []
  }

  const agregarTransaccion = async () => {
    if (!form.descripcion || !form.monto || !form.cuenta_id) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    let categoria_id = form.categoria_id || null
    let clasificado_por = form.categoria_id ? 'usuario' : null
    let necesita_revision = !form.categoria_id
    let confianza_ia = null

    if (IA_CLASIFICACION_ACTIVADA && !form.categoria_id && categorias.length > 0) {
      try {
        const resultado = await clasificarTransaccion(form.descripcion, categorias)
        if (resultado.categoria) {
          const categoriaEncontrada = categorias.find(
            c => c.nombre.toLowerCase() === resultado.categoria.toLowerCase()
          )
          if (categoriaEncontrada) {
            categoria_id = categoriaEncontrada.id
            clasificado_por = 'ia'
            confianza_ia = resultado.confianza
            necesita_revision = resultado.necesita_revision
          }
        }
      } catch (e) {
        console.error('Error clasificando:', e)
      }
    }

    const { error } = await supabase.from('transacciones').insert({
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      tipo: form.tipo,
      cuenta_id: form.cuenta_id || null,
      categoria_id,
      user_id: user.id,
      origen: 'manual',
      clasificado_por,
      confianza_ia,
      necesita_revision
    })

    if (error) {
      console.error('Error:', error)
      setLoading(false)
      return
    }

    setForm({
      descripcion: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'gasto',
      cuenta_id: '',
      categoria_id: ''
    })
    setMostrarForm(false)
    cargarDatos()
    setLoading(false)
  }

  const abrirEditor = (t) => {
    setTransaccionEditandoId(t.id)
    setFormEditar({
      descripcion: t.descripcion || '',
      monto: t.monto || '',
      fecha: t.fecha || '',
      tipo: t.tipo || 'gasto',
      cuenta_id: t.cuenta_id || '',
      categoria_id: t.categoria_id || ''
    })
  }

  const cerrarEditor = () => {
    setTransaccionEditandoId(null)
  }

  const guardarEdicion = async () => {
    if (!formEditar.descripcion || !formEditar.monto) return
    setGuardandoEdicion(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('transacciones').update({
      descripcion: formEditar.descripcion,
      monto: parseFloat(formEditar.monto),
      fecha: formEditar.fecha,
      tipo: formEditar.tipo,
      cuenta_id: formEditar.cuenta_id || null,
      categoria_id: formEditar.categoria_id || null,
      clasificado_por: formEditar.categoria_id ? 'usuario' : null,
      necesita_revision: !formEditar.categoria_id
    }).eq('id', transaccionEditandoId)

    if (error) {
      setGuardandoEdicion(false)
      alert('Error al guardar los cambios: ' + error.message)
      return
    }

    if (formEditar.categoria_id) {
      const { data: reglaExistente } = await supabase
        .from('reglas_ia')
        .select('*')
        .eq('user_id', user.id)
        .eq('patron', formEditar.descripcion)
        .single()

      if (reglaExistente) {
        await supabase.from('reglas_ia').update({
          categoria_id: formEditar.categoria_id,
          veces_usado: reglaExistente.veces_usado + 1
        }).eq('id', reglaExistente.id)
      } else {
        await supabase.from('reglas_ia').insert({
          user_id: user.id,
          patron: formEditar.descripcion,
          categoria_id: formEditar.categoria_id
        })
      }
    }

    setGuardandoEdicion(false)
    setTransaccionEditandoId(null)
    cargarDatos()
  }

  const abrirModalCategoria = (origen) => {
    setOrigenModalCategoria(origen)
    setMostrarModalCategoria(true)
  }

  const manejarCategoriaCreada = async (nuevaCategoria) => {
    await cargarDatos()

    if (origenModalCategoria === 'form') {
      setForm(f => ({ ...f, categoria_id: nuevaCategoria.id }))
    } else if (origenModalCategoria === 'editar') {
      setFormEditar(f => ({ ...f, categoria_id: nuevaCategoria.id }))
    }

    setMostrarModalCategoria(false)
    setOrigenModalCategoria(null)
  }

  const manejarTipoCreado = async () => {
    await cargarDatos()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    await supabase.from('transacciones').delete().eq('id', id)
    cargarDatos()
  }

  const formatMonto = (monto, tipo) => {
    const formatted = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto)
    return tipo === 'gasto' ? `-${formatted}` : `+${formatted}`
  }

  const bancosUnicos = [...new Set(cuentas.map(c => c.banco).filter(Boolean))].sort()

  const transaccionesFiltradas = filtroBanco === 'todos'
    ? transacciones
    : transacciones.filter(t => t.cuentas?.banco === filtroBanco)

  const categoriasPersonales = categorias.filter(c => c.tipo === 'personal')
  const categoriasEmpresariales = categorias.filter(c => c.tipo === 'empresarial')
  const categoriasOtrosTipos = categorias.filter(c => c.tipo !== 'personal' && c.tipo !== 'empresarial')

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <EstilosGlobales />
      <div className="max-w-4xl mx-auto">

        {mostrarModalCategoria && (
          <ModalNuevaCategoria
            onCerrar={() => { setMostrarModalCategoria(false); setOrigenModalCategoria(null) }}
            onCategoriaCreada={manejarCategoriaCreada}
            onTipoCreado={manejarTipoCreado}
          />
        )}

        {/* Modal: Nueva transacción (estilo neon) */}
        {mostrarForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4 font-body">
            <div className="bg-[#131829] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#262E4A] shadow-2xl max-h-[90vh] overflow-y-auto glow-cian">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-white">Nueva transacción</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Descripción</label>
                  <input
                    placeholder="Ej: Almuerzo Jumbo"
                    value={form.descripcion}
                    onChange={e => setForm({...form, descripcion: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Monto (CLP)</label>
                  <input
                    type="number"
                    placeholder="Ej: 15000"
                    value={form.monto}
                    onChange={e => setForm({...form, monto: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({...form, tipo: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base"
                  >
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Cuenta</label>
                  <select
                    value={form.cuenta_id}
                    onChange={e => setForm({...form, cuenta_id: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base"
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} — {c.banco}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">
                    Categoría <span className="text-[#5A6288]">(opcional{IA_CLASIFICACION_ACTIVADA ? ' — la IA la detecta sola' : ''})</span>
                  </label>
                  <select
                    value={form.categoria_id}
                    onChange={e => {
                      if (e.target.value === '__nueva__') {
                        abrirModalCategoria('form')
                        return
                      }
                      setForm({...form, categoria_id: e.target.value})
                    }}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] transition text-base"
                  >
                    <option value="">{IA_CLASIFICACION_ACTIVADA ? 'Sin categoría — clasificar con IA' : 'Sin categoría — marcar para revisar'}</option>
                    <optgroup label="Personal">
                      {categoriasPersonales.map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Empresarial">
                      {categoriasEmpresariales.map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                    {categoriasOtrosTipos.length > 0 && (
                      <optgroup label="Otros tipos">
                        {categoriasOtrosTipos.map(c => (
                          <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__nueva__">+ Agregar nueva categoría</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMostrarForm(false)}
                  className="flex-1 bg-[#1B2138] hover:bg-[#232A47] text-white font-bold py-3 rounded-xl transition border border-[#262E4A]"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarTransaccion}
                  disabled={loading}
                  className="flex-1 bg-[#00E5FF] hover:bg-[#33ebff] disabled:opacity-50 text-[#0B0E1A] font-bold py-3 rounded-xl transition glow-cian"
                >
                  {loading ? (IA_CLASIFICACION_ACTIVADA ? '🤖 Clasificando...' : 'Guardando...') : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar transacción (estilo neon) */}
        {transaccionEditandoId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4 font-body">
            <div className="bg-[#131829] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#262E4A] shadow-2xl max-h-[90vh] overflow-y-auto glow-violeta">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 font-display text-white">Editar transacción</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Descripción</label>
                  <input
                    value={formEditar.descripcion}
                    onChange={e => setFormEditar({...formEditar, descripcion: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Monto (CLP)</label>
                  <input
                    type="number"
                    value={formEditar.monto}
                    onChange={e => setFormEditar({...formEditar, monto: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={formEditar.fecha}
                    onChange={e => setFormEditar({...formEditar, fecha: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                  />
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Tipo</label>
                  <select
                    value={formEditar.tipo}
                    onChange={e => setFormEditar({...formEditar, tipo: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                  >
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Cuenta</label>
                  <select
                    value={formEditar.cuenta_id}
                    onChange={e => setFormEditar({...formEditar, cuenta_id: e.target.value})}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} — {c.banco}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#8891B0] text-sm mb-1 block">Categoría</label>
                  <select
                    value={formEditar.categoria_id}
                    onChange={e => {
                      if (e.target.value === '__nueva__') {
                        abrirModalCategoria('editar')
                        return
                      }
                      setFormEditar({...formEditar, categoria_id: e.target.value})
                    }}
                    className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] transition text-base"
                  >
                    <option value="">Sin categoría</option>
                    <optgroup label="Personal">
                      {categoriasPersonales.map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Empresarial">
                      {categoriasEmpresariales.map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                    {categoriasOtrosTipos.length > 0 && (
                      <optgroup label="Otros tipos">
                        {categoriasOtrosTipos.map(c => (
                          <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__nueva__">+ Agregar nueva categoría</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cerrarEditor}
                  className="flex-1 bg-[#1B2138] hover:bg-[#232A47] text-white font-bold py-3 rounded-xl transition border border-[#262E4A]"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicion}
                  disabled={guardandoEdicion}
                  className="flex-1 bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition glow-violeta"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Transacciones</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Todos tus movimientos</p>
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
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition text-sm sm:text-base"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Filtro por banco */}
        {bancosUnicos.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setFiltroBanco('todos')}
              className={`px-4 py-2 rounded-xl transition whitespace-nowrap text-sm sm:text-base ${filtroBanco === 'todos' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              Todos los bancos
            </button>
            {bancosUnicos.map(banco => (
              <button
                key={banco}
                onClick={() => setFiltroBanco(banco)}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap text-sm sm:text-base ${filtroBanco === banco ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                {banco}
              </button>
            ))}
          </div>
        )}

        {/* Lista de transacciones */}
        {transaccionesFiltradas.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 sm:p-12 text-center">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-gray-400">
              {filtroBanco === 'todos' ? 'No hay transacciones aún' : `No hay transacciones de ${filtroBanco}`}
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            {transaccionesFiltradas.map((t, i) => (
              <div
                key={t.id}
                className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:p-4 ${i !== transaccionesFiltradas.length - 1 ? 'border-b border-gray-800' : ''}`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                    {t.categorias?.icono || (t.tipo === 'gasto' ? '↓' : '↑')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.descripcion}</p>
                    <p className="text-gray-400 text-xs sm:text-sm truncate">
                      {t.cuentas?.banco} · {t.fecha}
                      {t.categorias && ` · ${t.categorias.nombre}`}
                      {t.clasificado_por === 'ia' && (
                        <span className="text-purple-400 ml-1">· 🤖 IA</span>
                      )}
                      {t.clasificado_por === 'regla' && (
                        <span className="text-blue-400 ml-1">· 📚 Regla</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className={`font-semibold text-sm sm:text-base whitespace-nowrap ${t.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                      {formatMonto(t.monto, t.tipo)}
                    </p>
                    {t.necesita_revision && (
                      <p className="text-yellow-400 text-xs">⚠ Revisar</p>
                    )}
                  </div>
                  <button
                    onClick={() => abrirEditor(t)}
                    className="text-gray-600 hover:text-blue-400 transition text-sm px-2 py-1 rounded-lg hover:bg-gray-800"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminar(t.id)}
                    className="text-gray-600 hover:text-red-400 transition text-sm px-2 py-1 rounded-lg hover:bg-gray-800"
                  >
                    🗑️
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

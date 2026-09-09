'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

function ModalNuevaCategoria({ onCerrar, onCategoriaCreada, onTipoCreado, tipoPreseleccionado }) {
  const [panel, setPanel] = useState('eleccion')
  const [loading, setLoading] = useState(false)
  const [tiposExistentes, setTiposExistentes] = useState(['personal', 'empresarial'])
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])
  const [mensajeExito, setMensajeExito] = useState('')

  const [formCategoria, setFormCategoria] = useState({
    nombre: '', tipo: tipoPreseleccionado || 'personal', color: '#00E5FF', icono: '📦'
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
    cargarTipos()
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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

export default function Presupuestos() {
  const [categorias, setCategorias] = useState([])
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [gastosCategoria, setGastosCategoria] = useState([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [vistaActual, setVistaActual] = useState('personal')
  const [mostrarModalCategoria, setMostrarModalCategoria] = useState(false)

  // Valores en edición: { [categoria_id]: '150000' }
  const [montos, setMontos] = useState({})
  const [guardandoId, setGuardandoId] = useState(null)
  const [guardadoId, setGuardadoId] = useState(null)

  const mesActual = new Date().getMonth() + 1
  const añoActual = new Date().getFullYear()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const [{ data: cats }, { data: pres }, { data: gastos }, { data: tipos }] = await Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('presupuestos')
        .select('*')
        .eq('mes', mesActual)
        .eq('año', añoActual),
      supabase.rpc('get_gastos_por_categoria', {
        p_user_id: user.id,
        p_mes: mesActual,
        p_año: añoActual
      }),
      supabase.from('tipos_categoria').select('*')
    ])

    setCategorias(cats || [])
    setPresupuestos(pres || [])
    setGastosCategoria(gastos || [])
    setTiposPersonalizados(tipos || [])

    // Inicializar los inputs con los montos ya guardados
    const montosIniciales = {}
    ;(pres || []).forEach(p => {
      montosIniciales[p.categoria_id] = String(p.monto)
    })
    setMontos(montosIniciales)

    setLoading(false)
  }

  const tiposExistentes = [...new Set([
    'personal', 'empresarial',
    ...tiposPersonalizados.map(t => t.nombre),
    ...categorias.map(c => c.tipo)
  ])]

  const obtenerIconoTipo = (tipo) => {
    if (ICONOS_TIPO_DEFAULT[tipo]) return ICONOS_TIPO_DEFAULT[tipo]
    return tiposPersonalizados.find(t => t.nombre === tipo)?.icono || '🗂️'
  }

  const categoriasDelTipo = categorias.filter(c => c.tipo === vistaActual)

  const getGastado = (categoria_id) => {
    const gasto = gastosCategoria.find(g => g.categoria_id === categoria_id)
    return gasto?.total_gastado || 0
  }

  const getPresupuestoGuardado = (categoria_id) => {
    return presupuestos.find(p => p.categoria_id === categoria_id)
  }

  const guardarMonto = async (categoria) => {
    const { data: { user } } = await supabase.auth.getUser()
    const valorTexto = montos[categoria.id] || ''
    const valor = parseFloat(valorTexto)

    setGuardandoId(categoria.id)

    if (!valorTexto || isNaN(valor) || valor <= 0) {
      // Si lo dejaron vacío o en 0, y ya existía un presupuesto, lo eliminamos
      const existente = getPresupuestoGuardado(categoria.id)
      if (existente) {
        await supabase.from('presupuestos').delete().eq('id', existente.id)
      }
    } else {
      await supabase.from('presupuestos').upsert({
        user_id: user.id,
        categoria_id: categoria.id,
        monto: valor,
        mes: mesActual,
        año: añoActual,
        tipo: categoria.tipo
      }, { onConflict: 'user_id,categoria_id,mes,año' })
    }

    await cargarDatos()
    setGuardandoId(null)
    setGuardadoId(categoria.id)
    setTimeout(() => setGuardadoId(null), 1500)
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

  const manejarCategoriaCreada = async (nuevaCategoria) => {
    await cargarDatos()
    setVistaActual(nuevaCategoria.tipo)
    setMostrarModalCategoria(false)
  }

  const manejarTipoCreado = async () => {
    await cargarDatos()
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(monto || 0)
  }

  const mesNombre = new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <EstilosGlobales />
      <div className="max-w-4xl mx-auto">

        {mostrarModalCategoria && (
          <ModalNuevaCategoria
            onCerrar={() => setMostrarModalCategoria(false)}
            onCategoriaCreada={manejarCategoriaCreada}
            onTipoCreado={manejarTipoCreado}
            tipoPreseleccionado={vistaActual}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">🎯 Presupuestos</h1>
            <p className="text-gray-400 mt-1 capitalize text-sm sm:text-base">{mesNombre}</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 sm:flex-wrap sm:justify-end">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-800 hover:bg-gray-700 px-3 sm:px-4 py-2 rounded-xl transition text-sm sm:text-base"
            >
              ← Volver
            </button>
            <button
              onClick={verificarPresupuestos}
              className="bg-yellow-600 hover:bg-yellow-500 px-3 sm:px-4 py-2 rounded-xl transition text-sm sm:text-base"
            >
              🔔 Alertas
            </button>
            <button
              onClick={generarConIA}
              disabled={generando}
              className="bg-purple-600 hover:bg-purple-500 px-3 sm:px-4 py-2 rounded-xl transition disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              {generando ? '🤖 Generando...' : '🤖 Sugerir IA'}
            </button>
          </div>
        </div>

        {/* Tabs de tipo (dinámico) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tiposExistentes.map(tipo => (
            <button
              key={tipo}
              onClick={() => setVistaActual(tipo)}
              className={`px-4 py-2 rounded-xl transition whitespace-nowrap text-sm sm:text-base capitalize ${vistaActual === tipo ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              {obtenerIconoTipo(tipo)} {tipo}
            </button>
          ))}
        </div>

        {/* Lista editable de todas las categorías del tipo seleccionado */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : categoriasDelTipo.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 sm:p-12 text-center">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-white font-semibold text-lg sm:text-xl capitalize">Sin categorías en "{vistaActual}"</p>
            <p className="text-gray-400 mt-2 text-sm sm:text-base mb-4">Crea una categoría primero para poder asignarle presupuesto</p>
            <button
              onClick={() => setMostrarModalCategoria(true)}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl transition"
            >
              + Crear categoría
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categoriasDelTipo.map(cat => {
              const gastado = getGastado(cat.id)
              const presupuestoGuardado = getPresupuestoGuardado(cat.id)
              const montoActual = parseFloat(montos[cat.id] || 0)
              const porcentaje = montoActual > 0 ? Math.min((gastado / montoActual) * 100, 100) : 0
              const sobrepasado = presupuestoGuardado && gastado > presupuestoGuardado.monto
              const cambioSinGuardar = String(montos[cat.id] || '') !== String(presupuestoGuardado?.monto || '')

              return (
                <div key={cat.id} className="bg-gray-900 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-2xl flex-shrink-0">{cat.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cat.nombre}</p>
                      <p className="text-gray-500 text-xs">Gastado este mes: {formatMonto(gastado)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        placeholder="$0"
                        value={montos[cat.id] || ''}
                        onChange={e => setMontos({ ...montos, [cat.id]: e.target.value })}
                        className="w-28 sm:w-36 bg-gray-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-right"
                      />
                      <button
                        onClick={() => guardarMonto(cat)}
                        disabled={guardandoId === cat.id || !cambioSinGuardar}
                        className={`px-3 py-2 rounded-xl text-sm transition whitespace-nowrap ${
                          guardadoId === cat.id
                            ? 'bg-green-600'
                            : cambioSinGuardar
                              ? 'bg-blue-600 hover:bg-blue-500'
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {guardandoId === cat.id ? '...' : guardadoId === cat.id ? '✓' : 'Guardar'}
                      </button>
                    </div>
                  </div>

                  {presupuestoGuardado && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-400">
                          {formatMonto(gastado)} de {formatMonto(presupuestoGuardado.monto)}
                        </p>
                        <p className={`text-xs font-bold ${sobrepasado ? 'text-red-400' : porcentaje > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {sobrepasado ? '⚠️ ' : ''}{Math.round(porcentaje)}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${sobrepasado ? 'bg-red-500' : porcentaje > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <button
              onClick={() => setMostrarModalCategoria(true)}
              className="w-full bg-gray-900 hover:bg-gray-800 border border-dashed border-gray-700 rounded-2xl p-4 text-center text-gray-400 hover:text-white transition text-sm sm:text-base"
            >
              + Agregar otra categoría a "{vistaActual}"
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

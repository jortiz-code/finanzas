'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { clasificarTransaccion } from '@/lib/clasificar'

// Flag temporal: la IA no está clasificando bien las categorías, así que
// por ahora la desactivamos y las transacciones sin categoría manual
// quedan como "necesita revisión". Para reactivarla, cambiar a true.
const IA_CLASIFICACION_ACTIVADA = false

const ICONOS_TIPO_DEFAULT = { personal: '👤', empresarial: '🏢' }

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
        className="w-full bg-gray-950 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition text-base flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">{valor || '📦'}</span>
          <span className="text-gray-400 text-sm">Elegir ícono</span>
        </span>
        <span className="text-gray-500">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-2xl max-h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {ICONOS_DISPONIBLES.map((icono, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onSeleccionar(icono); setAbierto(false) }}
                className={`text-xl p-1.5 rounded-lg hover:bg-gray-700 transition ${valor === icono ? 'bg-blue-600/20 ring-1 ring-blue-500' : ''}`}
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
  const [panel, setPanel] = useState('eleccion') // 'eleccion' | 'categoria' | 'tipo'
  const [loading, setLoading] = useState(false)
  const [tiposExistentes, setTiposExistentes] = useState(['personal', 'empresarial'])
  const [tiposPersonalizados, setTiposPersonalizados] = useState([])

  const [formCategoria, setFormCategoria] = useState({
    nombre: '', tipo: 'personal', color: '#3b82f6', icono: '📦'
  })
  const [formTipo, setFormTipo] = useState({ nombre: '', icono: '🗂️' })

  useEffect(() => {
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
      setFormCategoria(f => ({ ...f, tipo: combinados[0] || 'personal' }))
    }
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
    if (!error && data) {
      onCategoriaCreada(data)
    }
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

    setLoading(false)
    if (error) {
      alert(error.code === '23505' ? 'Ya existe un tipo con ese nombre' : 'Error al guardar')
      return
    }
    onTipoCreado(nombreLimpio)
    setPanel('eleccion')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 max-w-md w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">

        {panel === 'eleccion' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4">¿Qué quieres agregar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPanel('categoria')}
                className="bg-gray-950 border border-gray-700 hover:border-blue-500 rounded-2xl p-5 text-left transition"
              >
                <p className="text-3xl mb-2">🏷️</p>
                <p className="font-semibold">Nueva categoría</p>
                <p className="text-gray-400 text-sm mt-1">Ej: Gimnasio, Mascotas, Netflix</p>
              </button>
              <button
                onClick={() => setPanel('tipo')}
                className="bg-gray-950 border border-gray-700 hover:border-purple-500 rounded-2xl p-5 text-left transition"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="font-semibold">Nuevo tipo</p>
                <p className="text-gray-400 text-sm mt-1">Ej: Inversiones, Familiar, Ahorro</p>
              </button>
            </div>
            <button onClick={onCerrar} className="mt-4 text-gray-400 hover:text-white text-sm transition">
              Cancelar
            </button>
          </>
        )}

        {panel === 'categoria' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Nueva categoría</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Nombre</label>
                <input
                  placeholder="Ej: Gimnasio"
                  value={formCategoria.nombre}
                  onChange={e => setFormCategoria({...formCategoria, nombre: e.target.value})}
                  className="w-full bg-gray-950 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
                <select
                  value={formCategoria.tipo}
                  onChange={e => setFormCategoria({...formCategoria, tipo: e.target.value})}
                  className="w-full bg-gray-950 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition text-base capitalize"
                >
                  {tiposExistentes.map(t => (
                    <option key={t} value={t}>{obtenerIconoTipo(t)} {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Ícono</label>
                <SelectorIcono valor={formCategoria.icono} onSeleccionar={(icono) => setFormCategoria({...formCategoria, icono})} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Color</label>
                <input
                  type="color"
                  value={formCategoria.color}
                  onChange={e => setFormCategoria({...formCategoria, color: e.target.value})}
                  className="w-full bg-gray-950 rounded-xl px-2 py-2 outline-none h-12 border border-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={guardarCategoria}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-xl transition"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setPanel('eleccion')} className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-xl transition">
                ← Volver
              </button>
            </div>
          </>
        )}

        {panel === 'tipo' && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Nuevo tipo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Nombre del tipo</label>
                <input
                  placeholder="Ej: Inversiones"
                  value={formTipo.nombre}
                  onChange={e => setFormTipo({...formTipo, nombre: e.target.value})}
                  className="w-full bg-gray-950 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Ícono</label>
                <SelectorIcono valor={formTipo.icono} onSeleccionar={(icono) => setFormTipo({...formTipo, icono})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={guardarTipo}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-xl transition"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setPanel('eleccion')} className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-xl transition">
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
  const [editando, setEditando] = useState(null)
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

  // Modal de nueva categoría/tipo: 'origenModalCategoria' guarda de dónde
  // se abrió, para saber qué hacer cuando se crea la categoría:
  // 'form' = el formulario de nueva transacción
  // objeto transacción = el editor inline de una transacción existente
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

  const corregirCategoria = async (transaccion, categoria_id) => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('transacciones').update({
      categoria_id,
      clasificado_por: 'usuario',
      necesita_revision: false
    }).eq('id', transaccion.id)

    const { data: reglaExistente } = await supabase
      .from('reglas_ia')
      .select('*')
      .eq('user_id', user.id)
      .eq('patron', transaccion.descripcion)
      .single()

    if (reglaExistente) {
      await supabase.from('reglas_ia').update({
        categoria_id,
        veces_usado: reglaExistente.veces_usado + 1
      }).eq('id', reglaExistente.id)
    } else {
      await supabase.from('reglas_ia').insert({
        user_id: user.id,
        patron: transaccion.descripcion,
        categoria_id
      })
    }

    setEditando(null)
    cargarDatos()
  }

  // Se llama cuando el select de categoría (en cualquiera de los 3 lugares)
  // recibe la opción "+ Agregar nueva categoría"
  const abrirModalCategoria = (origen) => {
    setOrigenModalCategoria(origen)
    setMostrarModalCategoria(true)
  }

  const manejarCategoriaCreada = async (nuevaCategoria) => {
    const catsActualizadas = await cargarDatos()

    if (origenModalCategoria === 'form') {
      setForm(f => ({ ...f, categoria_id: nuevaCategoria.id }))
    } else if (origenModalCategoria && origenModalCategoria.id) {
      // era una transacción existente (editor inline)
      await corregirCategoria(origenModalCategoria, nuevaCategoria.id)
    }

    setMostrarModalCategoria(false)
    setOrigenModalCategoria(null)
  }

  const manejarTipoCreado = async () => {
    // Solo se creó un tipo (no una categoría), refrescamos y dejamos el
    // modal abierto en la pantalla de elección para que puedan seguir
    // y crear la categoría de ese tipo nuevo si quieren.
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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {mostrarModalCategoria && (
          <ModalNuevaCategoria
            onCerrar={() => { setMostrarModalCategoria(false); setOrigenModalCategoria(null) }}
            onCategoriaCreada={manejarCategoriaCreada}
            onTipoCreado={manejarTipoCreado}
          />
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

        {/* Formulario nueva transacción */}
        {mostrarForm && (
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Nueva transacción</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Descripción</label>
                <input
                  placeholder="Ej: Almuerzo Jumbo"
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Monto (CLP)</label>
                <input
                  type="number"
                  placeholder="Ej: 15000"
                  value={form.monto}
                  onChange={e => setForm({...form, monto: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({...form, fecha: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Cuenta</label>
                <select
                  value={form.cuenta_id}
                  onChange={e => setForm({...form, cuenta_id: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="">Selecciona una cuenta</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} — {c.banco}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Categoría <span className="text-gray-600">(opcional{IA_CLASIFICACION_ACTIVADA ? ' — la IA la detecta sola' : ''})</span>
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
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="">{IA_CLASIFICACION_ACTIVADA ? 'Sin categoría — clasificar con IA' : 'Sin categoría — marcar para revisar'}</option>
                  <optgroup label="Personal">
                    {categorias.filter(c => c.tipo === 'personal').map(c => (
                      <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Empresarial">
                    {categorias.filter(c => c.tipo === 'empresarial').map(c => (
                      <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                    ))}
                  </optgroup>
                  {categorias.filter(c => c.tipo !== 'personal' && c.tipo !== 'empresarial').length > 0 && (
                    <optgroup label="Otros tipos">
                      {categorias.filter(c => c.tipo !== 'personal' && c.tipo !== 'empresarial').map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__nueva__">+ Agregar nueva categoría</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={agregarTransaccion}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl transition"
              >
                {loading ? (IA_CLASIFICACION_ACTIVADA ? '🤖 Clasificando...' : 'Guardando...') : 'Guardar'}
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
              <div key={t.id}>
                <div
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
                      onClick={() => setEditando(editando === t.id ? null : t.id)}
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

                {/* Panel de edición */}
                {editando === t.id && (
                  <div className="px-3 sm:px-4 pb-4 bg-gray-850 border-b border-gray-800">
                    <div className="bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-2">Corregir categoría:</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          defaultValue={t.categoria_id || ''}
                          onChange={e => {
                            if (e.target.value === '__nueva__') {
                              abrirModalCategoria(t)
                              return
                            }
                            if (e.target.value) corregirCategoria(t, e.target.value)
                          }}
                          className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        >
                          <option value="" disabled>Selecciona categoría...</option>
                          <optgroup label="Personal">
                            {categorias.filter(c => c.tipo === 'personal').map(c => (
                              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Empresarial">
                            {categorias.filter(c => c.tipo === 'empresarial').map(c => (
                              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                            ))}
                          </optgroup>
                          {categorias.filter(c => c.tipo !== 'personal' && c.tipo !== 'empresarial').length > 0 && (
                            <optgroup label="Otros tipos">
                              {categorias.filter(c => c.tipo !== 'personal' && c.tipo !== 'empresarial').map(c => (
                                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                              ))}
                            </optgroup>
                          )}
                          <option value="__nueva__">+ Agregar nueva categoría</option>
                        </select>
                        <button
                          onClick={() => setEditando(null)}
                          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl transition text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

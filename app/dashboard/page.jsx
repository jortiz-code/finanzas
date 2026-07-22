'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// SetupModal Component
function SetupModal({ onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bancos, setBancos] = useState([])
  const [form, setForm] = useState({
    nombre_cuenta: '',
    banco: '',
    tipo: 'Corriente',
    rut: ''
  })

  const tipos = ['Corriente', 'Ahorro', 'Inversión']

  useEffect(() => {
    const cargarBancos = async () => {
      const { data } = await supabase.from('bancos').select('*')
      setBancos(data || [])
    }
    cargarBancos()
  }, [])

  const cambiarBanco = (bancoNombre) => {
    setForm({
      ...form,
      banco: bancoNombre
    })
  }

  const guardarCuenta = async () => {
    if (!form.nombre_cuenta || !form.banco || !form.tipo) {
      alert('Completa todos los campos')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const bancoSeleccionado = bancos.find(b => b.nombre === form.banco)
    const emailsArray = bancoSeleccionado?.emails ? JSON.parse(bancoSeleccionado.emails) : []

    const { error: errorCuenta } = await supabase.from('cuentas').insert({
      user_id: user.id,
      nombre: form.nombre_cuenta,
      banco: form.banco,
      tipo: form.tipo,
      emails: emailsArray,
      activa: true
    })

    if (form.rut) {
      const password = form.rut.replace(/\D/g, '').slice(-4)
      await supabase.from('configuracion_usuarios').upsert({
        user_id: user.id,
        cartola_password: password
      })
    }

    setLoading(false)
    if (!errorCuenta) setStep(2)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-4xl sm:text-5xl mb-3">👋</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">¡Bienvenido!</h2>
              <p className="text-gray-400 mt-2 text-sm sm:text-base">Configuremos tu primera cuenta bancaria</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Nombre de la cuenta</label>
                <input
                  type="text"
                  placeholder="Ej: Mi Cuenta Corriente"
                  value={form.nombre_cuenta}
                  onChange={e => setForm({...form, nombre_cuenta: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Banco</label>
                <select
                  value={form.banco}
                  onChange={e => cambiarBanco(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
                >
                  <option value="">Selecciona tu banco</option>
                  {bancos.map(b => (<option key={b.id} value={b.nombre}>{b.nombre}</option>))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tipo de cuenta</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
                >
                  {tipos.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tu RUT (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 19.279.611-K"
                  value={form.rut}
                  onChange={e => setForm({...form, rut: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
                />
                <p className="text-gray-500 text-xs mt-1">Para desencriptar cartolas PDF automáticamente</p>
              </div>
            </div>

            <button
              onClick={guardarCuenta}
              disabled={loading}
              className="w-full mt-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? '⏳ Guardando...' : '✅ Continuar'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl mb-4">✅</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">¡Todo listo!</h2>
              <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">Tu cuenta ha sido configurada correctamente.</p>

              <div className="bg-gray-800 rounded-2xl p-4 mb-6 sm:mb-8 space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">📂</span>
                  <p className="text-gray-300 text-sm sm:text-base"><strong>Importar cartolas</strong> desde el menú</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">💸</span>
                  <p className="text-gray-300 text-sm sm:text-base"><strong>Agregar transacciones</strong> manualmente</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">🎯</span>
                  <p className="text-gray-300 text-sm sm:text-base"><strong>Crear presupuestos</strong> por categoría</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">🧠</span>
                  <p className="text-gray-300 text-sm sm:text-base"><strong>Ver análisis IA</strong> de tus finanzas</p>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition"
              >
                Empezar a usar la app
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// EditarTransaccionModal Component
function EditarTransaccionModal({ transaccion, categorias, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    descripcion: transaccion?.descripcion || '',
    monto: transaccion?.monto || '',
    tipo: transaccion?.tipo || 'gasto',
    fecha: transaccion?.fecha || '',
    categoria_id: transaccion?.categoria_id || ''
  })

  const guardar = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('transacciones')
      .update({
        descripcion: form.descripcion,
        monto: parseFloat(form.monto),
        tipo: form.tipo,
        fecha: form.fecha,
        categoria_id: form.categoria_id || null
      })
      .eq('id', transaccion.id)

    setLoading(false)
    if (!error) {
      onComplete()
    } else {
      alert('Error al actualizar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Editar Transacción</h2>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Monto</label>
            <input
              type="number"
              value={form.monto}
              onChange={e => setForm({...form, monto: e.target.value})}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={e => setForm({...form, categoria_id: e.target.value})}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({...form, tipo: e.target.value})}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
            >
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm({...form, fecha: e.target.value})}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-base"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
          >
            {loading ? '⏳ Guardando...' : '✅ Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [usuario, setUsuario] = useState(null)
  const [kpis, setKpis] = useState({ total_gastos: 0, total_ingresos: 0, pendientes: 0 })
  const [kpisMesAnterior, setKpisMesAnterior] = useState({ total_gastos: 0, total_ingresos: 0 })
  const [gastosPorCategoria, setGastosPorCategoria] = useState([])
  const [presupuestosMes, setPresupuestosMes] = useState([])
  const [alertasActivas, setAlertasActivas] = useState([])
  const [transacciones, setTransacciones] = useState([])
  const [transaccionesPendientes, setTransaccionesPendientes] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [gastosMes, setGastosMes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarSetup, setMostrarSetup] = useState(false)
  const [transaccionEditando, setTransaccionEditando] = useState(null)

  const mesActual = new Date().getMonth() + 1
  const añoActual = new Date().getFullYear()

  const cargarDatos = async (user) => {
    const { data: kpis_data } = await supabase.rpc('get_kpis', {
      p_user_id: user.id,
      p_mes: mesActual,
      p_año: añoActual
    })
    if (kpis_data) setKpis(kpis_data)

    // Mes anterior, para la comparación
    let mesAnteriorNum = mesActual - 1
    let añoMesAnterior = añoActual
    if (mesAnteriorNum === 0) {
      mesAnteriorNum = 12
      añoMesAnterior = añoActual - 1
    }
    const { data: kpisAnterior } = await supabase.rpc('get_kpis', {
      p_user_id: user.id,
      p_mes: mesAnteriorNum,
      p_año: añoMesAnterior
    })
    if (kpisAnterior) setKpisMesAnterior(kpisAnterior)

    // Gastos por categoría del mes, para saber la categoría top
    const { data: gastosCat } = await supabase.rpc('get_gastos_por_categoria', {
      p_user_id: user.id,
      p_mes: mesActual,
      p_año: añoActual
    })
    setGastosPorCategoria(gastosCat || [])

    // Presupuestos del mes, para el % usado
    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('user_id', user.id)
      .eq('mes', mesActual)
      .eq('año', añoActual)
    setPresupuestosMes(presupuestos || [])

    // Alertas activas sin revisar
    const { data: alertas } = await supabase
      .from('alertas')
      .select('*')
      .eq('user_id', user.id)
      .eq('resuelta', false)
    setAlertasActivas(alertas || [])

    const { data: trans } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(10)
    setTransacciones(trans || [])

    const { data: pendientes } = await supabase
      .from('transacciones_pendientes')
      .select('*')
      .eq('user_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    setTransaccionesPendientes(pendientes || [])

    const { data: ctas } = await supabase
      .from('cuentas')
      .select('*')
      .eq('user_id', user.id)
    setCuentas(ctas || [])

    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
    setCategorias(cats || [])

    if (!ctas || ctas.length === 0) {
      setMostrarSetup(true)
    }

    const meses = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(añoActual, mesActual - 1 - i, 1)
      const mes = fecha.getMonth() + 1
      const año = fecha.getFullYear()
      const nombreMes = fecha.toLocaleString('es-CL', { month: 'short' }).slice(0, 3)

      const { data: gastos_mes } = await supabase.rpc('get_kpis', {
        p_user_id: user.id,
        p_mes: mes,
        p_año: año
      })

      meses.push({
        date: nombreMes,
        income: (gastos_mes?.total_ingresos || 0) / 1000
      })
    }
    setGastosMes(meses)

    setLoading(false)
  }

  useEffect(() => {
    const cargarTodo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return window.location.href = '/auth'

      setUsuario(user)
      cargarDatos(user)
    }

    cargarTodo()
  }, [])

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(monto)
  }

  const obtenerCategoria = (categoriaId) => {
    return categorias.find(c => c.id === categoriaId)
  }

  const irA = (path) => {
    window.location.href = path
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl sm:text-2xl">Cargando...</p>
    </div>
  )

  // --- Cálculos derivados para los KPIs nuevos ---

  const balanceNeto = kpis.total_ingresos - kpis.total_gastos

  const cambioMesAnterior = kpisMesAnterior?.total_gastos > 0
    ? ((kpis.total_gastos - kpisMesAnterior.total_gastos) / kpisMesAnterior.total_gastos) * 100
    : null

  const categoriaTop = gastosPorCategoria.length > 0
    ? [...gastosPorCategoria].sort((a, b) => (b.total_gastado || 0) - (a.total_gastado || 0))[0]
    : null

  const hoy = new Date()
  const diaActual = hoy.getDate()
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const proyeccionMes = diaActual > 0 ? (kpis.total_gastos / diaActual) * diasEnMes : 0

  const totalPresupuestado = presupuestosMes.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const idsConPresupuesto = new Set(presupuestosMes.map(p => p.categoria_id))
  const totalGastadoConPresupuesto = gastosPorCategoria
    .filter(g => idsConPresupuesto.has(g.categoria_id))
    .reduce((acc, g) => acc + Number(g.total_gastado || 0), 0)
  const pctPresupuestoUsado = totalPresupuestado > 0
    ? (totalGastadoConPresupuesto / totalPresupuestado) * 100
    : null
  const montoDisponiblePresupuesto = totalPresupuestado - totalGastadoConPresupuesto

  const navItems = [
    { path: '/dashboard', icon: '📊', title: 'Dashboard' },
    { path: '/dashboard/cuentas', icon: '💳', title: 'Cuentas' },
    { path: '/dashboard/transacciones', icon: '💸', title: 'Transacciones' },
    { path: '/dashboard/reportes', icon: '📈', title: 'Reportes' },
    { path: '/dashboard/presupuestos', icon: '🎯', title: 'Presupuestos' },
    { path: '/dashboard/alertas', icon: '⚠️', title: 'Alertas' },
    { path: '/dashboard/inteligencia', icon: '🧠', title: 'Inteligencia' },
    { path: '/dashboard/configuracion', icon: '⚙️', title: 'Configuración' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 lg:pb-0">
      {mostrarSetup && <SetupModal onComplete={() => {
        setMostrarSetup(false)
        window.location.reload()
      }} />}

      {transaccionEditando && (
        <EditarTransaccionModal
          transaccion={transaccionEditando}
          categorias={categorias}
          onComplete={() => {
            setTransaccionEditando(null)
            window.location.reload()
          }}
          onCancel={() => setTransaccionEditando(null)}
        />
      )}

      {/* SIDEBAR - Desktop (lateral fija) / Mobile (barra inferior) */}
      <div className="hidden lg:flex fixed left-0 top-0 w-32 h-screen bg-gray-800 border-r border-gray-700 p-4 flex-col items-center gap-6 py-8 z-40">
        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-lg">F</div>

        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => irA(item.path)}
            className={`w-10 h-10 rounded-lg transition flex items-center justify-center text-lg ${item.path === '/dashboard' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}

        <div className="mt-auto w-10 h-10 rounded-lg bg-gray-700 hover:bg-red-600 transition flex items-center justify-center text-lg cursor-pointer" onClick={cerrarSesion} title="Cerrar sesión">🚪</div>
      </div>

      {/* Bottom nav - Mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex items-center justify-around py-2 px-1 z-40 overflow-x-auto">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => irA(item.path)}
            className={`w-9 h-9 flex-shrink-0 rounded-lg transition flex items-center justify-center text-base ${item.path === '/dashboard' ? 'bg-orange-500' : 'bg-gray-700'}`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
        <button onClick={cerrarSesion} className="w-9 h-9 flex-shrink-0 rounded-lg bg-gray-700 flex items-center justify-center text-base">🚪</button>
      </div>

      <div className="lg:ml-32 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">summary</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <button className="hidden sm:block text-gray-400 hover:text-white text-xl sm:text-2xl">🔍</button>
            <button className="hidden sm:block text-gray-400 hover:text-white text-xl sm:text-2xl">🔔</button>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-base sm:text-lg cursor-pointer hover:bg-orange-600">
              {usuario?.email[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* TRANSACCIONES PENDIENTES */}
        {transaccionesPendientes.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-2xl p-4 sm:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-yellow-400">⏳ Transacciones Pendientes ({transaccionesPendientes.length})</h2>
              <p className="text-gray-400 text-xs sm:text-sm">Revisa en las próximas 24 horas</p>
            </div>

            <div className="space-y-3">
              {transaccionesPendientes.map((t, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border border-yellow-700/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-yellow-600/30 flex items-center justify-center text-lg">
                      ❓
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.descripcion}</p>
                      <p className="text-gray-400 text-sm">{t.fecha}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <span className={`font-bold ${t.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                      {formatMonto(t.monto)}
                    </span>
                    <button
                      onClick={() => window.location.href = `/dashboard/pendiente/${t.id}`}
                      className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded-lg text-sm transition whitespace-nowrap"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESUMEN DEL MES - Nuevos KPIs */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">📊 Resumen del mes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Balance neto */}
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Balance neto del mes</p>
              <p className={`text-xl sm:text-2xl font-bold ${balanceNeto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {balanceNeto >= 0 ? '+' : ''}{formatMonto(balanceNeto)}
              </p>
              <p className="text-gray-500 text-xs mt-1">Ingresos - Gastos</p>
            </div>

            {/* Comparación vs mes anterior */}
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Vs. mes anterior</p>
              {cambioMesAnterior === null ? (
                <p className="text-gray-500 text-sm">Sin datos del mes pasado</p>
              ) : (
                <p className={`text-xl sm:text-2xl font-bold flex items-center gap-1 ${cambioMesAnterior > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {cambioMesAnterior > 0 ? '↑' : '↓'} {Math.abs(cambioMesAnterior).toFixed(0)}%
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {cambioMesAnterior === null ? '' : cambioMesAnterior > 0 ? 'Gastaste más' : 'Gastaste menos'}
              </p>
            </div>

            {/* Categoría top */}
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Mayor gasto: categoría</p>
              {categoriaTop ? (
                <>
                  <p className="text-lg sm:text-xl font-bold truncate">
                    {categoriaTop.icono} {categoriaTop.nombre}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">{formatMonto(categoriaTop.total_gastado)}</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Sin gastos este mes</p>
              )}
            </div>

            {/* Proyección fin de mes */}
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Proyección a fin de mes</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-400">{formatMonto(proyeccionMes)}</p>
              <p className="text-gray-500 text-xs mt-1">Si mantienes el ritmo actual</p>
            </div>

            {/* Presupuesto usado */}
            <div className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Presupuesto usado</p>
              {pctPresupuestoUsado === null ? (
                <button onClick={() => irA('/dashboard/presupuestos')} className="text-blue-400 text-sm hover:underline">
                  Configurar presupuestos →
                </button>
              ) : (
                <>
                  <p className={`text-xl sm:text-2xl font-bold ${pctPresupuestoUsado > 100 ? 'text-red-400' : pctPresupuestoUsado > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {pctPresupuestoUsado.toFixed(0)}%
                  </p>
                  <p className={`text-xs sm:text-sm mt-1 ${montoDisponiblePresupuesto < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {montoDisponiblePresupuesto >= 0
                      ? `Te quedan ${formatMonto(montoDisponiblePresupuesto)}`
                      : `Te pasaste por ${formatMonto(Math.abs(montoDisponiblePresupuesto))}`}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pctPresupuestoUsado > 100 ? 'bg-red-500' : pctPresupuestoUsado > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(pctPresupuestoUsado, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Alertas activas */}
            <div
              onClick={() => irA('/dashboard/alertas')}
              className="bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-700 cursor-pointer hover:bg-gray-750 transition"
            >
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Alertas sin revisar</p>
              <p className={`text-xl sm:text-2xl font-bold ${alertasActivas.length > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {alertasActivas.length > 0 ? `⚠️ ${alertasActivas.length}` : '✅ 0'}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {alertasActivas.length > 0 ? 'Toca para revisar' : 'Todo al día'}
              </p>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <div className="bg-gray-800 rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-700">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Income</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['1d', '1w', '1m', '3m', '1y', 'all'].map(period => (
                    <button key={period} className={`px-3 py-1 rounded-full text-sm font-semibold transition flex-shrink-0 ${period === '1m' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 lg:mb-8 break-words">{formatMonto(kpis.total_ingresos)}</p>

              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={gastosMes}>
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} width={40} />
                  <Tooltip formatter={(value) => `$${value}k`} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                  <Line type="monotone" dataKey="income" stroke="#f97316" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>

              <div className="flex gap-2 mt-6">
                <button onClick={() => irA('/dashboard/reportes')} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm transition">↓ Download</button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Recent Transations</h2>
              </div>

              <div className="space-y-4">
                {transacciones.length === 0 ? (
                  <p className="text-gray-400 py-4">Sin transacciones</p>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm">ÚLTIMAS TRANSACCIONES</p>
                    {transacciones.map((t, i) => {
                      const categoria = obtenerCategoria(t.categoria_id)
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gray-700/50 rounded-2xl hover:bg-gray-700 transition group">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg bg-gray-600 flex items-center justify-center text-lg">
                              {categoria?.icono || '💳'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{t.descripcion}</p>
                              <p className="text-gray-400 text-xs sm:text-sm truncate">{categoria?.nombre || 'Sin categoría'} · {t.fecha}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <p className={`font-bold text-sm sm:text-base whitespace-nowrap ${t.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                              {formatMonto(t.monto)}
                            </p>
                            <button
                              onClick={() => setTransaccionEditando(t)}
                              className="bg-blue-600 hover:bg-blue-500 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition sm:opacity-0 sm:group-hover:opacity-100 whitespace-nowrap"
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold">Your cards</h2>
                <button onClick={() => irA('/dashboard/cuentas')} className="text-orange-500 hover:text-orange-400">→</button>
              </div>

              {cuentas.length > 0 ? (
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative">
                    <div className="flex justify-between items-start mb-10 sm:mb-12">
                      <div className="min-w-0">
                        <p className="text-orange-100 text-xs mb-1">CUENTA</p>
                        <p className="text-base sm:text-lg font-semibold truncate">{cuentas[0].nombre}</p>
                      </div>
                      <div className="w-10 h-8 flex-shrink-0 bg-white/30 rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <div className="min-w-0">
                        <p className="text-orange-100 text-xs mb-1">BANCO</p>
                        <p className="font-semibold truncate">{cuentas[0].banco}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-100 text-xs mb-1">TIPO</p>
                        <p className="font-semibold">{cuentas[0].tipo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-6 text-white text-center">
                  <p className="text-lg">Sin cuentas agregadas</p>
                  <button onClick={() => irA('/dashboard/cuentas')} className="mt-3 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
                    Agregar cuenta
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Wallet Summary</h2>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-700">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
                    <span className="text-orange-500 text-lg sm:text-xl">↗</span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">Outcome</p>
                  <p className="text-base sm:text-xl font-bold truncate">{formatMonto(kpis.total_gastos)}</p>
                </div>

                <div className="bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-700">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <span className="text-green-400 text-lg sm:text-xl">↘</span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">Income</p>
                  <p className="text-base sm:text-xl font-bold truncate">{formatMonto(kpis.total_ingresos)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-700 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-base sm:text-lg">⚡</span>
                  </div>
                  <p className="text-gray-400 text-xs">Pendientes</p>
                  <p className="font-bold text-lg sm:text-2xl">{kpis.pendientes}</p>
                </div>

                <div className="bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-700 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-base sm:text-lg">📊</span>
                  </div>
                  <p className="text-gray-400 text-xs">Transacciones</p>
                  <p className="font-bold text-lg sm:text-2xl">{transacciones.length}</p>
                </div>

                <div className="bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-700 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-400 text-base sm:text-lg">💳</span>
                  </div>
                  <p className="text-gray-400 text-xs">Cuentas</p>
                  <p className="font-bold text-lg sm:text-2xl">{cuentas.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button onClick={() => irA('/dashboard/importar')} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition text-sm sm:text-base">
                📂 Importar
              </button>
              <button onClick={() => irA('/dashboard/conciliar')} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition border border-gray-700 text-sm sm:text-base">
                🔍 Conciliar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

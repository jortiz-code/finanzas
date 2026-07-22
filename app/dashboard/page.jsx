'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ---------- Estilos globales del sistema "Pulso financiero" ----------
function EstilosGlobales() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

      .font-display { font-family: 'Chakra Petch', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .font-body { font-family: 'Inter', sans-serif; }

      .bg-grid-pulso {
        background-image:
          radial-gradient(circle at 1px 1px, rgba(0, 229, 255, 0.08) 1px, transparent 0);
        background-size: 28px 28px;
      }

      .glow-cian { box-shadow: 0 0 0 1px rgba(0,229,255,0.25), 0 0 24px -4px rgba(0,229,255,0.35); }
      .glow-magenta { box-shadow: 0 0 0 1px rgba(255,46,154,0.25), 0 0 24px -4px rgba(255,46,154,0.35); }
      .glow-violeta { box-shadow: 0 0 0 1px rgba(123,97,255,0.25), 0 0 24px -4px rgba(123,97,255,0.35); }

      .texto-glow-cian { text-shadow: 0 0 18px rgba(0,229,255,0.55); }
      .texto-glow-magenta { text-shadow: 0 0 18px rgba(255,46,154,0.55); }

      ::-webkit-scrollbar { height: 6px; width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #262E4A; border-radius: 999px; }

      @keyframes pulso-suave {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }
      .animar-pulso { animation: pulso-suave 3s ease-in-out infinite; }
    `}</style>
  )
}

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
    setForm({ ...form, banco: bancoNombre })
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
      <div className="bg-[#131829] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#262E4A] shadow-2xl max-h-[90vh] overflow-y-auto glow-cian">
        {step === 1 ? (
          <>
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-4xl sm:text-5xl mb-3">👋</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">¡Bienvenido!</h2>
              <p className="text-[#8891B0] mt-2 text-sm sm:text-base">Configuremos tu primera cuenta bancaria</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[#8891B0] text-sm mb-2 block">Nombre de la cuenta</label>
                <input
                  type="text"
                  placeholder="Ej: Mi Cuenta Corriente"
                  value={form.nombre_cuenta}
                  onChange={e => setForm({...form, nombre_cuenta: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition text-base"
                />
              </div>

              <div>
                <label className="text-[#8891B0] text-sm mb-2 block">Banco</label>
                <select
                  value={form.banco}
                  onChange={e => cambiarBanco(e.target.value)}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition text-base"
                >
                  <option value="">Selecciona tu banco</option>
                  {bancos.map(b => (<option key={b.id} value={b.nombre}>{b.nombre}</option>))}
                </select>
              </div>

              <div>
                <label className="text-[#8891B0] text-sm mb-2 block">Tipo de cuenta</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition text-base"
                >
                  {tipos.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>

              <div>
                <label className="text-[#8891B0] text-sm mb-2 block">Tu RUT (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 19.279.611-K"
                  value={form.rut}
                  onChange={e => setForm({...form, rut: e.target.value})}
                  className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition text-base"
                />
                <p className="text-[#5A6288] text-xs mt-1">Para desencriptar cartolas PDF automáticamente</p>
              </div>
            </div>

            <button
              onClick={guardarCuenta}
              disabled={loading}
              className="w-full mt-6 bg-[#00E5FF] hover:bg-[#33ebff] disabled:opacity-50 text-[#0B0E1A] font-bold py-3 rounded-xl transition glow-cian"
            >
              {loading ? '⏳ Guardando...' : '✅ Continuar'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl mb-4">✅</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-display mb-2">¡Todo listo!</h2>
              <p className="text-[#8891B0] mb-6 sm:mb-8 text-sm sm:text-base">Tu cuenta ha sido configurada correctamente.</p>

              <div className="bg-[#0B0E1A] rounded-2xl p-4 mb-6 sm:mb-8 space-y-3 text-left border border-[#262E4A]">
                <div className="flex items-start gap-3">
                  <span className="text-[#00E5FF] text-xl">📂</span>
                  <p className="text-[#C7CCE3] text-sm sm:text-base"><strong className="text-white">Importar cartolas</strong> desde el menú</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#00E5FF] text-xl">💸</span>
                  <p className="text-[#C7CCE3] text-sm sm:text-base"><strong className="text-white">Agregar transacciones</strong> manualmente</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#00E5FF] text-xl">🎯</span>
                  <p className="text-[#C7CCE3] text-sm sm:text-base"><strong className="text-white">Crear presupuestos</strong> por categoría</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#00E5FF] text-xl">🧠</span>
                  <p className="text-[#C7CCE3] text-sm sm:text-base"><strong className="text-white">Ver análisis IA</strong> de tus finanzas</p>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-[#00E5FF] hover:bg-[#33ebff] text-[#0B0E1A] font-bold py-3 rounded-xl transition glow-cian"
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
      <div className="bg-[#131829] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#262E4A] shadow-2xl max-h-[90vh] overflow-y-auto glow-violeta">
        <h2 className="text-xl sm:text-2xl font-bold text-white font-display mb-6">Editar Transacción</h2>

        <div className="space-y-4">
          <div>
            <label className="text-[#8891B0] text-sm mb-2 block">Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
            />
          </div>

          <div>
            <label className="text-[#8891B0] text-sm mb-2 block">Monto</label>
            <input
              type="number"
              value={form.monto}
              onChange={e => setForm({...form, monto: e.target.value})}
              className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base font-mono"
            />
          </div>

          <div>
            <label className="text-[#8891B0] text-sm mb-2 block">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={e => setForm({...form, categoria_id: e.target.value})}
              className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#8891B0] text-sm mb-2 block">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm({...form, tipo: e.target.value})}
              className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
            >
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>

          <div>
            <label className="text-[#8891B0] text-sm mb-2 block">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm({...form, fecha: e.target.value})}
              className="w-full bg-[#0B0E1A] text-white rounded-xl px-4 py-3 outline-none border border-[#262E4A] focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition text-base"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#1B2138] hover:bg-[#232A47] text-white font-bold py-3 rounded-xl transition border border-[#262E4A]"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="flex-1 bg-[#7B61FF] hover:bg-[#8f79ff] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition glow-violeta"
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

    const { data: gastosCat } = await supabase.rpc('get_gastos_por_categoria', {
      p_user_id: user.id,
      p_mes: mesActual,
      p_año: añoActual
    })
    setGastosPorCategoria(gastosCat || [])

    const { data: presupuestos } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('user_id', user.id)
      .eq('mes', mesActual)
      .eq('año', añoActual)
    setPresupuestosMes(presupuestos || [])

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
    <div className="min-h-screen bg-[#0B0E1A] flex items-center justify-center font-body">
      <p className="text-[#00E5FF] text-xl sm:text-2xl font-display animar-pulso">Cargando tu pulso financiero...</p>
    </div>
  )

  // --- Cálculos derivados ---
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

  const mesNombre = hoy.toLocaleString('es-CL', { month: 'long' })

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
    <div className="min-h-screen bg-[#0B0E1A] text-white pb-20 lg:pb-0 font-body bg-grid-pulso">
      <EstilosGlobales />

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

      {/* SIDEBAR - Desktop */}
      <div className="hidden lg:flex fixed left-0 top-0 w-24 h-screen bg-[#0B0E1A] border-r border-[#1B2138] p-4 flex-col items-center gap-5 py-8 z-40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2E9A] to-[#00E5FF] flex items-center justify-center font-bold text-lg font-display text-[#0B0E1A]">F</div>

        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => irA(item.path)}
            className={`w-11 h-11 rounded-xl transition flex items-center justify-center text-lg border ${item.path === '/dashboard' ? 'bg-[#131829] border-[#00E5FF] glow-cian text-white' : 'bg-transparent border-transparent hover:border-[#262E4A] hover:bg-[#131829] text-[#8891B0]'}`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}

        <div className="mt-auto w-11 h-11 rounded-xl border border-transparent hover:border-[#FF2E9A] hover:bg-[#131829] transition flex items-center justify-center text-lg cursor-pointer text-[#8891B0] hover:text-[#FF2E9A]" onClick={cerrarSesion} title="Cerrar sesión">🚪</div>
      </div>

      {/* Bottom nav - Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B0E1A]/95 backdrop-blur border-t border-[#1B2138] flex items-center justify-around py-2 px-1 z-40 overflow-x-auto">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => irA(item.path)}
            className={`w-9 h-9 flex-shrink-0 rounded-lg transition flex items-center justify-center text-base ${item.path === '/dashboard' ? 'bg-[#131829] border border-[#00E5FF]' : 'bg-transparent text-[#8891B0]'}`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
        <button onClick={cerrarSesion} className="w-9 h-9 flex-shrink-0 rounded-lg bg-transparent text-[#8891B0] flex items-center justify-center text-base">🚪</button>
      </div>

      <div className="lg:ml-24 p-4 sm:p-6 lg:p-8 relative">
        <div className="flex justify-between items-center mb-6 lg:mb-8">
          <div>
            <p className="text-[#8891B0] text-xs sm:text-sm uppercase tracking-widest font-mono">{mesNombre} {añoActual}</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display">Pulso</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <button className="hidden sm:block text-[#8891B0] hover:text-[#00E5FF] transition text-xl sm:text-2xl">🔍</button>
            <button className="hidden sm:block text-[#8891B0] hover:text-[#00E5FF] transition text-xl sm:text-2xl">🔔</button>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FF2E9A] to-[#7B61FF] flex items-center justify-center font-bold text-base sm:text-lg cursor-pointer glow-magenta font-display">
              {usuario?.email[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* TRANSACCIONES PENDIENTES */}
        {transaccionesPendientes.length > 0 && (
          <div className="bg-[#131829] border border-[#FFB800]/40 rounded-2xl p-4 sm:p-6 mb-6 lg:mb-8" style={{ boxShadow: '0 0 24px -8px rgba(255,184,0,0.35)' }}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-[#FFB800] font-display">⏳ Transacciones Pendientes ({transaccionesPendientes.length})</h2>
              <p className="text-[#8891B0] text-xs sm:text-sm">Revisa en las próximas 24 horas</p>
            </div>

            <div className="space-y-3">
              {transaccionesPendientes.map((t, i) => (
                <div key={i} className="bg-[#0B0E1A] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border border-[#262E4A]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#FFB800]/10 flex items-center justify-center text-lg">
                      ❓
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.descripcion}</p>
                      <p className="text-[#8891B0] text-sm font-mono">{t.fecha}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <span className={`font-bold font-mono ${t.tipo === 'gasto' ? 'text-[#FF2E9A]' : 'text-[#00E5FF]'}`}>
                      {formatMonto(t.monto)}
                    </span>
                    <button
                      onClick={() => window.location.href = `/dashboard/pendiente/${t.id}`}
                      className="bg-[#131829] border border-[#00E5FF] hover:bg-[#00E5FF]/10 text-[#00E5FF] px-4 py-1 rounded-lg text-sm transition whitespace-nowrap"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HERO - Balance neto */}
        <div className="relative bg-[#131829] border border-[#262E4A] rounded-3xl p-6 sm:p-8 lg:p-10 mb-4 overflow-hidden">
          {/* Línea de pulso decorativa de fondo */}
          <svg className="absolute inset-x-0 bottom-0 w-full h-24 opacity-40" viewBox="0 0 400 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pulsoHeroGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF2E9A" />
                <stop offset="100%" stopColor="#00E5FF" />
              </linearGradient>
            </defs>
            <path d="M0,40 L60,40 L75,15 L90,50 L105,40 L160,40 L175,20 L190,45 L205,40 L400,40" fill="none" stroke="url(#pulsoHeroGrad)" strokeWidth="2" />
          </svg>

          <div className="relative">
            <p className="text-[#8891B0] text-xs sm:text-sm uppercase tracking-widest font-mono mb-2">Balance neto del mes</p>
            <p className={`text-4xl sm:text-5xl lg:text-6xl font-bold font-display font-mono ${balanceNeto >= 0 ? 'text-[#00E5FF] texto-glow-cian' : 'text-[#FF2E9A] texto-glow-magenta'}`}>
              {balanceNeto >= 0 ? '+' : ''}{formatMonto(balanceNeto)}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              {cambioMesAnterior !== null && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-mono border ${cambioMesAnterior > 0 ? 'border-[#FF2E9A]/40 text-[#FF2E9A] bg-[#FF2E9A]/5' : 'border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/5'}`}>
                  {cambioMesAnterior > 0 ? '↑' : '↓'} {Math.abs(cambioMesAnterior).toFixed(0)}% vs {mesAnteriorTexto(hoy)}
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-mono border border-[#262E4A] text-[#8891B0]">
                <span className="text-[#00E5FF]">↘ {formatMonto(kpis.total_ingresos)}</span>
                <span className="text-[#5A6288]">·</span>
                <span className="text-[#FF2E9A]">↗ {formatMonto(kpis.total_gastos)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chips satélite - 4 KPIs restantes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">

          <div className="bg-[#131829] rounded-2xl p-4 border border-[#262E4A] hover:border-[#7B61FF]/50 transition">
            <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Mayor gasto</p>
            {categoriaTop ? (
              <>
                <p className="text-base sm:text-lg font-bold truncate font-display">
                  {categoriaTop.icono} {categoriaTop.nombre}
                </p>
                <p className="text-[#7B61FF] text-xs sm:text-sm mt-1 font-mono">{formatMonto(categoriaTop.total_gastado)}</p>
              </>
            ) : (
              <p className="text-[#5A6288] text-sm">Sin gastos aún</p>
            )}
          </div>

          <div className="bg-[#131829] rounded-2xl p-4 border border-[#262E4A] hover:border-[#FF2E9A]/50 transition">
            <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Proyección fin de mes</p>
            <p className="text-base sm:text-lg font-bold text-[#FF2E9A] font-mono">{formatMonto(proyeccionMes)}</p>
            <p className="text-[#5A6288] text-xs mt-1">Si mantienes el ritmo</p>
          </div>

          <div className="bg-[#131829] rounded-2xl p-4 border border-[#262E4A] hover:border-[#00E5FF]/50 transition">
            <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Presupuesto</p>
            {pctPresupuestoUsado === null ? (
              <button onClick={() => irA('/dashboard/presupuestos')} className="text-[#00E5FF] text-sm hover:underline">
                Configurar →
              </button>
            ) : (
              <>
                <p className={`text-base sm:text-lg font-bold font-mono ${pctPresupuestoUsado > 100 ? 'text-[#FF2E9A]' : pctPresupuestoUsado > 80 ? 'text-[#FFB800]' : 'text-[#00E5FF]'}`}>
                  {pctPresupuestoUsado.toFixed(0)}%
                </p>
                <p className={`text-xs mt-1 font-mono ${montoDisponiblePresupuesto < 0 ? 'text-[#FF2E9A]' : 'text-[#5A6288]'}`}>
                  {montoDisponiblePresupuesto >= 0
                    ? `Quedan ${formatMonto(montoDisponiblePresupuesto)}`
                    : `Excedido ${formatMonto(Math.abs(montoDisponiblePresupuesto))}`}
                </p>
                <div className="w-full bg-[#0B0E1A] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${pctPresupuestoUsado > 100 ? 'bg-[#FF2E9A]' : pctPresupuestoUsado > 80 ? 'bg-[#FFB800]' : 'bg-[#00E5FF]'}`}
                    style={{ width: `${Math.min(pctPresupuestoUsado, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div
            onClick={() => irA('/dashboard/alertas')}
            className="bg-[#131829] rounded-2xl p-4 border border-[#262E4A] hover:border-[#FFB800]/50 transition cursor-pointer"
          >
            <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Alertas</p>
            <p className={`text-base sm:text-lg font-bold font-mono ${alertasActivas.length > 0 ? 'text-[#FFB800]' : 'text-[#5A6288]'}`}>
              {alertasActivas.length > 0 ? `⚠️ ${alertasActivas.length}` : '✅ 0'}
            </p>
            <p className="text-[#5A6288] text-xs mt-1">
              {alertasActivas.length > 0 ? 'Toca para revisar' : 'Todo al día'}
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">

            {/* Gráfico estilo osciloscopio */}
            <div className="bg-[#131829] rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#262E4A]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="text-lg sm:text-xl font-bold font-display">Ingresos · últimos 6 meses</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['1d', '1w', '1m', '3m', '1y', 'all'].map(period => (
                    <button key={period} className={`px-3 py-1 rounded-full text-xs sm:text-sm font-mono transition flex-shrink-0 ${period === '1m' ? 'bg-[#00E5FF] text-[#0B0E1A] font-semibold' : 'bg-[#0B0E1A] text-[#8891B0] hover:text-white border border-[#262E4A]'}`}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display font-mono mb-6 lg:mb-8 break-words text-[#00E5FF] texto-glow-cian">{formatMonto(kpis.total_ingresos)}</p>

              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={gastosMes}>
                  <defs>
                    <linearGradient id="lineaPulso" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF2E9A" />
                      <stop offset="100%" stopColor="#00E5FF" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#5A6288" fontSize={11} fontFamily="JetBrains Mono" />
                  <YAxis stroke="#5A6288" fontSize={11} width={40} fontFamily="JetBrains Mono" />
                  <Tooltip
                    formatter={(value) => `$${value}k`}
                    contentStyle={{ backgroundColor: '#0B0E1A', border: '1px solid #262E4A', borderRadius: '8px', fontFamily: 'JetBrains Mono' }}
                    labelStyle={{ color: '#8891B0' }}
                  />
                  {/* Glow: linea gruesa translucida detras */}
                  <Line type="monotone" dataKey="income" stroke="#00E5FF" strokeWidth={8} strokeOpacity={0.18} dot={false} isAnimationActive={false} />
                  {/* Linea nitida encima */}
                  <Line type="monotone" dataKey="income" stroke="url(#lineaPulso)" strokeWidth={2.5} dot={{ r: 3, fill: '#00E5FF', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>

              <div className="flex gap-2 mt-6">
                <button onClick={() => irA('/dashboard/reportes')} className="flex-1 bg-[#0B0E1A] hover:bg-[#1B2138] border border-[#262E4A] py-2 rounded-lg text-sm transition text-[#8891B0] hover:text-white">↓ Ver reportes completos</button>
              </div>
            </div>

            {/* Ledger de transacciones recientes */}
            <div className="bg-[#131829] rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#262E4A]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-bold font-display">Movimientos recientes</h2>
              </div>

              <div className="space-y-3">
                {transacciones.length === 0 ? (
                  <p className="text-[#5A6288] py-4">Sin transacciones</p>
                ) : (
                  transacciones.map((t, i) => {
                    const categoria = obtenerCategoria(t.categoria_id)
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-[#0B0E1A] rounded-xl border-l-2 hover:bg-[#161c30] transition group"
                        style={{ borderLeftColor: t.tipo === 'gasto' ? '#FF2E9A' : '#00E5FF' }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg bg-[#131829] border border-[#262E4A] flex items-center justify-center text-base">
                            {categoria?.icono || (t.tipo === 'gasto' ? '↗' : '↘')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">{t.descripcion}</p>
                            <p className="text-[#5A6288] text-xs sm:text-sm truncate font-mono">{categoria?.nombre || 'Sin categoría'} · {t.fecha}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <p className={`font-bold text-sm sm:text-base whitespace-nowrap font-mono ${t.tipo === 'gasto' ? 'text-[#FF2E9A]' : 'text-[#00E5FF]'}`}>
                            {t.tipo === 'gasto' ? '-' : '+'}{formatMonto(t.monto)}
                          </p>
                          <button
                            onClick={() => setTransaccionEditando(t)}
                            className="bg-[#131829] border border-[#262E4A] hover:border-[#7B61FF] px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition sm:opacity-0 sm:group-hover:opacity-100 whitespace-nowrap"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold font-display">Tu cuenta</h2>
                <button onClick={() => irA('/dashboard/cuentas')} className="text-[#00E5FF] hover:text-[#33ebff]">→</button>
              </div>

              {cuentas.length > 0 ? (
                <div className="bg-[#131829] rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden border border-[#262E4A] glow-violeta">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#7B61FF]/20 to-transparent rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#00E5FF]/10 to-transparent rounded-full -ml-16 -mb-16 blur-2xl"></div>
                  <div className="relative">
                    <div className="flex justify-between items-start mb-10 sm:mb-12">
                      <div className="min-w-0">
                        <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Cuenta</p>
                        <p className="text-base sm:text-lg font-semibold truncate font-display">{cuentas[0].nombre}</p>
                      </div>
                      <div className="w-9 h-7 flex-shrink-0 rounded bg-gradient-to-br from-[#FF2E9A] to-[#7B61FF] opacity-80"></div>
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <div className="min-w-0">
                        <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Banco</p>
                        <p className="font-semibold truncate">{cuentas[0].banco}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#8891B0] text-xs mb-1 font-mono uppercase tracking-wide">Tipo</p>
                        <p className="font-semibold">{cuentas[0].tipo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#131829] border border-[#262E4A] rounded-3xl p-6 text-white text-center">
                  <p className="text-lg">Sin cuentas agregadas</p>
                  <button onClick={() => irA('/dashboard/cuentas')} className="mt-3 bg-[#00E5FF] text-[#0B0E1A] font-semibold px-4 py-2 rounded-lg transition hover:bg-[#33ebff]">
                    Agregar cuenta
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display mb-4">Resumen general</h2>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-[#131829] rounded-2xl p-3 sm:p-4 border border-[#262E4A] text-center">
                  <p className="text-[#FFB800] text-lg sm:text-xl mb-1">⚡</p>
                  <p className="text-[#8891B0] text-xs font-mono">Pendientes</p>
                  <p className="font-bold text-lg sm:text-xl font-mono">{kpis.pendientes}</p>
                </div>

                <div className="bg-[#131829] rounded-2xl p-3 sm:p-4 border border-[#262E4A] text-center">
                  <p className="text-[#00E5FF] text-lg sm:text-xl mb-1">📊</p>
                  <p className="text-[#8891B0] text-xs font-mono">Movimientos</p>
                  <p className="font-bold text-lg sm:text-xl font-mono">{transacciones.length}</p>
                </div>

                <div className="bg-[#131829] rounded-2xl p-3 sm:p-4 border border-[#262E4A] text-center">
                  <p className="text-[#7B61FF] text-lg sm:text-xl mb-1">💳</p>
                  <p className="text-[#8891B0] text-xs font-mono">Cuentas</p>
                  <p className="font-bold text-lg sm:text-xl font-mono">{cuentas.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button onClick={() => irA('/dashboard/importar')} className="bg-[#00E5FF] hover:bg-[#33ebff] text-[#0B0E1A] font-semibold py-3 rounded-xl transition text-sm sm:text-base glow-cian">
                📂 Importar
              </button>
              <button onClick={() => irA('/dashboard/conciliar')} className="bg-[#131829] hover:bg-[#1B2138] text-white font-semibold py-3 rounded-xl transition border border-[#262E4A] text-sm sm:text-base">
                🔍 Conciliar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function mesAnteriorTexto(hoy) {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  return fecha.toLocaleString('es-CL', { month: 'long' })
}

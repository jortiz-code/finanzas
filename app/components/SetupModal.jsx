'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SetupModal({ onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_cuenta: '',
    banco: '',
    tipo: 'Corriente',
    email_origen: '',
    rut: ''
  })

  const bancos = [
    'Banco BCI',
    'Banco de Chile',
    'Santander',
    'Itaú',
    'Scotiabank',
    'BBVA',
    'Falabella',
    'Otro'
  ]

  const tipos = ['Corriente', 'Ahorro', 'Inversión']

  const guardarCuenta = async () => {
    if (!form.nombre_cuenta || !form.banco || !form.tipo) {
      alert('Completa todos los campos')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: errorCuenta } = await supabase.from('cuentas').insert({
      user_id: user.id,
      nombre: form.nombre_cuenta,
      banco: form.banco,
      tipo: form.tipo,
      email_origen: form.email_origen || null,
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

    if (!errorCuenta) {
      setStep(2)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-800 shadow-2xl">
        {step === 1 ? (
          <>
            <div className="text-center mb-8">
              <p className="text-5xl mb-3">👋</p>
              <h2 className="text-3xl font-bold text-white">¡Bienvenido!</h2>
              <p className="text-gray-400 mt-2">Configuremos tu primera cuenta bancaria</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Nombre de la cuenta</label>
                <input type="text" placeholder="Ej: Mi Cuenta Corriente" value={form.nombre_cuenta} onChange={e => setForm({...form, nombre_cuenta: e.target.value})} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Banco</label>
                <select value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Selecciona tu banco</option>
                  {bancos.map(b => (<option key={b} value={b}>{b}</option>))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tipo de cuenta</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500">
                  {tipos.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Email del banco (opcional)</label>
                <input type="email" placeholder="Ej: cuenta@bancobci.cl" value={form.email_origen} onChange={e => setForm({...form, email_origen: e.target.value})} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
                <p className="text-gray-500 text-xs mt-1">Para detectar correos automáticos del banco</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tu RUT (opcional)</label>
                <input type="text" placeholder="Ej: 19.279.611-K" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
                <p className="text-gray-500 text-xs mt-1">Para desencriptar cartolas PDF automáticamente</p>
              </div>
            </div>

            <button onClick={guardarCuenta} disabled={loading} className="w-full mt-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
              {loading ? '⏳ Guardando...' : '✅ Continuar'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-5xl mb-4">✅</p>
              <h2 className="text-3xl font-bold text-white mb-2">¡Todo listo!</h2>
              <p className="text-gray-400 mb-8">Tu cuenta ha sido configurada correctamente. Ahora puedes:</p>
              
              <div className="bg-gray-800 rounded-2xl p-4 mb-8 space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">📂</span>
                  <p className="text-gray-300"><strong>Importar cartolas</strong> desde el menú</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">💸</span>
                  <p className="text-gray-300"><strong>Agregar transacciones</strong> manualmente</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">🎯</span>
                  <p className="text-gray-300"><strong>Crear presupuestos</strong> por categoría</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-orange-500 text-xl">🧠</span>
                  <p className="text-gray-300"><strong>Ver análisis IA</strong> de tus finanzas</p>
                </div>
              </div>

              <button onClick={onComplete} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">
                Empezar a usar la app
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

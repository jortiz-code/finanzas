'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Alertas() {
  const [alertas, setAlertas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return window.location.href = '/auth'

    const [{ data: als }, { data: cats }] = await Promise.all([
      supabase.from('alertas').select(`
        *,
        transacciones(
          id, descripcion, monto, fecha, tipo, clasificado_por, confianza_ia,
          cuentas(nombre, banco),
          categorias(nombre)
        )
      `).eq('resuelta', false).order('created_at', { ascending: false }),
      supabase.from('categorias').select('*').order('nombre')
    ])

    setAlertas(als || [])
    setCategorias(cats || [])
    setLoading(false)
  }

  const asignarCategoria = async (alerta, categoria_id) => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('transacciones').update({
      categoria_id,
      clasificado_por: 'usuario',
      necesita_revision: false
    }).eq('id', alerta.transaccion_id)

    const comercio = alerta.transacciones?.descripcion
    if (comercio) {
      const { data: reglaExistente } = await supabase
        .from('reglas_ia')
        .select('*')
        .eq('user_id', user.id)
        .eq('patron', comercio)
        .single()

      if (reglaExistente) {
        await supabase.from('reglas_ia').update({
          categoria_id,
          veces_usado: reglaExistente.veces_usado + 1
        }).eq('id', reglaExistente.id)
      } else {
        await supabase.from('reglas_ia').insert({
          user_id: user.id,
          patron: comercio,
          categoria_id
        })
      }
    }

    await supabase.from('alertas').update({
      resuelta: true
    }).eq('id', alerta.id)

    cargarDatos()
  }

  const ignorar = async (alerta_id) => {
    await supabase.from('alertas').update({
      resuelta: true
    }).eq('id', alerta_id)
    cargarDatos()
  }

  const formatMonto = (monto, tipo) => {
    const formatted = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto)
    return tipo === 'gasto' ? `-${formatted}` : `+${formatted}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">⚠️ Por revisar</h1>
            <p className="text-gray-400 mt-1">Transacciones que necesitan tu atención</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition"
          >
            ← Volver
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : alertas.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-white font-semibold text-xl">Todo al día</p>
            <p className="text-gray-400 mt-2">No hay transacciones pendientes de revisar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertas.map(alerta => (
              <div key={alerta.id} className="bg-gray-900 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-lg">
                      {alerta.transacciones?.descripcion}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {alerta.transacciones?.cuentas?.banco} · {alerta.transacciones?.fecha}
                    </p>
                    {alerta.transacciones?.categorias && (
                      <p className="text-purple-400 text-sm mt-1">
                        🤖 IA sugirió: {alerta.transacciones.categorias.nombre}
                        {alerta.transacciones.confianza_ia && (
                          <span className="text-gray-500 ml-1">
                            ({Math.round(alerta.transacciones.confianza_ia * 100)}% confianza)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <p className={`font-bold text-xl ${alerta.transacciones?.tipo === 'gasto' ? 'text-red-400' : 'text-green-400'}`}>
                    {formatMonto(alerta.transacciones?.monto, alerta.transacciones?.tipo)}
                  </p>
                </div>

                <div className="flex gap-3 items-center mt-2">
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) asignarCategoria(alerta, e.target.value)
                    }}
                    className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Selecciona una categoría...</option>
                    <optgroup label="Personal">
                      {categorias.filter(c => c.tipo === 'personal').map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icono} {cat.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Empresarial">
                      {categorias.filter(c => c.tipo === 'empresarial').map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icono} {cat.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    onClick={() => ignorar(alerta.id)}
                    className="bg-gray-800 hover:bg-red-600 px-4 py-2 rounded-xl text-sm transition"
                  >
                    Ignorar
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
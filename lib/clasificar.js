export async function clasificarTransaccion(descripcion, categorias) {
  const listaCategorias = categorias.map(c => `- ${c.nombre} (${c.tipo})`).join('\n')

  const response = await fetch('/api/clasificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ descripcion, categorias: listaCategorias })
  })

  const data = await response.json()
  return data
}
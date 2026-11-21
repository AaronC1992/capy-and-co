export async function downloadPortrait(svg: SVGSVGElement, name: string): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('viewBox', '60 35 380 460')
  clone.setAttribute('width', '760')
  clone.setAttribute('height', '920')
  clone.setAttribute('x', '20')
  clone.setAttribute('y', '0')
  clone.removeAttribute('class')
  const artwork = new XMLSerializer().serializeToString(clone)
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" rx="40" fill="#f8eee2"/><rect x="30" y="30" width="740" height="850" rx="180" fill="#e6ecdf"/>${artwork}<text x="400" y="926" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="#424b3f">${name}'s good hair day</text><text x="400" y="970" text-anchor="middle" font-family="sans-serif" font-size="19" letter-spacing="3" fill="#7b806e">CAPY &amp; CO. HAIR STUDIO</text></svg>`
  const sourceUrl = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The portrait image could not be rendered.'))
    })
    image.src = sourceUrl
    await loaded
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot export pictures.')
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The picture could not be encoded.')), 'image/png')
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `capy-and-co-${name.toLowerCase()}.png`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// Pantallas de inicio (apple-touch-startup-image) para iPhones modernos.
// iOS exige un PNG con la resolución EXACTA del dispositivo (en px reales),
// de lo contrario ignora la imagen y muestra un fondo blanco al abrir la PWA.
//
// Cada entrada: ancho/alto en px CSS y device-pixel-ratio. El PNG se genera a
// (w*ratio) x (h*ratio). Solo orientación retrato (la app es portrait-only).
const DEVICES = [
  { w: 375, h: 667, r: 2 }, // iPhone SE / 8 / 7 / 6s
  { w: 375, h: 812, r: 3 }, // iPhone X / XS / 11 Pro / 12 mini / 13 mini
  { w: 414, h: 896, r: 2 }, // iPhone XR / 11
  { w: 414, h: 896, r: 3 }, // iPhone XS Max / 11 Pro Max
  { w: 390, h: 844, r: 3 }, // iPhone 12 / 12 Pro / 13 / 13 Pro / 14
  { w: 428, h: 926, r: 3 }, // iPhone 12 Pro Max / 13 Pro Max / 14 Plus
  { w: 393, h: 852, r: 3 }, // iPhone 14 Pro / 15 / 15 Pro / 16
  { w: 430, h: 932, r: 3 }, // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  { w: 402, h: 874, r: 3 }, // iPhone 16 Pro
  { w: 440, h: 956, r: 3 }, // iPhone 16 Pro Max
]

const BG = '#0F0F0F' // background_color de la marca
const svg = readFileSync('./public/favicon.svg', 'utf-8')

mkdirSync('./public/splash', { recursive: true })

const links = []

for (const { w, h, r } of DEVICES) {
  const pxW = w * r
  const pxH = h * r
  const logoSize = Math.round(Math.min(pxW, pxH) * 0.32)

  const logoPng = new Resvg(svg, { fitTo: { mode: 'width', value: logoSize } }).render().asPng()

  const out = `./public/splash/splash-${pxW}x${pxH}.png`
  await sharp({ create: { width: pxW, height: pxH, channels: 4, background: BG } })
    .composite([{ input: logoPng, gravity: 'center' }])
    .png()
    .toFile(out)

  const media =
    `(device-width: ${w}px) and (device-height: ${h}px) ` +
    `and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`
  links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="/splash/splash-${pxW}x${pxH}.png" />`)
  console.log(`Generated splash-${pxW}x${pxH}.png`)
}

// Emite los <link> listos para pegar en index.html
writeFileSync('./public/splash/links.html', links.join('\n') + '\n')
console.log('\nLink tags written to public/splash/links.html')

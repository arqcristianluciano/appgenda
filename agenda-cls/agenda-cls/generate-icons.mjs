import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'

const svgContent = readFileSync('./public/favicon.svg', 'utf-8')
const sizes = [192, 512]

for (const size of sizes) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  writeFileSync(`./public/pwa-${size}x${size}.png`, pngBuffer)
  console.log(`Generated pwa-${size}x${size}.png`)
}

// Apple touch icon 180x180
const resvgApple = new Resvg(svgContent, {
  fitTo: { mode: 'width', value: 180 },
})
const appleData = resvgApple.render()
writeFileSync('./public/apple-touch-icon.png', appleData.asPng())
console.log('Generated apple-touch-icon.png')

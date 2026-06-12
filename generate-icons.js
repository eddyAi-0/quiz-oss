// Genera le icone PWA + favicon dell'app.
// Logo: scudo bianco con croce blu su sfondo blu (fiducia + ambito socio-sanitario).
// Uso:  npm install --no-save sharp  &&  node generate-icons.js
import { writeFileSync } from 'fs'
import sharp from 'sharp'

const grad = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>`

// Scudo bianco con croce blu, centrato nel canvas 512
const emblem = `
  <path d="M256 128 L372 166 V268 C372 338 322 388 256 412 C190 388 140 338 140 268 V166 Z" fill="#fff"/>
  <rect x="240" y="206" width="32" height="120" rx="12" fill="#2563eb"/>
  <rect x="206" y="250" width="100" height="32" rx="12" fill="#2563eb"/>`

// Icona standard: sfondo arrotondato (forma dell'icona)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${emblem}
</svg>`

// Icona maskable: sfondo a tutto campo + emblema rimpicciolito nella zona sicura
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.84) translate(-256 -256)">${emblem}</g>
</svg>`

writeFileSync('public/icon.svg', iconSvg)
writeFileSync('public/icon-192.svg', iconSvg)
writeFileSync('public/icon-512.svg', iconSvg)

await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/icon-maskable.png')

console.log('Icone generate: icon.svg, icon-192.png, icon-512.png, icon-maskable.png')

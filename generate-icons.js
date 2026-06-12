// Genera le icone PWA + favicon dell'app.
// Logo: croce medica bianca su sfondo blu (settore socio-sanitario), sobria e professionale.
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

// Croce a bracci arrotondati, centrata in (256,256)
const cross = (half, thick, r) => `
  <rect x="${256 - thick / 2}" y="${256 - half}" width="${thick}" height="${half * 2}" rx="${r}" fill="#fff"/>
  <rect x="${256 - half}" y="${256 - thick / 2}" width="${half * 2}" height="${thick}" rx="${r}" fill="#fff"/>`

// Icona standard: sfondo arrotondato (forma dell'icona) + croce ampia
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${cross(136, 80, 28)}
</svg>`

// Icona maskable: sfondo a tutto campo (no angoli) + croce nella zona sicura centrale
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${grad}
  <rect width="512" height="512" fill="url(#g)"/>
  ${cross(100, 60, 22)}
</svg>`

writeFileSync('public/icon.svg', iconSvg)
writeFileSync('public/icon-192.svg', iconSvg)
writeFileSync('public/icon-512.svg', iconSvg)

await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/icon-maskable.png')

console.log('Icone generate: icon.svg, icon-192.png, icon-512.png, icon-maskable.png')

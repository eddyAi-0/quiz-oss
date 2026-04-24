// Run with: node generate-icons.js
// Requires: npm install -g sharp  (or use online tool)
// Alternatively, use realfavicongenerator.net

// Quick workaround: create placeholder icons by copying SVG data
import { writeFileSync } from 'fs'

// Minimal 1x1 PNG in base64 — replace with real icons before deploying
// Generated with: https://realfavicongenerator.net

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="36" fill="#2563eb"/>
  <text x="96" y="132" text-anchor="middle" font-size="110" font-family="system-ui">📚</text>
</svg>`

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#2563eb"/>
  <text x="256" y="340" text-anchor="middle" font-size="280" font-family="system-ui">📚</text>
</svg>`

writeFileSync('public/icon-192.svg', svg192)
writeFileSync('public/icon-512.svg', svg512)

console.log('SVG icons created. Convert to PNG with:')
console.log('  npx sharp-cli -i public/icon-192.svg -o public/icon-192.png')
console.log('  npx sharp-cli -i public/icon-512.svg -o public/icon-512.png')

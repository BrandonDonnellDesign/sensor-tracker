// Simple script to generate PWA icons
// This creates basic colored squares as placeholders
// In production, you'd want to use proper icon generation tools

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG template
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <circle cx="${size * 0.5}" cy="${size * 0.35}" r="${size * 0.15}" fill="white" opacity="0.9"/>
  <rect x="${size * 0.3}" y="${size * 0.55}" width="${size * 0.4}" height="${size * 0.08}" rx="${size * 0.04}" fill="white" opacity="0.9"/>
  <rect x="${size * 0.25}" y="${size * 0.68}" width="${size * 0.5}" height="${size * 0.06}" rx="${size * 0.03}" fill="white" opacity="0.7"/>
</svg>`;

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  
  // Write SVG file (can be converted to PNG later)
  fs.writeFileSync(svgPath, svg.trim());
  console.log(`Created ${filename} (SVG)`);
});

console.log('Icon generation complete!');
console.log('Note: SVG files created. For production, convert these to PNG files.');
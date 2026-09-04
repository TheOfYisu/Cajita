/**
 * Genera el set de iconos de Cajita desde código (SVG → PNG).
 *
 *   node scripts/make-icon.js
 *
 * Requiere el devDependency `@resvg/resvg-js`. Salidas en `assets/`:
 *   icon.png · android-icon-{foreground,background,monochrome}.png · splash-icon.png · favicon.png
 *
 * Concepto: una "cajita" (tapa + cuerpo) con ranura para monedas y una moneda con $
 * entrando, en blanco sobre un degradado verde de marca.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ASSETS = path.resolve(__dirname, '..', 'assets');
const GREEN_DARK = '#1B8153';
const GRAD_TOP = '#3CB681';
const GRAD_BOT = '#178150';

function mark({ mono = false, shadow = false } = {}) {
  const solid = mono ? '#000000' : '#FFFFFF';
  const cut = GREEN_DARK;
  if (mono) {
    return `
      <mask id="mono">
        <rect width="1024" height="1024" fill="#000"/>
        <circle cx="512" cy="248" r="118" fill="#fff"/>
        <rect x="206" y="392" width="612" height="126" rx="46" fill="#fff"/>
        <rect x="244" y="536" width="536" height="312" rx="42" fill="#fff"/>
        <rect x="396" y="438" width="232" height="34" rx="17" fill="#000"/>
      </mask>
      <rect width="1024" height="1024" fill="#000" mask="url(#mono)"/>`;
  }
  return `
    ${shadow ? '<ellipse cx="512" cy="862" rx="292" ry="30" fill="#0C5C3C" opacity="0.25"/>' : ''}
    <circle cx="512" cy="252" r="150" fill="${solid}"/>
    <text x="512" y="252" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="200"
          fill="${cut}">$</text>
    <rect x="196" y="392" width="632" height="132" rx="48" fill="${solid}"/>
    <rect x="392" y="440" width="240" height="36" rx="18" fill="${cut}"/>
    <rect x="232" y="536" width="560" height="330" rx="44" fill="${solid}"/>`;
}

function frame({ bg = true, mono = false, shadow = false, scale = 1 } = {}) {
  const inner = mark({ mono, shadow });
  const wrapped = scale === 1
    ? inner
    : `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${inner}</g>`;
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRAD_TOP}"/><stop offset="1" stop-color="${GRAD_BOT}"/>
    </linearGradient></defs>
    ${bg ? '<rect width="1024" height="1024" fill="url(#g)"/>' : ''}
    ${wrapped}
  </svg>`;
}

const bgOnly = () => `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${GRAD_TOP}"/><stop offset="1" stop-color="${GRAD_BOT}"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

function render(svgStr, size, file) {
  const r = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: true },
  });
  fs.writeFileSync(path.join(ASSETS, file), r.render().asPng());
  console.log('wrote', file);
}

render(frame({ bg: true, shadow: true }), 1024, 'icon.png');
render(frame({ bg: false, scale: 0.78 }), 1024, 'android-icon-foreground.png');
render(bgOnly(), 1024, 'android-icon-background.png');
render(frame({ bg: false, mono: true, scale: 0.78 }), 432, 'android-icon-monochrome.png');
render(frame({ bg: false, scale: 0.42 }), 1024, 'splash-icon.png');
render(frame({ bg: true }), 48, 'favicon.png');
console.log('done');

/**
 * Genera el set de iconos de Cajita desde código (SVG → PNG).
 *
 *   node scripts/make-icon.js
 *
 * Requiere el devDependency `@resvg/resvg-js`. Salidas en `assets/`:
 *   icon.png · android-icon-{foreground,background,monochrome}.png · splash-icon.png · favicon.png
 *
 * Concepto: una puerta de caja fuerte en cuero esmeralda, con una C mecanizada
 * y un cierre dorado. El icono de sistema prioriza la legibilidad; el lockup
 * adicional incluye el nombre y el subtitulo de la marca.
 */
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const ASSETS = path.resolve(__dirname, "..", "assets");
const GREEN_DARK = "#123F36";
const GRAD_TOP = "#278A68";
const GRAD_BOT = "#092F2A";
const CREAM = "#F4EFE3";
const METAL = "#314944";
const GOLD = "#D6A84A";
const GOLD_LIGHT = "#F0D184";

function mark({ mono = false, shadow = false } = {}) {
  const solid = mono ? "#000000" : CREAM;
  const cut = mono ? "#000000" : METAL;
  if (mono) {
    return `
      <mask id="mono">
        <rect width="1024" height="1024" fill="#000"/>
        <rect x="150" y="126" width="724" height="772" rx="168" fill="#fff"/>
        <path d="M 660 300 C 590 236 486 218 390 252 C 264 297 228 438 276 558 C 330 694 470 750 588 694 C 638 670 676 638 704 594"
          fill="none" stroke="#000" stroke-width="82" stroke-linecap="round"/>
        <rect x="420" y="758" width="184" height="46" rx="23" fill="#000"/>
      </mask>
      <rect width="1024" height="1024" fill="#000" mask="url(#mono)"/>`;
  }
  return `
    ${shadow ? '<rect x="150" y="148" width="724" height="772" rx="168" fill="#061F1C" opacity="0.48"/>' : ""}
    <rect x="150" y="126" width="724" height="772" rx="168" fill="url(#panel)"/>
    <path d="M 660 300 C 590 236 486 218 390 252 C 264 297 228 438 276 558 C 330 694 470 750 588 694 C 638 670 676 638 704 594"
      fill="none" stroke="#1D3531" stroke-width="96" stroke-linecap="round" opacity="0.28" transform="translate(0 8)"/>
    <path d="M 660 300 C 590 236 486 218 390 252 C 264 297 228 438 276 558 C 330 694 470 750 588 694 C 638 670 676 638 704 594"
      fill="none" stroke="url(#metal)" stroke-width="82" stroke-linecap="round"/>
    <path d="M 646 291 C 580 244 486 232 400 263" fill="none" stroke="#8CA19A" stroke-width="9" stroke-linecap="round" opacity="0.45"/>
    <rect x="420" y="758" width="184" height="46" rx="23" fill="url(#gold)"/>
    <circle cx="512" cy="781" r="10" fill="${METAL}"/>
    <rect x="507" y="780" width="10" height="17" rx="5" fill="${METAL}"/>`;
}

function frame({ bg = true, mono = false, shadow = false, scale = 1 } = {}) {
  const inner = mark({ mono, shadow });
  const wrapped =
    scale === 1
      ? inner
      : `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${inner}</g>`;
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRAD_TOP}"/><stop offset="1" stop-color="${GRAD_BOT}"/>
    </linearGradient><linearGradient id="panel" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#FFF9ED"/><stop offset="1" stop-color="${CREAM}"/>
    </linearGradient><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#526A63"/><stop offset="0.45" stop-color="${METAL}"/><stop offset="1" stop-color="#1E3531"/>
    </linearGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.45" stop-color="${GOLD}"/><stop offset="1" stop-color="#A87925"/>
      </linearGradient><filter id="leather" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="8"/>
        <feColorMatrix values="0 0 0 0 0.58 0 0 0 0 0.82 0 0 0 0 0.70 0 0 0 0.16 0"/>
      </filter></defs>
    ${bg ? '<rect width="1024" height="1024" fill="url(#g)"/>' : ""}
      ${bg ? '<rect width="1024" height="1024" filter="url(#leather)" opacity="0.34"/>' : ""}
    ${bg ? '<path d="M-60 240 C220 80 390 170 550 52 M530 1040 C700 820 900 780 1090 850" fill="none" stroke="#B8E0C4" stroke-width="3" opacity="0.10"/>' : ""}
    ${wrapped}
  </svg>`;
}

const bgOnly =
  () => `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${GRAD_TOP}"/><stop offset="1" stop-color="${GRAD_BOT}"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

const lockupSvg =
  () => `<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRAD_TOP}"/><stop offset="1" stop-color="${GRAD_BOT}"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#FFF9ED"/><stop offset="1" stop-color="${CREAM}"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#526A63"/><stop offset="0.45" stop-color="${METAL}"/><stop offset="1" stop-color="#1E3531"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="0.45" stop-color="${GOLD}"/><stop offset="1" stop-color="#A87925"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="leather" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="8"/>
      <feColorMatrix values="0 0 0 0 0.58 0 0 0 0 0.82 0 0 0 0 0.70 0 0 0 0.16 0"/>
    </filter>
    <clipPath id="lockupClip"><rect width="1600" height="900" rx="76"/></clipPath>
  </defs>
  <rect width="1600" height="900" rx="76" fill="url(#g)"/>
  <rect width="1600" height="900" rx="76" filter="url(#leather)" opacity="0.28" clip-path="url(#lockupClip)"/>
  <g fill="none" stroke="#B8E0C4" stroke-width="10" opacity="0.10" filter="url(#soft)">
    <rect x="1160" y="76" width="310" height="610" rx="42" transform="rotate(11 1315 381)"/>
    <rect x="1230" y="166" width="310" height="610" rx="42" transform="rotate(11 1385 471)"/>
    <path d="M1200 260h190M1200 310h240M1200 360h170M1200 520h220"/>
  </g>
  <g transform="translate(92 36) scale(0.82)">${mark({ shadow: true })}</g>
  <text x="850" y="390" fill="${METAL}" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700" letter-spacing="18">CAJITA</text>
  <rect x="856" y="430" width="570" height="3" rx="2" fill="${GOLD}" opacity="0.8"/>
  <text x="856" y="486" fill="${CREAM}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="500" letter-spacing="5">LOCAL-FIRST FINANCE</text>
</svg>`;

function render(svgStr, size, file) {
  const r = new Resvg(svgStr, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
    font: { loadSystemFonts: true },
  });
  fs.writeFileSync(path.join(ASSETS, file), r.render().asPng());
  console.log("wrote", file);
}

render(frame({ bg: true, shadow: true }), 1024, "icon.png");
render(frame({ bg: false, scale: 0.78 }), 1024, "android-icon-foreground.png");
render(bgOnly(), 1024, "android-icon-background.png");
render(
  frame({ bg: false, mono: true, scale: 0.78 }),
  432,
  "android-icon-monochrome.png",
);
render(frame({ bg: false, scale: 0.42 }), 1024, "splash-icon.png");
render(frame({ bg: true }), 48, "favicon.png");
render(lockupSvg(), 1600, "logo-lockup.png");
console.log("done");

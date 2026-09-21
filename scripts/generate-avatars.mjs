/**
 * Writes 32 preset SVG avatars + a default into apps/web/public/avatars/.
 * Run: node scripts/generate-avatars.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps/web/public/avatars");
mkdirSync(outDir, { recursive: true });

const palettes = [
  { name: "Lime", bg: "#14532d", fg: "#a3e635", ink: "#ecfccb", dark: "#052e16" },
  { name: "Cyan", bg: "#164e63", fg: "#67e8f9", ink: "#cffafe", dark: "#083344" },
  { name: "Violet", bg: "#4c1d95", fg: "#c4b5fd", ink: "#ede9fe", dark: "#2e1065" },
  { name: "Amber", bg: "#78350f", fg: "#fbbf24", ink: "#fef3c7", dark: "#451a03" },
  { name: "Rose", bg: "#9f1239", fg: "#fb7185", ink: "#ffe4e6", dark: "#4c0519" },
  { name: "Sky", bg: "#1e3a8a", fg: "#7dd3fc", ink: "#e0f2fe", dark: "#172554" },
  { name: "Orange", bg: "#9a3412", fg: "#fdba74", ink: "#ffedd5", dark: "#431407" },
  { name: "Emerald", bg: "#064e3b", fg: "#34d399", ink: "#d1fae5", dark: "#022c22" },
];

const species = [
  { id: "duck", label: "Duck", draw: duck },
  { id: "fox", label: "Fox", draw: fox },
  { id: "cat", label: "Cat", draw: cat },
  { id: "owl", label: "Owl", draw: owl },
];

function duck(p) {
  return `
    <ellipse cx="64" cy="78" rx="36" ry="28" fill="${p.fg}"/>
    <circle cx="64" cy="48" r="22" fill="${p.fg}"/>
    <ellipse cx="88" cy="50" rx="10" ry="6" fill="${p.ink}"/>
    <circle cx="58" cy="44" r="4" fill="${p.dark}"/>
    <circle cx="72" cy="44" r="4" fill="${p.dark}"/>
    <circle cx="59.2" cy="43" r="1.4" fill="#fff"/>
    <circle cx="73.2" cy="43" r="1.4" fill="#fff"/>
    <path d="M64 52 l16 4 -16 4 z" fill="#f59e0b"/>
    <ellipse cx="48" cy="96" rx="8" ry="4" fill="${p.ink}" opacity=".7"/>
    <ellipse cx="80" cy="96" rx="8" ry="4" fill="${p.ink}" opacity=".7"/>
  `;
}

function fox(p) {
  return `
    <ellipse cx="64" cy="84" rx="32" ry="24" fill="${p.fg}"/>
    <circle cx="64" cy="56" r="24" fill="${p.fg}"/>
    <path d="M40 48 L34 22 L54 40 Z" fill="${p.fg}"/>
    <path d="M88 48 L94 22 L74 40 Z" fill="${p.fg}"/>
    <path d="M42 46 L38 28 L52 40 Z" fill="${p.ink}"/>
    <path d="M86 46 L90 28 L76 40 Z" fill="${p.ink}"/>
    <circle cx="54" cy="56" r="4.2" fill="${p.dark}"/>
    <circle cx="74" cy="56" r="4.2" fill="${p.dark}"/>
    <circle cx="55.4" cy="54.8" r="1.3" fill="#fff"/>
    <circle cx="75.4" cy="54.8" r="1.3" fill="#fff"/>
    <ellipse cx="64" cy="66" rx="5" ry="3.5" fill="${p.dark}"/>
    <path d="M64 69 Q56 76 50 74" stroke="${p.dark}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M64 69 Q72 76 78 74" stroke="${p.dark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  `;
}

function cat(p) {
  return `
    <ellipse cx="64" cy="86" rx="30" ry="22" fill="${p.fg}"/>
    <circle cx="64" cy="58" r="26" fill="${p.fg}"/>
    <path d="M42 48 L38 20 L58 42 Z" fill="${p.fg}"/>
    <path d="M86 48 L90 20 L70 42 Z" fill="${p.fg}"/>
    <path d="M44 44 L42 28 L54 42 Z" fill="${p.ink}"/>
    <path d="M84 44 L86 28 L74 42 Z" fill="${p.ink}"/>
    <ellipse cx="54" cy="58" rx="5" ry="6" fill="${p.dark}"/>
    <ellipse cx="74" cy="58" rx="5" ry="6" fill="${p.dark}"/>
    <ellipse cx="54" cy="58" rx="2" ry="4" fill="#22c55e"/>
    <ellipse cx="74" cy="58" rx="2" ry="4" fill="#22c55e"/>
    <path d="M64 66 Q64 72 58 74 Q64 70 70 74 Q64 72 64 66" fill="${p.ink}"/>
    <path d="M40 64 H50 M78 64 H88 M38 70 H50 M78 70 H90" stroke="${p.dark}" stroke-width="1.6" stroke-linecap="round"/>
  `;
}

function owl(p) {
  return `
    <ellipse cx="64" cy="78" rx="34" ry="32" fill="${p.fg}"/>
    <circle cx="50" cy="58" r="16" fill="${p.ink}"/>
    <circle cx="78" cy="58" r="16" fill="${p.ink}"/>
    <circle cx="50" cy="58" r="9" fill="${p.dark}"/>
    <circle cx="78" cy="58" r="9" fill="${p.dark}"/>
    <circle cx="53" cy="55" r="3" fill="#fff"/>
    <circle cx="81" cy="55" r="3" fill="#fff"/>
    <path d="M64 68 L74 78 L54 78 Z" fill="#f59e0b"/>
    <path d="M40 38 L50 48 L34 50 Z" fill="${p.fg}"/>
    <path d="M88 38 L78 48 L94 50 Z" fill="${p.fg}"/>
    <path d="M42 96 Q64 108 86 96" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
  `;
}

function wrap(inner, palette, extra = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img">
  <rect width="128" height="128" rx="28" fill="${palette.bg}"/>
  <circle cx="64" cy="64" r="52" fill="${palette.dark}" opacity=".35"/>
  ${inner}
  ${extra}
</svg>
`;
}

function accessory(kind, p) {
  if (kind === 0) {
    return `<rect x="28" y="48" width="72" height="8" rx="3" fill="${p.ink}" opacity=".85"/>
      <circle cx="44" cy="52" r="12" fill="none" stroke="${p.ink}" stroke-width="4"/>
      <circle cx="84" cy="52" r="12" fill="none" stroke="${p.ink}" stroke-width="4"/>`;
  }
  if (kind === 1) {
    return `<path d="M30 38 Q64 12 98 38 L92 44 Q64 24 36 44 Z" fill="${p.ink}"/>
      <rect x="56" y="18" width="16" height="8" rx="2" fill="${p.fg}"/>`;
  }
  if (kind === 2) {
    return `<path d="M24 56 Q20 40 36 38 Q64 28 92 38 Q108 40 104 56" fill="none" stroke="${p.ink}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="24" cy="62" r="8" fill="${p.ink}"/>
      <circle cx="104" cy="62" r="8" fill="${p.ink}"/>`;
  }
  return `<circle cx="40" cy="92" r="7" fill="${p.ink}" opacity=".5"/>
    <circle cx="88" cy="28" r="5" fill="${p.fg}" opacity=".7"/>`;
}

const catalog = [];
let n = 1;
for (const spec of species) {
  for (const palette of palettes) {
    const id = String(n).padStart(2, "0");
    const svg = wrap(spec.draw(palette), palette, accessory((n - 1) % 4, palette));
    writeFileSync(join(outDir, `${id}.svg`), svg);
    catalog.push({
      id,
      src: `/avatars/${id}.svg`,
      label: `${palette.name} ${spec.label}`,
    });
    n += 1;
  }
}

const defaultSvg = wrap(duck(palettes[0]), palettes[0], `<text x="64" y="118" text-anchor="middle" font-size="9" font-family="ui-sans-serif,system-ui,sans-serif" fill="${palettes[0].ink}" opacity=".8">KS</text>`);
writeFileSync(join(outDir, "default.svg"), defaultSvg);

console.log(`Wrote ${catalog.length} presets + default.svg`);
console.log("Update PRESET_AVATARS in apps/web/lib/avatars.ts if labels or ids changed.");

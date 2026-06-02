// Génère les 4 couches SVG nettoyées + recolorées, identité injectée, viewBox commun 0 0 630 651.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// parse un attribut d -> liste d'anneaux [[x,y],...] (courbes approximées par extrémités)
function pathToRings(d) {
  const t = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi); if (!t) return [];
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0; const R = []; let r = [];
  const n = () => parseFloat(t[i++]); const u = () => r.push([x, y]);
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rl = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'M') { if (r.length) { R.push(r); r = []; } const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; sx = x; sy = y; u(); cmd = rl ? 'l' : 'L'; }
    else if (C === 'L') { const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; u(); }
    else if (C === 'H') { x = rl ? x + n() : n(); u(); }
    else if (C === 'V') { y = rl ? y + n() : n(); u(); }
    else if (C === 'C') { n(); n(); n(); n(); const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; u(); }
    else if (C === 'S' || C === 'Q') { n(); n(); const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; u(); }
    else if (C === 'T') { const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; u(); }
    else if (C === 'A') { n(); n(); n(); n(); n(); const a = n(), b = n(); x = rl ? x + a : a; y = rl ? y + b : b; u(); }
    else if (C === 'Z') { x = sx; y = sy; if (r.length) { R.push(r); r = []; } }
    else i++;
  }
  if (r.length) R.push(r);
  return R;
}

const VB = '0 0 630 651';
const out = 'public/layers';
mkdirSync(out, { recursive: true });

// ---- utilitaires ----
function groupBody(s, id) {
  const i = s.indexOf(`id="${id}"`); if (i < 0) return '';
  let j = s.indexOf('>', i) + 1, depth = 1; const re = /<g\b|<\/g>/g; re.lastIndex = j; let m;
  while ((m = re.exec(s))) { if (m[0] === '</g>') { if (--depth === 0) return s.slice(j, m.index); } else depth++; }
  return s.slice(j);
}
const svgWrap = (id, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" class="layer" data-layer="${id}">\n${inner}\n</svg>\n`;

// ---- table des départements (source unique = composant existant) ----
const comp = readFileSync('src/CarteFranceSimple.tsx', 'utf8');
const depts = {}; // code -> {nom, region, prefecture}
for (const m of comp.matchAll(/"dep_[0-9a-bA-B]+":\s*\{\s*nom:\s*"([^"]+)",\s*code:\s*"([^"]+)",\s*region:\s*"([^"]+)",\s*prefecture:\s*"([^"]+)"/g)) {
  depts[m[2]] = { nom: m[1], region: m[3], prefecture: m[4] };
}
console.log('départements lus:', Object.keys(depts).length);
writeFileSync('src/depts.json', JSON.stringify(depts, null, 0));

const labels = JSON.parse(readFileSync('tools/labels.json', 'utf8'));

// ---- 1. Couche DÉPARTEMENTS (interactive) ----
{
  const s = readFileSync('départements.svg', 'utf8');
  const F = groupBody(s, 'France');
  const tags = F.match(/<path\b[\s\S]*?\/>/g) || [];
  if (tags.length !== labels.pathCode.length)
    console.warn('!! désalignement tags/labels', tags.length, labels.pathCode.length);
  const paths = tags.map((tag, i) => {
    const code = labels.pathCode[i];
    const region = depts[code]?.region || '';
    const d = (tag.match(/\bd="([^"]+)"/) || [])[1] || '';
    return `<path class="dep" data-dep="${code}" data-region="${region.replace(/"/g, '&quot;')}" d="${d.replace(/\s+/g, ' ')}"/>`;
  });
  writeFileSync(`${out}/departements.svg`, svgWrap('departements', `<g>${paths.join('')}</g>`));
  console.log('departements.svg:', paths.length, 'tracés');

  // centroïde du plus grand tracé par département -> src/dept-centroids.json (pour les labels numéros)
  const best = {};
  tags.forEach((tag, i) => {
    const code = labels.pathCode[i]; if (!code) return;
    const d = (tag.match(/\bd="([^"]+)"/) || [])[1] || '';
    let A = 0, cx = 0, cy = 0;
    for (const r of pathToRings(d)) {
      let a = 0, px = 0, py = 0;
      for (let k = 0; k < r.length; k++) { const [x1, y1] = r[k], [x2, y2] = r[(k + 1) % r.length]; const cr = x1 * y2 - x2 * y1; a += cr; px += (x1 + x2) * cr; py += (y1 + y2) * cr; }
      a *= 0.5; if (Math.abs(a) < 1e-9) continue; A += a; cx += px / 6; cy += py / 6;
    }
    if (Math.abs(A) < 1e-9) return;
    const area = Math.abs(A), C = { area, cx: cx / A, cy: cy / A };
    if (!best[code] || area > best[code].area) best[code] = C;
  });
  const centroids = {};
  for (const c in best) centroids[c] = [+best[c].cx.toFixed(1), +best[c].cy.toFixed(1)];
  writeFileSync('src/dept-centroids.json', JSON.stringify(centroids));
  console.log('dept-centroids.json:', Object.keys(centroids).length, 'centroïdes');
}

// ---- 2. Couche RÉGIONS : contours par ARÊTES des départements ----
// Une arête est une frontière de région si elle est côtière (présente 1×) ou
// partagée entre deux départements de régions différentes. Méthode robuste et
// exactement cohérente avec la surbrillance. (régions.svg n'est PAS utilisé :
// son découpage diverge pour ~6 départements frontaliers, ex. le Jura.)
{
  const s = readFileSync('départements.svg', 'utf8');
  const F = groupBody(s, 'France');
  const tags = F.match(/<path\b[\s\S]*?\/>/g) || [];
  const q = (v) => Math.round(v * 10) / 10; // quantification 0,1 px pour apparier les sommets partagés
  const edges = new Map(); // clé -> {p1,p2,count,regions:Set}
  tags.forEach((tag, i) => {
    const region = depts[labels.pathCode[i]]?.region; if (!region) return;
    const d = (tag.match(/\bd="([^"]+)"/) || [])[1] || '';
    for (const ring of pathToRings(d)) {
      if (ring.length < 2) continue;
      for (let k = 0; k < ring.length; k++) {
        const p1 = ring[k], p2 = ring[(k + 1) % ring.length];
        const a = `${q(p1[0])},${q(p1[1])}`, b = `${q(p2[0])},${q(p2[1])}`;
        if (a === b) continue;
        const key = a < b ? `${a} ${b}` : `${b} ${a}`;
        let e = edges.get(key);
        if (!e) { e = { p1, p2, count: 0, regions: new Set() }; edges.set(key, e); }
        e.count++; e.regions.add(region);
      }
    }
  });
  const segs = [];
  for (const e of edges.values()) {
    if (e.count === 1 || e.regions.size > 1) {
      segs.push(`M${q(e.p1[0])},${q(e.p1[1])}L${q(e.p2[0])},${q(e.p2[1])}`);
    }
  }
  writeFileSync(`${out}/regions.svg`, svgWrap('regions', `<path class="region-outline" d="${segs.join('')}"/>`));
  console.log('regions.svg:', segs.length, 'arêtes de frontière');
}

// ---- 3. Couche PRÉFECTURES (points interactifs) ----
{
  const circles = labels.dots.map(([x, y], i) => {
    const code = labels.dotCode[i];
    return `<circle class="pref" data-dep="${code}" cx="${(+x).toFixed(1)}" cy="${(+y).toFixed(1)}" r="3.2"/>`;
  });
  writeFileSync(`${out}/prefectures.svg`, svgWrap('prefectures', `<g>${circles.join('')}</g>`));
  console.log('prefectures.svg:', circles.length, 'points');
}

// ---- 4. Couche FLEUVES (tracés, non interactive) ----
{
  const s = readFileSync('fleuves.svg', 'utf8');
  const Fl = groupBody(s, 'Fleuves');
  // tracés déjà bleus ; on neutralise les fonds blancs, on arrondit les coordonnées
  // (1 décimale) et on compacte les espaces -> fichier ~3-5x plus léger.
  const inner = Fl
    .replace(/fill="#FFFFFF"/g, 'fill="none"')
    .replace(/-?\d+\.\d+/g, (m) => (+m).toFixed(1).replace(/\.0$/, ''))
    .replace(/\s+/g, ' ');
  writeFileSync(`${out}/fleuves.svg`, svgWrap('fleuves', `<g class="rivers">${inner}</g>`));
  console.log('fleuves.svg:', (inner.match(/<path/g) || []).length, 'tracés');
}

console.log('-> couches écrites dans', out);

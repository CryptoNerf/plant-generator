/**
 * Batch flower generator — creates 472 flower PNG files in F:/flowers8
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. Run this script:       node generate-flowers.mjs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const APP_URL    = 'http://localhost:5173';
const OUTPUT_DIR = 'F:/flowers8';
const WAIT_MS    = 450; // wait (ms) for React re-render + canvas draw

// ═══════════════════════════════════════════════
//  COLOR PALETTES
// ═══════════════════════════════════════════════

// Full-spectrum petal palette — 100 distinct colours
const PETAL = [
  // reds & corals
  '#FF0000','#DC143C','#B22222','#8B0000','#C0392B',
  '#FF4500','#FF6347','#E9967A','#CD5C5C','#FA8072',
  // oranges
  '#FF7F50','#FF6600','#FF8C00','#FFA500','#FF9900',
  '#E2722C','#E25822','#FFAA33','#FF5722','#F4511E',
  // yellows
  '#FFD700','#FFFF00','#FFE135','#FFF44F','#F0E130',
  '#FADA5E','#EDD20B','#FFDB58','#F9A825','#FBC02D',
  // yellow-greens
  '#ADFF2F','#7FFF00','#7CFC00','#9ACD32','#6B8E23',
  '#BFFF00','#CAFF70','#B5D900','#8DB600','#8FBC8F',
  // greens
  '#00FF00','#32CD32','#00FA9A','#00FF7F','#3CB371',
  '#2E8B57','#228B22','#006400','#90EE90','#98FB98',
  // cyan-teals
  '#00CED1','#48D1CC','#40E0D0','#20B2AA','#008B8B',
  '#00BFFF','#87CEFA','#87CEEB','#B0E0E6','#ADD8E6',
  // blues
  '#1E90FF','#6495ED','#4169E1','#0000FF','#0000CD',
  '#00008B','#191970','#2F4F4F','#5B9BD5','#4682B4',
  // blue-purples
  '#7B68EE','#6A5ACD','#483D8B','#9370DB','#8A2BE2',
  '#6A0DAD','#9400D3','#800080','#4B0082','#663399',
  // pinks & magentas
  '#FF00FF','#FF00CC','#CC00FF','#FF33CC','#CC00CC',
  '#E75480','#FF1493','#FF69B4','#FFB6C1','#FFC0CB',
  // misc / special
  '#DDA0DD','#EE82EE','#DA70D6','#BA55D3','#D8BFD8',
  '#F5DEB3','#DEB887','#D2B48C','#A0522D','#FFFFFF',
];

// Diverse center colours — 30 entries
const CENTER = [
  '#FFD700','#FFA500','#FF8C00','#FF6347','#FF4500',
  '#8B4513','#A0522D','#4B3621','#D2691E','#CD853F',
  '#FFFFFF','#C0C0C0','#808080','#404040','#000000',
  '#228B22','#006400','#2E8B57','#808000','#556B2F',
  '#4169E1','#191970','#6A0DAD','#800080','#C71585',
  '#DC143C','#B22222','#FF1493','#00CED1','#FFD700',
];

// Stem greens — 15 entries
const STEM = [
  '#228B22','#32CD32','#006400','#3a7d44','#2E8B57',
  '#556B2F','#8FBC8F','#4a7c59','#5d9e6e','#2d6a4f',
  '#52b788','#40916c','#1b4332','#74c69d','#95d5b2',
];

// Leaf greens — 15 entries
const LEAF = [
  '#228B22','#32CD32','#006400','#3a7d44','#2E8B57',
  '#6B8E23','#8FBC8F','#90EE90','#9ACD32','#7CFC00',
  '#556B2F','#2d6a4f','#52b788','#74c69d','#a8dadc',
];

// Fluffy-dandelion "cloud" colours — subtle tinted whites
const FLUFFY_RAY = [
  '#FFFFFF','#F5F5F5','#FFFAFA','#E8E8E8','#F0F0F0',
  '#DCDCDC','#E0E0E0','#D3D3D3','#C0C0C0','#F8F8FF',
  '#FAEBD7','#FFE4E1','#FFF0F5','#F0FFF0','#F0F8FF',
  '#FFF5EE','#FFFFF0','#E6E6FA','#FFF8DC','#FAFAD2',
  '#E1F5FE','#E8F5E9','#FFD1DC','#B5EAD7','#C7CEEA',
  '#FFDAC1','#E2F0CB','#FFB7B2','#FF9AA2','#85C1E9',
  '#A9CCE3','#FAD7A0','#ABEBC6','#D7BDE2','#F9E79F',
  '#A3E4D7','#D5D8DC','#ABB2B9','#BFC9CA','#CCD1D1',
];

// Fluffy-dandelion seed/centre colours — various browns & greys
const FLUFFY_SEED = [
  '#8B7355','#A0522D','#4B3621','#D2B48C','#8B4513',
  '#5C4033','#795548','#6D4C41','#4E342E','#3E2723',
  '#9E9E9E','#757575','#616161','#424242','#212121',
  '#BCAAA4','#A1887F','#8D6E63','#6D4C41','#BF8970',
];

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

/** Repeat-cycles `arr` to produce exactly `n` elements */
function cycle(arr, n) {
  return Array.from({ length: n }, (_, i) => arr[i % arr.length]);
}

/**
 * Builds N configs by ZIPPING parameter arrays so that adjacent flowers
 * differ on every axis — maximising visible diversity in the output folder.
 */
function zipType(grassType, extraBase, paramArrays, n, seedOffset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const newParams = { grassType, UseGradient: false, ...extraBase };
    for (const [key, arr] of Object.entries(paramArrays)) {
      newParams[key] = arr[i % arr.length];
    }
    return { type: 'grass', newParams, seed: (seedOffset + i) % 16 };
  });
}

// ═══════════════════════════════════════════════
//  FLOWER CONFIGURATIONS  (472 total)
// ═══════════════════════════════════════════════

function buildConfigs() {
  const all = [];

  // ── Chamomile (80) ─────────────────────────────────────────────────────
  // Full spectrum petals — every shade from white to red to blue to purple
  all.push(...zipType('chamomile', {}, {
    flowerColor:       PETAL.slice(0, 80),                            // 80 unique primary colours
    flowerCenterColor: cycle(CENTER, 80),
    flowerSize:        cycle([7, 9, 11, 13, 15, 17, 19, 22], 80),
    petalCount:        cycle([5, 6, 7, 8, 9, 10, 12, 15], 80),
    length:            cycle([85, 105, 125, 145, 165, 190], 80),
    blades:            cycle([5, 7, 9, 11, 13], 80),
    color:             cycle(STEM, 80),
    leafColor:         cycle(LEAF, 80),
    spread:            cycle([40, 55, 70, 85, 100], 80),
    curvature:         cycle([0.3, 0.5, 0.7, 0.9], 80),
  }, 80, 0));

  // ── Dandelion – yellow + creative (78) ─────────────────────────────────
  // Starts with traditional yellows, then expands to full creative spectrum
  const DND_COLORS = [
    // Traditional yellows & golds (20)
    '#FFD700','#FFA500','#FFFF00','#FFB347','#FF8C00',
    '#FFAA00','#DAA520','#EEC900','#FFC200','#F4B942',
    '#FFB300','#FFC107','#FF8F00','#FF6F00','#E6B800',
    '#D4A017','#C8900A','#B5850B','#F9A825','#F57F17',
    // Creative / unexpected (58)
    '#FF69B4','#FF1493','#DC143C','#FF4500','#FF6347',
    '#BA55D3','#9370DB','#6495ED','#4169E1','#00BFFF',
    '#ADFF2F','#7FFF00','#00FA9A','#00CED1','#40E0D0',
    '#FF00FF','#CC00FF','#FF33CC','#E75480','#CB4154',
    '#8B0000','#B22222','#C0392B','#E74C3C','#922B21',
    '#1ABC9C','#16A085','#148F77','#117A65','#0E6655',
    '#2980B9','#2471A3','#1F618D','#1A5276','#154360',
    '#6C3483','#76448A','#7D3C98','#884EA0','#9B59B6',
    '#1E8449','#196F3D','#145A32','#0B5345','#0A3D2E',
    '#4A235A','#512E5F','#5B2C6F','#6C3483','#7D3C98',
    '#784212','#6E2C10','#641E16','#5B2333','#4A235A',
    '#1C2833','#17202A','#0B0B0B','#212121','#000000',
    '#FDFEFE','#F8F9FA','#EAECEE','#D5D8DC','#BFC9CA',
  ];
  all.push(...zipType('dandelion', { dandelionFluffy: false }, {
    flowerColor:       cycle(DND_COLORS, 78),
    flowerCenterColor: cycle(CENTER, 78),
    flowerSize:        cycle([9, 11, 13, 15, 17, 20, 23], 78),
    petalCount:        cycle([8, 10, 12, 14, 16], 78),
    length:            cycle([85, 105, 125, 150, 175, 200], 78),
    blades:            cycle([4, 6, 8, 10, 12], 78),
    color:             cycle(STEM, 78),
    leafColor:         cycle(LEAF, 78),
    spread:            cycle([45, 60, 75, 90], 78),
    curvature:         cycle([0.3, 0.5, 0.7, 0.9], 78),
  }, 78, 10));

  // ── Dandelion – fluffy (78) ─────────────────────────────────────────────
  all.push(...zipType('dandelion', { dandelionFluffy: true }, {
    flowerColor:       cycle(FLUFFY_RAY, 78),
    flowerCenterColor: cycle(FLUFFY_SEED, 78),
    flowerSize:        cycle([11, 13, 15, 17, 19, 22, 25], 78),
    length:            cycle([90, 110, 130, 150, 175, 200], 78),
    blades:            cycle([4, 6, 8, 10, 12], 78),
    color:             cycle(STEM, 78),
    leafColor:         cycle(LEAF, 78),
    spread:            cycle([40, 55, 70, 85], 78),
    curvature:         cycle([0.4, 0.6, 0.8], 78),
  }, 78, 20));

  // ── Clover (78) ──────────────────────────────────────────────────────────
  // Pinks and purples first, then creative expansion
  const CLOVER_COLORS = [
    '#FFB6C1','#FF69B4','#FFFFFF','#FFC0CB','#DDA0DD',
    '#EE82EE','#FF1493','#DB7093','#C71585','#FF007F',
    '#BA55D3','#9370DB','#8A2BE2','#FF00FF','#DA70D6',
    '#FF33CC','#E75480','#F2ABBA','#DC143C','#B22222',
    '#FF4500','#FF6347','#FFA500','#FFD700','#ADFF2F',
    '#7FFF00','#00FA9A','#00CED1','#6495ED','#4169E1',
    '#191970','#800080','#4B0082','#9400D3','#663399',
    '#CC00FF','#9900CC','#7700BB','#5500AA','#330099',
    '#FF3399','#FF0066','#CC0044','#AA0033','#880022',
    '#FFCC00','#FF9900','#FF6600','#FF3300','#FF0000',
    '#00FFCC','#00CCAA','#009988','#007766','#005544',
    '#CCFF00','#AADD00','#88BB00','#669900','#447700',
    '#FF99CC','#FF77AA','#FF5588','#FF3366','#FF1144',
    '#00CCFF','#00AADD','#0088BB','#006699','#004477',
    '#FFCCFF','#EEBBEE','#DD99DD','#CC77CC','#BB55BB',
    '#CCFFCC','#AADDAA','#88BB88','#669966','#447744',
  ];
  all.push(...zipType('clover', {}, {
    flowerColor:       cycle(CLOVER_COLORS, 78),
    flowerCenterColor: cycle(CENTER, 78),
    flowerSize:        cycle([8, 10, 12, 14, 16, 18, 21], 78),
    length:            cycle([85, 105, 125, 150, 175, 200], 78),
    blades:            cycle([4, 6, 8, 10, 12], 78),
    color:             cycle(STEM, 78),
    leafColor:         cycle(LEAF, 78),
    spread:            cycle([40, 55, 70, 85, 100], 78),
    curvature:         cycle([0.3, 0.5, 0.7, 0.9], 78),
  }, 78, 30));

  // ── Cornflower (78) ──────────────────────────────────────────────────────
  // Blues/purples first, then full spectrum
  const CORN_COLORS = [
    '#6495ED','#4169E1','#191970','#00008B','#0000CD',
    '#1E90FF','#00BFFF','#00CED1','#40E0D0','#48D1CC',
    '#5F9EA0','#4682B4','#6A5ACD','#7B68EE','#9370DB',
    '#8A2BE2','#6A0DAD','#9400D3','#800080','#BA55D3',
    '#EE82EE','#FF00FF','#FF1493','#DC143C','#FF4500',
    '#FFA500','#FFD700','#ADFF2F','#00FA9A','#FFFFFF',
    '#FF6347','#FF7F50','#FFB347','#FADA5E','#F4A460',
    '#228B22','#32CD32','#006400','#2E8B57','#3CB371',
    '#FF69B4','#FFB6C1','#FFC0CB','#DB7093','#C71585',
    '#B22222','#8B0000','#CD5C5C','#E9967A','#FA8072',
    '#C0C0C0','#808080','#404040','#000000','#F8F8FF',
    '#00008B','#000080','#0D47A1','#1565C0','#1976D2',
    '#283593','#303F9F','#3949AB','#3F51B5','#5C6BC0',
    '#7986CB','#9FA8DA','#C5CAE9','#E8EAF6','#E3F2FD',
    '#BBDEFB','#90CAF9','#64B5F6','#42A5F5','#2196F3',
    '#1E88E5','#1565C0','#0D47A1','#082B6C','#051A40',
  ];
  all.push(...zipType('cornflower', {}, {
    flowerColor:       cycle(CORN_COLORS, 78),
    flowerCenterColor: cycle(CENTER, 78),
    flowerSize:        cycle([8, 10, 12, 14, 16, 18, 21], 78),
    petalCount:        cycle([8, 10, 12, 14, 16, 18], 78),
    length:            cycle([85, 105, 125, 150, 175, 200], 78),
    blades:            cycle([4, 6, 8, 10, 12], 78),
    color:             cycle(STEM, 78),
    leafColor:         cycle(LEAF, 78),
    spread:            cycle([40, 55, 70, 85], 78),
    curvature:         cycle([0.3, 0.5, 0.7, 0.9], 78),
  }, 78, 40));

  // ── Bellflower (80) ──────────────────────────────────────────────────────
  // Purples/pinks first, then full spectrum
  const BELL_COLORS = [
    '#9370DB','#8A2BE2','#6A0DAD','#DDA0DD','#DA70D6',
    '#C71585','#BA55D3','#FF00FF','#9400D3','#800080',
    '#EE82EE','#FF33CC','#CC00FF','#7B68EE','#6A5ACD',
    '#4169E1','#1E90FF','#00BFFF','#40E0D0','#00FA9A',
    '#90EE90','#ADFF2F','#FFD700','#FFA500','#FF4500',
    '#FF1493','#DC143C','#FF69B4','#FFB6C1','#FFFFFF',
    '#FF6347','#FF7F50','#FFB347','#FADA5E','#F4A460',
    '#DEB887','#CD853F','#A0522D','#8B4513','#D2691E',
    '#228B22','#32CD32','#006400','#2E8B57','#3CB371',
    '#00CED1','#48D1CC','#20B2AA','#008B8B','#5F9EA0',
    '#B22222','#8B0000','#C0392B','#E74C3C','#922B21',
    '#4682B4','#5B9BD5','#2F75B6','#1F618D','#154360',
    '#F39C12','#E67E22','#D35400','#CA6F1E','#B9770E',
    '#1ABC9C','#16A085','#148F77','#117A65','#0E6655',
    '#6C3483','#76448A','#7D3C98','#884EA0','#9B59B6',
    '#2ECC71','#27AE60','#1E8449','#196F3D','#145A32',
  ];
  all.push(...zipType('bellflower', {}, {
    flowerColor:       cycle(BELL_COLORS, 80),
    flowerCenterColor: cycle(CENTER, 80),
    flowerSize:        cycle([8, 10, 12, 14, 16, 18, 21], 80),
    bellCount:         cycle([1, 2, 3, 4], 80),
    length:            cycle([90, 110, 130, 155, 180, 205], 80),
    blades:            cycle([3, 5, 7, 9, 11], 80),
    color:             cycle(STEM, 80),
    leafColor:         cycle(LEAF, 80),
    spread:            cycle([35, 50, 65, 80, 100], 80),
    curvature:         cycle([0.3, 0.5, 0.7, 0.9], 80),
  }, 80, 50));

  return all;
}

// ═══════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════

async function main() {
  const configs = buildConfigs();
  const total = configs.length;
  console.log(`Built ${total} flower configurations.`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`Opening ${APP_URL} …`);
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch {
    console.error(`\nCould not open ${APP_URL}.`);
    console.error('Make sure the dev server is running:  npm run dev\n');
    await browser.close();
    process.exit(1);
  }

  try {
    await page.waitForFunction(() => window.__batchAPIReady === true, { timeout: 15000 });
  } catch {
    console.error('Batch API not available — is the app running correctly?');
    await browser.close();
    process.exit(1);
  }

  console.log('App ready. Starting batch generation…\n');

  let saved = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const num = String(i + 1).padStart(3, '0');

    await page.evaluate((c) => window.__setFlowerConfig(c), cfg);
    await new Promise(r => setTimeout(r, WAIT_MS));

    const dataUrl = await page.evaluate(() => window.__getFlowerPNG());

    if (dataUrl && dataUrl.startsWith('data:image/png')) {
      const base64   = dataUrl.slice('data:image/png;base64,'.length);
      const buf      = Buffer.from(base64, 'base64');
      const typeName = cfg.newParams.grassType + (cfg.newParams.dandelionFluffy ? '_fluffy' : '');
      const filename = path.join(OUTPUT_DIR, `flower_${num}_${typeName}.png`);
      fs.writeFileSync(filename, buf);
      saved++;

      if (saved % 20 === 0 || saved === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const pct = ((saved / total) * 100).toFixed(0);
        console.log(`[${pct}%] ${saved}/${total} saved  (${elapsed}s elapsed)`);
      }
    } else {
      console.warn(`  Warning: no canvas data for flower #${num}`);
      errors++;
    }
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! ${saved} flowers saved to ${OUTPUT_DIR}  (${errors} errors, ${elapsed}s total)`);
}

main().catch(err => { console.error(err); process.exit(1); });

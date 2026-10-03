// ============================================================================
// YKS Sayaç — Şehrim: piksel sanatı yardımcıları ve bina tipleri
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Şehrim (odak ödül/ceza oyunu) ----

// ---- Piksel sanati temel yardimcilar (satin alinan gorsel varliklarla birlikte kullanilir) ----

function pxMakeGrid(w, h) {
  var grid = [];
  for (var y = 0; y < h; y++) grid.push(new Array(w).fill(null));
  return grid;
}
function pxSet(grid, x, y, color) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = color;
}
function pxFillRect(grid, x0, y0, w, h, color) {
  for (var y = y0; y < y0 + h; y++) {
    for (var x = x0; x < x0 + w; x++) pxSet(grid, x, y, color);
  }
}
function pxFillTriangleRoof(grid, x0, y0, w, color) {
  var rows = Math.ceil(w / 2);
  for (var r = 0; r < rows; r++) {
    var inset = r;
    var rowW = w - inset * 2;
    if (rowW <= 0) break;
    pxFillRect(grid, x0 + inset, y0 + r, rowW, 1, color);
  }
}
function pxFillDome(grid, x0, y0, w, h, color) {
  for (var r = 0; r < h; r++) {
    var t = r / (h - 1 || 1);
    var inset = Math.round((w / 2) * Math.sqrt(1 - Math.pow(1 - t, 2)) * -1 + (w / 2));
    var rowW = w - inset * 2;
    if (rowW <= 0) continue;
    pxFillRect(grid, x0 + inset, y0 + r, rowW, 1, color);
  }
}
function pxAddGridDots(grid, x0, y0, w, h, color, stepX, stepY) {
  for (var y = y0; y < y0 + h; y += stepY) {
    for (var x = x0; x < x0 + w; x += stepX) pxSet(grid, x, y, color);
  }
}
function pxGridToSvgMarkup(grid) {
  var w = grid[0].length, h = grid.length;
  var rects = [];
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var c = grid[y][x];
      if (c) rects.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>');
    }
  }
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + rects.join("") + '</svg>';
}
function pxTreeShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  var trunkW = Math.max(1, Math.round(w * 0.2));
  var trunkX = Math.floor((w - trunkW) / 2);
  var trunkH = Math.round(h * 0.3);
  pxFillRect(grid, trunkX, h - trunkH, trunkW, trunkH, c.trunk);
  pxFillDome(grid, 0, 0, w, h - trunkH + 1, c.leaf);
  return grid;
}
function pxFountainShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  pxFillRect(grid, 0, h - 3, w, 3, c.water || c.base);
  var midW = Math.max(2, Math.round(w * 0.5));
  var midX = Math.floor((w - midW) / 2);
  pxFillRect(grid, midX, h - 6, midW, 3, c.pillar);
  var topW = Math.max(2, Math.round(w * 0.3));
  var topX = Math.floor((w - topW) / 2);
  pxFillRect(grid, topX, h - 8, topW, 2, c.water || c.base);
  pxSet(grid, Math.floor(w / 2), h - 9, c.pillar);
  pxSet(grid, Math.floor(w / 2), h - 10, c.pillar);
  pxSet(grid, Math.floor(w / 2) - 2, h - 4, c.water || c.base);
  pxSet(grid, Math.floor(w / 2) + 2, h - 4, c.water || c.base);
  return grid;
}
function pxDomeShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  var domeH = Math.round(h * 0.45);
  pxFillDome(grid, 0, 0, w, domeH, c.dome);
  pxFillRect(grid, 1, domeH, w - 2, h - domeH, c.wall);
  var doorW = Math.max(2, Math.round(w * 0.2));
  pxFillRect(grid, Math.floor((w - doorW) / 2), h - 3, doorW, 3, c.door);
  if (c.minaret) {
    var mx = w - 1;
    pxFillRect(grid, mx, 2, 1, h - 4, c.minaret);
    pxSet(grid, mx, 1, c.minaret);
  }
  if (c.columns) {
    for (var cx = 1; cx < w - 1; cx += 2) pxFillRect(grid, cx, domeH + 1, 1, h - domeH - 2, c.column);
  }
  return grid;
}
function pxObeliskShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  pxFillRect(grid, 0, h - 2, w, 2, c.base);
  var pillarW = Math.max(2, Math.round(w * 0.4));
  var px0 = Math.floor((w - pillarW) / 2);
  pxFillRect(grid, px0, 2, pillarW, h - 4, c.stone);
  pxFillTriangleRoof(grid, px0 - 1, 0, pillarW + 2, c.stone);
  return grid;
}
function pxWheelShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  var cx = w / 2, cy = h * 0.42, r = Math.min(w, h * 0.8) / 2 - 1;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var d = Math.sqrt(Math.pow(x + 0.5 - cx, 2) + Math.pow(y + 0.5 - cy, 2));
      if (Math.abs(d - r) < 0.75) pxSet(grid, x, y, c.wheel);
    }
  }
  pxSet(grid, Math.round(cx), Math.round(cy), c.hub);
  var legY = Math.round(cy + r);
  pxFillRect(grid, Math.round(cx) - 2, legY, 1, h - legY, c.leg);
  pxFillRect(grid, Math.round(cx) + 1, legY, 1, h - legY, c.leg);
  return grid;
}
function pxBridgeShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  var deckY = Math.round(h * 0.55);
  pxFillRect(grid, 1, deckY, 2, h - deckY, c.pillar);
  pxFillRect(grid, w - 3, deckY, 2, h - deckY, c.pillar);
  pxFillRect(grid, 0, deckY, w, 2, c.deck);
  var R = w / 2 - 2;
  var archRows = Math.min(deckY, Math.ceil(R));
  for (var r = 0; r < archRows; r++) {
    var halfW = Math.sqrt(Math.max(0, R * R - r * r));
    var inset = Math.round(R - halfW);
    pxSet(grid, inset, deckY - 1 - r, c.rail);
    pxSet(grid, w - 1 - inset, deckY - 1 - r, c.rail);
  }
  return grid;
}
function pxOfficeShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  pxFillRect(grid, 0, 0, w, h, c.wall);
  pxAddGridDots(grid, 1, 1, w - 2, h - 2, c.window, 2, 2);
  return grid;
}
function pxCastleShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  var bodyY = 2;
  pxFillRect(grid, 0, bodyY, w, h - bodyY, c.wall);
  for (var x = 0; x < w; x += 2) pxSet(grid, x, bodyY - 1, c.wall);
  var towerW = 2;
  pxFillRect(grid, 0, 0, towerW, h, c.tower);
  pxFillRect(grid, w - towerW, 0, towerW, h, c.tower);
  if (c.domeAccent) pxFillDome(grid, Math.floor(w / 2) - 2, bodyY - 3, 4, 3, c.domeAccent);
  var doorW = 3;
  pxFillRect(grid, Math.floor((w - doorW) / 2), h - 3, doorW, 3, c.door);
  if (c.window) pxAddGridDots(grid, 3, bodyY + 2, w - 6, h - bodyY - 4, c.window, 3, 3);
  return grid;
}
function pxRuinShape(w, h, c) {
  var grid = pxMakeGrid(w, h);
  pxFillRect(grid, 0, h - 1, w, 1, c.ground);
  var cols = 4, colW = 1, gap = Math.floor((w - cols * colW) / (cols + 1));
  var heights = [h - 2, Math.round(h * 0.5), h - 3, Math.round(h * 0.65)];
  for (var i = 0; i < cols; i++) {
    var xx = gap + i * (colW + gap);
    var ch = heights[i];
    pxFillRect(grid, xx, h - 1 - ch, colW, ch, c.stone);
    pxSet(grid, xx, h - 1 - ch - 1, c.stone);
  }
  pxFillRect(grid, Math.floor(w / 2) - 2, h - 2, 3, 1, c.stone);
  return grid;
}
function pxLampShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  pxFillRect(g, 1, 0, 3, 1, c.pole);
  pxFillRect(g, 1, 1, 3, 2, c.lamp);
  pxSet(g, 2, 1, c.glow);
  pxFillRect(g, 2, 3, 1, h - 4, c.pole);
  pxFillRect(g, 1, h - 1, 3, 1, c.pole);
  return g;
}
function pxBenchShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  pxFillRect(g, 0, 0, w, 2, c.back);
  pxFillRect(g, 0, 3, w, 1, c.seat);
  pxFillRect(g, 1, 4, 1, h - 4, c.leg);
  pxFillRect(g, w - 2, 4, 1, h - 4, c.leg);
  return g;
}
function pxFlowersShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  pxFillRect(g, 0, h - 2, w, 2, c.leaf);
  for (var x = 1; x < w - 1; x += 2) {
    var col = c.blooms[(x >> 1) % c.blooms.length];
    var top = (x % 4 === 1) ? 0 : 1;
    pxSet(g, x, top, col);
    pxSet(g, x, top + 1, col);
    pxSet(g, x, top + 2, c.stem);
  }
  return g;
}
function pxSignShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  var boardH = Math.round(h * 0.58);
  pxFillRect(g, 0, 0, w, boardH, c.frame);
  pxFillRect(g, 1, 1, w - 2, boardH - 2, c.board);
  pxFillRect(g, Math.floor(w / 2) - 1, boardH, 2, h - boardH, c.post);
  return g;
}
function pxBusStopShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  pxFillRect(g, 0, 0, w, 2, c.roof);
  pxFillRect(g, 0, 2, 1, h - 2, c.post);
  pxFillRect(g, w - 1, 2, 1, h - 2, c.post);
  pxFillRect(g, 1, 2, w - 2, h - 6, c.glass);
  pxFillRect(g, 2, h - 4, w - 4, 1, c.seat);
  pxFillRect(g, 3, h - 3, 1, 3, c.post);
  pxFillRect(g, w - 4, h - 3, 1, 3, c.post);
  pxFillRect(g, w - 4, 3, 2, 3, c.sign);
  return g;
}
function pxPineShape(w, h, c) {
  var g = pxMakeGrid(w, h);
  for (var i = 0; i < 4; i++) {
    var tw = Math.min(w, 2 + i * 2);
    var x0 = Math.floor((w - tw) / 2);
    pxFillRect(g, x0, i * 3, tw, 3, c.leaf);
    pxFillRect(g, x0, i * 3, 1, 3, c.leafDark);
  }
  pxFillRect(g, Math.floor(w / 2) - 1, h - 2, 2, 2, c.trunk);
  return g;
}
// Yol karosu: mask bitleri K=1 D=2 G=4 B=8 (komşu yol yönleri). Kaldırım kenarı + orta şerit.
function roadTileSvg(mask) {
  if (!mask) mask = 10;
  var A = "#4d515b", K = "#7b818d", L = "#e8d98e", N = 16;
  var g = pxMakeGrid(N, N);
  pxFillRect(g, 4, 4, 8, 8, A);
  if (mask & 1) pxFillRect(g, 4, 0, 8, 4, A);
  if (mask & 4) pxFillRect(g, 4, 12, 8, 4, A);
  if (mask & 2) pxFillRect(g, 12, 4, 4, 8, A);
  if (mask & 8) pxFillRect(g, 0, 4, 4, 8, A);
  var edge = [];
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      if (!g[y][x]) continue;
      var nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (var i = 0; i < 4; i++) {
        var nx = nb[i][0], ny = nb[i][1];
        if (nx >= 0 && nx < N && ny >= 0 && ny < N && !g[ny][nx]) { edge.push([x, y]); break; }
      }
    }
  }
  edge.forEach(function (p) { g[p[1]][p[0]] = K; });
  function dashH(row, x0, x1) { for (var xx = x0; xx <= x1; xx++) if ((xx % 4) < 2) pxSet(g, xx, row, L); }
  function dashV(col, y0, y1) { for (var yy = y0; yy <= y1; yy++) if ((yy % 4) < 2) pxSet(g, col, yy, L); }
  if (mask === 10) { dashH(7, 0, 15); }
  else if (mask === 5) { dashV(7, 0, 15); }
  else {
    if (mask & 8) dashH(7, 0, 3);
    if (mask & 2) dashH(7, 12, 15);
    if (mask & 1) dashV(7, 0, 3);
    if (mask & 4) dashV(7, 12, 15);
  }
  return pxGridToSvgMarkup(g).replace("<svg ", '<svg preserveAspectRatio="none" ');
}
function buildProceduralSvg(shapeName, w, h, colors) {
  var grid;
  switch (shapeName) {
    case "tree": grid = pxTreeShape(w, h, colors); break;
    case "fountain": grid = pxFountainShape(w, h, colors); break;
    case "dome": grid = pxDomeShape(w, h, colors); break;
    case "obelisk": grid = pxObeliskShape(w, h, colors); break;
    case "wheel": grid = pxWheelShape(w, h, colors); break;
    case "bridge": grid = pxBridgeShape(w, h, colors); break;
    case "office": grid = pxOfficeShape(w, h, colors); break;
    case "castle": grid = pxCastleShape(w, h, colors); break;
    case "ruin": grid = pxRuinShape(w, h, colors); break;
    case "lamp": grid = pxLampShape(w, h, colors); break;
    case "bench": grid = pxBenchShape(w, h, colors); break;
    case "flowers": grid = pxFlowersShape(w, h, colors); break;
    case "sign": grid = pxSignShape(w, h, colors); break;
    case "busstop": grid = pxBusStopShape(w, h, colors); break;
    case "pine": grid = pxPineShape(w, h, colors); break;
    default: grid = pxMakeGrid(w, h);
  }
  return pxGridToSvgMarkup(grid);
}
function buildingVisualMarkup(b, type) {
  type = type || BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0];
  if (type && type.anim && BUILDING_IMAGES[type.anim.key]) {
    var an = type.anim;
    return '<div class="pcs-anim" role="img" aria-label="' + b.name + '" style="--frames:' + an.frames +
      ';--ar:' + an.w + ' / ' + an.h + ';--ms:' + an.ms + 'ms;background-image:url(' + BUILDING_IMAGES[an.key] + ')"></div>';
  }
  var imgKey = b.imageKey;
  if (!imgKey && type && type.images && type.images.length) imgKey = type.images[0];
  if (imgKey && BUILDING_IMAGES[imgKey]) {
    var litSrc = BUILDING_IMAGES[imgKey + "_lit"];
    if (litSrc) {
      return '<img class="pcs-day" src="' + BUILDING_IMAGES[imgKey] + '" alt="' + b.name + '">' +
        '<img class="pcs-lit' + ((type && type.glow) ? ' pcs-glow' : '') + '" src="' + litSrc + '" alt="">';
    }
    return '<img src="' + BUILDING_IMAGES[imgKey] + '" alt="' + b.name + '">';
  }
  if (type && type.sprite) {
    return buildProceduralSvg(type.sprite.shape, type.sprite.w, type.sprite.h, type.sprite.colors);
  }
  return '<span style="font-size:26px;">' + (b.emoji || "\ud83c\udfe0") + '</span>';
}
var BUILDING_TYPES = [
  { emoji: "🌳", name: "Park", cost: 2, population: 2,
    sprite: { shape: "tree", w: 8, h: 12, colors: { trunk: "#7a5230", leaf: "#5f9c5a" } } },
  { emoji: "🌲", name: "Bahçe", cost: 3, population: 3, images: ["bahce1"] },
  { emoji: "🏠", name: "Ev", cost: 4, population: 5,
    images: ["ev1", "ev2", "ev3", "ev4", "ev5", "ev6", "ev7", "ev8"] },
  { emoji: "⛲", name: "Çeşme", cost: 6, population: 2,
    sprite: { shape: "fountain", w: 8, h: 12, colors: { base: "#6b8fae", pillar: "#9aa5ab", water: "#8fb4d1" } } },
  { emoji: "🕌", name: "Cami (tarihi)", cost: 8, population: 15,
    sprite: { shape: "dome", w: 12, h: 14, colors: { dome: "#5f9c86", wall: "#e7ddc7", door: "#5a3b25", minaret: "#cfc6ab" } } },
  { emoji: "🏪", name: "Dükkan", cost: 10, population: 6, images: ["dukkan1", "dukkan2", "dukkan3"] },
  { emoji: "🌾", name: "Çiftlik", cost: 12, population: 8, images: ["ciftlik1", "ciftlik2"] },
  { emoji: "🗿", name: "Anıt (tarihi)", cost: 15, population: 3,
    sprite: { shape: "obelisk", w: 6, h: 14, colors: { base: "#9aa5ab", stone: "#c7c2b8" } } },
  { emoji: "🌉", name: "Köprü", cost: 18, population: 4,
    sprite: { shape: "bridge", w: 14, h: 10, colors: { deck: "#9aa5ab", pillar: "#7d8790", rail: "#c7c2b8" } } },
  { emoji: "🎡", name: "Lunapark", cost: 20, population: 20,
    sprite: { shape: "wheel", w: 12, h: 14, colors: { wheel: "#c97064", hub: "#e7a33e", leg: "#8a6a4a" } } },
  { emoji: "🏫", name: "Okul", cost: 22, population: 40, images: ["okul1"] },
  { emoji: "⛩️", name: "Tapınak (tarihi)", cost: 28, population: 15,
    sprite: { shape: "dome", w: 12, h: 14, colors: { dome: "#b58fd9", wall: "#e7ddc7", door: "#5a3b25", columns: true, column: "#cfc6ab" } } },
  { emoji: "🏢", name: "Ofis", cost: 32, population: 25,
    sprite: { shape: "office", w: 8, h: 16, colors: { wall: "#7d8790", window: "#d9e6ee" } } },
  { emoji: "🗼", name: "Tarihi Kule", cost: 38, population: 10, images: ["kule1"] },
  { emoji: "🏛️", name: "Antik Kalıntı (tarihi)", cost: 45, population: 5,
    sprite: { shape: "ruin", w: 12, h: 10, colors: { stone: "#c7c2b8", ground: "#9c9080" } } },
  { emoji: "🏰", name: "Kale", cost: 55, population: 30,
    sprite: { shape: "castle", w: 14, h: 14, colors: { wall: "#9aa5ab", tower: "#7d8790", door: "#3a2a1e", window: "#e7a33e" } } },
  { emoji: "🛸", name: "Gizemli İstasyon", cost: 60, population: 8, images: ["gizemli1"] },
  { emoji: "🥚", name: "Zaman Kapsülü", cost: 65, population: 5, images: ["kapsul1"] },
  { emoji: "🏯", name: "Saray", cost: 75, population: 60,
    sprite: { shape: "castle", w: 16, h: 15, colors: { wall: "#d9b56b", tower: "#b58fd9", door: "#5a3b25", window: "#e7a33e", domeAccent: "#b58fd9" } } },
  // ---- Yollar & dekor (nüfus etkisi yok, sadece görsel) ----
  { emoji: "🛣️", name: "Yol", cost: 1, population: 0, cat: "dekor", road: true },
  { emoji: "💡", name: "Sokak Lambası", cost: 1, population: 0, cat: "dekor",
    images: ["cp_lamp_a"], glow: true, pxH: 32,
    sprite: { shape: "lamp", w: 5, h: 14, colors: { pole: "#4a4f58", lamp: "#ffd86b", glow: "#fff4b8" } } },
  { emoji: "🎄", name: "Çam Ağacı", cost: 1, population: 0, cat: "dekor",
    sprite: { shape: "pine", w: 8, h: 14, colors: { leaf: "#3f7f4a", leafDark: "#2f6a3c", trunk: "#6b4a2b" } } },
  { emoji: "🪑", name: "Bank", cost: 2, population: 0, cat: "dekor",
    images: ["cp_bench_1", "cp_bench_2"], pxH: 16, tiny: true,
    sprite: { shape: "bench", w: 10, h: 7, colors: { back: "#8a5a34", seat: "#a8703f", leg: "#4a4f58" } } },
  { emoji: "🌷", name: "Çiçeklik", cost: 2, population: 0, cat: "dekor",
    sprite: { shape: "flowers", w: 10, h: 6, colors: { leaf: "#4f8f4a", stem: "#3f7a3c", blooms: ["#e2566b", "#f2c94c", "#b58fd9", "#f28fb1"] } } },
  { emoji: "🪧", name: "Tabela", cost: 2, population: 0, cat: "dekor",
    sprite: { shape: "sign", w: 16, h: 12, colors: { frame: "#5a3b25", board: "#e9d8a6", post: "#5a3b25" } } },
  { emoji: "🚏", name: "Otobüs Durağı", cost: 3, population: 0, cat: "dekor",
    sprite: { shape: "busstop", w: 14, h: 14, colors: { roof: "#c0483f", post: "#4a4f58", glass: "#b7d8e6", seat: "#8a5a34", sign: "#f2c94c" } } },
  // ---- Modern şehir (City Pack — nyknck): binalar, gece pencereleri yanar ----
  { emoji: "🏪", name: "Market", cost: 9, population: 6, tab: "sehir", images: ["cp_market"], pxH: 42 },
  { emoji: "☕", name: "Kafe", cost: 11, population: 7, tab: "sehir", images: ["cp_kafe"], pxH: 48 },
  { emoji: "🛍️", name: "Mağaza", cost: 12, population: 8, tab: "sehir", images: ["cp_magaza"], pxH: 48 },
  { emoji: "👗", name: "Butik", cost: 14, population: 10, tab: "sehir", images: ["cp_butik"], pxH: 54 },
  { emoji: "🥖", name: "Fırın", cost: 10, population: 7, tab: "sehir", images: ["cp_firin"], pxH: 48 },
  { emoji: "🧁", name: "Pastane", cost: 10, population: 7, tab: "sehir", images: ["cp_pastane"], pxH: 42 },
  { emoji: "🚇", name: "Metro Girişi", cost: 8, population: 5, tab: "sehir", images: ["cp_metro"], pxH: 48 },
  { emoji: "🏢", name: "Kırmızı Apartman", cost: 24, population: 30, tab: "sehir", images: ["cp_apt_kirmizi"], pxH: 96 },
  { emoji: "🏢", name: "Mavi Apartman", cost: 26, population: 32, tab: "sehir", images: ["cp_apt_mavi"], pxH: 96 },
  { emoji: "🏬", name: "Cam Kule", cost: 36, population: 44, tab: "sehir", images: ["cp_cam_kule"], pxH: 96 },
  { emoji: "🏙️", name: "Mavi Gökdelen", cost: 42, population: 52, tab: "sehir", images: ["cp_gokdelen"], pxH: 96 },
  { emoji: "🏛️", name: "Plaza", cost: 60, population: 75, tab: "sehir", images: ["cp_plaza"], pxH: 96 },
  // ---- Modern şehir dekoru ve araçlar (nüfus etkisi yok) ----
  { emoji: "🏮", name: "Kollu Lamba", cost: 2, population: 0, cat: "dekor", images: ["cp_lamp_b"], glow: true, pxH: 32 },
  { emoji: "🕯️", name: "Süs Lambası", cost: 2, population: 0, cat: "dekor", images: ["cp_lamp_c"], glow: true, pxH: 31 },
  { emoji: "🚦", name: "Trafik Lambası", cost: 2, population: 0, cat: "dekor", pxH: 30,
    anim: { key: "cp_traffic_pole_strip", frames: 4, w: 8, h: 30, ms: 4000 } },
  { emoji: "🚥", name: "Trafik Lambası (Kollu)", cost: 3, population: 0, cat: "dekor", pxH: 32,
    anim: { key: "cp_traffic_arm_strip", frames: 4, w: 29, h: 32, ms: 4000 } },
  { emoji: "🌳", name: "Şehir Ağacı", cost: 1, population: 0, cat: "dekor", images: ["cp_tree_1", "cp_tree_2"], pxH: 29, tiny: true },
  { emoji: "🪧", name: "Bilgi Panosu", cost: 2, population: 0, cat: "dekor", images: ["cp_board"], pxH: 16, tiny: true },
  { emoji: "🛑", name: "Yol Levhası", cost: 2, population: 0, cat: "dekor", images: ["cp_sign_1", "cp_sign_2", "cp_sign_3"], pxH: 27, tiny: true },
  { emoji: "🗑️", name: "Çöp Kutusu", cost: 1, population: 0, cat: "dekor", images: ["cp_trash"], pxH: 16, tiny: true },
  { emoji: "🧯", name: "Yangın Musluğu", cost: 1, population: 0, cat: "dekor", images: ["cp_hydrant"], pxH: 14, tiny: true },
  { emoji: "🚧", name: "Bariyer", cost: 1, population: 0, cat: "dekor", images: ["cp_barrier"], pxH: 11, tiny: true },
  { emoji: "🔶", name: "Trafik Konisi", cost: 1, population: 0, cat: "dekor", images: ["cp_cone"], pxH: 13, tiny: true },
  { emoji: "🥤", name: "Otomat", cost: 3, population: 0, cat: "dekor", images: ["cp_vending"], pxH: 32 },
  { emoji: "📦", name: "Koli", cost: 1, population: 0, cat: "dekor", images: ["cp_box_1", "cp_box_2", "cp_box_3"], pxH: 22, tiny: true },
  { emoji: "📢", name: "Reklam Panosu", cost: 4, population: 0, cat: "dekor", images: ["cp_billboard_1", "cp_billboard_2", "cp_billboard_3"], pxH: 66 },
  { emoji: "🚗", name: "Araba (Kırmızı)", cost: 4, population: 0, cat: "dekor", images: ["cp_car_red"], pxH: 27 },
  { emoji: "🚙", name: "Araba (Mavi)", cost: 4, population: 0, cat: "dekor", images: ["cp_car_blue"], pxH: 27 },
  { emoji: "🚚", name: "Kamyon", cost: 6, population: 0, cat: "dekor", images: ["cp_truck"], pxH: 32 },
  { emoji: "🚐", name: "Yemek Aracı", cost: 6, population: 0, cat: "dekor", images: ["cp_foodtruck"], pxH: 32 }
];

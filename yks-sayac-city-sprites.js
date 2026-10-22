// ============================================================================
// YKS Sayaç — Şehrim: piksel sanatı yardımcıları ve bina tipleri
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Şehrim (odak ödül/ceza oyunu) ----

// ---- Piksel ızgarası yardımcıları (yalnızca yol karoları için; yapılar artık hazır çizimlerden gelir) ----

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
  return '<span style="font-size:26px;">' + (b.emoji || "\ud83c\udfe0") + '</span>';
}
// minLevel: yapının satın alınabildiği şehir seviyesi (CITY_LEVELS indeksi; yoksa 0 = baştan açık). Mevcut yapılar kilitlenmez.
// Nüfus = altın × oran. Oran yapının rolüne göre tek tabloda: yeniden dengelemek için sadece buradaki sayıları değiştir.
//   konut   : ev, apartman, kule, plaza (yüksek yoğunluk)     ticaret: dükkan, kafe, market, çiftlik, metro …
//   kamu    : okul                                              yesil  : bahçe
//   ozel    : koleksiyonluk/merak uyandıran yapılar (kule, istasyon, kapsül)
var CITY_POP_RATIO = { konut: 1.25, ticaret: 0.75, kamu: 1.0, yesil: 1.0, ozel: 0.5 };
var BUILDING_TYPES = [
  { emoji: "🌲", name: "Bahçe", cost: 3, role: "yesil", images: ["bahce1"] },
  { emoji: "🏠", name: "Ev", cost: 4, role: "konut",
    images: ["ev1", "ev2", "ev3", "ev4", "ev5", "ev6", "ev7", "ev8"] },
  { emoji: "🏪", name: "Dükkan", cost: 10, role: "ticaret", images: ["dukkan1", "dukkan2", "dukkan3"] },
  { emoji: "🌾", name: "Çiftlik", cost: 12, role: "ticaret", images: ["ciftlik1", "ciftlik2"] },
  { emoji: "🏫", name: "Okul", cost: 22, minLevel: 1, role: "kamu", images: ["okul1"] },
  { emoji: "🗼", name: "Tarihi Kule", cost: 38, minLevel: 2, role: "ozel", images: ["kule1"] },
  { emoji: "🛸", name: "Gizemli İstasyon", cost: 60, minLevel: 2, role: "ozel", images: ["gizemli1"] },
  { emoji: "🥚", name: "Zaman Kapsülü", cost: 65, minLevel: 3, role: "ozel", images: ["kapsul1"] },
  // ---- Yollar & dekor (nüfus etkisi yok, sadece görsel) ----
  { emoji: "🛣️", name: "Yol", cost: 1, population: 0, cat: "dekor", road: true },
  { emoji: "💡", name: "Sokak Lambası", cost: 1, population: 0, cat: "dekor", images: ["cp_lamp_a"], glow: true, pxH: 32 },
  { emoji: "🪑", name: "Bank", cost: 2, population: 0, cat: "dekor", images: ["cp_bench_1", "cp_bench_2"], pxH: 16, tiny: true },
  // Tabela: yazı yazılabilen tek yapı (✏️ Yazı). Yüzü düz beyaz City Pack panosu; Reklam Panosu ile aynı boy ve fiyat.
  { emoji: "🪧", name: "Tabela", cost: 4, population: 0, cat: "dekor", images: ["cp_billboard_3"], pxH: 66 },
  // ---- Modern şehir (City Pack — nyknck): binalar, gece pencereleri yanar ----
  { emoji: "🚇", name: "Metro Girişi", cost: 8, role: "ticaret", tab: "sehir", images: ["cp_metro"], pxH: 48 },
  { emoji: "🏪", name: "Market", cost: 9, role: "ticaret", tab: "sehir", images: ["cp_market"], pxH: 42 },
  { emoji: "🥖", name: "Fırın", cost: 10, role: "ticaret", tab: "sehir", images: ["cp_firin"], pxH: 48 },
  { emoji: "🧁", name: "Pastane", cost: 10, role: "ticaret", tab: "sehir", images: ["cp_pastane"], pxH: 42 },
  { emoji: "☕", name: "Kafe", cost: 11, role: "ticaret", tab: "sehir", images: ["cp_kafe"], pxH: 48 },
  { emoji: "🛍️", name: "Mağaza", cost: 12, role: "ticaret", tab: "sehir", images: ["cp_magaza"], pxH: 48 },
  { emoji: "👗", name: "Butik", cost: 14, role: "ticaret", tab: "sehir", images: ["cp_butik"], pxH: 54 },
  { emoji: "🏢", name: "Kırmızı Apartman", cost: 24, minLevel: 1, role: "konut", tab: "sehir", images: ["cp_apt_kirmizi"], pxH: 96 },
  { emoji: "🏢", name: "Mavi Apartman", cost: 26, minLevel: 1, role: "konut", tab: "sehir", images: ["cp_apt_mavi"], pxH: 96 },
  { emoji: "🏬", name: "Cam Kule", cost: 36, minLevel: 2, role: "konut", tab: "sehir", images: ["cp_cam_kule"], pxH: 96 },
  { emoji: "🏙️", name: "Mavi Gökdelen", cost: 42, minLevel: 2, role: "konut", tab: "sehir", images: ["cp_gokdelen"], pxH: 96 },
  { emoji: "🏛️", name: "Plaza", cost: 60, minLevel: 3, role: "konut", tab: "sehir", images: ["cp_plaza"], pxH: 96 },
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
// Nüfus rolden hesaplanır (tek kaynak: CITY_POP_RATIO); en az 1.
BUILDING_TYPES.forEach(function (t) {
  if (t.role) t.population = Math.max(1, Math.round(t.cost * CITY_POP_RATIO[t.role]));
});
// Kaldırılan düşük kaliteli (koddan çizilmiş) yapılar: adı -> eski maliyet. Eski kayıtlardaki bu yapılar
// yüklemede silinir ve maliyetlerinin TAMAMI altın olarak iade edilir (bkz. cityMigrateRemoved).
var CITY_REMOVED_TYPES = {
  "Park": 2, "Çeşme": 6, "Cami (tarihi)": 8, "Anıt (tarihi)": 15, "Köprü": 18, "Lunapark": 20,
  "Tapınak (tarihi)": 28, "Ofis": 32, "Antik Kalıntı (tarihi)": 45, "Kale": 55, "Saray": 75,
  "Çam Ağacı": 1, "Çiçeklik": 2, "Otobüs Durağı": 3
};

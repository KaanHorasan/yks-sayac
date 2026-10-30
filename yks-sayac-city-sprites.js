// Yapı katalogu: fiyat, nüfus, rol ve (2D) kısa görünüm bilgisi. Şehir artık yalnızca 3D çizilir (yks-sayac-city3d.js);
// buradaki `images` anahtarları sadece görsel varyant seçimi içindir (ev1..ev8 -> 8 farklı ev modeli).
// Alanlar: role (nüfus oranı için), minLevel (satın alma seviyesi), road (yol), cat/tab (pazar sekmesi), population (süs için 0).
// pxH / glow / tiny / anim eski 2D alanlarıdır, kullanılmaz. onRoad: true = dekor yol karesine de konabilir (araç, koni, bariyer).

// Pano (şehrim kartı) ve yedek gösterim: yalnızca emoji.
function buildingVisualMarkup(b, type) {
  type = type || BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0];
  return '<span style="font-size:26px;">' + (b.emoji || (type && type.emoji) || "\ud83c\udfe0") + '</span>';
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
  { emoji: "🚧", name: "Bariyer", onRoad: true, cost: 1, population: 0, cat: "dekor", images: ["cp_barrier"], pxH: 11, tiny: true },
  { emoji: "🔶", name: "Trafik Konisi", onRoad: true, cost: 1, population: 0, cat: "dekor", images: ["cp_cone"], pxH: 13, tiny: true },
  { emoji: "🥤", name: "Otomat", cost: 3, population: 0, cat: "dekor", images: ["cp_vending"], pxH: 32 },
  { emoji: "📦", name: "Koli", cost: 1, population: 0, cat: "dekor", images: ["cp_box_1", "cp_box_2", "cp_box_3"], pxH: 22, tiny: true },
  { emoji: "📢", name: "Reklam Panosu", cost: 4, population: 0, cat: "dekor", images: ["cp_billboard_1", "cp_billboard_2", "cp_billboard_3"], pxH: 66 },
  { emoji: "🚗", name: "Araba (Kırmızı)", onRoad: true, cost: 4, population: 0, cat: "dekor", images: ["cp_car_red"], pxH: 27 },
  { emoji: "🚙", name: "Araba (Mavi)", onRoad: true, cost: 4, population: 0, cat: "dekor", images: ["cp_car_blue"], pxH: 27 },
  { emoji: "🚚", name: "Kamyon", onRoad: true, cost: 6, population: 0, cat: "dekor", images: ["cp_truck"], pxH: 32 },
  { emoji: "🚐", name: "Yemek Aracı", onRoad: true, cost: 6, population: 0, cat: "dekor", images: ["cp_foodtruck"], pxH: 32 },
  // ---- Doğa dekoru (v3.17.0, Kenney Nature Kit): yarım kare hassasiyetle yerleşir ----
  { emoji: "🌹", name: "Çiçek (Kırmızı)", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🌼", name: "Çiçek (Sarı)", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🌷", name: "Çiçek (Mor)", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🌿", name: "Çalı", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🪨", name: "Kaya", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🪵", name: "Kütük", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🍄", name: "Mantar", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🎃", name: "Balkabağı", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🪴", name: "Saksı", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🧱", name: "Çit", cost: 1, population: 0, cat: "dekor" },
  { emoji: "🔥", name: "Kamp Ateşi", cost: 2, population: 0, cat: "dekor" },
  { emoji: "🌲", name: "Ladin Ağacı", cost: 2, population: 0, cat: "dekor" },
  { emoji: "🌳", name: "Meşe Ağacı", cost: 2, population: 0, cat: "dekor" },
  { emoji: "🍂", name: "Sonbahar Ağacı", cost: 2, population: 0, cat: "dekor" },
  { emoji: "⛺", name: "Çadır", cost: 4, population: 0, cat: "dekor" },
  { emoji: "🗿", name: "Obelisk", cost: 6, population: 0, cat: "dekor" },
  { emoji: "🗽", name: "Heykel Sütunu", cost: 8, population: 0, cat: "dekor" }
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

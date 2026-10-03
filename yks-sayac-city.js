// ============================================================================
// YKS Sayaç — Şehrim: yerleşim ızgarası, pazar, satın alma, sahne ve görünüm
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

var cityState = { buildings: [], coins: 0, debuffSessionsLeft: 0 };
function cityKey() { return "focus-city"; }
function loadCity() {
  return storageGet(cityKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        if (parsed && Array.isArray(parsed.buildings)) {
          if (typeof parsed.coins !== "number") parsed.coins = 0;
          if (typeof parsed.debuffSessionsLeft !== "number") parsed.debuffSessionsLeft = 0;
          return normalizeCityLayout(parsed);
        }
      } catch (e) {}
    }
    return { buildings: [], coins: 0, debuffSessionsLeft: 0 };
  });
}
function saveCity() {
  return storageSet(cityKey(), JSON.stringify(cityState));
}
function roundCoins(n) {
  return Math.round(n * 10) / 10;
}
function computeFocusReward(elapsedMs) {
  var hours = elapsedMs / 3600000;
  var streakValue = (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0;
  var multiplier = (streakValue + 20) / 20;
  return roundCoins(hours * multiplier);
}
// Normal kronometre (odak modu DIŞINDA) çalışırken de altın kazandırır — odak modu
// ile aynı taban orandan (1x), odak modunun FOCUS_REWARD_MULTIPLIER (1.5x) bonusu yok.
// Saniyelik artışlar roundCoins ile yuvarlanırsa hep 0'a düşer, o yüzden pendingStudyGold'da
// ondalıksız biriktirip 0.1 altına ulaşınca cityState.coins'e aktarıyoruz.
function accrueStudyGold() {
  if (!studyState.running || focusModeActive) return;
  var now = Date.now();
  if (!lastGoldAccrualTs) { lastGoldAccrualTs = now; return; }
  var elapsedMs = now - lastGoldAccrualTs;
  if (elapsedMs <= 0) return;
  lastGoldAccrualTs = now;
  var hours = elapsedMs / 3600000;
  var streakValue = (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0;
  var multiplier = (streakValue + 20) / 20;
  pendingStudyGold += hours * multiplier;
  if (pendingStudyGold >= 0.1) {
    var toAdd = Math.floor(pendingStudyGold * 10) / 10;
    pendingStudyGold -= toAdd;
    cityState.coins = roundCoins((cityState.coins || 0) + toAdd);
    saveCity();
    renderCity();
  }
}
// ---- Şehir yerleşimi: 14x5 ızgara, derinlik, yol/dekor ----
var CITY_COLS = 14, CITY_ROWS = 5;
var CITY_SELL_RATIO = 0.8; // yapı silinince maliyetin bu kadarı iade edilir
var CITY_LOOK = {
  "Çiftlik": { span: 2, hs: 1.3 }, "Okul": { span: 2, hs: 1.3 }, "Lunapark": { span: 2, hs: 1.4 },
  "Kale": { span: 2, hs: 1.4 }, "Saray": { span: 2, hs: 1.45 }, "Köprü": { span: 2, hs: 0.9 },
  "Ofis": { hs: 1.35 }, "Tarihi Kule": { hs: 1.3 }, "Anıt (tarihi)": { hs: 1.15 },
  "Çeşme": { hs: 0.95 }, "Gizemli İstasyon": { hs: 1.1 },
  "Çam Ağacı": { hs: 1.05 },
  "Plaza": { span: 2 },
  "Çiçeklik": { hs: 0.38 }, "Tabela": { hs: 0.72 }, "Otobüs Durağı": { hs: 0.9 }
};
function cityTypeOf(b) { return BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0] || null; }
function cityItemSpan(b) { var l = CITY_LOOK[b.name]; return (l && l.span) || 1; }
// Modern şehir sprite'ları için ölçek: 1 kaynak piksel ~ 1.05 ekran pikseli (türün pxH'ı üzerinden),
// küçük süsler (tiny) okunur olsun diye 1.35 kat büyütülür.
function cityItemHs(b) {
  var l = CITY_LOOK[b.name];
  if (l && l.hs) return l.hs;
  var t = cityTypeOf(b);
  if (t && t.pxH) return t.pxH * 0.016 * (t.tiny ? 1.35 : 1);
  return 1;
}
function cityIsRoad(b) { var t = cityTypeOf(b); return !!(t && t.road); }
function cityIsCounted(b) { var t = cityTypeOf(b); return !t || (t.cat || "bina") === "bina"; }
function cityBuildingCount() { return cityState.buildings.filter(cityIsCounted).length; }
function cityDepth(gy) { return 0.82 + 0.045 * gy; }
function cityOccupancy(list, exceptId) {
  var occ = {};
  list.forEach(function (b) {
    if (b.id === exceptId || typeof b.gx !== "number" || typeof b.gy !== "number") return;
    var sp = cityItemSpan(b);
    for (var i = 0; i < sp; i++) occ[(b.gx + i) + "," + b.gy] = b.id;
  });
  return occ;
}
function cityCanPlace(gx, gy, span, occ) {
  if (gx < 0 || gy < 0 || gy >= CITY_ROWS || gx + span > CITY_COLS) return false;
  for (var i = 0; i < span; i++) if (occ[(gx + i) + "," + gy]) return false;
  return true;
}
function cityFindFree(occ, gx, gy, span) {
  var rows = [];
  for (var r = gy; r >= 0; r--) rows.push(r);
  for (var r2 = gy + 1; r2 < CITY_ROWS; r2++) rows.push(r2);
  for (var ri = 0; ri < rows.length; ri++) {
    for (var d = 0; d < CITY_COLS; d++) {
      var cands = d === 0 ? [gx] : [gx - d, gx + d];
      for (var k = 0; k < cands.length; k++) {
        if (cityCanPlace(cands[k], rows[ri], span, occ)) return { gx: cands[k], gy: rows[ri] };
      }
    }
  }
  return null;
}
// Eski kayıtlarda sadece xPercent var: hepsi ön sıraya (ana yolun yanına) oturtulur,
// dolu kareler varsa bir üst sıraya taşar. xPercent geriye dönük uyumluluk için güncel tutulur.
function normalizeCityLayout(state) {
  var occ = cityOccupancy(state.buildings);
  state.buildings.forEach(function (b, i) {
    if (typeof b.gx === "number" && typeof b.gy === "number") return;
    var sp = cityItemSpan(b);
    var x = (typeof b.xPercent === "number") ? b.xPercent : (8 + i * (84 / Math.max(1, state.buildings.length - 1)));
    var gx = Math.max(0, Math.min(CITY_COLS - sp, Math.round((x / 100) * CITY_COLS - sp / 2)));
    var spot = cityFindFree(occ, gx, CITY_ROWS - 1, sp) || { gx: gx, gy: CITY_ROWS - 1 };
    b.gx = spot.gx;
    b.gy = spot.gy;
    b.xPercent = ((b.gx + sp / 2) / CITY_COLS) * 100;
    for (var k = 0; k < sp; k++) occ[(b.gx + k) + "," + b.gy] = b.id;
  });
  return state;
}
function cityRoadMap() {
  var map = {};
  cityState.buildings.forEach(function (o) {
    if (cityIsRoad(o) && typeof o.gx === "number" && o.id !== movingId) map[o.gx + "," + o.gy] = true;
  });
  return map;
}
function cityRoadMask(b, map) {
  var m = 0;
  if (map[b.gx + "," + (b.gy - 1)]) m |= 1;
  if (map[(b.gx + 1) + "," + b.gy]) m |= 2;
  if (map[b.gx + "," + (b.gy + 1)]) m |= 4;
  if (map[(b.gx - 1) + "," + b.gy]) m |= 8;
  if (b.rot === 1) m |= 5;    // dikey kollar (kuzey + güney)
  if (b.rot === 2) m |= 10;   // yatay kollar (doğu + batı)
  return m;
}
function cityRoadPreviewMask(b) { return b && b.rot === 1 ? 5 : 10; }
// Yollar: otomatik -> dikey -> yatay. Binalar: yatay çevirme (ayna). Sprite'lar önden görünümlü
// olduğu için 90 derece yatırmak yerine sağ-sol çevirmek doğru görüntüyü verir.
function cityRotateItem(b) {
  if (!b) return;
  if (cityIsRoad(b)) {
    var hasNeighbor = false;
    if (typeof b.gx === "number" && typeof b.gy === "number") {
      hasNeighbor = cityWalkerNeighbors(b.gx, b.gy, cityRoadMap()).length > 0;
    }
    var next = ((b.rot || 0) + 1) % 3;
    if (!hasNeighbor && next === 0) next = 1;   // yalnız karede "otomatik" yatayla aynı görünür, atla
    b.rot = next;
  } else {
    b.flip = !b.flip;
  }
}
function rotateActiveOrSelected() {
  var active = cityActiveItem();
  if (active) {
    cityRotateItem(active);
    if (!pendingBuilding) saveCity();   // taşınan yapı zaten şehirde; yeni alınan yerleşince kaydedilir
    renderPixelCityScene();
    return;
  }
  var sel = selectedCityItemId
    ? cityState.buildings.filter(function (x) { return x.id === selectedCityItemId; })[0]
    : null;
  if (!sel) return;
  cityRotateItem(sel);
  saveCity();
  renderPixelCityScene();
}
var pendingBuilding = null; // marketten yeni alınmış, henüz yerleştirilmemiş
var movingId = null;        // şehirdeki mevcut bir yapı taşınıyor
var selectedCityItemId = null;
var cityMarketTab = "bina";
function cityActiveItem() {
  if (pendingBuilding) return pendingBuilding;
  if (movingId) {
    var found = cityState.buildings.filter(function (b) { return b.id === movingId; })[0];
    if (found) return found;
    movingId = null;
  }
  return null;
}
function buyBuilding(type) {
  if (cityActiveItem() || (cityState.coins || 0) < type.cost) return;
  cityState.coins = roundCoins((cityState.coins || 0) - type.cost);
  saveCity();
  var building = {
    id: "b" + Date.now() + Math.random().toString(36).slice(2, 6),
    emoji: type.emoji,
    name: type.name,
    builtAt: Date.now()
  };
  if (type.images && type.images.length) {
    building.imageKey = type.images[Math.floor(Math.random() * type.images.length)];
  }
  pendingBuilding = building;
  selectedCityItemId = null;
  renderCity();
  renderCityViewAll();
}
function cancelPendingPlacement() {
  if (pendingBuilding) {
    var type = cityTypeOf(pendingBuilding);
    if (type) cityState.coins = roundCoins((cityState.coins || 0) + type.cost);
    pendingBuilding = null;
    saveCity();
  }
  movingId = null;   // taşıma iptalinde yapı zaten eski yerinde duruyor, iade/kayıp yok
  renderCity();
  renderCityViewAll();
}
function startMovingSelected() {
  if (!selectedCityItemId || cityActiveItem()) return;
  movingId = selectedCityItemId;
  selectedCityItemId = null;
  renderCityViewAll();
}
function removeSelectedCityItem() {
  var b = cityState.buildings.filter(function (x) { return x.id === selectedCityItemId; })[0];
  if (!b) return;
  var type = cityTypeOf(b);
  var refund = type ? roundCoins(type.cost * CITY_SELL_RATIO) : 0;
  var popLoss = type ? (type.population || 0) : 0;
  var parts = [];
  parts.push(refund > 0 ? "+" + refund + " altın iade" : "iade yok");
  if (popLoss > 0) parts.push("-" + popLoss + " nüfus");
  var msg = (type ? type.name : "Bu yapı") + " silinsin mi? (" + parts.join(", ") + ")";
  if (!window.confirm(msg)) return;
  cityState.buildings = cityState.buildings.filter(function (x) { return x.id !== b.id; });
  cityState.coins = roundCoins((cityState.coins || 0) + refund);
  selectedCityItemId = null;
  saveCity();
  renderCity();
  renderCityViewAll();
}
function askSignLabel(current) {
  var t = window.prompt("Tabela yazısı (en fazla 12 karakter):", current || "Mahalle");
  if (t === null) return current || "Şehir";
  t = String(t).replace(/\s+/g, " ").trim().slice(0, 12);
  return t || current || "Şehir";
}
function editSelectedSignLabel() {
  var b = cityState.buildings.filter(function (x) { return x.id === selectedCityItemId; })[0];
  if (!b || b.name !== "Tabela") return;
  b.label = askSignLabel(b.label);
  saveCity();
  renderPixelCityScene();
}
function cityPopulation() {
  var total = 0;
  cityState.buildings.forEach(function (b) {
    var type = BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0];
    total += (type && type.population) || 0;
  });
  return total;
}
function renderCity() {
  var grid = document.getElementById("cityGrid");
  var empty = document.getElementById("cityEmpty");
  var stats = document.getElementById("cityStats");
  if (!grid) return;
  grid.innerHTML = "";
  if (!cityState.buildings.length) {
    if (empty) empty.style.display = "block";
  } else {
    if (empty) empty.style.display = "none";
    cityState.buildings.filter(cityIsCounted).forEach(function (b) {
      var tile = document.createElement("div");
      tile.className = "city-tile";
      tile.title = b.name;
      tile.innerHTML = buildingVisualMarkup(b);
      grid.appendChild(tile);
    });
  }
  if (stats) {
    stats.textContent = cityBuildingCount() + " bina · " + (cityState.coins || 0) + " altın · " + cityPopulation() + " nüfus";
  }
}
function renderMarket() {
  var grid = document.getElementById("cityMarketGrid");
  if (!grid) return;
  var tabsEl = document.getElementById("cityMarketTabs");
  if (tabsEl) {
    Array.prototype.forEach.call(tabsEl.querySelectorAll(".city-market-tab"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === cityMarketTab);
    });
  }
  grid.innerHTML = "";
  var busy = !!cityActiveItem();
  BUILDING_TYPES.filter(function (t) { return (t.tab || t.cat || "bina") === cityMarketTab; }).forEach(function (type) {
    var canAfford = !busy && (cityState.coins || 0) >= type.cost;
    var animPreview = "";
    if (type.anim && BUILDING_IMAGES[type.anim.key]) {
      var sc = Math.min(40 / type.anim.h, 56 / type.anim.w);
      animPreview = '<div class="city-market-anim" style="width:' + Math.round(type.anim.w * sc) + 'px;height:' + Math.round(type.anim.h * sc) +
        'px;background-image:url(' + BUILDING_IMAGES[type.anim.key] + ');background-size:' + (type.anim.frames * 100) + '% 100%;"></div>';
    }
    var preview = animPreview
      ? animPreview
      : type.road
      ? roadTileSvg(10)
      : (type.images && type.images.length
        ? '<img src="' + BUILDING_IMAGES[type.images[0]] + '" alt="' + type.name + '">'
        : (type.sprite ? buildProceduralSvg(type.sprite.shape, type.sprite.w, type.sprite.h, type.sprite.colors) : type.emoji));
    var item = document.createElement("div");
    item.className = "city-market-item";
    item.innerHTML =
      '<div class="city-market-emoji">' + preview + '</div>' +
      '<div class="city-market-name">' + type.name + '</div>' +
      '<div class="city-market-cost">' + type.cost + ' altın · ' + ((type.population || 0) > 0 ? '+' + type.population + ' nüfus' : 'süs') + '</div>' +
      '<button type="button" class="city-market-buy-btn"' + (canAfford ? "" : " disabled") +
      (busy ? ' title="Önce elindeki yapıyı yerleştir"' : "") + '>Satın Al</button>';
    item.querySelector(".city-market-buy-btn").addEventListener("click", function () {
      buyBuilding(type);
    });
    grid.appendChild(item);
  });
}
function renderCityViewStats() {
  var coinEl = document.getElementById("cityViewCoinValue");
  var countEl = document.getElementById("cityViewBuildingCount");
  var popEl = document.getElementById("cityViewPopulation");
  if (coinEl) coinEl.textContent = (cityState.coins || 0);
  if (countEl) countEl.textContent = cityBuildingCount();
  if (popEl) popEl.textContent = cityPopulation();
}
function cityItemSprite(b) {
  var wrap = document.createElement("div");
  wrap.className = "pcs-sprite" + (b.flip ? " is-flipped" : "");
  wrap.innerHTML = buildingVisualMarkup(b);
  if (b.name === "Tabela") {
    var lab = document.createElement("span");
    lab.className = "pcs-sign-label";
    lab.textContent = b.label || "Şehir";
    wrap.appendChild(lab);
  }
  return wrap;
}
function renderExistingBuildings(sky) {
  var roadMap = cityRoadMap();
  cityState.buildings.forEach(function (b) {
    if (b.id === movingId) return;
    var span = cityItemSpan(b);
    var gx = (typeof b.gx === "number") ? b.gx : 0;
    var gy = (typeof b.gy === "number") ? b.gy : 0;
    var isRoad = cityIsRoad(b);
    var el = document.createElement("div");
    el.className = "pcs-item" + (isRoad ? " pcs-road" : "") + (b.id === selectedCityItemId ? " is-selected" : "");
    el.setAttribute("data-id", b.id);
    el.title = b.name + (b.builtAt ? " · " + formatNoteTimestamp(b.builtAt) : "");
    if (isRoad) {
      el.style.left = (gx / CITY_COLS * 100) + "%";
      el.style.top = (gy / CITY_ROWS * 100) + "%";
      el.style.width = (100 / CITY_COLS) + "%";
      el.style.height = (100 / CITY_ROWS) + "%";
      el.innerHTML = roadTileSvg(cityRoadMask({ gx: gx, gy: gy, rot: b.rot }, roadMap));
    } else {
      el.style.left = ((gx + span / 2) / CITY_COLS * 100) + "%";
      el.style.top = ((gy + 1) / CITY_ROWS * 100) + "%";
      el.style.zIndex = String(10 + gy);
      el.style.setProperty("--span", String(span));
      el.style.setProperty("--depth", String(cityDepth(gy)));
      el.style.setProperty("--hs", String(cityItemHs(b)));
      el.appendChild(cityItemSprite(b));
    }
    sky.appendChild(el);
  });
}
function applyCityTimeOfDay(scene) {
  var h = new Date().getHours();
  var tod = (h >= 5 && h < 8) ? "dawn" : (h >= 8 && h < 17) ? "day" : (h >= 17 && h < 20) ? "dusk" : "night";
  scene.setAttribute("data-tod", tod);
}
function renderPixelCityScene() {
  var scene = document.getElementById("pixelCityScene");
  var sky = document.getElementById("pixelCityBuildings");
  if (!scene || !sky) return;
  applyCityTimeOfDay(scene);

  var active = cityActiveItem();
  var hasItems = cityState.buildings.length > 0;
  sky.innerHTML = "";
  sky.classList.toggle("placement-mode", !!active);
  scene.classList.toggle("is-empty", !hasItems && !active);

  if (!hasItems && !active) {
    sky.innerHTML = '<p class="pixel-city-empty-msg">Şehrin henüz boş — market\'ten bina alınca burada canlanacak!</p>';
    return;
  }
  renderExistingBuildings(sky);

  if (active) {
    var isMove = !!movingId && !pendingBuilding;
    var hint = document.createElement("div");
    hint.className = "pixel-city-placement-hint";
    var msg = document.createElement("span");
    msg.textContent = (isMove ? "✋ Yeni yerini seç: " : "📍 Yerleştirmek için bir kareye tıkla: ") + active.emoji + " " + active.name;
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.id = "cancelPlacementBtn";
    cancel.textContent = "Vazgeç";
    cancel.addEventListener("click", function (e) {
      e.stopPropagation();
      cancelPendingPlacement();
    });
    var rotBtn = document.createElement("button");
    rotBtn.type = "button";
    rotBtn.id = "rotatePlacementBtn";
    rotBtn.textContent = "↻ Döndür (R)";
    rotBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      rotateActiveOrSelected();
    });
    hint.appendChild(msg);
    hint.appendChild(rotBtn);
    hint.appendChild(cancel);
    sky.appendChild(hint);

    var ghost = document.createElement("div");
    ghost.className = "pcs-ghost";
    ghost.id = "pcsGhost";
    ghost.style.display = "none";
    ghost.style.setProperty("--span", String(cityItemSpan(active)));
    ghost.style.setProperty("--hs", String(cityItemHs(active)));
    if (cityIsRoad(active)) {
      var roadPrev = document.createElement("div");
      roadPrev.className = "pcs-ghost-road";
      roadPrev.innerHTML = roadTileSvg(cityRoadPreviewMask(active));
      ghost.appendChild(roadPrev);
    } else {
      ghost.appendChild(cityItemSprite(active));
    }
    sky.appendChild(ghost);
    if (cityLastPointer) handleCityLayerMove(cityLastPointer);
    return;
  }

  var sel = selectedCityItemId
    ? cityState.buildings.filter(function (b) { return b.id === selectedCityItemId; })[0]
    : null;
  if (sel) {
    var span = cityItemSpan(sel);
    var type = cityTypeOf(sel);
    var bubble = document.createElement("div");
    bubble.className = "pcs-bubble";
    var leftPct = Math.max(14, Math.min(86, ((sel.gx + span / 2) / CITY_COLS) * 100));
    bubble.style.left = leftPct + "%";
    bubble.style.top = ((sel.gy + 1) / CITY_ROWS * 100) + "%";
    bubble.style.setProperty("--depth", String(cityDepth(sel.gy)));
    bubble.style.setProperty("--hs", String(cityIsRoad(sel) ? 0.5 : cityItemHs(sel)));
    function addBtn(label, cls, fn) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if (cls) btn.className = cls;
      btn.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
      bubble.appendChild(btn);
    }
    addBtn("↻ Döndür", "", rotateActiveOrSelected);
    addBtn("✋ Taşı", "", startMovingSelected);
    if (sel.name === "Tabela") addBtn("✏️ Yazı", "", editSelectedSignLabel);
    addBtn("🗑 Sil", "danger", removeSelectedCityItem);
    addBtn("✕", "", function () { selectedCityItemId = null; renderPixelCityScene(); });
    sky.appendChild(bubble);
  }
}
function cityCellFromEvent(e, span) {
  var layer = document.getElementById("pixelCityBuildings");
  var rect = layer.getBoundingClientRect();
  var fx = (e.clientX - rect.left) / Math.max(1, rect.width);
  var fy = (e.clientY - rect.top) / Math.max(1, rect.height);
  var gx = Math.max(0, Math.min(CITY_COLS - span, Math.round(fx * CITY_COLS - span / 2)));
  var gy = Math.max(0, Math.min(CITY_ROWS - 1, Math.floor(fy * CITY_ROWS)));
  return { gx: gx, gy: gy };
}
var cityLastPointer = null;
function handleCityLayerMove(e) {
  cityLastPointer = { clientX: e.clientX, clientY: e.clientY };
  var active = cityActiveItem();
  var ghost = document.getElementById("pcsGhost");
  if (!active || !ghost) return;
  var span = cityItemSpan(active);
  var cell = cityCellFromEvent(e, span);
  var ok = cityCanPlace(cell.gx, cell.gy, span, cityOccupancy(cityState.buildings, active.id));
  ghost.style.display = "block";
  ghost.style.left = (cell.gx / CITY_COLS * 100) + "%";
  ghost.style.top = (cell.gy / CITY_ROWS * 100) + "%";
  ghost.style.width = (span / CITY_COLS * 100) + "%";
  ghost.style.height = (100 / CITY_ROWS) + "%";
  ghost.style.setProperty("--depth", String(cityDepth(cell.gy)));
  ghost.classList.toggle("is-invalid", !ok);
}
function placeActiveItem(active, cell) {
  var span = cityItemSpan(active);
  active.gx = cell.gx;
  active.gy = cell.gy;
  active.xPercent = ((cell.gx + span / 2) / CITY_COLS) * 100;
  if (pendingBuilding) {
    if (active.name === "Tabela") active.label = askSignLabel(active.label);
    cityState.buildings.push(active);
    pendingBuilding = null;
  } else {
    movingId = null;
  }
  selectedCityItemId = null;
  saveCity();
  renderCity();
  renderCityViewAll();
}
function handleCityLayerClick(e) {
  var target = e.target;
  if (target && target.closest && target.closest(".pixel-city-placement-hint")) return;
  if (target && target.closest && target.closest(".pcs-bubble")) return;
  var active = cityActiveItem();
  if (active) {
    var span = cityItemSpan(active);
    var cell = cityCellFromEvent(e, span);
    var occ = cityOccupancy(cityState.buildings, active.id);
    if (!cityCanPlace(cell.gx, cell.gy, span, occ)) {
      handleCityLayerMove(e);
      return;
    }
    placeActiveItem(active, cell);
    return;
  }
  var itemEl = (target && target.closest) ? target.closest(".pcs-item") : null;
  var pickedId = itemEl ? itemEl.getAttribute("data-id") : null;
  if (!pickedId) {
    // Küçük süslere (bank, çiçeklik…) isabet ettirmek zor olabilir: tıklanan karedeki yapıyı seç
    var c = cityCellFromEvent(e, 1);
    pickedId = cityOccupancy(cityState.buildings)[c.gx + "," + c.gy] || null;
  }
  selectedCityItemId = pickedId;
  renderPixelCityScene();
}
function renderCityViewAll() {
  renderMarket();
  renderPixelCityScene();
  renderCityViewStats();
}
function initCityView() {
  var dateEl = document.getElementById("cityViewDate");
  setupPixelCityScenery();
  loadCity().then(function (data) {
    cityState = data;
    if (dateEl) {
      var now = new Date();
      dateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
    }
    renderCityViewAll();
  });

  // Altın başka pencerede (ör. yönetici hediyesi, odak seansı) değişmiş olabilir: pencere odak alınca depodan tazele
  window.addEventListener("focus", function () {
    if (cityActiveItem()) return;
    loadCity().then(function (data) {
      cityState = data;
      renderCityViewAll();
    });
  });

  var cityFullscreenBtn = document.getElementById("cityFullscreenBtn");
  if (cityFullscreenBtn) {
    cityFullscreenBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
  }

  var cityThemeBtn = document.getElementById("cityThemeBtn");
  if (cityThemeBtn) {
    cityThemeBtn.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
    });
  }
}

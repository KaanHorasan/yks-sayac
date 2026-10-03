// ============================================================================
// YKS Sayaç — Şehrim: yollarda yürüyen karakterler
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Yollarda yürüyen karakterler ----
// Izgaradaki yol karelerinde rastgele dolaşırlar; yanındaki bir binaya (ev, dükkan, apartman…)
// kapısından girip birkaç saniye sonra tekrar çıkarlar. Yol yoksa hiç görünmezler.
var cityWalkers = [];
var cityWalkerHues = [0, 145, 250, 320];
var cityWalkerRaf = null;
var cityWalkerLast = 0;
// Girilemeyen yapılar (açık hava / anıt türleri)
var CITY_NO_ENTER = { "Park": 1, "Bahçe": 1, "Çeşme": 1, "Anıt (tarihi)": 1, "Köprü": 1, "Antik Kalıntı (tarihi)": 1, "Zaman Kapsülü": 1 };
function cityCanEnter(b) { return !!b && cityIsCounted(b) && !CITY_NO_ENTER[b.name]; }
function cityWalkerNeighbors(cx, cy, map) {
  var out = [];
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
    var nx = cx + d[0], ny = cy + d[1];
    if (map[nx + "," + ny]) out.push({ x: nx, y: ny });
  });
  return out;
}
function cityBuildingById(id) {
  return cityState.buildings.filter(function (x) { return x.id === id; })[0] || null;
}
// Yol karesinin (4 yön) yanındaki girilebilir bir bina; birden çoksa rastgele biri
function cityWalkerFindDoor(cx, cy) {
  var occ = cityOccupancy(cityState.buildings, movingId);
  var found = [];
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (d) {
    var id = occ[(cx + d[0]) + "," + (cy + d[1])];
    if (!id) return;
    var b = cityBuildingById(id);
    if (b && cityCanEnter(b) && found.indexOf(b) < 0) found.push(b);
  });
  return found.length ? found[Math.floor(Math.random() * found.length)] : null;
}
function cityWalkerPlace(w, keys) {
  var k = keys[Math.floor(Math.random() * keys.length)].split(",");
  w.cx = +k[0]; w.cy = +k[1];
  w.tx = w.cx; w.ty = w.cy;
  w.t = 1;
  w.prev = null;
  w.pause = 0;
  w.mode = "walk";
  w.bid = null;
  w.el.style.opacity = "1";
  w.el.style.visibility = "visible";
}
function cityWalkerCreate(keys, idx) {
  var el = document.createElement("div");
  el.className = "pcs-walker";
  var img = (typeof BUILDING_IMAGES !== "undefined") ? BUILDING_IMAGES.ped_detective_walk : null;
  if (img) el.style.backgroundImage = "url(" + img + ")";
  el.style.filter = "hue-rotate(" + cityWalkerHues[idx % cityWalkerHues.length] + "deg)";
  var w = { el: el, facing: 1, speed: 0.85 + Math.random() * 0.4, cx: 0, cy: 0, tx: 0, ty: 0, t: 1, prev: null,
            pause: 0, mode: "walk", bid: null, m: 0, dur: 0.9, wait: 0, cool: 2 + Math.random() * 4 };
  cityWalkerPlace(w, keys);
  return w;
}
function cityEase(t) { return t * t * (3 - 2 * t); }
function cityWalkersTick(ts) {
  cityWalkerRaf = window.requestAnimationFrame(cityWalkersTick);
  var dt = Math.min(0.1, Math.max(0, (ts - cityWalkerLast) / 1000));
  cityWalkerLast = ts;
  var sky = document.getElementById("pixelCityBuildings");
  if (!sky || !sky.offsetParent) return;

  var map = cityRoadMap();
  var keys = Object.keys(map);
  var desired = keys.length === 0 ? 0 : Math.min(3, Math.max(1, Math.floor(keys.length / 4)));
  while (cityWalkers.length > desired) {
    var gone = cityWalkers.pop();
    if (gone.el.parentNode) gone.el.parentNode.removeChild(gone.el);
  }
  while (cityWalkers.length < desired) cityWalkers.push(cityWalkerCreate(keys, cityWalkers.length));
  if (!cityWalkers.length) return;

  var layerW = sky.clientWidth, layerH = sky.clientHeight;
  var cellW = layerW / CITY_COLS, cellH = layerH / CITY_ROWS;
  var scale = Math.max(0.7, Math.min(1.6, cellW / 57));
  function sizeFor(row) { return Math.round(28 * cityDepth(Math.round(row)) * scale); }

  cityWalkers.forEach(function (w) {
    if (w.el.parentNode !== sky) sky.appendChild(w.el);   // sahne yeniden çizilince elemanlar sökülür

    // yol silindi/taşındıysa ya da girdiği bina yok olduysa yeniden yerleştir
    if (!map[w.cx + "," + w.cy] || !map[w.tx + "," + w.ty]) cityWalkerPlace(w, keys);
    var bld = null;
    if (w.mode !== "walk") {
      bld = cityBuildingById(w.bid);
      if (!bld || !cityCanEnter(bld) || bld.id === movingId) {
        w.mode = "walk"; w.bid = null; w.t = 1; w.tx = w.cx; w.ty = w.cy; w.prev = null;
        w.el.style.opacity = "1"; w.el.style.visibility = "visible";
        bld = null;
      }
    }

    var moving = false, opacity = 1, fx, fy;

    if (w.mode === "walk") {
      w.cool = Math.max(0, w.cool - dt);
      if (w.pause > 0) {
        w.pause -= dt;
      } else if (w.t >= 1) {
        w.cx = w.tx; w.cy = w.ty;
        // yanında bir bina varsa bazen içeri gir
        var door = (w.cool <= 0 && Math.random() < 0.5) ? cityWalkerFindDoor(w.cx, w.cy) : null;
        if (door) {
          w.mode = "in"; w.bid = door.id; w.m = 0; w.dur = 0.9;
          bld = door;
        } else {
          var opts = cityWalkerNeighbors(w.cx, w.cy, map);
          var prevKey = w.prev;
          var fwd = opts.filter(function (o) { return (o.x + "," + o.y) !== prevKey; });
          var pool = fwd.length ? fwd : opts;
          if (pool.length) {
            var nx = pool[Math.floor(Math.random() * pool.length)];
            w.prev = w.cx + "," + w.cy;
            w.tx = nx.x; w.ty = nx.y; w.t = 0;
            if (nx.x > w.cx) w.facing = 1; else if (nx.x < w.cx) w.facing = -1;
            if (Math.random() < 0.15) w.pause = 0.6 + Math.random() * 1.2;
          } else {
            w.pause = 0.5;   // tek başına duran yol karesi: olduğu yerde bekle
          }
        }
      }
      if (w.mode === "walk") {
        if (w.pause <= 0 && w.t < 1) {
          w.t = Math.min(1, w.t + w.speed * dt);
          moving = true;
        }
        fx = w.cx + (w.tx - w.cx) * w.t;
        fy = w.cy + (w.ty - w.cy) * w.t;
      }
    }

    if (w.mode !== "walk") {
      // kapı noktası: binanın alt-orta kenarı (ayaklar binanın tabanında)
      var span = cityItemSpan(bld);
      var doorFx = bld.gx + span / 2 - 0.5;
      var doorFy = bld.gy + 0.5 - (0.22 * sizeFor(bld.gy) + 2) / cellH;
      if (w.mode === "in") {
        w.m = Math.min(1, w.m + dt / w.dur);
        var e = cityEase(w.m);
        fx = w.cx + (doorFx - w.cx) * e;
        fy = w.cy + (doorFy - w.cy) * e;
        if (doorFx > w.cx + 0.01) w.facing = 1; else if (doorFx < w.cx - 0.01) w.facing = -1;
        opacity = w.m < 0.7 ? 1 : Math.max(0, 1 - (w.m - 0.7) / 0.3);
        moving = true;
        if (w.m >= 1) { w.mode = "inside"; w.wait = 2.5 + Math.random() * 3.5; }
      } else if (w.mode === "inside") {
        fx = doorFx; fy = doorFy; opacity = 0;
        w.wait -= dt;
        if (w.wait <= 0) { w.mode = "out"; w.m = 0; }
      } else {   // "out"
        w.m = Math.min(1, w.m + dt / w.dur);
        var e2 = cityEase(w.m);
        fx = doorFx + (w.cx - doorFx) * e2;
        fy = doorFy + (w.cy - doorFy) * e2;
        if (w.cx > doorFx + 0.01) w.facing = 1; else if (w.cx < doorFx - 0.01) w.facing = -1;
        opacity = w.m < 0.3 ? w.m / 0.3 : 1;
        moving = true;
        if (w.m >= 1) {
          w.mode = "walk"; w.bid = null; w.t = 1; w.tx = w.cx; w.ty = w.cy; w.prev = null;
          w.cool = 8 + Math.random() * 6; w.pause = 0.3;
        }
      }
    }

    var size = sizeFor(fy);
    var px = (fx + 0.5) * cellW - size / 2;
    var py = (fy + 0.5) * cellH + size * 0.22 - size;
    w.el.style.setProperty("--ws", size + "px");
    w.el.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px) scaleX(" + w.facing + ")";
    w.el.style.zIndex = String(10 + Math.round(fy));
    w.el.style.opacity = String(opacity);
    w.el.style.visibility = (w.mode === "inside") ? "hidden" : "visible";
    w.el.style.animationPlayState = moving ? "running" : "paused";
  });
}
function startCityWalkers() {
  if (cityWalkerRaf) return;
  if (!window.requestAnimationFrame) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cityWalkerLast = performance.now();
  cityWalkerRaf = window.requestAnimationFrame(cityWalkersTick);
}
function setupPixelCityScenery() {
  var sky = document.getElementById("pixelCityBuildings");
  if (sky) {
    sky.addEventListener("click", handleCityLayerClick);
    sky.addEventListener("mousemove", handleCityLayerMove);
    sky.addEventListener("mouseleave", function () {
      cityLastPointer = null;
      var g = document.getElementById("pcsGhost");
      if (g) g.style.display = "none";
    });
  }
  var tabsEl = document.getElementById("cityMarketTabs");
  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".city-market-tab") : null;
      if (!btn) return;
      var wantedTab = btn.getAttribute("data-tab");
      cityMarketTab = (wantedTab === "dekor" || wantedTab === "sehir") ? wantedTab : "bina";
      renderMarket();
    });
  }
  document.addEventListener("keydown", function (e) {
    if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey && (cityActiveItem() || selectedCityItemId)) {
      var tr = e.target;
      var typingR = tr && (tr.tagName === "INPUT" || tr.tagName === "TEXTAREA" || tr.isContentEditable);
      if (!typingR) { rotateActiveOrSelected(); e.preventDefault(); }
      return;
    }
    if (e.key === "Delete" && selectedCityItemId && !cityActiveItem()) {
      var tg = e.target;
      var typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable);
      if (!typing) removeSelectedCityItem();
      return;
    }
    if (e.key !== "Escape") return;
    if (cityActiveItem()) cancelPendingPlacement();
    else if (selectedCityItemId) { selectedCityItemId = null; renderPixelCityScene(); }
  });
  startCityWalkers();
  setInterval(function () {
    var scene = document.getElementById("pixelCityScene");
    if (scene) applyCityTimeOfDay(scene);
  }, 300000);
}

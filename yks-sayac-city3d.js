// 3D şehir önizlemesi (deneysel, yalnızca görüntüleme). Three.js + Kenney modelleri (CC0, kenney.nl).
// Three.js yalnızca bu önizleme açılınca yüklenir; normal kullanımı etkilemez.
// Eşleştirme tablosu (TYPES) tek yerde: bir yapının 3D modelini değiştirmek için "kit/dosya" adını değiştir.
var City3D = (function () {
  "use strict";

  var MODEL_BASE = "models/";   // models/<kit>/<dosya>.glb ve models/<kit>/Textures/colormap.png

  // m: model listesi (birden çok varsa görsel varyant), fixed: sabit ölçek, maxH: en çok yükseklik (hücre = 1 birim),
  // box: model yoksa basit kutu {w,h,d,color}
  var TYPES = {
    "Bahçe": { m: ["fan/tree-high-round"], maxH: 1.1 },
    "Ev": { m: ["comm/building-a", "comm/building-b", "comm/building-c", "comm/building-d", "comm/building-f", "comm/building-g", "comm/building-h", "comm/building-i"] },
    "Dükkan": { m: ["fan/stall-red", "fan/stall-green", "fan/stall-red"], fixed: 1 },
    "Çiftlik": { m: ["ind/building-a", "ind/windmill"] },
    "Okul": { m: ["comm/building-e"] },
    "Tarihi Kule": { m: ["ind/water-tower"] },
    "Gizemli İstasyon": { m: ["ind/detail-tank-large"] },
    "Zaman Kapsülü": { m: ["fan/rock-large"] },
    "Metro Girişi": { m: ["comm/building-d"] },
    "Market": { m: ["comm/building-a"] },
    "Fırın": { m: ["comm/building-b"] },
    "Pastane": { m: ["comm/building-c"] },
    "Kafe": { m: ["comm/building-h"] },
    "Mağaza": { m: ["comm/building-g"] },
    "Butik": { m: ["comm/building-f"] },
    "Kırmızı Apartman": { m: ["comm/building-l"] },
    "Mavi Apartman": { m: ["comm/building-m"] },
    "Cam Kule": { m: ["comm/building-skyscraper-a"] },
    "Mavi Gökdelen": { m: ["comm/building-skyscraper-c"] },
    "Plaza": { m: ["comm/building-n"] },
    "Sokak Lambası": { m: ["road/light-square"], fixed: 1.2 },
    "Kollu Lamba": { m: ["road/light-curved"], fixed: 1.2 },
    "Süs Lambası": { m: ["fan/lantern"], fixed: 0.5 },
    "Trafik Lambası": { m: ["road/light-square-double"], fixed: 1.2 },
    "Trafik Lambası (Kollu)": { m: ["road/light-curved-double"], fixed: 1.2 },
    "Bank": { m: ["fan/stall-bench"], fixed: 1 },
    "Tabela": { m: ["road/sign-highway-wide"], fixed: 1 },
    "Reklam Panosu": { m: ["road/sign-highway-wide"], fixed: 1 },
    "Bilgi Panosu": { m: ["road/sign-highway-detailed"], fixed: 0.9 },
    "Yol Levhası": { m: ["road/sign-highway"], fixed: 0.9 },
    "Şehir Ağacı": { m: ["fan/tree", "fan/tree-high"], maxH: 1.6 },
    "Bariyer": { m: ["road/construction-barrier"], fixed: 1 },
    "Trafik Konisi": { m: ["road/construction-cone"], fixed: 1 },
    "Araba (Kırmızı)": { m: ["car/sedan"], fixed: 0.3 },
    "Araba (Mavi)": { m: ["car/hatchback-sports"], fixed: 0.3 },
    "Kamyon": { m: ["car/truck"], fixed: 0.28 },
    "Yemek Aracı": { m: ["car/delivery"], fixed: 0.28 },
    "Çöp Kutusu": { box: { w: 0.3, h: 0.4, d: 0.3, color: 0x4a8a5a } },
    "Yangın Musluğu": { box: { w: 0.2, h: 0.35, d: 0.2, color: 0xc0392b } },
    "Otomat": { box: { w: 0.36, h: 0.7, d: 0.3, color: 0x3a6fb0 } },
    "Koli": { box: { w: 0.3, h: 0.25, d: 0.3, color: 0xb98b55 } }
  };

  // Yol parçaları: taban yönleri (Kenney parçalarının geometrisinden çözüldü): end={E}, straight={E,W}, bend={W,S}, tee={E,W,S}
  // Yönler: N=-Z (gy-1), E=+X (gx+1), S=+Z (gy+1), W=-X (gx-1). rotation.y = +90° her adımda E→N→W→S→E döndürür.
  var ROAD_FILE = { square: "road/road-square", end: "road/road-end", straight: "road/road-straight", bend: "road/road-bend", tee: "road/road-intersection", cross: "road/road-crossroad" };
  var ROAD_BASE = { square: [], end: ["E"], straight: ["E", "W"], bend: ["W", "S"], tee: ["E", "W", "S"], cross: ["N", "E", "S", "W"] };
  var ROT_NEXT = { E: "N", N: "W", W: "S", S: "E" };

  function roadPieceFor(dirs) {
    var want = dirs.slice().sort().join("");
    var names = ["square", "end", "straight", "bend", "tee", "cross"];
    for (var i = 0; i < names.length; i++) {
      var base = ROAD_BASE[names[i]];
      if (base.length !== dirs.length) continue;
      var set = base.slice();
      for (var k = 0; k < 4; k++) {
        if (set.slice().sort().join("") === want) return { piece: names[i], rot: k };
        set = set.map(function (d) { return ROT_NEXT[d]; });
      }
    }
    return { piece: "square", rot: 0 };
  }

  // Gün ışığı ayarları (şiddetler fiziksel ışık birimlerinde; görünüme göre buradan ayarlanır)
  var TOD = {
    day:   { bg: 0xbfe6f7, sky: 0xffffff, ground: 0x9aa8b4, hemi: 1.2, sun: 0xfff4e0, sunI: 2.6, pos: [8, 14, 6] },
    dawn:  { bg: 0xf7cfa6, sky: 0xffe2c8, ground: 0x8a7f8f, hemi: 1.0, sun: 0xffc89a, sunI: 2.0, pos: [-10, 6, 4] },
    dusk:  { bg: 0x7b6aa0, sky: 0xd9b8c8, ground: 0x544a6e, hemi: 0.9, sun: 0xff9a6a, sunI: 1.6, pos: [10, 5, -4] },
    night: { bg: 0x0d1433, sky: 0x4a5a9a, ground: 0x1a1f3a, hemi: 0.9, sun: 0x8fa8ff, sunI: 0.7, pos: [-6, 12, 8] }
  };
  function todOf(hour) { return hour >= 6 && hour < 8 ? "dawn" : (hour >= 8 && hour < 17 ? "day" : (hour >= 17 && hour < 20 ? "dusk" : "night")); }

  function hash(str) { var h = 7; str = String(str || ""); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function variantIndex(b, n) {
    var m = /(\d+)$/.exec(b.imageKey || "");
    return m ? (parseInt(m[1], 10) - 1) % n : hash(b.id) % n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- Sahne kurulumu (saf: THREE ve model yükleyici dışarıdan verilir, böylece testte sahte yükleyici kullanılabilir) ----
  // city: { cols, rows, buildings, typeOf(b), isRoad(b) }; loadModel("kit/dosya") -> Promise<Object3D>
  function buildCity(T, loadModel, city) {
    var cols = city.cols, rows = city.rows;
    var group = new T.Group();
    var report = { placed: 0, roads: 0, fallback: 0, missing: [], roadCells: [] };
    var dispose = [];   // bu sahneye özgü kaynaklar (modeller önbellekten klonlandığı için paylaşılan geometriye dokunulmaz)
    group.userData.dispose = dispose;

    // zemin: hücre başına hafif farklı iki yeşil + toprak kaide
    var data = new Uint8Array(cols * rows * 4);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = (r * cols + c) * 4, odd = (r + c) % 2;
      data[i] = odd ? 126 : 134; data[i + 1] = odd ? 190 : 200; data[i + 2] = odd ? 104 : 110; data[i + 3] = 255;
    }
    var tex = new T.DataTexture(data, cols, rows, T.RGBAFormat);
    tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.colorSpace = T.SRGBColorSpace; tex.needsUpdate = true;
    var groundGeo = new T.PlaneGeometry(cols, rows), groundMat = new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
    var ground = new T.Mesh(groundGeo, groundMat);
    dispose.push(tex, groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    group.add(ground);
    var slabGeo = new T.BoxGeometry(cols + 0.5, 0.3, rows + 0.5), slabMat = new T.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 1, metalness: 0 });
    var slab = new T.Mesh(slabGeo, slabMat);
    dispose.push(slabGeo, slabMat);
    slab.position.y = -0.03 - 0.15; slab.receiveShadow = true;
    group.add(slab);

    var cellX = function (gx, span) { return gx + span / 2 - cols / 2; };
    var cellZ = function (gy) { return gy + 0.5 - rows / 2; };

    // yol haritası
    var roads = {};
    city.buildings.forEach(function (b) { if (city.isRoad(b)) roads[b.gx + "," + b.gy] = true; });

    var jobs = [];
    city.buildings.forEach(function (b) {
      var type = city.typeOf(b);
      if (!type) return;
      var span = type.span || 1;
      if (city.isRoad(b)) {
        var dirs = [];
        if (roads[b.gx + "," + (b.gy - 1)]) dirs.push("N");
        if (roads[(b.gx + 1) + "," + b.gy]) dirs.push("E");
        if (roads[b.gx + "," + (b.gy + 1)]) dirs.push("S");
        if (roads[(b.gx - 1) + "," + b.gy]) dirs.push("W");
        var pick = roadPieceFor(dirs);
        report.roadCells.push({ gx: b.gx, gy: b.gy, dirs: dirs, piece: pick.piece, rot: pick.rot });
        jobs.push(loadModel(ROAD_FILE[pick.piece]).then(function (obj) {
          var holder = new T.Group(); holder.add(obj);
          holder.rotation.y = pick.rot * Math.PI / 2;
          holder.position.set(cellX(b.gx, 1), 0, cellZ(b.gy));
          holder.userData = { road: pick.piece, gx: b.gx, gy: b.gy };
          group.add(holder); report.roads++;
        }, function () { report.missing.push(ROAD_FILE[pick.piece]); }));
        return;
      }
      var def = TYPES[b.name] || {};
      var place = function (model, fallback) {
        // ölçek: sabit ya da hücreye sığacak şekilde; sonra taban ortası hücre merkezine oturtulur
        var box0 = new T.Box3().setFromObject(model), size0 = box0.getSize(new T.Vector3());
        var s;
        if (def.fixed) s = def.fixed;
        else {
          // genişlik span hücreye, derinlik tek sıraya (en çok %25 taşma payı) sığsın
          s = clamp(Math.min(span * 0.94 / (size0.x || 1), 1.25 / (size0.z || 1)), 0.3, 1.25);
          if (def.maxH && size0.y * s > def.maxH) s = def.maxH / size0.y;
        }
        model.scale.setScalar(s);
        var holder = new T.Group(); holder.add(model);
        var box = new T.Box3().setFromObject(model), center = box.getCenter(new T.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        holder.rotation.y = b.flip ? Math.PI : 0;
        holder.position.set(cellX(b.gx, span), 0, cellZ(b.gy));
        holder.userData = { name: b.name, id: b.id };
        group.add(holder);
        report.placed++; if (fallback) report.fallback++;
      };
      var makeBox = function () {
        var bx = def.box || { w: 0.7 * span, h: 0.6, d: 0.7, color: 0x9aa0a8 };
        var geo = new T.BoxGeometry(bx.w, bx.h, bx.d), mat = new T.MeshStandardMaterial({ color: bx.color, roughness: 1, metalness: 0 });
        dispose.push(geo, mat);
        var m = new T.Mesh(geo, mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
      };
      if (def.m && def.m.length) {
        var file = def.m[def.m.length > 1 ? variantIndex(b, def.m.length) : 0];
        jobs.push(loadModel(file).then(function (obj) { place(obj, false); }, function () { report.missing.push(file); place(makeBox(), true); }));
      } else {
        place(makeBox(), true);
      }
    });
    return Promise.all(jobs).then(function () { return { group: group, report: report }; });
  }

  // ---- Tarayıcıya bağlama ----
  var S = { on: false, T: null, loader: null, cache: {}, renderer: null, scene: null, cam: null, group: null, lights: null, host: null, canvas: null,
            az: 0.35, zoom: 1, w: 1, h: 1, raf: 0, ro: null, building: false, again: false, tod: "", todTimer: 0 };

  function url(rel) { return new URL(rel, document.baseURI).href; }

  function loadThree() {
    if (S.T) return Promise.resolve();
    return Promise.all([import("three"), import(url("vendor/three/examples/jsm/loaders/GLTFLoader.js"))]).then(function (mods) {
      S.T = mods[0];
      S.loader = new mods[1].GLTFLoader();
    });
  }
  function loadModel(rel) {
    if (!S.cache[rel]) {
      var parts = rel.split("/");
      S.cache[rel] = new Promise(function (res, rej) {
        S.loader.load(url(MODEL_BASE + parts[0] + "/" + parts[1] + ".glb"), function (g) {
          g.scene.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          res(g.scene);
        }, undefined, rej);
      });
    }
    return S.cache[rel].then(function (tpl) { return tpl.clone(true); });
  }

  function realCity() {
    return { cols: CITY_COLS, rows: CITY_ROWS, buildings: cityState.buildings.filter(function (b) { return typeof b.gx === "number" && typeof b.gy === "number"; }),
             typeOf: cityTypeOf, isRoad: cityIsRoad };
  }

  function applyCamera() {
    var cols = CITY_COLS, rows = CITY_ROWS, T = S.T;
    var radius = Math.sqrt(cols * cols + rows * rows) / 2, half = radius * 0.78 / S.zoom, aspect = S.w / S.h;
    S.cam.left = -half * aspect; S.cam.right = half * aspect; S.cam.top = half; S.cam.bottom = -half;
    var el = 36 * Math.PI / 180, d = 40;
    S.cam.position.set(Math.sin(S.az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(S.az) * Math.cos(el) * d);
    S.cam.lookAt(0, 0.6, 0);
    S.cam.updateProjectionMatrix();
    if (S.lights) {
      var ext = Math.max(cols, rows) * 0.8, sh = S.lights.sun.shadow.camera;
      sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 1; sh.far = 80; sh.updateProjectionMatrix();
    }
  }
  function applyLighting() {
    var T = S.T, key = todOf(new Date().getHours()), c = TOD[key];
    S.tod = key;
    S.scene.background = new T.Color(c.bg);
    S.lights.hemi.color.set(c.sky); S.lights.hemi.groundColor.set(c.ground); S.lights.hemi.intensity = c.hemi;
    S.lights.sun.color.set(c.sun); S.lights.sun.intensity = c.sunI; S.lights.sun.position.set(c.pos[0], c.pos[1], c.pos[2]);
  }
  function render() {
    S.raf = 0;
    if (!S.on || !S.renderer) return;
    S.renderer.render(S.scene, S.cam);
  }
  function requestRender() { if (!S.raf) S.raf = requestAnimationFrame(render); }

  function resize() {
    if (!S.host || !S.renderer) return;
    S.w = Math.max(1, S.host.clientWidth); S.h = Math.max(1, S.host.clientHeight);
    S.renderer.setSize(S.w, S.h, false);
    S.canvas.style.width = S.w + "px"; S.canvas.style.height = S.h + "px";
    applyCamera(); requestRender();
  }

  function wireControls(canvas) {
    var drag = null;
    canvas.addEventListener("pointerdown", function (e) { drag = { x: e.clientX }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      S.az -= (e.clientX - drag.x) * 0.008; drag.x = e.clientX;
      applyCamera(); requestRender();
    });
    var end = function () { drag = null; };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      S.zoom = clamp(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.7, 3);
      applyCamera(); requestRender();
    }, { passive: false });
  }

  function rebuild() {
    if (!S.on) return Promise.resolve();
    if (S.building) { S.again = true; return Promise.resolve(); }
    S.building = true;
    var host = document.getElementById("pixelCity3d");
    if (host) host.style.setProperty("--rows-scale", String(CITY_ROWS / 5));   // yeni mahalle açılınca yükseklik 2D ile aynı büyür
    return buildCity(S.T, loadModel, realCity()).then(function (res) {
      if (S.group) {
        S.scene.remove(S.group);
        (S.group.userData.dispose || []).forEach(function (d) { if (d && d.dispose) d.dispose(); });
      }
      S.group = res.group; S.scene.add(res.group);
      applyCamera();
      S.lastReport = res.report;
      if (res.report.missing.length && typeof console !== "undefined") console.warn("3D: yüklenemeyen modeller", res.report.missing);
      requestRender();
    }).catch(function (err) { toast("3D önizleme kurulamadı: " + (err && err.message || err)); })
      .then(function () { S.building = false; if (S.again) { S.again = false; rebuild(); } });
  }

  function toast(msg) { if (typeof showUpdateToast === "function") showUpdateToast(msg); else if (typeof console !== "undefined") console.warn(msg); }

  function mount() {
    var T = S.T;
    S.host = document.getElementById("pixelCity3d");
    S.canvas = document.createElement("canvas");
    S.canvas.style.touchAction = "none"; S.canvas.style.display = "block"; S.canvas.style.cursor = "grab";
    S.host.appendChild(S.canvas);
    S.renderer = new T.WebGLRenderer({ canvas: S.canvas, antialias: true });
    S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    S.renderer.shadowMap.enabled = true; S.renderer.shadowMap.type = T.PCFSoftShadowMap;
    S.scene = new T.Scene();
    S.cam = new T.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
    var hemi = new T.HemisphereLight(0xffffff, 0x888888, 1);
    var sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006;
    S.scene.add(hemi); S.scene.add(sun);
    S.lights = { hemi: hemi, sun: sun };
    applyLighting();
    wireControls(S.canvas);
    S.ro = new ResizeObserver(resize); S.ro.observe(S.host);
    S.todTimer = setInterval(function () { if (S.on && todOf(new Date().getHours()) !== S.tod) { applyLighting(); requestRender(); } }, 60000);
    resize();
  }
  function unmount() {
    if (S.ro) { S.ro.disconnect(); S.ro = null; }
    clearInterval(S.todTimer);
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    if (S.renderer) { S.renderer.dispose(); S.renderer = null; }
    if (S.canvas && S.canvas.parentNode) S.canvas.parentNode.removeChild(S.canvas);
    S.canvas = null; S.scene = null; S.group = null; S.lights = null;
  }

  function setUi(on) {
    var host = document.getElementById("pixelCity3d"), scene2d = document.getElementById("pixelCityScene"), btn = document.getElementById("city3dBtn");
    if (host) host.hidden = !on;
    if (scene2d) scene2d.style.display = on ? "none" : "";
    if (btn) btn.textContent = on ? "🗺️ 2D'ye dön" : "🧪 3D önizleme";
  }

  function turnOn() {
    var btn = document.getElementById("city3dBtn");
    if (btn) { btn.disabled = true; btn.textContent = "3D yükleniyor…"; }
    return loadThree().then(function () {
      S.on = true; setUi(true); mount(); return rebuild();
    }).catch(function (err) {
      S.on = false; setUi(false);
      toast("3D açılamadı: " + (err && err.message || err) + " (2D şehre dönüldü)");
    }).then(function () { if (btn) btn.disabled = false; });
  }
  function turnOff() { S.on = false; unmount(); setUi(false); }

  var refreshTimer = 0;
  function refresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(rebuild, 200); }

  if (typeof document !== "undefined") {
    document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "city3dBtn") { if (S.on) turnOff(); else turnOn(); }
    });
  }

  return {
    isOn: function () { return S.on; }, refresh: refresh, toggle: function () { return S.on ? turnOff() : turnOn(); },
    // test için
    _init: function (T, GLTFLoaderClass) { S.T = T; S.loader = new GLTFLoaderClass(); }, _state: S,
    _buildCity: buildCity, _roadPieceFor: roadPieceFor, _ROAD_BASE: ROAD_BASE, _TYPES: TYPES, _ROAD_FILE: ROAD_FILE, _todOf: todOf, _variantIndex: variantIndex
  };
})();

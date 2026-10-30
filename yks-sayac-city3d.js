// 3D şehir (tek şehir görünümü). Three.js + Kenney modelleri (CC0, kenney.nl).
// Three.js yalnızca şehir ekranı ilk görününce yüklenir. Oyun mantığı (altın, nüfus, yerleştirme kuralları) yks-sayac-city.js içinde;
// burası yalnızca çizer ve fare/dokunma olaylarını o mantığa iletir.
// Eşleştirme tablosu (TYPES) tek yerde: bir yapının 3D modelini değiştirmek için "kit/dosya" adını değiştir.
var City3D = (function () {
  "use strict";

  var MODEL_BASE = "models/";   // models/<kit>/<dosya>.glb ve models/<kit>/Textures/colormap.png

  // m: model listesi (birden çok varsa görsel varyant: ev1..ev8 gibi imageKey'in sayısı), fixed: sabit ölçek,
  // maxH: en çok yükseklik (hücre = 1 birim), box: model yoksa basit kutu {w,h,d,color}
  var TYPES = {
    "Bahçe": { m: ["fan/tree-high-round"], maxH: 1.1 },
    "Ev": { m: ["sub/building-type-a", "sub/building-type-c", "sub/building-type-e", "sub/building-type-g", "sub/building-type-k", "sub/building-type-o", "sub/building-type-r", "sub/building-type-s"] },
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
    "Koli": { box: { w: 0.3, h: 0.25, d: 0.3, color: 0xb98b55 } },
    // Doğa dekoru (Kenney Nature Kit, models/nat/): yarım karelik hücreye sığacak boyda
    "Çiçek (Kırmızı)": { m: ["nat/flower_redA", "nat/flower_redB", "nat/flower_redC"], fixed: 1.6 },
    "Çiçek (Sarı)": { m: ["nat/flower_yellowA", "nat/flower_yellowB", "nat/flower_yellowC"], fixed: 1.6 },
    "Çiçek (Mor)": { m: ["nat/flower_purpleA", "nat/flower_purpleB", "nat/flower_purpleC"], fixed: 1.6 },
    "Çalı": { m: ["nat/plant_bush", "nat/plant_bushDetailed", "nat/plant_bushLarge", "nat/plant_bushSmall", "nat/plant_bushTriangle"], fixed: 1.1 },
    "Kaya": { m: ["nat/rock_smallA", "nat/rock_smallC", "nat/stone_smallA", "nat/rock_smallFlatA"], fixed: 1.1 },
    "Kütük": { m: ["nat/stump_old", "nat/stump_round", "nat/log"], fixed: 1.3 },
    "Mantar": { m: ["nat/mushroom_red", "nat/mushroom_tan", "nat/mushroom_redGroup"], fixed: 1.8 },
    "Balkabağı": { m: ["nat/crop_pumpkin"], fixed: 1.5 },
    "Saksı": { m: ["nat/pot_large"], fixed: 1 },
    "Çit": { m: ["nat/fence_simple", "nat/fence_planks"], fixed: 1 },
    "Kamp Ateşi": { m: ["nat/campfire_logs"], fixed: 1.7 },
    "Ladin Ağacı": { m: ["nat/tree_pineTallA", "nat/tree_pineDefaultA", "nat/tree_pineSmallA", "nat/tree_pineRoundA"], fixed: 0.7 },
    "Meşe Ağacı": { m: ["nat/tree_oak", "nat/tree_default", "nat/tree_detailed", "nat/tree_fat"], fixed: 0.7 },
    "Sonbahar Ağacı": { m: ["nat/tree_default_fall", "nat/tree_oak_fall"], fixed: 0.7 },
    "Çadır": { m: ["nat/tent_smallClosed"], fixed: 1 },
    "Obelisk": { m: ["nat/statue_obelisk"], fixed: 1 },
    "Heykel Sütunu": { m: ["nat/statue_column"], fixed: 1 }
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

  // Kamera: serbest yörünge (azimut 360°, eğim 9°–86°), kaydırma (pan) ve yakınlaştırma
  var VIEW = { az: 0.35, el: 0.7, zoom: 1, minEl: 0.16, maxEl: 1.5, minZoom: 0.35, maxZoom: 5, fov: 34 };

  function hash(str) { var h = 7; str = String(str || ""); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function variantIndex(b, n) {
    var m = /(\d+)$/.exec(b.imageKey || "");
    return m ? (parseInt(m[1], 10) - 1) % n : hash(b.id) % n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- Saf yapı taşları (THREE ve model yükleyici dışarıdan verilir: testte sahte yükleyici kullanılabilir) ----

  // Düz renkli metin/rozet levhası (tabela yazısı, yıldızlar). Tarayıcı dışında (canvas yoksa) null döner.
  function makeTextSprite(T, text, opt) {
    if (typeof document === "undefined") return null;
    try {
      var cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
      var c = cv.getContext("2d"); if (!c) return null;
      if (opt.bg) { c.fillStyle = opt.bg; c.fillRect(0, 0, 256, 64); }
      c.font = opt.font || "bold 34px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = opt.fg || "#fff"; c.fillText(text, 128, 34);
      var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
      var mat = new T.SpriteMaterial({ map: tex, transparent: true });
      var sp = new T.Sprite(mat); sp.scale.set(opt.w, opt.w * 64 / 256, 1); sp.renderOrder = 5;
      return { sprite: sp, dispose: [tex, mat] };
    } catch (e) { return null; }
  }

  // Bir yapı için (konumlandırılmamış) 3D nesne üretir: ölçekli, tabanı y=0'da, merkezi (0,0), b.rot kadar döndürülmüş.
  // opt.thumb: küçük resim için hücreye değil 1 birimlik kutuya sığdır.
  function makeHolder(T, loadModel, b, type, dispose, opt) {
    opt = opt || {};
    var span = (type && type.span) || 1, def = TYPES[b.name] || {};
    var assemble = function (model, fallback) {
      var box0 = new T.Box3().setFromObject(model), size0 = box0.getSize(new T.Vector3()), s;
      if (opt.thumb) s = 0.95 / (Math.max(size0.x, size0.y, size0.z) || 1);
      else if (def.fixed) s = def.fixed;
      else {
        // genişlik span hücreye, derinlik tek sıraya (en çok %25 taşma payı) sığsın
        s = clamp(Math.min(span * 0.94 / (size0.x || 1), 1.25 / (size0.z || 1)), 0.3, 1.25);
        if (def.maxH && size0.y * s > def.maxH) s = def.maxH / size0.y;
      }
      model.scale.setScalar(s);
      var holder = new T.Group(); holder.add(model);
      var box = new T.Box3().setFromObject(model), center = box.getCenter(new T.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z);
      holder.rotation.y = (b.rot || 0) * Math.PI / 2;
      holder.userData = { name: b.name, id: b.id, fallback: !!fallback };
      return holder;
    };
    var makeBox = function () {
      var bx = def.box || { w: 0.7 * span, h: 0.6, d: 0.7, color: 0x9aa0a8 };
      var geo = new T.BoxGeometry(bx.w, bx.h, bx.d), mat = new T.MeshStandardMaterial({ color: bx.color, roughness: 1, metalness: 0 });
      dispose.push(geo, mat);
      var m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    if (def.m && def.m.length) {
      var file = def.m[def.m.length > 1 ? variantIndex(b, def.m.length) : 0];
      return loadModel(file).then(function (obj) { return assemble(obj, false); }, function () { return assemble(makeBox(), true); }).then(function (h) { h.userData.file = file; return h; });
    }
    return Promise.resolve(assemble(makeBox(), true));
  }

  // ---- Süs bitki örtüsü (v3.17.0): kaydedilmez; öğrenci başına sabit rastgele; yapı/yol/dekor gelen yerden kalkar ----
  // [model, ölçek]: Kenney Nature Kit modelleri 1 birim = 1 kare ölçeğindedir; ağaçlar evlerle orantılı küçültülür.
  var SC = {
    tree: [["nat/tree_default", 0.7], ["nat/tree_oak", 0.75], ["nat/tree_detailed", 0.7], ["nat/tree_fat", 0.8], ["nat/tree_pineDefaultA", 0.7],
           ["nat/tree_pineTallA", 0.65], ["nat/tree_pineRoundA", 0.7], ["nat/tree_pineSmallA", 0.85], ["nat/tree_small", 0.85], ["nat/tree_thin", 0.7],
           ["nat/tree_simple", 0.7], ["nat/tree_cone", 0.7], ["nat/tree_default_fall", 0.7], ["nat/tree_oak_fall", 0.75]],
    bush: [["nat/plant_bush", 1.2], ["nat/plant_bushDetailed", 1], ["nat/plant_bushLarge", 1.2], ["nat/plant_bushSmall", 1.3], ["nat/plant_bushTriangle", 1.1]],
    flower: [["nat/flower_redA", 1.6], ["nat/flower_redB", 1.6], ["nat/flower_redC", 1.6], ["nat/flower_yellowA", 1.6], ["nat/flower_yellowB", 1.6],
             ["nat/flower_yellowC", 1.6], ["nat/flower_purpleA", 1.6], ["nat/flower_purpleB", 1.6], ["nat/flower_purpleC", 1.6]],
    grass: [["nat/grass", 1.2], ["nat/grass_large", 1.1], ["nat/grass_leafs", 1.4], ["nat/grass_leafsLarge", 1.1]],
    rock: [["nat/rock_smallA", 1.1], ["nat/rock_smallC", 1.3], ["nat/stone_smallA", 1.1], ["nat/rock_smallFlatA", 1.4], ["nat/rock_largeA", 0.6]],
    misc: [["nat/mushroom_red", 1.7], ["nat/mushroom_tan", 1.7], ["nat/mushroom_redGroup", 1.5], ["nat/log", 1.2], ["nat/stump_old", 1.1], ["nat/stump_round", 1.1]]
  };
  // kenara uzaklığa göre: dış halka sık orman, içeri doğru seyrelir (bina yapılacak yer rahat kalsın)
  var SC_TREE_P = [0.85, 0.55, 0.26];   // kenar 0, 1, 2; daha içeride SC_TREE_IN
  var SC_TREE_IN = 0.07;
  var SC_OTHER_EDGE = [["bush", 0.12], ["rock", 0.05], ["flower", 0.1], ["grass", 0.1], ["misc", 0.03]];
  var SC_OTHER_IN = [["bush", 0.06], ["rock", 0.04], ["flower", 0.16], ["grass", 0.12], ["misc", 0.03]];
  function rnd(seed, a, b, c) {   // (tohum, a, b, c) -> [0,1) sabit sahte rastgele
    var h = (seed ^ Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 1, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }
  // Saf: hangi karelere hangi süs konur. Dönen: [{ m, x, z, rot, s }]
  function planScenery(city, seed) {
    var cols = city.cols, rows = city.rows, main = {}, sub = {}, out = [];
    city.buildings.forEach(function (b) {
      var type = city.typeOf(b); if (!type) return;
      if (city.isDecor && city.isDecor(b)) { var q = city.subOf(b); if (q) sub[q.sx + "," + q.sy] = true; return; }
      var span = type.span || 1;
      for (var i = 0; i < span; i++) main[(b.gx + i) + "," + b.gy] = true;
    });
    for (var gy = 0; gy < rows; gy++) for (var gx = 0; gx < cols; gx++) {
      if (main[gx + "," + gy]) continue;
      var edge = Math.min(gx, cols - 1 - gx, gy, rows - 1 - gy);
      var pTree = edge < SC_TREE_P.length ? SC_TREE_P[edge] : SC_TREE_IN;
      var kind = null;
      if (rnd(seed, gx, gy, 1) < pTree) kind = "tree";
      else {
        var k = rnd(seed, gx, gy, 3), acc = 0, tbl = edge <= 2 ? SC_OTHER_EDGE : SC_OTHER_IN;
        for (var t = 0; t < tbl.length; t++) { acc += tbl[t][1]; if (k < acc) { kind = tbl[t][0]; break; } }
      }
      if (!kind) continue;
      var n = 1;
      if (kind === "flower") n = 2 + Math.floor(rnd(seed, gx, gy, 4) * 2);
      else if (kind === "grass") n = 1 + Math.floor(rnd(seed, gx, gy, 4) * 2);
      else if (kind === "tree" && edge === 0 && rnd(seed, gx, gy, 4) < 0.35) n = 2;
      var base = Math.floor(rnd(seed, gx, gy, 5) * 4), list = SC[kind];
      for (var i2 = 0; i2 < n; i2++) {
        var slot = (base + i2) % 4, sx = gx * 2 + (slot & 1), sy = gy * 2 + (slot >> 1);
        if (sub[sx + "," + sy]) continue;   // bu yarım karede oyuncunun dekoru var
        var pick = list[Math.floor(rnd(seed, gx, gy, 20 + i2) * list.length) % list.length];
        out.push({
          m: pick[0],
          x: (sx + 0.5) / 2 - cols / 2 + (rnd(seed, gx, gy, 30 + i2) - 0.5) * 0.14,
          z: (sy + 0.5) / 2 - rows / 2 + (rnd(seed, gx, gy, 40 + i2) - 0.5) * 0.14,
          rot: rnd(seed, gx, gy, 50 + i2) * Math.PI * 2,
          s: pick[1] * (0.85 + rnd(seed, gx, gy, 60 + i2) * 0.3)
        });
      }
    }
    return out;
  }
  // Süsleri model başına InstancedMesh olarak ekler (yüzlerce süs birkaç çizim çağrısı).
  function addScenery(T, loadModel, group, items, dispose, report) {
    var byModel = {};
    items.forEach(function (it) { (byModel[it.m] = byModel[it.m] || []).push(it); });
    return Promise.all(Object.keys(byModel).map(function (m) {
      return loadModel(m).then(function (obj) {
        obj.updateMatrixWorld(true);
        var box = new T.Box3().setFromObject(obj);
        if (box.isEmpty()) return;
        var center = box.getCenter(new T.Vector3());
        var offset = new T.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);
        var inv = new T.Matrix4().copy(obj.matrixWorld).invert(), list = byModel[m], up = new T.Vector3(0, 1, 0);
        obj.traverse(function (mesh) {
          if (!mesh.isMesh || !mesh.geometry || !mesh.material) return;
          var rel = mesh.matrixWorld.clone().premultiply(inv);
          var im = new T.InstancedMesh(mesh.geometry, mesh.material, list.length);
          im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.scenery = true;
          list.forEach(function (it, i) {
            var M = new T.Matrix4().compose(new T.Vector3(it.x, 0, it.z), new T.Quaternion().setFromAxisAngle(up, it.rot), new T.Vector3(it.s, it.s, it.s));
            M.multiply(offset).multiply(rel);
            im.setMatrixAt(i, M);
          });
          im.instanceMatrix.needsUpdate = true;
          group.add(im); dispose.push(im); report.sceneryMeshes++;
        });
        report.scenery += list.length;
      }, function () { report.missing.push(m); });
    }));
  }

  // city: { cols, rows, buildings, typeOf(b), isRoad(b), isDecor?(b), subOf?(b), seed? }; loadModel("kit/dosya") -> Promise<Object3D>
  function buildCity(T, loadModel, city) {
    var cols = city.cols, rows = city.rows;
    var group = new T.Group();
    var report = { placed: 0, roads: 0, fallback: 0, missing: [], roadCells: [], sprites: 0, scenery: 0, sceneryMeshes: 0 };
    var dispose = [];   // bu sahneye özgü kaynaklar (modeller önbellekten klonlandığı için paylaşılan geometriye dokunulmaz)
    var holders = {};
    group.userData.dispose = dispose; group.userData.holders = holders;

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
          holder.userData = { road: pick.piece, gx: b.gx, gy: b.gy, id: b.id, name: b.name };
          group.add(holder); holders[b.id] = holder; report.roads++;
        }, function () { report.missing.push(ROAD_FILE[pick.piece]); }));
        return;
      }
      jobs.push(makeHolder(T, loadModel, b, type, dispose).then(function (holder) {
        if (holder.userData.fallback) { report.fallback++; if (TYPES[b.name] && TYPES[b.name].m) report.missing.push(holder.userData.file); }
        var sub = (city.isDecor && city.isDecor(b)) ? city.subOf(b) : null;   // dekor: yarım kare konumu
        if (sub) {
          var onRoad = type.onRoad && roads[Math.floor(sub.sx / 2) + "," + Math.floor(sub.sy / 2)];
          holder.position.set((sub.sx + 0.5) / 2 - cols / 2, onRoad ? 0.02 : 0, (sub.sy + 0.5) / 2 - rows / 2);
        } else holder.position.set(cellX(b.gx, span), 0, cellZ(b.gy));
        group.add(holder); holders[b.id] = holder; report.placed++;
        // etiketler: tabela yazısı ve yükseltme yıldızları
        var top = new T.Box3().setFromObject(holder).max.y;
        if (b.name === "Tabela" && b.label) {
          var ls = makeTextSprite(T, b.label, { bg: "rgba(255,255,255,0.92)", fg: "#2b2117", w: 0.95, font: "bold 38px sans-serif" });
          if (ls) { ls.sprite.position.set(holder.position.x, top + 0.2, holder.position.z); group.add(ls.sprite); dispose.push.apply(dispose, ls.dispose); report.sprites++; }
        }
        if (b.stars) {
          var st = makeTextSprite(T, "⭐".repeat(b.stars), { w: 0.55, font: "40px sans-serif" });
          if (st) { st.sprite.position.set(holder.position.x, top + 0.18, holder.position.z); group.add(st.sprite); dispose.push.apply(dispose, st.dispose); report.sprites++; }
        }
      }));
    });
    return Promise.all(jobs).then(function () {
      try { return addScenery(T, loadModel, group, planScenery(city, city.seed || 0), dispose, report); } catch (e) { return null; }
    }).then(function () { return { group: group, report: report }; }, function () { return { group: group, report: report }; });
  }

  // İmleç (ekran) -> zemin düzlemi -> hücre. span: yatay kaç hücre kaplıyor.
  // sub=true: dekor için yarım kare (sx, sy) de döner.
  function cellFromPoint(p, span, cols, rows, sub) {
    var c = {
      gx: clamp(Math.round(p.x + cols / 2 - span / 2), 0, Math.max(0, cols - span)),
      gy: clamp(Math.floor(p.z + rows / 2), 0, rows - 1)
    };
    if (sub) { c.sx = clamp(Math.floor((p.x + cols / 2) * 2), 0, cols * 2 - 1); c.sy = clamp(Math.floor((p.z + rows / 2) * 2), 0, rows * 2 - 1); }
    return c;
  }

  // ---- Tarayıcıya bağlama ----
  var S = {
    T: null, loader: null, cache: {}, started: null, mounted: false,
    renderer: null, scene: null, cam: null, lights: null, host: null, canvas: null, group: null,
    az: VIEW.az, el: VIEW.el, zoom: VIEW.zoom, tx: 0, tz: 0, w: 1, h: 1, raf: 0, ro: null, io: null,
    building: false, again: false, sig: "", tod: "", todTimer: 0, lastReport: null,
    ray: null, plane: null, ptr: {}, ptrCount: 0, gesture: null,
    ghost: null, ghostKey: "", ghostCell: null, ghostDispose: [], lastCell: null, selRing: null, selKey: "", uiKey: "", gridLines: null, gridKey: "", marker: null, markerKey: "",
    toolbar: null, hint: null, hud: null
  };

  function url(rel) { return new URL(rel, document.baseURI).href; }
  function toast(msg) { if (typeof showUpdateToast === "function") showUpdateToast(msg); else if (typeof console !== "undefined") console.warn(msg); }

  function loadThree() {
    if (S.T) return Promise.resolve();
    return Promise.all([import("three"), import(url("vendor/three/examples/jsm/loaders/GLTFLoader.js"))]).then(function (mods) {
      S.T = mods[0];
      S.loader = new mods[1].GLTFLoader();
      S.ray = new S.T.Raycaster();
      S.plane = new S.T.Plane(new S.T.Vector3(0, 1, 0), 0);
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
             typeOf: cityTypeOf, isRoad: cityIsRoad, isDecor: cityIsDecor, subOf: citySubOf, seed: sceneSeed() };
  }
  function sceneSeed() { return hash(typeof currentUserUid !== "undefined" ? currentUserUid : ""); }
  function citySig() {
    return CITY_COLS + "x" + CITY_ROWS + "|" + sceneSeed() + "|" + cityState.buildings.map(function (b) {
      return [b.id, b.name, b.gx, b.gy, b.sx, b.sy, b.rot || 0, b.stars || 0, b.label || "", b.imageKey || ""].join(":");
    }).join(",");
  }

  // ---- Kamera ----
  function camDistance() {
    var cols = CITY_COLS, rows = CITY_ROWS, r = Math.sqrt(cols * cols + rows * rows) / 2, t = Math.tan(VIEW.fov * Math.PI / 360);
    var dv = r * 0.85 / t, dh = (cols / 2 + 0.6) / (t * (S.w / S.h)) * 0.9;
    return Math.max(dv, dh) / S.zoom;
  }
  function applyCamera() {
    if (!S.cam) return;
    var cols = CITY_COLS, rows = CITY_ROWS, d = camDistance();
    S.tx = clamp(S.tx, -cols / 2 - 2, cols / 2 + 2); S.tz = clamp(S.tz, -rows / 2 - 2, rows / 2 + 2);
    S.el = clamp(S.el, VIEW.minEl, VIEW.maxEl); S.zoom = clamp(S.zoom, VIEW.minZoom, VIEW.maxZoom);
    d = camDistance();
    S.cam.fov = VIEW.fov; S.cam.aspect = S.w / S.h; S.cam.near = Math.max(0.1, d / 40); S.cam.far = d * 8 + 100;
    S.cam.position.set(S.tx + Math.sin(S.az) * Math.cos(S.el) * d, Math.sin(S.el) * d, S.tz + Math.cos(S.az) * Math.cos(S.el) * d);
    S.cam.lookAt(S.tx, 0.4, S.tz);
    S.cam.updateProjectionMatrix();
    S.cam.updateMatrixWorld(true);
    if (S.lights) {
      var ext = Math.max(cols, rows) * 0.8, sh = S.lights.sun.shadow.camera;
      sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 1; sh.far = 80 + Math.max(cols, rows) * 3; sh.updateProjectionMatrix();
    }
  }
  function resetView() { S.az = VIEW.az; S.el = VIEW.el; S.zoom = VIEW.zoom; S.tx = 0; S.tz = 0; applyCamera(); requestRender(); }
  function topView() { S.el = VIEW.maxEl; S.az = 0; applyCamera(); requestRender(); }
  function panBy(dx, dy) {   // dx, dy: ekran pikseli; sahne parmakla birlikte hareket eder
    var t = Math.tan(VIEW.fov * Math.PI / 360), upp = (2 * camDistance() * t) / S.h;
    var rx = Math.cos(S.az), rz = -Math.sin(S.az), fx = -Math.sin(S.az), fz = -Math.cos(S.az);
    var v = upp / Math.max(0.25, Math.sin(S.el));
    S.tx += -dx * upp * rx + dy * v * fx;
    S.tz += -dx * upp * rz + dy * v * fz;
  }

  function applyLighting() {
    var T = S.T, key = todOf(new Date().getHours()), c = TOD[key];
    S.tod = key;
    S.scene.background = new T.Color(c.bg);
    S.lights.hemi.color.set(c.sky); S.lights.hemi.groundColor.set(c.ground); S.lights.hemi.intensity = c.hemi;
    S.lights.sun.color.set(c.sun); S.lights.sun.intensity = c.sunI; var k = Math.max(1, Math.max(CITY_COLS, CITY_ROWS) / 14);   // büyük şehirde güneş de uzaklaşır (gölge kutusu alanı kapsasın)
    S.lights.sun.position.set(c.pos[0] * k, c.pos[1] * k, c.pos[2] * k);
  }

  function render() {
    S.raf = 0;
    if (!S.renderer || !S.scene) return;
    S.renderer.render(S.scene, S.cam);
    positionOverlays();
  }
  function requestRender() { if (!S.raf) S.raf = requestAnimationFrame(render); }

  function resize() {
    if (!S.host || !S.renderer) return;
    S.w = Math.max(1, S.host.clientWidth); S.h = Math.max(1, S.host.clientHeight);
    S.renderer.setSize(S.w, S.h, false);
    S.canvas.style.width = S.w + "px"; S.canvas.style.height = S.h + "px";
    applyCamera(); requestRender();
  }

  // ---- İşaretçi: ekran -> zemin ----
  function groundPoint(clientX, clientY) {
    var rect = S.canvas.getBoundingClientRect();
    var nx = ((clientX - rect.left) / (rect.width || 1)) * 2 - 1, ny = -((clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    S.ray.setFromCamera({ x: nx, y: ny }, S.cam);
    var p = new S.T.Vector3();
    return S.ray.ray.intersectPlane(S.plane, p) ? p : null;
  }
  function cellAt(clientX, clientY, span, sub) {
    var p = groundPoint(clientX, clientY);
    return p ? cellFromPoint(p, span, CITY_COLS, CITY_ROWS, sub) : null;
  }
  function pickId(clientX, clientY) {
    if (S.group) {
      var rect = S.canvas.getBoundingClientRect();
      S.ray.setFromCamera({ x: ((clientX - rect.left) / (rect.width || 1)) * 2 - 1, y: -((clientY - rect.top) / (rect.height || 1)) * 2 + 1 }, S.cam);
      var hs = S.group.userData.holders, list = Object.keys(hs).map(function (k) { return hs[k]; });
      var hit = S.ray.intersectObjects(list, true)[0];
      if (hit) { var o = hit.object; while (o && !(o.userData && o.userData.id && hs[o.userData.id] === o)) o = o.parent; if (o) return o.userData.id; }
    }
    var p = groundPoint(clientX, clientY);   // küçük süslere isabet zor olabilir: tıklanan karedeki yapıyı seç
    if (!p) return null;
    var c = cellFromPoint(p, 1, CITY_COLS, CITY_ROWS, true);
    var subId = citySubOccupancy(cityState.buildings)[c.sx + "," + c.sy];   // önce tam o yarım karedeki dekor
    if (subId) return subId;
    var occId = cityOccupancy(cityState.buildings)[c.gx + "," + c.gy];
    if (occId) return occId;
    var inCell = cityState.buildings.filter(function (b) {   // karedeki herhangi bir dekor
      var q = cityIsDecor(b) ? citySubOf(b) : null;
      return q && Math.floor(q.sx / 2) === c.gx && Math.floor(q.sy / 2) === c.gy;
    })[0];
    return inCell ? inCell.id : null;
  }

  // ---- Yerleştirme hayaleti ----
  function clearGhost() {
    if (S.ghost) { S.scene.remove(S.ghost); S.ghost = null; }
    S.ghostDispose.forEach(function (d) { if (d && d.dispose) d.dispose(); });
    S.ghostDispose = []; S.ghostKey = "";
    removeMarker();
  }
  function tintGhost(valid) {
    if (!S.ghost) return;
    S.ghost.traverse(function (o) {
      if (o.isMesh && o.material && o.material.emissive) { o.material.emissive.set(valid ? 0x1a7f37 : 0x9b1c1c); o.material.emissiveIntensity = 0.65; }
    });
  }
  // ---- Yerleştirme yardımcıları: ızgara çizgileri (bina: ana kare, dekor: yarım kare) + hedef kare vurgusu ----
  function removeGrid() {
    if (S.gridLines) { S.scene.remove(S.gridLines); S.gridLines.geometry.dispose(); S.gridLines.material.dispose(); S.gridLines = null; }
    S.gridKey = "";
  }
  function syncGrid(active) {
    if (!S.scene) return;
    var step = active ? (cityIsDecor(active) ? 0.5 : 1) : 0, key = step ? step + ":" + CITY_COLS + "x" + CITY_ROWS : "";
    if (key === S.gridKey) return;
    removeGrid();
    if (!step) { requestRender(); return; }
    var T = S.T, pts = [], x0 = -CITY_COLS / 2, z0 = -CITY_ROWS / 2, i;
    for (i = 0; i <= Math.round(CITY_COLS / step); i++) { var x = x0 + i * step; pts.push(x, 0, z0, x, 0, -z0); }
    for (i = 0; i <= Math.round(CITY_ROWS / step); i++) { var z = z0 + i * step; pts.push(x0, 0, z, -x0, 0, z); }
    var geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    var mat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: step < 1 ? 0.38 : 0.2, depthWrite: false });
    var lines = new T.LineSegments(geo, mat); lines.position.y = 0.012; lines.renderOrder = 1;
    S.scene.add(lines); S.gridLines = lines; S.gridKey = key;
    requestRender();
  }
  function removeMarker() {
    if (S.marker && S.scene) { S.scene.remove(S.marker); S.marker.geometry.dispose(); S.marker.material.dispose(); }
    S.marker = null; S.markerKey = "";
  }
  function setMarker(active, cell, ok) {
    if (!S.scene || !active || !cell) { removeMarker(); return; }
    var T = S.T, decor = cityIsDecor(active), span = cityItemSpan(active);
    var w = decor ? 0.46 : span * 0.98, d = decor ? 0.46 : 0.98, key = w + ":" + d;
    if (!S.marker || S.markerKey !== key) {
      removeMarker();
      var m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.5, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 2; S.scene.add(m); S.marker = m; S.markerKey = key;
    }
    S.marker.position.set(decor ? (cell.sx + 0.5) / 2 - CITY_COLS / 2 : cell.gx + span / 2 - CITY_COLS / 2, 0.03,
                          decor ? (cell.sy + 0.5) / 2 - CITY_ROWS / 2 : cell.gy + 0.5 - CITY_ROWS / 2);
    S.marker.material.color.set(ok ? 0x2ecc71 : 0xe74c3c);
  }
  function moveGhost(cell) {
    var active = cityActiveItem();
    if (!active || !S.ghost || !cell) return;
    var span = cityItemSpan(active), decor = cityIsDecor(active);
    if (decor && typeof cell.sx !== "number") cell = { gx: cell.gx, gy: cell.gy, sx: cell.gx * 2, sy: cell.gy * 2 };   // yapı seçiminden dekora geçiş
    var ok = cityCanPlaceActive(active, cell);
    if (decor) S.ghost.position.set((cell.sx + 0.5) / 2 - CITY_COLS / 2, 0.02, (cell.sy + 0.5) / 2 - CITY_ROWS / 2);
    else S.ghost.position.set(cell.gx + span / 2 - CITY_COLS / 2, 0.02, cell.gy + 0.5 - CITY_ROWS / 2);
    S.ghost.visible = true;
    S.ghostCell = cell;
    tintGhost(ok);
    setMarker(active, cell, ok);
    requestRender();
  }
  function syncGhost() {
    var active = cityActiveItem();
    var key = active ? active.id + ":" + (active.rot || 0) : "";
    if (key === S.ghostKey) return;
    clearGhost();
    S.ghostKey = key;
    if (!active) { requestRender(); return; }
    var type = cityTypeOf(active), dispose = S.ghostDispose, myKey = key;
    var holderP = cityIsRoad(active)
      ? loadModel(ROAD_FILE.straight).then(function (obj) { var h = new S.T.Group(); h.add(obj); return h; })
      : makeHolder(S.T, loadModel, active, type, dispose);
    holderP.then(function (holder) {
      if (S.ghostKey !== myKey || !S.scene) return;   // bu arada başka şey seçildi
      holder.traverse(function (o) {
        if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.72; dispose.push(o.material); o.castShadow = false; }
      });
      holder.visible = false;
      S.ghost = holder; S.scene.add(holder);
      moveGhost(S.ghostCell || S.lastCell);
    });
  }

  // ---- Seçim halkası, araç çubuğu, yerleştirme çubuğu ----
  function selectedBuilding() {
    if (!selectedCityItemId) return null;
    return cityState.buildings.filter(function (b) { return b.id === selectedCityItemId; })[0] || null;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function btn(label, cls, fn) {
    var b = el("button", cls || "", label); b.type = "button";
    b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
    b.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    return b;
  }

  function updateOverlays() {
    if (!S.host || !S.scene) return;
    var active = cityActiveItem(), sel = active ? null : selectedBuilding();
    syncGrid(active);
    // araç çubuğu ve halka
    var selKey = sel ? sel.id + ":" + (sel.stars || 0) + ":" + (sel.rot || 0) + ":" + Math.floor(cityState.coins || 0) : "";
    if (selKey !== S.selKey) {
      S.selKey = selKey;
      if (S.selRing) { S.scene.remove(S.selRing); if (S.selRing.geometry) S.selRing.geometry.dispose(); if (S.selRing.material) S.selRing.material.dispose(); S.selRing = null; }
      S.toolbar.innerHTML = "";
      if (sel) {
        var span = cityItemSpan(sel), type = cityTypeOf(sel), road = cityIsRoad(sel), decor = cityIsDecor(sel), sq = decor ? citySubOf(sel) : null;
        var T = S.T, ring = new T.Mesh(new T.PlaneGeometry(sq ? 0.46 : span * 0.98, sq ? 0.46 : 0.98), new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.5, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2;
        ring.position.set(sq ? (sq.sx + 0.5) / 2 - CITY_COLS / 2 : sel.gx + span / 2 - CITY_COLS / 2, 0.035, sq ? (sq.sy + 0.5) / 2 - CITY_ROWS / 2 : sel.gy + 0.5 - CITY_ROWS / 2);
        S.scene.add(ring); S.selRing = ring;
        if (!road) S.toolbar.appendChild(btn("↻ Döndür", "", rotateActiveOrSelected));
        S.toolbar.appendChild(btn("✋ Taşı", "", startMovingSelected));
        if (sel.name === "Tabela") S.toolbar.appendChild(btn("✏️ Yazı", "", editSelectedSignLabel));
        if (type && type.population > 0 && (sel.stars || 0) < CITY_UPGRADE.maxStars) S.toolbar.appendChild(btn("⭐ Yükselt · " + cityUpgradeCost(type, sel.stars || 0) + " altın", "", upgradeSelectedCityItem));
        S.toolbar.appendChild(btn("🗑 Sil", "danger", removeSelectedCityItem));
        S.toolbar.appendChild(btn("✕", "", function () { selectedCityItemId = null; updateOverlays(); requestRender(); }));
      }
      S.toolbar.hidden = !sel;
    }
    // yerleştirme çubuğu
    var hintKey = active ? active.id + ":" + (!!movingId && !pendingBuilding) : "";
    if (hintKey !== S.uiKey) {
      S.uiKey = hintKey;
      S.hint.innerHTML = "";
      if (active) {
        var isMove = !!movingId && !pendingBuilding;
        S.hint.appendChild(el("span", "", (isMove ? "✋ Yeni yerini seç: " : (cityIsDecor(active) ? "📍 Küçük kareye tıkla (dekor yarım kare hassasiyetli): " : "📍 Yerleştirmek için bir kareye tıkla: ")) + active.emoji + " " + active.name));
        if (!cityIsRoad(active)) S.hint.appendChild(btn("↻ Döndür (R)", "", rotateActiveOrSelected));
        S.hint.appendChild(btn("Vazgeç", "", cancelPendingPlacement));
      }
      S.hint.hidden = !active;
    }
    // taşınan yapı kendi yerinde gizlenir
    if (S.group) {
      var hs = S.group.userData.holders;
      Object.keys(hs).forEach(function (id) { hs[id].visible = !(movingId && id === movingId); });
    }
    syncGhost();
    positionOverlays();
  }
  function positionOverlays() {
    if (!S.toolbar || S.toolbar.hidden || !S.group) return;
    var sel = selectedBuilding(), holder = sel && S.group.userData.holders[sel.id];
    if (!holder) { S.toolbar.hidden = true; return; }
    var box = new S.T.Box3().setFromObject(holder), v = new S.T.Vector3((box.min.x + box.max.x) / 2, box.max.y + 0.1, (box.min.z + box.max.z) / 2).project(S.cam);
    var x = (v.x * 0.5 + 0.5) * S.w, y = (-v.y * 0.5 + 0.5) * S.h;
    S.toolbar.style.left = clamp(x, 70, S.w - 70) + "px";
    S.toolbar.style.top = clamp(y, 44, S.h - 8) + "px";
  }

  // ---- Fare / dokunma ----
  var CLICK_MOVE = 6;
  function onDown(e) {
    if (S.canvas.setPointerCapture) S.canvas.setPointerCapture(e.pointerId);
    S.ptr[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now(), btn: e.button, shift: e.shiftKey, type: e.pointerType, moved: false };
    S.ptrCount = Object.keys(S.ptr).length;
    if (S.ptrCount === 2) {
      var k = Object.keys(S.ptr), a = S.ptr[k[0]], b = S.ptr[k[1]];
      S.gesture = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      a.moved = b.moved = true;   // iki parmak asla "tıklama" sayılmaz
    }
    S.canvas.style.cursor = "grabbing";
  }
  function onMove(e) {
    var p = S.ptr[e.pointerId];
    if (!p) {   // basılı değil: fare üzerinde gezinirken hayalet güncellenir
      if (e.pointerType === "mouse" && cityActiveItem()) {
        var act = cityActiveItem(), span = cityItemSpan(act), c = cellAt(e.clientX, e.clientY, span, cityIsDecor(act));
        if (c) { S.lastCell = c; moveGhost(c); }
      }
      return;
    }
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > CLICK_MOVE) p.moved = true;
    if (S.ptrCount >= 2 && S.gesture) {
      var k = Object.keys(S.ptr), a = S.ptr[k[0]], b = S.ptr[k[1]], dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      S.zoom *= dist / S.gesture.dist; panBy(mx - S.gesture.mx, my - S.gesture.my);
      S.gesture.dist = dist; S.gesture.mx = mx; S.gesture.my = my;
    } else if (p.moved) {
      if (p.btn === 2 || p.btn === 1 || p.shift) panBy(dx, dy);
      else { S.az -= dx * 0.007; S.el += dy * 0.005; }
    } else return;
    applyCamera(); requestRender();
  }
  function onUp(e) {
    var p = S.ptr[e.pointerId];
    delete S.ptr[e.pointerId]; S.ptrCount = Object.keys(S.ptr).length;
    if (S.ptrCount < 2) S.gesture = null;
    if (S.ptrCount === 0) S.canvas.style.cursor = "grab";
    if (p && !p.moved && p.btn === 0 && Date.now() - p.t < 600) onClick(e.clientX, e.clientY, p.type);
  }
  function onClick(x, y, ptype) {
    var active = cityActiveItem();
    if (active) {
      var span = cityItemSpan(active), decor = cityIsDecor(active), cell = cellAt(x, y, span, decor);
      if (!cell) return;
      var ok = cityCanPlaceActive(active, cell);
      // dokunmatikte iki adım: ilk dokunuş hayaleti taşır, aynı kareye ikinci dokunuş yerleştirir
      var same = S.ghostCell && (decor ? (S.ghostCell.sx === cell.sx && S.ghostCell.sy === cell.sy) : (S.ghostCell.gx === cell.gx && S.ghostCell.gy === cell.gy));
      S.lastCell = cell;
      if (ptype === "touch" && !same) { moveGhost(cell); return; }
      if (!ok) { moveGhost(cell); return; }
      S.ghostCell = null;
      placeActiveItem(active, cell);
      return;
    }
    selectedCityItemId = pickId(x, y);
    updateOverlays(); requestRender();
  }
  function onWheel(e) {
    e.preventDefault();
    S.zoom *= (e.deltaY < 0 ? 1.1 : 1 / 1.1);
    applyCamera(); requestRender();
  }
  function onKey(e) {
    if (!S.host || !S.host.offsetParent) return;
    var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, step = 60, handled = true;
    if (k === "r" || k === "R") rotateActiveOrSelected();
    else if (k === "Delete") { if (selectedCityItemId && !cityActiveItem()) removeSelectedCityItem(); else handled = false; }
    else if (k === "Escape") { if (cityActiveItem()) cancelPendingPlacement(); else { selectedCityItemId = null; updateOverlays(); requestRender(); } }
    else if (k === "ArrowLeft") panBy(step, 0);
    else if (k === "ArrowRight") panBy(-step, 0);
    else if (k === "ArrowUp") panBy(0, step);
    else if (k === "ArrowDown") panBy(0, -step);
    else if (k === "q" || k === "Q") S.az += 0.15;
    else if (k === "e" || k === "E") S.az -= 0.15;
    else if (k === "+" || k === "=") S.zoom *= 1.15;
    else if (k === "-" || k === "_") S.zoom /= 1.15;
    else handled = false;
    if (handled) { e.preventDefault(); applyCamera(); requestRender(); }
  }

  function rebuild(force) {
    if (!S.renderer || !S.scene) return Promise.resolve();
    var sig = citySig();
    if (!force && sig === S.sig && S.group) { updateOverlays(); return Promise.resolve(); }
    if (S.building) { S.again = true; return Promise.resolve(); }
    S.building = true; S.sig = sig;
    return buildCity(S.T, loadModel, realCity()).then(function (res) {
      if (S.group) {
        S.scene.remove(S.group);
        (S.group.userData.dispose || []).forEach(function (d) { if (d && d.dispose) d.dispose(); });
      }
      S.group = res.group; S.scene.add(res.group);
      S.lastReport = res.report;
      if (res.report.missing.length && typeof console !== "undefined") console.warn("3D: yüklenemeyen modeller", res.report.missing);
      S.selKey = "-";   // halka/araç çubuğu yeni sahneye göre yeniden kurulsun
      applyCamera(); updateOverlays(); requestRender();
    }).catch(function (err) { toast("3D şehir kurulamadı: " + (err && err.message || err)); })
      .then(function () { S.building = false; if (S.again) { S.again = false; rebuild(); } });
  }

  function mount() {
    var T = S.T;
    S.host = document.getElementById("pixelCity3d");
    S.canvas = document.createElement("canvas");
    S.canvas.style.touchAction = "none"; S.canvas.style.display = "block"; S.canvas.style.cursor = "grab";
    S.host.insertBefore(S.canvas, S.host.firstChild);
    if (S.loadingEl && S.loadingEl.parentNode) { S.loadingEl.parentNode.removeChild(S.loadingEl); S.loadingEl = null; }
    S.renderer = new T.WebGLRenderer({ canvas: S.canvas, antialias: true });
    S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    S.renderer.shadowMap.enabled = true; S.renderer.shadowMap.type = T.PCFSoftShadowMap;
    S.scene = new T.Scene();
    S.cam = new T.PerspectiveCamera(VIEW.fov, 2, 0.1, 400);
    var hemi = new T.HemisphereLight(0xffffff, 0x888888, 1);
    var sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006;
    S.scene.add(hemi); S.scene.add(sun);
    S.lights = { hemi: hemi, sun: sun };
    applyLighting();

    // araç çubukları ve kamera düğmeleri
    S.toolbar = el("div", "c3-toolbar"); S.toolbar.hidden = true;
    S.hint = el("div", "c3-hint"); S.hint.hidden = true;
    S.hud = el("div", "c3-hud");
    S.hud.appendChild(btn("🎥", "", resetView)); S.hud.lastChild.title = "Görünümü sıfırla";
    S.hud.appendChild(btn("⬇️", "", topView)); S.hud.lastChild.title = "Kuşbakışı";
    S.hud.appendChild(btn("＋", "", function () { S.zoom *= 1.25; applyCamera(); requestRender(); })); S.hud.lastChild.title = "Yakınlaştır";
    S.hud.appendChild(btn("－", "", function () { S.zoom /= 1.25; applyCamera(); requestRender(); })); S.hud.lastChild.title = "Uzaklaştır";
    var tip = el("div", "c3-tip", "Sol tuş: döndür · Sağ tuş / Shift: kaydır · Tekerlek: yakınlaştır · İki parmak: kaydır + yakınlaştır");
    S.host.appendChild(S.toolbar); S.host.appendChild(S.hint); S.host.appendChild(S.hud); S.host.appendChild(tip);
    ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (n) {
      S.canvas.addEventListener(n, n === "pointerdown" ? onDown : (n === "pointermove" ? onMove : onUp));
    });
    S.canvas.addEventListener("wheel", onWheel, { passive: false });
    S.canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    window.addEventListener("keydown", onKey);
    S.ro = new ResizeObserver(resize); S.ro.observe(S.host);
    S.todTimer = setInterval(function () { if (todOf(new Date().getHours()) !== S.tod) { applyLighting(); requestRender(); } }, 60000);
    S.mounted = true;
    resize();
  }

  function showFatal(err) {
    var host = document.getElementById("pixelCity3d");
    if (S.loadingEl && S.loadingEl.parentNode) { S.loadingEl.parentNode.removeChild(S.loadingEl); S.loadingEl = null; }
    if (host) { var p = el("p", "c3-fatal", "3D şehir açılamadı: " + (err && err.message || err) + ". Tarayıcın WebGL'i desteklemiyor olabilir; sayfayı yenilemeyi dene."); host.appendChild(p); }
    toast("3D şehir açılamadı: " + (err && err.message || err));
  }

  // Şehir ekranı ilk görününce (ya da küçük resim istenince) başlatılır.
  function start() {
    if (S.started) return S.started;
    var h = document.getElementById("pixelCity3d");
    if (h && !S.loadingEl) { S.loadingEl = el("p", "c3-fatal", "3D şehir yükleniyor…"); h.appendChild(S.loadingEl); }
    S.started = loadThree().then(function () {
      if (document.getElementById("pixelCity3d") && !S.mounted) mount();
      return rebuild(true);
    }).catch(function (err) { S.started = null; showFatal(err); });
    return S.started;
  }

  var refreshTimer = 0;
  function refresh() { if (!S.mounted) return; clearTimeout(refreshTimer); refreshTimer = setTimeout(function () { rebuild(); }, 150); }
  function refreshNow() { if (!S.mounted) return; updateOverlays(); requestRender(); }

  // ---- Pazar küçük resimleri: her tür bir kez, ayrı küçük çizici ile ----
  var thumbCache = {}, thumbQueue = Promise.resolve(), thumbCtx = null;
  function renderThumb(name) {
    var T = S.T, type = cityTypeOf({ name: name });
    var b = { id: "thumb-" + name, name: name, rot: 0 };
    if (!thumbCtx) {
      var cv = document.createElement("canvas");
      var r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(128, 128, false);
      var sc = new T.Scene(), hemi = new T.HemisphereLight(0xffffff, 0x9aa8b4, 1.5), sun = new T.DirectionalLight(0xfff4e0, 2.4);
      sun.position.set(4, 8, 5); sc.add(hemi); sc.add(sun);
      var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
      thumbCtx = { cv: cv, r: r, sc: sc, cam: cam };
    }
    var dispose = [], g = thumbCtx;
    var holderP = (type && type.road)
      ? loadModel(ROAD_FILE.cross).then(function (obj) { var h = new T.Group(); h.add(obj); return h; })
      : makeHolder(T, loadModel, b, type, dispose, { thumb: true });
    return holderP.then(function (holder) {
      g.sc.add(holder);
      var box = new T.Box3().setFromObject(holder), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      var half = Math.max(size.x, size.y, size.z) * 0.78 + 0.05, az = 0.65, el = 0.6, d = 10;
      g.cam.left = -half; g.cam.right = half; g.cam.top = half; g.cam.bottom = -half;
      g.cam.position.set(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
      g.cam.lookAt(c.x, c.y, c.z); g.cam.updateProjectionMatrix();
      g.r.setClearColor(0x000000, 0); g.r.render(g.sc, g.cam);
      var data = g.cv.toDataURL("image/png");
      g.sc.remove(holder);
      dispose.forEach(function (d2) { if (d2 && d2.dispose) d2.dispose(); });
      return data;
    });
  }
  function thumbFor(name) {
    if (!thumbCache[name]) {
      thumbCache[name] = thumbQueue = thumbQueue.then(function () { return start(); }).then(function () { return S.T ? renderThumb(name) : null; }).catch(function () { return null; });
    }
    return thumbCache[name];
  }
  // root içindeki [data-thumb="Tür adı"] öğelerine küçük resim koyar (emoji, resim hazır olana kadar kalır)
  function fillThumbs(root) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-thumb]"), function (node) {
      thumbFor(node.getAttribute("data-thumb")).then(function (data) {
        if (data && node.parentNode) node.innerHTML = '<img src="' + data + '" alt="" style="width:56px;height:56px;object-fit:contain;">';
      });
    });
  }

  if (typeof document !== "undefined" && document.getElementById) {
    var host0 = document.getElementById("pixelCity3d");
    if (host0 && typeof IntersectionObserver !== "undefined") {
      S.io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) start(); });
      S.io.observe(host0);
    }
  }

  return {
    start: start, refresh: refresh, refreshNow: refreshNow, resetView: resetView, thumbFor: thumbFor, fillThumbs: fillThumbs,
    isReady: function () { return S.mounted; },
    // test için
    _init: function (T, GLTFLoaderClass) { S.T = T; S.loader = new GLTFLoaderClass(); S.ray = new T.Raycaster(); S.plane = new T.Plane(new T.Vector3(0, 1, 0), 0); },
    _state: S, _buildCity: buildCity, _planScenery: planScenery, _roadPieceFor: roadPieceFor, _ROAD_BASE: ROAD_BASE, _TYPES: TYPES, _ROAD_FILE: ROAD_FILE, _todOf: todOf,
    _variantIndex: variantIndex, _cellFromPoint: cellFromPoint, _makeHolder: makeHolder, _citySig: citySig, _applyCamera: applyCamera, _panBy: panBy,
    _onDown: onDown, _onMove: onMove, _onUp: onUp, _onWheel: onWheel, _onKey: onKey, _groundPoint: groundPoint, _mount: mount, _rebuild: rebuild, _VIEW: VIEW
  };
})();

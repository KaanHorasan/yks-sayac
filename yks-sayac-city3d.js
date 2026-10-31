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
    "Araba (Kırmızı)": { m: ["car/sedan"], fixed: 0.17 },
    "Araba (Mavi)": { m: ["car/hatchback-sports"], fixed: 0.17 },
    "Kamyon": { m: ["car/truck"], fixed: 0.16 },
    "Yemek Aracı": { m: ["car/delivery"], fixed: 0.16 },
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

  // ---- Şehir hayatı (v3.18.0): yollarda araba, kaldırımlarda yürüyen karakterler ----
  // Aşağıdaki bölüm saftır (THREE'ye bağlı değil); testte doğrudan çalıştırılır. Birim: ızgara karesi (1 = bir kare).
  var DIRS4 = ["N", "E", "S", "W"];
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };   // N=-Z (gy-1), E=+X, S=+Z, W=-X
  var OPP = { N: "S", E: "W", S: "N", W: "E" };
  var LIFE = {
    ext: 5,                                  // giriş yolunun dışarıya uzanan kare sayısı (sahne dışı doğma/kaybolma noktası)
    carScale: 0.17, pedScale: 0.12,          // model ölçekleri (araba ≈0,45 kare uzunluk, yaya ≈0,32 kare boy)
    carLane: 0.15, pedLane: 0.47,            // yol ekseninden yan uzaklık: araba şeridi / kaldırım şeridi (sağdan gidiş)
    carSpeed: [0.55, 0.85], pedSpeed: [0.2, 0.32],
    cars: ["car/sedan", "car/taxi", "car/van", "car/suv", "car/hatchback-sports", "car/delivery", "car/police", "car/sedan-sports", "car/suv-luxury", "car/ambulance", "car/garbage-truck"],
    peds: ["chr/character-a", "chr/character-c", "chr/character-e", "chr/character-g", "chr/character-i", "chr/character-k", "chr/character-m", "chr/character-o", "chr/character-q", "chr/character-r"]
  };
  function rightOf(d) { var v = DV[d]; return [-v[1], v[0]]; }   // hareket yönünün sağ eli (X doğu, Z güney)
  function nodeKey(gx, gy) { return gx + "," + gy; }

  // Bir karede din yönünde girip dout yönünde çıkan şerit eğrisi (yerel koordinat: kare merkezi 0,0). Kübik Bezier + yay uzunluğu tablosu.
  function laneCurve(din, dout, L) {
    var vi = DV[din], vo = DV[dout], ri = rightOf(din), ro = rightOf(dout);
    var p0 = [-vi[0] * 0.5 + ri[0] * L, -vi[1] * 0.5 + ri[1] * L];   // giriş: hareket yönünün tersi kenar
    var p3 = [vo[0] * 0.5 + ro[0] * L, vo[1] * 0.5 + ro[1] * L];
    var k = din === dout ? 0.33 : (OPP[din] === dout ? 0.55 : 0.35);
    var p1 = [p0[0] + vi[0] * k, p0[1] + vi[1] * k], p2 = [p3[0] - vo[0] * k, p3[1] - vo[1] * k];
    var pts = [], lens = [0], N = 14, total = 0, prev = null;
    for (var i = 0; i <= N; i++) {
      var t = i / N, u = 1 - t;
      var x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      var z = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      pts.push([x, z]);
      if (prev) { total += Math.sqrt((x - prev[0]) * (x - prev[0]) + (z - prev[1]) * (z - prev[1])); lens.push(total); }
      prev = [x, z];
    }
    return { pts: pts, lens: lens, len: total };
  }
  var curveCache = {};
  function curveFor(din, dout, L) { var k = din + dout + L; return curveCache[k] || (curveCache[k] = laneCurve(din, dout, L)); }
  function curveAt(c, s) {   // yay uzunluğu s'deki konum ve birim teğet
    s = Math.max(0, Math.min(c.len, s));
    var i = 1; while (i < c.lens.length - 1 && c.lens[i] < s) i++;
    var a = c.pts[i - 1], b = c.pts[i], l0 = c.lens[i - 1], l1 = c.lens[i], f = l1 > l0 ? (s - l0) / (l1 - l0) : 0;
    var dx = b[0] - a[0], dz = b[1] - a[1], m = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: a[0] + dx * f, z: a[1] + dz * f, tx: dx / m, tz: dz / m };
  }

  // cells: [{ gx, gy, dirs, ext? }] yol kareleri. Bağlantısı olmayan (dirs boş) kareler ağa girmez. exitKey: sahne dışı uç kare.
  function buildGraph(cells, exitKey) {
    var nodes = {}, dist = {}, queue = [];
    cells.forEach(function (c) { if (c.dirs.length) nodes[nodeKey(c.gx, c.gy)] = { gx: c.gx, gy: c.gy, dirs: c.dirs.slice(), ext: !!c.ext }; });
    if (exitKey && nodes[exitKey]) { dist[exitKey] = 0; queue.push(exitKey); }
    while (queue.length) {
      var k = queue.shift(), n = nodes[k];
      n.dirs.forEach(function (d) {
        var nk = nodeKey(n.gx + DV[d][0], n.gy + DV[d][1]);
        if (nodes[nk] && dist[nk] === undefined) { dist[nk] = dist[k] + 1; queue.push(nk); }
      });
    }
    return { nodes: nodes, exit: exitKey, dist: dist };
  }

  function simChoose(sim, node, din, a) {   // kavşakta çıkış yönü: geri dönmez (çıkmaz sokak hariç); düz gitmeyi tercih eder; ayrılırken çıkışa en kısa yol
    var back = OPP[din], opts = node.dirs.filter(function (d) { return d !== back; });
    if (!opts.length) return back;
    if (a.leaving) {
      var best = null, bd = 1e9;
      opts.forEach(function (d) {
        var dd = sim.graph.dist[nodeKey(node.gx + DV[d][0], node.gy + DV[d][1])];
        if (dd !== undefined && (dd < bd || (dd === bd && sim.rng() < 0.5))) { bd = dd; best = d; }
      });
      if (best) return best;
    }
    var w = opts.map(function (d) { return d === din ? 3 : 1; }), tot = 0, i;
    for (i = 0; i < w.length; i++) tot += w[i];
    var r = sim.rng() * tot;
    for (i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i]; }
    return opts[opts.length - 1];
  }
  function simPlace(sim, a) {
    var n = sim.graph.nodes[a.key], p = curveAt(a.curve, a.s);
    a.x = n.gx + 0.5 + p.x; a.z = n.gy + 0.5 + p.z; a.hx = p.tx; a.hz = p.tz;
  }
  function simAgent(sim, kind, key, din, s0) {
    var node = sim.graph.nodes[key], L = kind === "car" ? LIFE.carLane : LIFE.pedLane, sp = kind === "car" ? LIFE.carSpeed : LIFE.pedSpeed;
    var list = kind === "car" ? LIFE.cars : LIFE.peds;
    var a = { id: sim.nextId++, kind: kind, model: list[Math.floor(sim.rng() * list.length) % list.length], key: key, din: din, L: L,
              s: 0, leaving: false, blocked: 0, ignore: 0, dead: false, x: 0, z: 0, hx: 0, hz: 1, obj: null, mixer: null, rot: null };
    a.speed = sp[0] + sim.rng() * (sp[1] - sp[0]);
    a.v = a.speed * (kind === "car" ? 0.6 : 1);
    a.budget = (kind === "car" ? 10 : 8) + Math.floor(sim.rng() * 14);   // bu kadar kavşak dolaştıktan sonra çıkışa yönelir
    a.dout = simChoose(sim, node, din, a);
    a.curve = curveFor(din, a.dout, L);
    a.s = Math.min(a.curve.len, (s0 || 0) * a.curve.len);
    simPlace(sim, a);
    sim.agents.push(a);
    if (sim.onSpawn) sim.onSpawn(a);
    return a;
  }
  function createSim(graph, opt) {
    opt = opt || {};
    var sim = { graph: graph, agents: [], nextId: 1, rng: opt.rng || Math.random, target: { car: 0, ped: 0 }, spawnIn: { car: 0, ped: 0 }, onSpawn: null, onRemove: null };
    return sim;
  }
  function simPopulate(sim) {   // yolların üstüne rastgele dağıtır (şehir ilk anda boş görünmesin)
    var keys = Object.keys(sim.graph.nodes).filter(function (k) { var n = sim.graph.nodes[k]; return !n.ext && n.dirs.length; });
    if (!keys.length) return;
    ["car", "ped"].forEach(function (kind) {
      for (var i = 0; i < sim.target[kind]; i++) {
        for (var tries = 0; tries < 12; tries++) {   // başka araçla üst üste gelen noktayı reddet
          var key = keys[Math.floor(sim.rng() * keys.length) % keys.length], n = sim.graph.nodes[key];
          var enter = n.dirs[Math.floor(sim.rng() * n.dirs.length) % n.dirs.length];   // bu kenardan girmiş say
          var a = simAgent(sim, kind, key, OPP[enter], sim.rng()), clash = false;
          if (kind === "car") sim.agents.forEach(function (o) { if (o !== a && o.kind === "car" && (o.x - a.x) * (o.x - a.x) + (o.z - a.z) * (o.z - a.z) < 0.36) clash = true; });
          if (!clash) break;
          sim.agents.pop(); if (sim.onRemove) sim.onRemove(a);
        }
      }
    });
  }
  function simCount(sim, kind) { var c = 0; sim.agents.forEach(function (a) { if (a.kind === kind) c++; }); return c; }
  function simStep(sim, dt) {
    var g = sim.graph, i, a;
    for (i = 0; i < sim.agents.length; i++) {
      a = sim.agents[i];
      if (a.kind === "car") {
        var target = a.speed;
        if (a.ignore > 0) a.ignore -= dt;
        else {
          var blocked = false;
          for (var j = 0; j < sim.agents.length; j++) {
            var b = sim.agents[j];
            if (b === a || b.kind !== "car") continue;
            var dx = b.x - a.x, dz = b.z - a.z, fwd = dx * a.hx + dz * a.hz, lat = Math.abs(dx * a.hz - dz * a.hx);
            if (fwd > 0.02 && fwd < 0.5 && lat < 0.2) { blocked = true; break; }
          }
          if (blocked) { a.blocked += dt; target = 0; if (a.blocked > 2.5) { a.ignore = 3; a.blocked = 0; } } else a.blocked = 0;
        }
        a.v += Math.max(-4 * dt, Math.min(1.5 * dt, target - a.v));
      } else a.v = a.speed;
      a.s += a.v * dt;
      while (!a.dead && a.s >= a.curve.len) {
        var n = g.nodes[a.key], nk = nodeKey(n.gx + DV[a.dout][0], n.gy + DV[a.dout][1]);
        a.s -= a.curve.len;
        if (nk === g.exit || !g.nodes[nk]) { a.dead = true; break; }
        a.key = nk; a.din = a.dout; a.budget--;
        if (a.budget <= 0) a.leaving = true;
        a.dout = simChoose(sim, g.nodes[nk], a.din, a);
        a.curve = curveFor(a.din, a.dout, a.L);
      }
      if (!a.dead) simPlace(sim, a);
    }
    sim.agents = sim.agents.filter(function (x) { if (x.dead && sim.onRemove) sim.onRemove(x); return !x.dead; });
    if (g.exit && g.nodes[g.exit]) {
      ["car", "ped"].forEach(function (kind) {
        if (simCount(sim, kind) >= sim.target[kind]) return;
        sim.spawnIn[kind] -= dt;
        if (sim.spawnIn[kind] > 0) return;
        var en = g.nodes[g.exit], ex = en.gx + 0.5, ez = en.gy + 0.5 + 0.5, free = true;   // doğma noktası yakınında başka bir araç varsa bekle
        sim.agents.forEach(function (o) { if (o.kind === kind && Math.abs(o.x - ex) < 0.8 && Math.abs(o.z - ez) < 0.8) free = false; });
        if (!free) { sim.spawnIn[kind] = 0.5; return; }
        simAgent(sim, kind, g.exit, "N", 0);
        sim.spawnIn[kind] = kind === "car" ? 1.5 + sim.rng() * 3 : 2 + sim.rng() * 4;
      });
    }
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

  // ---- Süs bitki örtüsü: kaydedilmez; öğrenci başına sabit rastgele ----
  // [model, ölçek]: Kenney Nature Kit 1 birim = 1 kare ölçeğindedir; ağaçlar evlerle orantılı küçültülür, çalı/kaya büyütülür.
  var SC = {   // yapılabilir bölgenin içi (seyrek, hafif); model çeşitliliği çizim çağrısı sayısını sınırlamak için kısıtlı
    tree: [["nat/tree_default", 0.7], ["nat/tree_oak", 0.75], ["nat/tree_fat", 0.8], ["nat/tree_pineDefaultA", 0.7],
           ["nat/tree_pineTallA", 0.65], ["nat/tree_small", 0.85], ["nat/tree_default_fall", 0.7], ["nat/tree_oak_fall", 0.75]],
    bush: [["nat/plant_bush", 1.2], ["nat/plant_bushDetailed", 1], ["nat/plant_bushLarge", 1.2], ["nat/plant_bushSmall", 1.3]],
    flower: [["nat/flower_redA", 1.6], ["nat/flower_redB", 1.6], ["nat/flower_yellowA", 1.6], ["nat/flower_yellowB", 1.6], ["nat/flower_purpleA", 1.6], ["nat/flower_purpleB", 1.6]],
    grass: [["nat/grass", 1.2], ["nat/grass_large", 1.1], ["nat/grass_leafs", 1.4]],
    rock: [["nat/rock_smallA", 1.1], ["nat/rock_smallC", 1.3], ["nat/stone_smallA", 1.1], ["nat/rock_smallFlatA", 1.4]],
    misc: [["nat/mushroom_red", 1.7], ["nat/mushroom_redGroup", 1.5], ["nat/log", 1.2], ["nat/stump_round", 1.1]]
  };
  var SCW = {   // vahşi bölge: büyük çalılar ve kayalar
    bushBig: [["nat/plant_bushLarge", 2.4], ["nat/plant_bushDetailed", 2.2], ["nat/plant_bush", 2.4], ["nat/plant_bushLargeTriangle", 2.6], ["nat/plant_bushSmall", 2.6]],
    rockBig: [["nat/rock_largeA", 0.8], ["nat/rock_largeB", 0.8], ["nat/rock_largeD", 0.7], ["nat/rock_largeF", 0.8],
              ["nat/stone_largeC", 0.8], ["nat/rock_tallB", 0.7], ["nat/rock_tallC", 0.9], ["nat/stone_tallA", 0.65]],
    rockSmall: [["nat/rock_smallA", 1.4], ["nat/rock_smallB", 1.6], ["nat/rock_smallC", 1.4], ["nat/stone_smallA", 1.4]],
    flat: [["nat/plant_flatTall", 1.6], ["nat/plant_flatShort", 1.6], ["nat/grass_large", 1.4]]
  };
  var SCF = {   // dünyanın dışındaki sisli halka (gölgesiz): en az model, en az çizim çağrısı
    tree: [["nat/tree_default", 0.7], ["nat/tree_oak", 0.75], ["nat/tree_pineTallA", 0.65], ["nat/tree_pineDefaultA", 0.7], ["nat/tree_fat", 0.8], ["nat/tree_default_fall", 0.7]],
    bush: [["nat/plant_bushLarge", 2.4], ["nat/plant_bushDetailed", 2.2], ["nat/plant_bushLargeTriangle", 2.6]],
    rock: [["nat/rock_largeA", 0.8], ["nat/rock_largeD", 0.7], ["nat/stone_largeC", 0.8], ["nat/rock_tallB", 0.7]],
    flat: [["nat/plant_flatTall", 1.6], ["nat/grass_large", 1.4]]
  };
  var SC_TREE_IN = 0.05;
  var SC_OTHER_IN = [["bush", 0.06], ["rock", 0.04], ["flower", 0.16], ["grass", 0.12], ["misc", 0.03]];
  var SC_RING = 7;   // dünyanın dışında, sisle kaybolan orman/çalı halkası (gölgesiz)
  function rnd(seed, a, b, c) {   // (tohum, a, b, c) -> [0,1) sabit sahte rastgele
    var h = (seed ^ Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 1, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }
  // Saf: hangi yere hangi süs konur. Dönen: [{ m, x, z, rot, s, far }] (x,z dünya koordinatı). Satır anahtarı ön sıradan sayılır:
  // "yeni mahalle" arkaya satır ekleyince süsler yerinde kalır.
  function planScenery(city, seed) {
    var cols = city.cols, rows = city.rows, main = {}, sub = {}, out = [];
    var zone = city.zone || { x0: 0, x1: cols - 1, y0: 0, y1: rows - 1 }, ent = city.entrance || null;
    city.buildings.forEach(function (b) {
      var type = city.typeOf(b); if (!type) return;
      if (city.isDecor && city.isDecor(b)) { var q = city.subOf(b); if (q) sub[q.sx + "," + q.sy] = true; return; }
      var span = type.span || 1;
      for (var i = 0; i < span; i++) main[(b.gx + i) + "," + b.gy] = true;
    });
    if (ent) main[ent.gx + "," + ent.gy] = true;
    function pick(list, r) { return list[Math.floor(r * list.length) % list.length]; }
    function add(pk, x, z, r1, r2, far) { out.push({ m: pk[0], x: x - cols / 2, z: z - rows / 2, rot: r1 * Math.PI * 2, s: pk[1] * (0.85 + r2 * 0.3), far: !!far }); }
    var gx, gy, i, j;
    for (gy = 0; gy < rows; gy++) for (gx = 0; gx < cols; gx++) {
      if (main[gx + "," + gy]) continue;
      var fy = rows - 1 - gy;
      if (gx >= zone.x0 && gx <= zone.x1 && gy >= zone.y0) {   // yapılabilir bölge: seyrek çiçek / çimen / çalı
        var kind = null;
        if (rnd(seed, gx, fy, 1) < SC_TREE_IN) kind = "tree";
        else {
          var k = rnd(seed, gx, fy, 3), acc = 0;
          for (var t = 0; t < SC_OTHER_IN.length; t++) { acc += SC_OTHER_IN[t][1]; if (k < acc) { kind = SC_OTHER_IN[t][0]; break; } }
        }
        if (!kind) continue;
        var n = 1;
        if (kind === "flower") n = 2 + Math.floor(rnd(seed, gx, fy, 4) * 2);
        else if (kind === "grass") n = 1 + Math.floor(rnd(seed, gx, fy, 4) * 2);
        var base = Math.floor(rnd(seed, gx, fy, 5) * 4);
        for (i = 0; i < n; i++) {
          var slot = (base + i) % 4, sx = gx * 2 + (slot & 1), sy = gy * 2 + (slot >> 1);
          if (sub[sx + "," + sy]) continue;   // bu yarım karede oyuncunun dekoru var
          add(pick(SC[kind], rnd(seed, gx, fy, 20 + i)), (sx + 0.5) / 2 + (rnd(seed, gx, fy, 30 + i) - 0.5) * 0.14, (sy + 0.5) / 2 + (rnd(seed, gx, fy, 40 + i) - 0.5) * 0.14,
              rnd(seed, gx, fy, 50 + i), rnd(seed, gx, fy, 60 + i), false);
        }
      } else {   // vahşi bölge: sık çalılık ve kayalık (kenarda birkaç ağaç)
        var edge = Math.min(gx, cols - 1 - gx, gy, rows - 1 - gy), cnt = 2 + Math.floor(rnd(seed, gx, fy, 71) * 3);
        for (j = 0; j < cnt; j++) {
          var r = rnd(seed, gx, fy, 80 + j), lst;
          if (r < 0.40) lst = SCW.bushBig; else if (r < 0.66) lst = SCW.rockBig; else if (r < 0.78) lst = SCW.rockSmall;
          else if (r < 0.90) lst = SCW.flat; else lst = edge <= 1 ? SC.tree : SCW.bushBig;
          add(pick(lst, rnd(seed, gx, fy, 90 + j)), gx + 0.12 + rnd(seed, gx, fy, 100 + j) * 0.76, gy + 0.12 + rnd(seed, gx, fy, 110 + j) * 0.76,
              rnd(seed, gx, fy, 120 + j), rnd(seed, gx, fy, 130 + j), false);
        }
      }
    }
    for (gy = -SC_RING; gy < rows + SC_RING; gy++) for (gx = -SC_RING; gx < cols + SC_RING; gx++) {   // dünyanın dışı
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) continue;
      if (ent && gy >= rows && Math.abs(gx - ent.gx) <= 1) continue;   // dışarı uzanan giriş yolu ve kaldırımı açık kalsın
      var dist = Math.max(-gx, gx - (cols - 1), -gy, gy - (rows - 1)), fy2 = rows - 1 - gy;
      if (rnd(seed, gx + 500, fy2 + 500, 201) >= 0.8 - 0.09 * (dist - 1)) continue;
      var m2 = 1 + (rnd(seed, gx + 500, fy2 + 500, 202) < 0.4 ? 1 : 0);
      for (j = 0; j < m2; j++) {
        var r2 = rnd(seed, gx + 500, fy2 + 500, 203 + j), l2 = r2 < 0.5 ? SCF.tree : (r2 < 0.75 ? SCF.bush : (r2 < 0.9 ? SCF.rock : SCF.flat));
        add(pick(l2, rnd(seed, gx + 500, fy2 + 500, 210 + j)), gx + 0.1 + rnd(seed, gx + 500, fy2 + 500, 220 + j) * 0.8, gy + 0.1 + rnd(seed, gx + 500, fy2 + 500, 230 + j) * 0.8,
            rnd(seed, gx + 500, fy2 + 500, 240 + j), rnd(seed, gx + 500, fy2 + 500, 250 + j), true);
      }
    }
    return out;
  }
  // Süsleri model başına InstancedMesh olarak ekler (yüzlerce süs birkaç çizim çağrısı). Uzak halka gölge düşürmez.
  function addScenery(T, loadModel, group, items, dispose, report) {
    var byModel = {};
    items.forEach(function (it) { var k = (it.far ? "f|" : "n|") + it.m; (byModel[k] = byModel[k] || []).push(it); });
    return Promise.all(Object.keys(byModel).map(function (k) {
      var list = byModel[k], m = list[0].m, far = !!list[0].far;
      return loadModel(m).then(function (obj) {
        obj.updateMatrixWorld(true);
        var box = new T.Box3().setFromObject(obj);
        if (box.isEmpty()) return;
        var center = box.getCenter(new T.Vector3());
        var offset = new T.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);
        var inv = new T.Matrix4().copy(obj.matrixWorld).invert(), up = new T.Vector3(0, 1, 0);
        obj.traverse(function (mesh) {
          if (!mesh.isMesh || !mesh.geometry || !mesh.material) return;
          var rel = mesh.matrixWorld.clone().premultiply(inv);
          var im = new T.InstancedMesh(mesh.geometry, mesh.material, list.length);
          im.castShadow = !far; im.receiveShadow = true; im.frustumCulled = false; im.userData.scenery = true; im.userData.model = m;
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

  // ---- Kaldırım: yolun bağlantısı olmayan kenarlarında, komşu BOŞ kareye 0,22 genişliğinde döşeme şeridi (yolun kendi kaldırımına eklenir) ----
  var PAVE_W = 0.22;
  function planPavement(cells, occMain, inZone, cols, rows) {   // cells: yol kareleri {gx, gy, dirs, ext?}; dönen: [{ x, z, sx, sz }] dünya koordinatı
    var out = [];
    cells.forEach(function (c) {
      if (c.ext) return;
      DIRS4.forEach(function (d) {
        if (c.dirs.indexOf(d) >= 0) return;
        var nx = c.gx + DV[d][0], ny = c.gy + DV[d][1];
        if (!inZone(nx, ny) || occMain[nx + "," + ny]) return;
        var horiz = d === "N" || d === "S";
        out.push({ x: c.gx + 0.5 + DV[d][0] * (0.5 + PAVE_W / 2) - cols / 2, z: c.gy + 0.5 + DV[d][1] * (0.5 + PAVE_W / 2) - rows / 2, sx: horiz ? 1 : PAVE_W, sz: horiz ? PAVE_W : 1 });
      });
    });
    return out;
  }
  function addPavement(T, loadModel, group, strips, dispose, report) {
    if (!strips.length) return Promise.resolve();
    return loadModel("road/tile-low").then(function (obj) {
      obj.updateMatrixWorld(true);
      var inv = new T.Matrix4().copy(obj.matrixWorld).invert(), q = new T.Quaternion();
      obj.traverse(function (mesh) {
        if (!mesh.isMesh || !mesh.geometry || !mesh.material) return;
        var rel = mesh.matrixWorld.clone().premultiply(inv);
        var im = new T.InstancedMesh(mesh.geometry, mesh.material, strips.length);
        im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.userData.pavement = true;
        strips.forEach(function (st, i) {
          var M = new T.Matrix4().compose(new T.Vector3(st.x, 0, st.z), q, new T.Vector3(st.sx, 1, st.sz));
          M.multiply(rel); im.setMatrixAt(i, M);
        });
        im.instanceMatrix.needsUpdate = true;
        group.add(im); dispose.push(im); report.pavement = strips.length;
      });
    }, function () { report.missing.push("road/tile-low"); });
  }

  // ---- Şehir giriş kapısı: giriş yolunun üstünde iki taş sütun, ahşap kiriş ve yazı levhası ----
  function addGate(T, group, dispose, cx, cz, report) {
    var stone = new T.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9, metalness: 0 });
    var wood = new T.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.95, metalness: 0 });
    var pillarGeo = new T.BoxGeometry(0.12, 0.64, 0.12), capGeo = new T.BoxGeometry(0.18, 0.05, 0.18), beamGeo = new T.BoxGeometry(1.0, 0.1, 0.13);
    dispose.push(stone, wood, pillarGeo, capGeo, beamGeo);
    [-0.44, 0.44].forEach(function (dx) {
      var p = new T.Mesh(pillarGeo, stone); p.position.set(cx + dx, 0.32, cz); p.castShadow = true; p.receiveShadow = true; group.add(p);
      var c = new T.Mesh(capGeo, wood); c.position.set(cx + dx, 0.665, cz); c.castShadow = true; group.add(c);
    });
    var beam = new T.Mesh(beamGeo, wood); beam.position.set(cx, 0.6, cz); beam.castShadow = true; beam.receiveShadow = true; group.add(beam);
    var ls = makeTextSprite(T, "Şehre Hoş Geldin", { bg: "rgba(34,64,124,0.96)", fg: "#ffffff", w: 1.1, font: "bold 30px sans-serif" });
    if (ls) { ls.sprite.position.set(cx, 0.8, cz); group.add(ls.sprite); dispose.push.apply(dispose, ls.dispose); }
    report.gate = true;
  }

  // city: { cols, rows, buildings, typeOf(b), isRoad(b), isDecor?(b), subOf?(b), seed?, zone?, entrance? }; loadModel("kit/dosya") -> Promise<Object3D>
  function buildCity(T, loadModel, city) {
    var cols = city.cols, rows = city.rows;
    var group = new T.Group();
    var report = { placed: 0, roads: 0, fallback: 0, missing: [], roadCells: [], sprites: 0, scenery: 0, sceneryMeshes: 0, pavement: 0, gate: false, graph: null, graphReal: 0 };
    var dispose = [];   // bu sahneye özgü kaynaklar (modeller önbellekten klonlandığı için paylaşılan geometriye dokunulmaz)
    var holders = {};
    group.userData.dispose = dispose; group.userData.holders = holders;
    var zone = city.zone || { x0: 0, x1: cols - 1, y0: 0, y1: rows - 1 }, ent = city.entrance || null, EXT = LIFE.ext;
    var inZone = function (gx, gy) { return gx >= zone.x0 && gx <= zone.x1 && gy >= zone.y0 && gy <= zone.y1; };

    // zemin: yapılabilir bölge açık çimen, çevresi koyu vahşi doğa; her şey çok geniş bir düzlemin üstünde (şehir havada durmaz)
    var data = new Uint8Array(cols * rows * 4);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = (r * cols + c) * 4, odd = (r + c) % 2, zn = inZone(c, r);
      data[i] = zn ? (odd ? 126 : 134) : (odd ? 100 : 108); data[i + 1] = zn ? (odd ? 190 : 200) : (odd ? 148 : 156); data[i + 2] = zn ? (odd ? 104 : 110) : (odd ? 84 : 90); data[i + 3] = 255;
    }
    var tex = new T.DataTexture(data, cols, rows, T.RGBAFormat);
    tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.colorSpace = T.SRGBColorSpace; tex.needsUpdate = true;
    var groundGeo = new T.PlaneGeometry(cols, rows), groundMat = new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
    var ground = new T.Mesh(groundGeo, groundMat);
    dispose.push(tex, groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    group.add(ground);
    var farGeo = new T.PlaneGeometry(700, 700), farMat = new T.MeshStandardMaterial({ color: 0x6c9c5a, roughness: 1, metalness: 0 });
    var farGround = new T.Mesh(farGeo, farMat);
    dispose.push(farGeo, farMat);
    farGround.rotation.x = -Math.PI / 2; farGround.position.y = -0.06;
    group.add(farGround);

    var cellX = function (gx, span) { return gx + span / 2 - cols / 2; };
    var cellZ = function (gy) { return gy + 0.5 - rows / 2; };

    var roads = {};
    city.buildings.forEach(function (b) { if (city.isRoad(b)) roads[b.gx + "," + b.gy] = true; });
    var entKey = ent ? ent.gx + "," + ent.gy : null, entReal = !!(ent && roads[entKey]);
    if (ent) for (var kx = 0; kx <= EXT; kx++) roads[ent.gx + "," + (ent.gy + kx)] = true;   // sabit giriş yolu + dışarı uzantısı
    var dirsOf = function (gx, gy) {
      var dirs = [];
      if (roads[gx + "," + (gy - 1)]) dirs.push("N");
      if (roads[(gx + 1) + "," + gy]) dirs.push("E");
      if (roads[gx + "," + (gy + 1)]) dirs.push("S");
      if (roads[(gx - 1) + "," + gy]) dirs.push("W");
      return dirs;
    };

    var jobs = [];
    city.buildings.forEach(function (b) {
      var type = city.typeOf(b);
      if (!type) return;
      var span = type.span || 1;
      if (city.isRoad(b)) {
        var dirs = dirsOf(b.gx, b.gy);
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

    // giriş: sabit yol karesi, dışarı uzanan yol ve kapı
    var graphCells = [];
    if (ent) {
      var roadVisual = function (gx, gy, pk) {
        return loadModel(ROAD_FILE[pk.piece]).then(function (obj) {
          var h = new T.Group(); h.add(obj); h.rotation.y = pk.rot * Math.PI / 2; h.position.set(cellX(gx, 1), 0, cellZ(gy)); group.add(h); report.roads++;
        }, function () { report.missing.push(ROAD_FILE[pk.piece]); });
      };
      var entDirs = dirsOf(ent.gx, ent.gy);
      if (!entReal) { jobs.push(roadVisual(ent.gx, ent.gy, roadPieceFor(entDirs))); graphCells.push({ gx: ent.gx, gy: ent.gy, dirs: entDirs }); }
      var ns = roadPieceFor(["N", "S"]);
      for (var k = 1; k <= EXT; k++) {
        jobs.push(roadVisual(ent.gx, ent.gy + k, ns));
        graphCells.push({ gx: ent.gx, gy: ent.gy + k, dirs: k < EXT ? ["N", "S"] : ["N"], ext: true });
      }
      try { addGate(T, group, dispose, cellX(ent.gx, 1), cellZ(ent.gy) + 0.36, report); } catch (e) { /* kapı yoksa şehir yine kurulur */ }
    }

    return Promise.all(jobs).then(function () {
      report.roadCells.forEach(function (rc) { graphCells.push({ gx: rc.gx, gy: rc.gy, dirs: rc.dirs }); });
      report.graphReal = graphCells.filter(function (g) { return !g.ext && g.dirs.length; }).length;
      report.graph = buildGraph(graphCells, ent ? ent.gx + "," + (ent.gy + EXT) : null);
      var occMain = {};   // yapı ve yol kareleri (dekor sayılmaz): kaldırım şeridi buralara girmez
      city.buildings.forEach(function (b) {
        if (city.isDecor && city.isDecor(b)) return;
        var t = city.typeOf(b); if (!t) return;
        for (var q = 0; q < (t.span || 1); q++) occMain[(b.gx + q) + "," + b.gy] = true;
      });
      if (entKey) occMain[entKey] = true;
      try { return addPavement(T, loadModel, group, planPavement(graphCells, occMain, inZone, cols, rows), dispose, report); } catch (e) { return null; }
    }).then(function () {
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
    T: null, loader: null, cache: {}, anims: {}, started: null, mounted: false,
    renderer: null, scene: null, cam: null, lights: null, host: null, canvas: null, group: null,
    az: VIEW.az, el: VIEW.el, zoom: VIEW.zoom, tx: 0, tz: 0, w: 1, h: 1, raf: 0, ro: null, io: null,
    building: false, again: false, sig: "", tod: "", todTimer: 0, lastReport: null,
    ray: null, plane: null, ptr: {}, ptrCount: 0, gesture: null,
    ghost: null, ghostKey: "", ghostCell: null, ghostDispose: [], lastCell: null, selRing: null, selKey: "", uiKey: "", gridLines: null, gridKey: "", marker: null, markerKey: "",
    toolbar: null, hint: null, hud: null,
    sim: null, agentsGroup: null, life: true, lifeBtn: null, visible: true, animRun: false, animRaf: 0, lastFrame: 0, slowSum: 0, slowN: 0
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
          S.anims[rel] = g.animations || [];
          res(g.scene);
        }, undefined, rej);
      });
    }
    return S.cache[rel].then(function (tpl) { return tpl.clone(true); });
  }

  function realCity() {
    return { cols: CITY_COLS, rows: CITY_ROWS, buildings: cityState.buildings.filter(function (b) { return typeof b.gx === "number" && typeof b.gy === "number"; }),
             typeOf: cityTypeOf, isRoad: cityIsRoad, isDecor: cityIsDecor, subOf: citySubOf, seed: sceneSeed(), zone: cityZone(), entrance: cityEntrance() };
  }
  function sceneSeed() { return hash(typeof currentUserUid !== "undefined" ? currentUserUid : ""); }
  function citySig() {
    return CITY_COLS + "x" + CITY_ROWS + "|" + sceneSeed() + "|" + cityState.buildings.map(function (b) {
      return [b.id, b.name, b.gx, b.gy, b.sx, b.sy, b.rot || 0, b.stars || 0, b.label || "", b.imageKey || ""].join(":");
    }).join(",");
  }

  // ---- Kamera ----
  // Kamera, yapılabilir bölgeyi (çevresinde birkaç kare vahşi alanla) ekrana sığdırır; dünya daha geniştir, kaydırarak görülür.
  function zoneFrame() {
    var z = cityZone(), w = z.x1 - z.x0 + 1 + 6, h = z.y1 - z.y0 + 1 + 4;
    return { w: w, h: h, cz: (z.y0 + z.y1 + 1) / 2 - CITY_ROWS / 2 + 0.5, cx: (z.x0 + z.x1 + 1) / 2 - CITY_COLS / 2 };
  }
  function camDistance() {
    var f = zoneFrame(), r = Math.sqrt(f.w * f.w + f.h * f.h) / 2, t = Math.tan(VIEW.fov * Math.PI / 360);
    var dv = r * 0.85 / t, dh = (f.w / 2 + 0.6) / (t * (S.w / S.h)) * 0.9;
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
  function resetView() { var f = zoneFrame(); S.az = VIEW.az; S.el = VIEW.el; S.zoom = VIEW.zoom; S.tx = f.cx; S.tz = f.cz; applyCamera(); requestRender(); }
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
    S.scene.fog = new T.Fog(c.bg, 120, 260);   // uzaktaki zemin ufukta gökle kaynaşır (şehir havada durmuyor gibi)
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
    if (occId && occId !== "__entrance") return occId;
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
    var zn = cityZone(), step = active ? (cityIsDecor(active) ? 0.5 : 1) : 0, key = step ? step + ":" + CITY_COLS + "x" + CITY_ROWS + ":" + zn.x0 + "-" + zn.x1 + "-" + zn.y0 : "";
    if (key === S.gridKey) return;
    removeGrid();
    if (!step) { requestRender(); return; }
    var T = S.T, pts = [], i;   // çizgiler yalnızca yapılabilir bölgeyi kaplar
    var x0 = zn.x0 - CITY_COLS / 2, x1 = zn.x1 + 1 - CITY_COLS / 2, z0 = zn.y0 - CITY_ROWS / 2, z1 = zn.y1 + 1 - CITY_ROWS / 2;
    for (i = 0; i <= Math.round((x1 - x0) / step); i++) { var x = x0 + i * step; pts.push(x, 0, z0, x, 0, z1); }
    for (i = 0; i <= Math.round((z1 - z0) / step); i++) { var z = z0 + i * step; pts.push(x0, 0, z, x1, 0, z); }
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

  // ---- Şehir hayatı: sahne bağlantısı (arabalar ve yayalar zaman içinde hareket eder) ----
  function readLifePref() {
    var v = null;
    try { v = localStorage.getItem("yks-city-life"); } catch (e) { /* depolama kapalı olabilir */ }
    if (v === "0") return false;
    if (v === "1") return true;
    return !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function clearLife() {
    if (S.sim) { S.sim.onSpawn = null; S.sim.onRemove = null; }
    if (S.agentsGroup) while (S.agentsGroup.children.length) S.agentsGroup.remove(S.agentsGroup.children[0]);
    S.sim = null;
  }
  function placeAgentObj(a, dt) {
    if (!a.obj) return;
    a.obj.position.set(a.x - CITY_COLS / 2, 0.02, a.z - CITY_ROWS / 2);
    var target = Math.atan2(a.hx, a.hz);   // modeller +Z'ye bakar
    if (a.rot === null || a.kind === "car") a.rot = target;
    else { var d = Math.atan2(Math.sin(target - a.rot), Math.cos(target - a.rot)); a.rot += d * Math.min(1, dt * 10); }
    a.obj.rotation.y = a.rot;
    if (a.mixer && dt) a.mixer.update(dt);
  }
  function attachAgent(a, sim) {
    var T = S.T;
    loadModel(a.model).then(function (obj) {
      if (a.dead || S.sim !== sim || !S.agentsGroup) return;
      var root = new T.Group();
      obj.scale.setScalar(a.kind === "car" ? LIFE.carScale : LIFE.pedScale); root.add(obj);
      a.obj = root; S.agentsGroup.add(root);
      if (a.kind === "ped") {
        var walk = (S.anims[a.model] || []).filter(function (c) { return c.name === "walk"; })[0];
        if (walk) { a.mixer = new T.AnimationMixer(obj); var act = a.mixer.clipAction(walk); act.play(); act.time = Math.random() * walk.duration; a.mixer.timeScale = a.speed / 0.28; }
      }
      placeAgentObj(a, 0); requestRender();
    }, function () { /* model yoksa ajan görünmez kalır */ });
  }
  function startLife(report) {
    clearLife();
    if (!S.life || !report || !report.graph || !report.graph.exit) { updateAnim(); return; }
    var sim = createSim(report.graph), n = report.graphReal || 0;
    sim.target.car = clamp(Math.round(n / 5), 1, 6);
    sim.target.ped = clamp(Math.round(n / 2.5), 2, 10);
    sim.onSpawn = function (a) { attachAgent(a, sim); };
    sim.onRemove = function (a) { if (a.obj && a.obj.parent) a.obj.parent.remove(a.obj); a.obj = null; a.mixer = null; };
    S.sim = sim; simPopulate(sim); updateAnim();
  }
  function setLife(on, auto) {
    S.life = !!on;
    try { localStorage.setItem("yks-city-life", S.life ? "1" : "0"); } catch (e) { /* önemli değil */ }
    if (S.lifeBtn) S.lifeBtn.textContent = S.life ? "🚗" : "🚫";
    if (S.life) startLife(S.lastReport); else { clearLife(); updateAnim(); }
    if (auto) toast("Şehir hayatı bu cihazda yavaşladığı için kapatıldı. 🚫 düğmesiyle yeniden açabilirsin.");
    requestRender();
  }
  function lifeTick(now) {
    S.animRaf = 0;
    if (!S.animRun || !S.sim) return;
    S.animRaf = requestAnimationFrame(lifeTick);
    var gap = now - S.lastFrame;
    if (gap < 30) return;   // ≈30 kare/sn
    S.lastFrame = now;
    if (gap < 400) {   // yavaş cihaz koruması: 90 karenin ortalaması 55 ms'yi aşarsa şehir hayatını kapat
      S.slowSum += gap; S.slowN++;
      if (S.slowN >= 90) { if (S.slowSum / S.slowN > 55) { setLife(false, true); return; } S.slowSum = 0; S.slowN = 0; }
    }
    var dt = Math.min(0.1, gap / 1000);
    simStep(S.sim, dt);
    S.sim.agents.forEach(function (a) { placeAgentObj(a, dt); });
    render();
  }
  function updateAnim() {
    var want = !!(S.mounted && S.sim && S.sim.agents.length && S.life && S.visible && !(typeof document !== "undefined" && document.hidden));
    if (want && !S.animRun) {
      S.animRun = true; S.slowSum = 0; S.slowN = 0; S.lastFrame = (typeof performance !== "undefined" ? performance.now() : 0);
      S.animRaf = requestAnimationFrame(lifeTick);
    } else if (!want && S.animRun) {
      S.animRun = false;
      if (S.animRaf) { cancelAnimationFrame(S.animRaf); S.animRaf = 0; }
    }
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
      applyCamera(); updateOverlays(); startLife(res.report); requestRender();
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
    S.agentsGroup = new T.Group(); S.scene.add(S.agentsGroup);
    S.life = readLifePref();
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
    S.lifeBtn = btn(S.life ? "🚗" : "🚫", "", function () { setLife(!S.life); }); S.lifeBtn.title = "Şehir hayatı (araba ve yayalar): aç / kapat"; S.hud.appendChild(S.lifeBtn);
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
    document.addEventListener("visibilitychange", updateAnim);
    var f0 = zoneFrame(); S.tx = f0.cx; S.tz = f0.cz;
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
      S.io = new IntersectionObserver(function (es) { var vis = es.some(function (e) { return e.isIntersecting; }); S.visible = vis; if (vis) start(); updateAnim(); });
      S.io.observe(host0);
    }
  }

  return {
    start: start, refresh: refresh, refreshNow: refreshNow, resetView: resetView, thumbFor: thumbFor, fillThumbs: fillThumbs,
    isReady: function () { return S.mounted; },
    // test için
    _init: function (T, GLTFLoaderClass) { S.T = T; S.loader = new GLTFLoaderClass(); S.ray = new T.Raycaster(); S.plane = new T.Plane(new T.Vector3(0, 1, 0), 0); },
    _startLife: startLife, _setLife: setLife, _zoneFrame: zoneFrame, _life: { buildGraph: buildGraph, createSim: createSim, simPopulate: simPopulate, simStep: simStep, simCount: simCount, simAgent: simAgent, laneCurve: laneCurve, curveAt: curveAt, LIFE: LIFE, DV: DV, OPP: OPP },
    _state: S, _buildCity: buildCity, _planScenery: planScenery, _planPavement: planPavement, _roadPieceFor: roadPieceFor, _ROAD_BASE: ROAD_BASE, _TYPES: TYPES, _ROAD_FILE: ROAD_FILE, _todOf: todOf,
    _variantIndex: variantIndex, _cellFromPoint: cellFromPoint, _makeHolder: makeHolder, _citySig: citySig, _applyCamera: applyCamera, _panBy: panBy,
    _onDown: onDown, _onMove: onMove, _onUp: onUp, _onWheel: onWheel, _onKey: onKey, _groundPoint: groundPoint, _mount: mount, _rebuild: rebuild, _VIEW: VIEW
  };
})();

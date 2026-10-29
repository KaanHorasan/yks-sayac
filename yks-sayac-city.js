// ============================================================================
// YKS Sayaç — Şehrim: yerleşim ızgarası, pazar, satın alma, sahne ve görünüm
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

var cityState = { buildings: [], coins: 0, debuffSessionsLeft: 0, layoutV: 2 };
function cityKey() { return "focus-city"; }
function loadCity() {
  return storageGet(cityKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        if (parsed && Array.isArray(parsed.buildings)) {
          if (typeof parsed.coins !== "number") parsed.coins = 0;
          if (typeof parsed.debuffSessionsLeft !== "number") parsed.debuffSessionsLeft = 0;
          cityApplyRows(parsed);   // kayıtlı genişleme kadar sıra; yerleşim düzeltmesinden ÖNCE
          return normalizeCityLayout(cityMigrateLayout(cityMigrateRemoved(parsed)));
        }
      } catch (e) {}
    }
    return { buildings: [], coins: 0, debuffSessionsLeft: 0, layoutV: CITY_LAYOUT_V };
  });
}
// Depodan yükleme tamamlanmadan ilerleme (seviye/rozet) ödülü verilmez: boş varsayılan durum gerçek şehrin üzerine yazılmasın.
var cityLoadedOnce = false;
var loadCityRaw = loadCity;
loadCity = function () {
  return loadCityRaw().then(function (state) { cityLoadedOnce = true; return state; });
};
// ---- Şehir seviyeleri (nüfusa göre), seri rozetleri, hedef bina ----
var CITY_LEVELS = [
  { name: "Köy", emoji: "🏡", pop: 0, bonus: 0 },
  { name: "Kasaba", emoji: "🏘️", pop: 80, bonus: 10 },
  { name: "Şehir", emoji: "🏙️", pop: 300, bonus: 30 },
  { name: "Metropol", emoji: "🌆", pop: 800, bonus: 80 },
  { name: "Megakent", emoji: "🌃", pop: 1800, bonus: 150 }
];
var CITY_STREAK_MILESTONES = [
  { days: 7, bonus: 10 }, { days: 14, bonus: 25, joker: true }, { days: 30, bonus: 60 }, { days: 60, bonus: 150, joker: true }, { days: 100, bonus: 300 }
];
// ---- Aşama 2: günlük görevler, süre dışı ödüller, seri kalkanı, yumuşak ceza, anlık geri bildirim ----
// Tüm ödül sayıları tek yerde (ekonomiyi dengelemek için buradan ayarla).
var CITY_REWARDS = {
  topic: 0.3, topicCap: 4,                 // tamamlanan konu başına altın, günlük en çok kaç konu
  review: 0.1, reviewCap: 10,              // hata çözümü / başarılı tekrar başına altın, günlük sınır
  examFirst: 1, examPerNet: 0.5, examMax: 6, examRecord: 2,   // deneme: ilk kayıt, net artışı başına, tavan, kişisel rekor
  jokerCost: 20, jokerMax: 2,              // seri kalkanı fiyatı ve en çok kaç tane
  debuffRecoveryMin: 25,                   // odak cezası bu kadar dakika çalışınca kalkar
  surprise: [ { min: 25, lo: 0.2, hi: 0.5 }, { min: 50, lo: 0.4, hi: 0.8 }, { min: 90, lo: 0.8, hi: 1.6 } ],  // kesintisiz çalışma sürprizleri
  chest: { lo: 1, hi: 3, jackpot: 5, jackpotChance: 0.15 }
};
var CITY_QUEST_POOL = [
  { id: "study60", kind: "study", need: 60, text: "60 dk çalış", reward: 0.5 },
  { id: "study120", kind: "study", need: 120, text: "120 dk çalış", reward: 1 },
  { id: "focus1", kind: "focus", need: 1, text: "1 odak seansını tamamla", reward: 1 },
  { id: "mistake3", kind: "mistake", need: 3, text: "3 hatayı çöz / tekrar et", reward: 0.5 },
  { id: "topic2", kind: "topic", need: 2, text: "2 konuyu tamamla", reward: 0.5 }
];
var citySessionGold = 0;
function cityFmtGold(g) { return String(roundCoins(g)).replace(".", ","); }
function cityHash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
function cityQuestDef(id) { return CITY_QUEST_POOL.filter(function (q) { return q.id === id; })[0]; }
function cityPickQuests(dateKey) {   // her gün 3 görev: 1 çalışma süresi + (odak / hata / konu) içinden 2'si; aynı gün her cihazda aynı
  var h = cityHash(dateKey), others = ["focus1", "mistake3", "topic2"];
  others.splice(h % 3, 1);
  return [(h % 2) ? "study120" : "study60"].concat(others);
}
function cityQuestsEnsure() {
  var today = dateStr(new Date());
  if (!cityState.quests || cityState.quests.date !== today) {
    cityState.quests = { date: today, ids: cityPickQuests(today), done: {}, p: { focus: 0, mistake: 0 }, chest: null };
  }
  return cityState.quests;
}
function cityDailyEnsure() {
  var today = dateStr(new Date());
  if (!cityState.daily || cityState.daily.date !== today) cityState.daily = { date: today, topics: 0, reviews: 0, exam: false, paid: {} };
  return cityState.daily;
}
function cityTodayStudySeconds() {
  var t = 0, subs = (typeof studyState !== "undefined" && studyState.subjects) || {};
  Object.keys(subs).forEach(function (k) { t += subs[k] || 0; });
  return t + (typeof elapsedRunningSeconds === "function" ? elapsedRunningSeconds() : 0);
}
function cityQuestProgress(def) {
  var qs = cityQuestsEnsure();
  if (def.kind === "study") return Math.floor(cityTodayStudySeconds() / 60);
  if (def.kind === "focus") return qs.p.focus || 0;
  if (def.kind === "mistake") return qs.p.mistake || 0;
  if (def.kind === "topic") return (typeof todayTopics !== "undefined" ? todayTopics : []).filter(function (t) { return t.done; }).length;
  return 0;
}
// Küçük "+0,1 🪙" uçuşu: altın kazanıldığını anında hissettirir.
function cityFloat(text) {
  if (typeof document === "undefined" || !document.body) return;
  var anchor = document.querySelector(".stopwatch-card") || document.getElementById("cityStats");
  var el = document.createElement("div");
  el.className = "city-float";
  el.textContent = text;
  var r = anchor && anchor.offsetParent !== null ? anchor.getBoundingClientRect() : null;
  el.style.left = (r ? r.left + r.width / 2 : window.innerWidth / 2) + "px";
  el.style.top = (r ? r.top + 12 : 90) + "px";
  document.body.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
}
function cityAward(gold, quiet) {
  if (!cityLoadedOnce || !(gold > 0)) return;
  cityState.coins = roundCoins((cityState.coins || 0) + gold);
  saveCity();
  renderCity();
  if (!quiet) cityFloat("+" + cityFmtGold(gold) + " 🪙");
}
function cityQuestTick() {
  var out = { changed: false, msgs: [] };
  var qs = cityQuestsEnsure();
  qs.ids.forEach(function (id) {
    if (qs.done[id]) return;
    var def = cityQuestDef(id);
    if (def && cityQuestProgress(def) >= def.need) {
      qs.done[id] = true;
      cityState.coins = roundCoins((cityState.coins || 0) + def.reward);
      out.msgs.push("✅ Görev tamam: " + def.text + " (+" + cityFmtGold(def.reward) + " altın)");
      out.changed = true;
    }
  });
  if (!qs.chest && qs.ids.every(function (id) { return qs.done[id]; })) {
    qs.chest = { state: "ready" };
    out.msgs.push("🎁 Günlük sandık hazır!");
    out.changed = true;
  }
  return out;
}
function cityOpenChest() {
  var qs = cityQuestsEnsure();
  if (!cityLoadedOnce || !qs.chest || qs.chest.state !== "ready") return;
  var C = CITY_REWARDS.chest, jackpot = Math.random() < C.jackpotChance;
  var gold = jackpot ? C.jackpot : C.lo + Math.floor(Math.random() * (C.hi - C.lo + 1));
  qs.chest = { state: "opened", gold: gold };
  cityState.coins = roundCoins((cityState.coins || 0) + gold);
  saveCity();
  renderCity();
  renderCityViewAll();
  cityCelebrate([jackpot ? "💎 Büyük ödül! Sandıktan " + gold + " altın çıktı" : "🎁 Sandıktan " + gold + " altın çıktı"]);
}
// Konu tamamlama: bugünkü tamamlanan her konu bir kez ödenir (tik atıp kaldırmak tekrar ödemez), günlük sınırlı.
function cityScanTopics() {
  if (!cityLoadedOnce || typeof todayTopics === "undefined") return;
  var d = cityDailyEnsure(), gold = 0;
  todayTopics.forEach(function (t) {
    if (!t.done || d.paid[t.id]) return;
    d.paid[t.id] = true;
    if (d.topics < CITY_REWARDS.topicCap) { d.topics++; gold += CITY_REWARDS.topic; }
  });
  if (gold > 0) { cityAward(gold); }
}
// Hata arşivi: ilk "çözüldü" ve her başarılı tekrar (SRS aralıklı olduğu için tekrar tekrar kasılamaz) + günlük sınır.
function cityOnMistake(kind) {
  if (!cityLoadedOnce) return;
  cityQuestsEnsure().p.mistake++;
  var d = cityDailyEnsure();
  if (d.reviews < CITY_REWARDS.reviewCap) { d.reviews++; cityAward(CITY_REWARDS.review); } else { saveCity(); }
  cityCheckProgress();
}
// Deneme: ilk kayıt, önceki denemeye göre net artışı ve kişisel rekor ödüllendirilir; günde en çok bir kez.
function cityOnExamSaved(record, all) {
  if (!cityLoadedOnce) return;
  var d = cityDailyEnsure();
  if (d.exam) return;
  var R = CITY_REWARDS, gold = 0;
  var prev = (all || []).filter(function (r) { return r.id !== record.id && r.examKey === record.examKey; });
  if (!prev.length) {
    gold = R.examFirst;
  } else {
    prev.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    var last = prev[prev.length - 1];
    var best = Math.max.apply(null, prev.map(function (r) { return r.totalNet; }));
    var delta = record.totalNet - last.totalNet;
    if (delta > 0) gold += Math.min(R.examMax, Math.round(delta * R.examPerNet * 10) / 10);
    if (record.totalNet > best) gold += R.examRecord;
  }
  if (gold > 0) {
    d.exam = true;
    cityAward(gold, true);
    cityCelebrate(["📈 Deneme ödülü: +" + cityFmtGold(gold) + " altın"]);
  }
}
// Seri kalkanı: dün hedef tutmadıysa ve ondan önceki gün seriye dahilse otomatik kullanılır (computeBaseStreak çağırır).
function cityJokerAvailable() { return cityLoadedOnce && (cityState.jokers || 0) > 0; }
function cityJokerProtects(ds) { return (cityState.jokerDays || []).indexOf(ds) >= 0; }
function cityJokerUse(ds) {
  cityState.jokers = Math.max(0, (cityState.jokers || 0) - 1);
  cityState.jokerDays = (cityState.jokerDays || []).concat(ds).slice(-60);
  saveCity();
  renderCityViewAll();
  cityCelebrate(["🛡️ Seri kalkanı dün için kullanıldı, serin korundu!"]);
}
function cityBuyJoker() {
  var R = CITY_REWARDS;
  if (!cityLoadedOnce || (cityState.jokers || 0) >= R.jokerMax || (cityState.coins || 0) < R.jokerCost) return;
  cityState.coins = roundCoins(cityState.coins - R.jokerCost);
  cityState.jokers = (cityState.jokers || 0) + 1;
  saveCity();
  renderCity();
  renderCityViewAll();
  cityCelebrate(["🛡️ Seri kalkanı alındı (" + cityState.jokers + "/" + R.jokerMax + ")"]);
}
function cityWhenLoaded(cb, tries) {
  if (cityLoadedOnce || (tries || 0) > 50) { cb(); return; }
  setTimeout(function () { cityWhenLoaded(cb, (tries || 0) + 1); }, 200);
}
// Kesintisiz çalışma sürprizleri (25 / 50 / 90. dakika); aynı oturum için bir kez (sayfa yenilense de).
function citySurpriseTick() {
  if (!cityLoadedOnce || typeof studyState === "undefined") return;
  if (!studyState.running || !studyState.startTs) return;
  var sp = cityState.surprise;
  if (!sp || sp.startTs !== studyState.startTs) sp = cityState.surprise = { startTs: studyState.startTs, given: {} };
  var mins = (Date.now() - studyState.startTs) / 60000;
  CITY_REWARDS.surprise.forEach(function (s) {
    if (mins >= s.min && !sp.given[s.min]) {
      sp.given[s.min] = true;
      var g = Math.round((s.lo + Math.random() * (s.hi - s.lo)) * 10) / 10;
      citySessionGold += g;
      cityAward(g, true);
      cityCelebrate(["🎁 " + s.min + " dakikadır kesintisiz çalışıyorsun: +" + cityFmtGold(g) + " altın"]);
    }
  });
}
function citySessionSummary(elapsedSec) {
  var gold = citySessionGold;
  citySessionGold = 0;
  if (elapsedSec < 120 || typeof showUpdateToast !== "function") return;
  var parts = ["⏱️ Bu seans: " + cityFmtDuration(elapsedSec / 3600)];
  if (gold > 0) parts.push("+" + cityFmtGold(gold) + " altın");
  var tt = cityLoadedOnce ? cityTargetType() : null;
  if (tt) {
    var rem = Math.max(0, tt.cost - (cityState.coins || 0));
    parts.push(rem <= 0 ? "🎯 " + tt.name + " için altının hazır!" : "🎯 " + tt.name + ": ≈ " + cityFmtDuration(rem / cityStreakMultiplier()) + " kaldı");
  }
  showUpdateToast(parts.join(" · "));
}
function cityLevelFromPop(pop) {
  var lv = 0;
  for (var i = 0; i < CITY_LEVELS.length; i++) if (pop >= CITY_LEVELS[i].pop) lv = i;
  return lv;
}
// Açılan en yüksek seviye: nüfus sonradan düşse bile (yapı satılsa) kilitler geri kapanmaz.
function cityLevelIndex() { return Math.max(cityState.levelClaimed || 0, cityLevelFromPop(cityPopulation())); }
function cityTypeLocked(type) { return (type.minLevel || 0) > cityLevelIndex(); }
function cityTargetType() {
  var name = cityState.target;
  if (!name) return null;
  var t = BUILDING_TYPES.filter(function (x) { return x.name === name; })[0];
  return (t && !t.road && !cityTypeLocked(t)) ? t : null;
}
function citySetTarget(name) {
  cityState.target = (cityState.target === name) ? null : name;
  saveCity();
  renderCityViewAll();
}
function cityCelebrate(msgs) {
  if (!msgs.length) return;
  if (typeof showUpdateToast === "function") showUpdateToast(msgs.join("   ·   "));
  if (typeof triggerCelebrationMessage !== "function") return;
  var seen = [];
  ["cityStats", "pixelCity3d"].forEach(function (id) {
    var el = document.getElementById(id);
    var card = el && el.closest ? el.closest(".dash-card") : null;
    if (card && card.offsetParent !== null && seen.indexOf(card) < 0) { seen.push(card); triggerCelebrationMessage(card, msgs[0]); }
  });
}
// Seviye atlama ve seri rozeti ödülleri: her biri bir kez verilir (levelClaimed / streakClaimed, geri düşmez).
function cityCheckProgress() {
  if (!cityLoadedOnce) return;
  var msgs = [], changed = false;
  var lv = cityLevelFromPop(cityPopulation());
  var claimed = cityState.levelClaimed || 0;
  if (lv > claimed) {
    var bonus = 0;
    for (var i = claimed + 1; i <= lv; i++) bonus += CITY_LEVELS[i].bonus;
    cityState.levelClaimed = lv;
    cityState.coins = roundCoins((cityState.coins || 0) + bonus);
    msgs.push(CITY_LEVELS[lv].emoji + " Şehrin " + CITY_LEVELS[lv].name + " oldu! +" + bonus + " altın");
    changed = true;
  }
  if (typeof streakDisplayedValue === "number") {
    var sc = cityState.streakClaimed || 0, sBonus = 0, sTop = 0, jokerGain = 0;
    CITY_STREAK_MILESTONES.forEach(function (m) {
      if (streakDisplayedValue >= m.days && m.days > sc) { sBonus += m.bonus; sTop = m.days; if (m.joker) jokerGain++; }
    });
    if (sTop) {
      cityState.streakClaimed = sTop;
      cityState.coins = roundCoins((cityState.coins || 0) + sBonus);
      msgs.push("🏅 " + sTop + " günlük seri rozeti! +" + sBonus + " altın");
      if (jokerGain) {
        cityState.jokers = Math.min(CITY_REWARDS.jokerMax, (cityState.jokers || 0) + jokerGain);
        msgs.push("🛡️ Seri kalkanı kazandın!");
      }
      changed = true;
    }
  }
  var q = cityQuestTick();
  if (q.changed) { changed = true; msgs = msgs.concat(q.msgs); }
  cityScanTopics();
  if (changed) {
    saveCity();
    renderCity();
    if (typeof renderCityViewAll === "function") renderCityViewAll();
    cityCelebrate(msgs);
  }
}
// ---- Aşama 3: bina yıldızları (yükseltme), yeni mahalle (ızgara genişletme), canlı şehir, haftalık şehir kartı ----
var CITY_UPGRADE = { maxStars: 2, popBonus: 0.25, costFrac: [0.5, 1.0] };   // her yıldız nüfusu +%25; maliyet = yapı fiyatının 0,5× / 1,0×
var CITY_ROWS_BASE = 12;   // v3.16.0: 5 -> 12 (şehir alanı büyütüldü)
var CITY_EXPANSIONS = [ { cost: 150, level: 2 }, { cost: 400, level: 3 } ];  // her genişleme +2 sıra; Şehir / Metropol seviyesi ister
function cityApplyRows(state) { CITY_ROWS = CITY_ROWS_BASE + 2 * ((state && state.expansions) || 0); }
function cityBuildingPop(b, type) { return Math.round(((type && type.population) || 0) * (1 + CITY_UPGRADE.popBonus * (b.stars || 0))); }
function cityUpgradeCost(type, stars) { return Math.ceil(type.cost * CITY_UPGRADE.costFrac[stars]); }
function cityUpgradeSpent(type, stars) { var t = 0; for (var i = 0; i < stars; i++) t += cityUpgradeCost(type, i); return t; }
function upgradeSelectedCityItem() {
  var b = cityState.buildings.filter(function (x) { return x.id === selectedCityItemId; })[0];
  var type = b ? cityTypeOf(b) : null;
  if (!b || !type || !type.population || (b.stars || 0) >= CITY_UPGRADE.maxStars) return;
  var cost = cityUpgradeCost(type, b.stars || 0);
  if ((cityState.coins || 0) < cost) { if (typeof showUpdateToast === "function") showUpdateToast("⭐ Yükseltmek için " + cost + " altın gerekir (elinde " + cityFmtGold(cityState.coins || 0) + ")."); return; }
  cityState.coins = roundCoins(cityState.coins - cost);
  b.stars = (b.stars || 0) + 1;
  saveCity();
  renderCity();
  renderCityViewAll();
  cityFloat("⭐ " + type.name + " yükseltildi");
}
function cityBuyExpansion() {
  var n = cityState.expansions || 0, ex = CITY_EXPANSIONS[n];
  if (!cityLoadedOnce || !ex || cityActiveItem() || cityLevelIndex() < ex.level || (cityState.coins || 0) < ex.cost) return;
  cityState.coins = roundCoins(cityState.coins - ex.cost);
  cityState.expansions = n + 1;
  cityState.buildings.forEach(function (b) { if (typeof b.gy === "number") b.gy += 2; });   // yeni sıralar arkaya eklenir, mevcut yapılar yerinde kalır
  selectedCityItemId = null;
  cityApplyRows(cityState);
  saveCity();
  renderCity();
  renderCityViewAll();
  cityCelebrate(["🏗️ Yeni mahalle açıldı! (+2 sıra)"]);
}
// Canlı şehir: öğleden sonra hâlâ en az 10 dk çalışılmadıysa şehir "uykulu" görünür (cezasız, sadece hatırlatma).
function cityIsSleepy() { return new Date().getHours() >= 15 && cityTodayStudySeconds() < 600; }
function cityApplySleepy() {
  var scene = document.getElementById("pixelCity3d");
  if (scene && scene.classList) { if (cityIsSleepy()) scene.classList.add("is-sleepy"); else scene.classList.remove("is-sleepy"); }
}
// ---- Haftalık şehir kartı (Canvas ile PNG) ----
var CITY_DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
function cityWeeklyStats() {
  var days = [];
  for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  return Promise.all(days.map(function (d, idx) {
    if (idx === 13) return Promise.resolve(cityTodayStudySeconds());
    return getStudyDaySeconds("study-" + dateStr(d), false);
  })).then(function (secs) {
    var week = secs.slice(7), prev = secs.slice(0, 7);
    var weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    var built = cityState.buildings.filter(function (b) { return b.builtAt && b.builtAt >= weekStart.getTime() && cityTypeOf(b) && !cityIsRoad(b); })
      .map(function (b) { return b.name; });
    return {
      days: days.slice(7), week: week, prevTotal: prev.reduce(function (a, b) { return a + b; }, 0),
      total: week.reduce(function (a, b) { return a + b; }, 0), built: built,
      pop: cityPopulation(), level: CITY_LEVELS[cityLevelIndex()], streak: (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0,
      buildings: cityBuildingCount()
    };
  });
}
function cityDrawWeeklyCard(c, W, H, s) {
  var g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#14213d"); g.addColorStop(1, "#1f4068");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.textAlign = "center"; c.fillStyle = "#ffd166";
  c.font = "700 54px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillText("Haftalık Şehir Raporu", W / 2, 120);
  var a = s.days[0], b = s.days[6];
  c.fillStyle = "rgba(255,255,255,0.7)"; c.font = "400 30px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillText(a.getDate() + "." + (a.getMonth() + 1) + " – " + b.getDate() + "." + (b.getMonth() + 1) + "." + b.getFullYear(), W / 2, 168);
  c.font = "400 150px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif"; c.fillStyle = "#fff";
  c.fillText(s.level.emoji, W / 2, 360);
  c.font = "700 64px 'IBM Plex Sans', 'Segoe UI', sans-serif"; c.fillStyle = "#fff";
  c.fillText(s.level.name, W / 2, 440);
  c.font = "400 34px 'IBM Plex Sans', 'Segoe UI', sans-serif"; c.fillStyle = "rgba(255,255,255,0.8)";
  c.fillText(s.pop + " nüfus · " + s.buildings + " yapı · 🔥 seri " + s.streak, W / 2, 492);
  // 7 günlük sütunlar
  var max = Math.max.apply(null, s.week.concat([3600])), baseY = 880, areaH = 300, bw = 96, gap = 28;
  var x0 = (W - (7 * bw + 6 * gap)) / 2;
  s.week.forEach(function (sec, i) {
    var h = Math.max(6, Math.round(sec / max * areaH)), x = x0 + i * (bw + gap);
    c.fillStyle = sec >= 5400 ? "#ffd166" : "rgba(255,255,255,0.35)";
    c.fillRect(x, baseY - h, bw, h);
    c.fillStyle = "rgba(255,255,255,0.85)"; c.font = "400 26px 'IBM Plex Sans', 'Segoe UI', sans-serif";
    c.fillText(CITY_DAY_NAMES[s.days[i].getDay()], x + bw / 2, baseY + 38);
    if (sec > 0) c.fillText((sec / 3600).toFixed(1).replace(".", ","), x + bw / 2, baseY - h - 12);
  });
  c.fillStyle = "#fff"; c.font = "700 56px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillText("Toplam: " + cityFmtDuration(s.total / 3600), W / 2, 1020);
  var diff = s.total - s.prevTotal;
  c.font = "400 32px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillStyle = diff >= 0 ? "#8ee08e" : "#ffb3b3";
  c.fillText((diff >= 0 ? "▲ " : "▼ ") + cityFmtDuration(Math.abs(diff) / 3600) + " geçen haftaya göre", W / 2, 1066);
  c.fillStyle = "rgba(255,255,255,0.85)"; c.font = "400 32px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillText(s.built.length ? "🏗️ Bu hafta eklenen: " + s.built.slice(0, 5).join(", ") + (s.built.length > 5 ? " +" + (s.built.length - 5) : "") : "🏗️ Bu hafta yeni yapı eklenmedi", W / 2, 1150);
  c.fillStyle = "rgba(255,255,255,0.45)"; c.font = "400 26px 'IBM Plex Sans', 'Segoe UI', sans-serif";
  c.fillText("YKS Sayaç", W / 2, H - 60);
}
function cityShowWeeklyCard() {
  cityWeeklyStats().then(function (stats) {
    var W = 1080, H = 1350, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cityDrawWeeklyCard(cv.getContext("2d"), W, H, stats);
    var url = cv.toDataURL("image/png");
    var ov = document.createElement("div");
    ov.className = "city-card-overlay";
    ov.innerHTML = '<div class="city-card-box"><img alt="Haftalık şehir kartı" src="' + url + '"><div class="city-card-actions">' +
      '<a class="city-meta-btn" download="haftalik-sehir.png" href="' + url + '">⬇️ İndir</a>' +
      '<button type="button" class="city-meta-btn" data-card="share">📤 Paylaş</button>' +
      '<button type="button" class="city-meta-btn" data-card="close">Kapat</button></div></div>';
    ov.addEventListener("click", function (e) {
      var k = e.target && e.target.getAttribute ? e.target.getAttribute("data-card") : null;
      if (k === "close" || e.target === ov) { ov.remove(); return; }
      if (k === "share") {
        cv.toBlob(function (blob) {
          var file = blob && new File([blob], "haftalik-sehir.png", { type: "image/png" });
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "Haftalık şehir raporum" }).catch(function () {});
          else if (typeof showUpdateToast === "function") showUpdateToast("Bu cihaz paylaşmayı desteklemiyor; İndir'i kullan.");
        });
      }
    });
    document.body.appendChild(ov);
  });
}
function cityFmtDuration(h) {
  if (!isFinite(h)) return "—";
  var total = Math.ceil(h * 60);
  if (total < 60) return total + " dk";
  var hh = Math.floor(total / 60), mm = total % 60;
  return hh + " sa" + (mm ? " " + mm + " dk" : "");
}
function cityMetaRow(top, side, pct, ready, extra) {
  return '<div class="city-meta-row"><div class="city-meta-top"><b>' + top + '</b><span>' + side + (extra || "") + '</span></div>' +
    '<div class="city-bar' + (ready ? " is-ready" : "") + '"><i style="width:' + pct + '%"></i></div></div>';
}
function cityQuestsHtml(full) {
  var qs = cityQuestsEnsure();
  var doneN = qs.ids.filter(function (id) { return qs.done[id]; }).length;
  var chestBtn = (qs.chest && qs.chest.state === "ready") ? ' <button type="button" class="city-meta-btn" data-act="open-chest">🎁 Sandığı aç</button>' : "";
  if (!full) return cityMetaRow("📋 Günlük görevler", doneN + "/" + qs.ids.length, Math.round(doneN / qs.ids.length * 100), doneN === qs.ids.length, chestBtn);
  var html = '<div class="city-meta-row"><div class="city-meta-top"><b>📋 Günlük görevler</b><span>' + doneN + "/" + qs.ids.length + chestBtn + '</span></div><ul class="city-quest-list">';
  qs.ids.forEach(function (id) {
    var def = cityQuestDef(id), done = !!qs.done[id];
    var p = Math.min(def.need, cityQuestProgress(def));
    html += '<li class="' + (done ? "is-done" : "") + '"><span>' + (done ? "✅" : "▫️") + " " + def.text + "</span><i>" + p + "/" + def.need + (def.kind === "study" ? " dk" : "") + "</i><em>+" + cityFmtGold(def.reward) + "</em></li>";
  });
  html += "</ul>";
  if (!qs.chest) html += '<div class="city-meta-hint">🎁 Üç görevi de bitirince günlük sandık açılır (1-3 altın, ara sıra büyük ödül).</div>';
  else if (qs.chest.state === "opened") html += '<div class="city-meta-hint">🎁 Sandık açıldı: +' + qs.chest.gold + " altın</div>";
  return html + "</div>";
}
function renderCityMeta() {
  var boxes = ["cityMetaMain", "cityMetaView"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (!boxes.length) return;
  var pop = cityPopulation(), lv = cityLevelIndex();
  var L = CITY_LEVELS[lv], N = CITY_LEVELS[lv + 1];
  var coins = cityState.coins || 0, R = CITY_REWARDS;
  boxes.forEach(function (box) {
    var full = box.id === "cityMetaView";
    var html = "";
    var pct = N ? Math.max(0, Math.min(100, Math.round((pop - L.pop) / (N.pop - L.pop) * 100))) : 100;
    html += cityMetaRow(L.emoji + " " + L.name, N ? (pop + " / " + N.pop + " nüfus · sonraki: " + N.name + " (+" + N.bonus + " altın)") : (pop + " nüfus · en üst seviye"), pct, !N);
    var tt = cityTargetType();
    if (tt) {
      var rem = Math.max(0, tt.cost - coins), rate = cityStreakMultiplier();
      var ready = rem <= 0;
      var info = ready ? "✅ hazır — marketten satın alabilirsin"
        : roundCoins(coins) + " / " + tt.cost + " altın · ≈ " + cityFmtDuration(rem / rate) + " (odakta ≈ " + cityFmtDuration(rem / (rate * 1.5)) + ")";
      html += cityMetaRow("🎯 " + tt.name, info, Math.min(100, Math.round(coins / tt.cost * 100)), ready,
        ' <button type="button" class="city-meta-x" data-act="clear-target" title="Hedefi kaldır">✕</button>');
    } else if (full) {
      html += '<div class="city-meta-hint">🎯 Marketten bir yapıyı <b>hedef</b> seç; çalıştıkça ne kadar kaldığını burada görürsün.</div>';
    }
    if ((cityState.debuffSessionsLeft || 0) > 0) {
      var rec = Math.min(R.debuffRecoveryMin, Math.floor((cityState.debuffRecoveryMs || 0) / 60000));
      html += cityMetaRow("⚠️ Odak cezası", "sonraki ödüllü odak seansı yarım · " + R.debuffRecoveryMin + " dk çalışınca kalkar (" + rec + "/" + R.debuffRecoveryMin + ")", Math.round(rec / R.debuffRecoveryMin * 100), false);
    }
    if (cityIsSleepy()) html += '<div class="city-meta-hint">💤 Şehir seni bekliyor — 10 dakika çalışınca uyanır.</div>';
    html += cityQuestsHtml(full);
    if (typeof streakDisplayedValue === "number" && full) {
      var sv = streakDisplayedValue, mult = cityStreakMultiplier();
      var next = CITY_STREAK_MILESTONES.filter(function (m) { return m.days > sv; })[0];
      var got = CITY_STREAK_MILESTONES.filter(function (m) { return m.days <= (cityState.streakClaimed || 0); }).map(function (m) { return m.days; });
      html += '<div class="city-meta-hint">🔥 Seri ' + sv + ' · altın ×' + mult.toFixed(2).replace(".", ",") +
        (mult < CITY_STREAK_MULT_MAX ? " (tavan ×" + CITY_STREAK_MULT_MAX + " için " + Math.max(0, Math.ceil((CITY_STREAK_MULT_MAX * 20 - 20) - sv)) + " gün)" : " (tavan)") +
        (next ? " · sıradaki rozet: " + next.days + ". gün (+" + next.bonus + " altın" + (next.joker ? " + seri kalkanı" : "") + ")" : "") +
        (got.length ? " · 🏅 " + got.join(" · ") + " gün" : "") + '</div>';
    }
    if (full) {
      var jk = cityState.jokers || 0;
      html += '<div class="city-meta-row"><div class="city-meta-top"><b>🛡️ Seri kalkanı</b><span>' + jk + "/" + R.jokerMax +
        " · bir gün kaçırırsan serin otomatik korunur " +
        '<button type="button" class="city-meta-btn" data-act="buy-joker"' + ((jk >= R.jokerMax || coins < R.jokerCost) ? " disabled" : "") + ">Al · " + R.jokerCost + " altın</button></span></div></div>";
      var exN = cityState.expansions || 0, ex = CITY_EXPANSIONS[exN];
      if (ex) {
        var exLocked = lv < ex.level;
        html += '<div class="city-meta-row"><div class="city-meta-top"><b>🏗️ Yeni mahalle</b><span>' + exN + "/" + CITY_EXPANSIONS.length + " · +2 sıra · " + ex.cost + " altın" +
          (exLocked ? " · 🔒 " + CITY_LEVELS[ex.level].name + " seviyesi" : "") + ' <button type="button" class="city-meta-btn" data-act="buy-expansion"' +
          ((exLocked || coins < ex.cost || cityActiveItem()) ? " disabled" : "") + ">Aç</button></span></div></div>";
      } else html += '<div class="city-meta-hint">🏗️ Tüm mahalleler açık.</div>';
      html += '<div class="city-meta-row"><div class="city-meta-top"><b>🖼️ Haftalık şehir kartı</b><span>paylaşılabilir görsel <button type="button" class="city-meta-btn" data-act="weekly-card">Oluştur</button></span></div></div>';
    }
    if (box._last !== html) { box.innerHTML = html; box._last = html; }   // değişmediyse yeniden çizme (basılan düğme kaybolmasın)
    if (!box._wired) {
      box._wired = true;
      box.addEventListener("click", function (e) {
        var t = e.target, act = t && t.getAttribute ? t.getAttribute("data-act") : null;
        if (act === "clear-target") { cityState.target = null; saveCity(); renderCityViewAll(); }
        else if (act === "open-chest") cityOpenChest();
        else if (act === "buy-joker") cityBuyJoker();
        else if (act === "buy-expansion") cityBuyExpansion();
        else if (act === "weekly-card") cityShowWeeklyCard();
      });
    }
  });
}
// Kaldırılan (koddan çizilmiş) yapılar eski kayıtlarda kalmasın: silinir, maliyetin tamamı iade edilir.
function cityMigrateRemoved(state) {
  var refund = 0, count = 0;
  state.buildings = state.buildings.filter(function (b) {
    var cost = (typeof CITY_REMOVED_TYPES !== "undefined") ? CITY_REMOVED_TYPES[b.name] : undefined;
    if (typeof cost !== "number") return true;
    refund += cost;
    count++;
    return false;
  });
  if (count > 0) {
    state.coins = roundCoins((state.coins || 0) + refund);
    storageSet(cityKey(), JSON.stringify(state));
    var msg = "Şehir güncellendi: eski görselli " + count + " yapı kaldırıldı, " + roundCoins(refund) + " altın iade edildi.";
    setTimeout(function () { if (typeof showUpdateToast === "function") showUpdateToast(msg); }, 2500);
  }
  return state;
}
function saveCity() {
  return storageSet(cityKey(), JSON.stringify(cityState));
}
function roundCoins(n) {
  return Math.round(n * 10) / 10;
}
// Seri çarpanı: (seri + 20) / 20, en çok CITY_STREAK_MULT_MAX (seri 40 günde ×3'e ulaşır, sonrası sabit).
var CITY_STREAK_MULT_MAX = 3;
function cityStreakMultiplier() {
  var streakValue = (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0;
  return Math.min(CITY_STREAK_MULT_MAX, (streakValue + 20) / 20);
}
function computeFocusReward(elapsedMs) {
  var hours = elapsedMs / 3600000;
  return roundCoins(hours * cityStreakMultiplier());
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
  pendingStudyGold += hours * cityStreakMultiplier();
  // Yumuşak ceza: odak bozulduktan sonra normal kronometreyle 25 dk çalışmak cezayı kaldırır.
  var recovered = false;
  if (cityLoadedOnce && (cityState.debuffSessionsLeft || 0) > 0) {
    cityState.debuffRecoveryMs = (cityState.debuffRecoveryMs || 0) + elapsedMs;
    if (cityState.debuffRecoveryMs >= CITY_REWARDS.debuffRecoveryMin * 60000) {
      cityState.debuffSessionsLeft = 0;
      cityState.debuffRecoveryMs = 0;
      recovered = true;
    }
  }
  if (pendingStudyGold >= 0.1) {
    var toAdd = Math.floor(pendingStudyGold * 10) / 10;
    pendingStudyGold -= toAdd;
    citySessionGold += toAdd;
    cityState.coins = roundCoins((cityState.coins || 0) + toAdd);
    saveCity();
    renderCity();
    cityFloat("+" + cityFmtGold(toAdd) + " 🪙");
  } else if (recovered) {
    saveCity();
    renderCity();
  }
  if (recovered) cityCelebrate(["💪 Toparlandın: odak cezası kalktı"]);
}
// ---- Şehir yerleşimi: 24x12 ızgara (v3.16.0'dan önce 14x5), derinlik, yol/dekor ----
var CITY_COLS = 24, CITY_ROWS = 12;
// Yerleşim sürümü: 2 = 24 sütun x 12 temel sıra. Eski kayıtlar (sürümsüz = 14x5) bir kez ortalanıp öne hizalanır.
var CITY_LAYOUT_V = 2, CITY_OLD_COLS = 14, CITY_OLD_ROWS_BASE = 5;
function cityMigrateLayout(state) {
  if (!state || (state.layoutV || 1) >= CITY_LAYOUT_V) return state;
  var dx = Math.floor((CITY_COLS - CITY_OLD_COLS) / 2), dy = CITY_ROWS_BASE - CITY_OLD_ROWS_BASE;
  (state.buildings || []).forEach(function (b) {
    if (typeof b.gx === "number") b.gx += dx;
    if (typeof b.gy === "number") b.gy += dy;   // eski ön sıralar yeni alanın önünde kalır, yeni alan arkaya/yanlara eklenir
  });
  state.layoutV = CITY_LAYOUT_V;
  return state;
}
var CITY_SELL_RATIO = 0.8; // yapı silinince maliyetin bu kadarı iade edilir
// Yatay kaç kare kaplar (varsayılan 1). Görünüm 3D modelden gelir (yks-sayac-city3d.js).
var CITY_LOOK = {
  "Çiftlik": { span: 2 }, "Okul": { span: 2 }, "Plaza": { span: 2 }
};
function cityTypeOf(b) { return BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0] || null; }
function cityItemSpan(b) { var l = CITY_LOOK[b.name]; return (l && l.span) || 1; }
function cityIsRoad(b) { var t = cityTypeOf(b); return !!(t && t.road); }
function cityIsCounted(b) { var t = cityTypeOf(b); return !t || (t.cat || "bina") === "bina"; }
function cityBuildingCount() { return cityState.buildings.filter(cityIsCounted).length; }
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
  // 3D'ye geçiş: eski ayna çevirme (flip) 180° dönüşe, yolların eski yön ayarı (rot) silinir (yollar komşudan otomatik çözülür)
  state.buildings.forEach(function (b) {
    var t = BUILDING_TYPES.filter(function (x) { return x.name === b.name; })[0];
    if (t && t.road) { delete b.rot; delete b.flip; return; }
    if (b.flip) { b.rot = ((b.rot || 0) + 2) % 4; }
    delete b.flip;
    b.rot = (((b.rot || 0) % 4) + 4) % 4;
  });
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
// Binalar çeyrek tur (90°) döner; 2 kare genişliğindekiler yalnızca 180° (yatay yer kaplamaları bozulmasın). Yollar komşudan otomatik.
function cityRotateItem(b) {
  if (!b || cityIsRoad(b)) return;
  b.rot = ((b.rot || 0) + (cityItemSpan(b) > 1 ? 2 : 1)) % 4;
}
function rotateActiveOrSelected() {
  var active = cityActiveItem();
  if (active) {
    cityRotateItem(active);
    if (!pendingBuilding) saveCity();   // taşınan yapı zaten şehirde; yeni alınan yerleşince kaydedilir
    if (typeof City3D !== "undefined") City3D.refresh();
    if (typeof City3D !== "undefined") City3D.refreshNow();
    return;
  }
  var sel = selectedCityItemId
    ? cityState.buildings.filter(function (x) { return x.id === selectedCityItemId; })[0]
    : null;
  if (!sel || cityIsRoad(sel)) return;
  cityRotateItem(sel);
  saveCity();
  renderCityViewAll();
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
  if (cityActiveItem() || (cityState.coins || 0) < type.cost || cityTypeLocked(type)) return;
  cityState.coins = roundCoins((cityState.coins || 0) - type.cost);
  if (cityState.target === type.name) {
    cityState.target = null;
    cityCelebrate(["🎯 Hedefine ulaştın: " + type.name + "!"]);
  }
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
  var refund = type ? roundCoins((type.cost + cityUpgradeSpent(type, b.stars || 0)) * CITY_SELL_RATIO) : 0;   // yükseltme harcaması da %80 iade
  var popLoss = type ? cityBuildingPop(b, type) : 0;
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
  renderCityViewAll();
}
function cityPopulation() {
  var total = 0;
  cityState.buildings.forEach(function (b) {
    var type = BUILDING_TYPES.filter(function (t) { return t.name === b.name; })[0];
    total += cityBuildingPop(b, type);
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
  renderCityMeta();
  cityCheckProgress();
}
function renderMarket() {
  var grid = document.getElementById("cityMarketGrid");
  if (!grid) return;
  var tabsEl = document.getElementById("cityMarketTabs");
  if (tabsEl) {
    if (!tabsEl._tabsBound) {   // sekme tıklaması: v3.15.0'da 2D temizliğinde dinleyici kaybolmuştu
      tabsEl._tabsBound = true;
      tabsEl.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest(".city-market-tab") : null;
        var tab = btn ? btn.getAttribute("data-tab") : null;
        if (!tab || tab === cityMarketTab) return;
        cityMarketTab = tab;
        renderMarket();
      });
    }
    Array.prototype.forEach.call(tabsEl.querySelectorAll(".city-market-tab"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === cityMarketTab);
    });
  }
  grid.innerHTML = "";
  var busy = !!cityActiveItem();
  BUILDING_TYPES.filter(function (t) { return (t.tab || t.cat || "bina") === cityMarketTab; }).forEach(function (type) {
    var locked = cityTypeLocked(type);
    var canAfford = !busy && !locked && (cityState.coins || 0) >= type.cost;
    var isTarget = cityState.target === type.name;
    var preview = '<span data-thumb="' + type.name + '">' + type.emoji + '</span>';
    var item = document.createElement("div");
    item.className = "city-market-item" + (locked ? " is-locked" : "");
    item.innerHTML =
      '<div class="city-market-emoji">' + preview + '</div>' +
      '<div class="city-market-name">' + type.name + '</div>' +
      '<div class="city-market-cost">' + type.cost + ' altın · ' + ((type.population || 0) > 0 ? '+' + type.population + ' nüfus' : 'süs') + '</div>' +
      (locked ? '<div class="city-market-lock">🔒 ' + CITY_LEVELS[type.minLevel].name + ' seviyesinde açılır (' + CITY_LEVELS[type.minLevel].pop + ' nüfus)</div>' : "") +
      '<button type="button" class="city-market-buy-btn"' + (canAfford ? "" : " disabled") +
      (busy ? ' title="Önce elindeki yapıyı yerleştir"' : (locked ? ' title="Şehir seviyesi yetmiyor"' : "")) + '>Satın Al</button>' +
      (type.road || locked ? "" : '<button type="button" class="city-market-target-btn' + (isTarget ? " is-target" : "") + '">' + (isTarget ? "🎯 hedefin ✓" : "🎯 hedef yap") + '</button>');
    item.querySelector(".city-market-buy-btn").addEventListener("click", function () {
      buyBuilding(type);
    });
    var tgBtn = item.querySelector(".city-market-target-btn");
    if (tgBtn) tgBtn.addEventListener("click", function () { citySetTarget(type.name); });
    grid.appendChild(item);
  });
  if (typeof City3D !== "undefined") City3D.fillThumbs(grid);
}
function renderCityViewStats() {
  var coinEl = document.getElementById("cityViewCoinValue");
  var countEl = document.getElementById("cityViewBuildingCount");
  var popEl = document.getElementById("cityViewPopulation");
  if (coinEl) coinEl.textContent = (cityState.coins || 0);
  if (countEl) countEl.textContent = cityBuildingCount();
  if (popEl) popEl.textContent = cityPopulation();
  renderCityMeta();
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
function renderCityViewAll() {
  cityApplyRows(cityState);   // genişleme sayısına göre sıra sayısı (başka cihazdan gelen durum dahil)
  renderMarket();
  renderCityViewStats();
  cityCheckProgress();
  if (typeof City3D !== "undefined") { City3D.refresh(); City3D.refreshNow(); }   // 3D şehri değişikliklere göre tazele
}
function initCityView() {
  var dateEl = document.getElementById("cityViewDate");
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

// ============================================================================
// YKS Sayaç — Bulut eşitleme: yönetici işlemlerini uygulama ve öğrenci özeti
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Yönetici işlemlerini uygula (altın / çalışma süresi / duyuru) ----
// cloud.js, studentData/{uid}/adminGrants içindeki bekleyen işlemleri dinler ve buraya verir.
// Aynı işlemin iki kez uygulanmaması için uygulanan kimlikler yerelde de tutulur.
var ADMIN_APPLIED_KEY = "admin-grants-applied";
var adminGrantChain = Promise.resolve();
var adminSyncTimer = null;
function showAdminMessage(text) {
  var ov = document.getElementById("adminMsgOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "adminMsgOverlay";
    ov.className = "admin-msg-overlay";
    var box = document.createElement("div");
    box.className = "admin-msg-box";
    var title = document.createElement("div");
    title.className = "admin-msg-title";
    title.textContent = "📣 Yöneticiden mesaj";
    var body = document.createElement("div");
    body.id = "adminMsgBody";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "save-btn";
    ok.textContent = "Tamam";
    ok.addEventListener("click", function () { ov.remove(); });
    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(ok);
    ov.appendChild(box);
    document.body.appendChild(ov);
  }
  var p = document.createElement("p");
  p.className = "admin-msg-text";
  p.textContent = text;
  document.getElementById("adminMsgBody").appendChild(p);
}
function adminDurationText(secs) {
  var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return (h ? h + " sa " : "") + (m ? m + " dk" : (h ? "" : "0 dk"));
}
function scheduleAdminSummarySync() {
  if (!currentUserUid) return;
  clearTimeout(adminSyncTimer);
  adminSyncTimer = setTimeout(function () {
    buildStudentSummaryPayload().then(function (payload) { syncStudentSummary(currentUserUid, payload); });
  }, 2000);
}
function doApplyAdminGrant(g, silent) {
  if (!g || typeof g !== "object") return Promise.resolve(false);
  var note = typeof g.note === "string" ? g.note.slice(0, 80) : "";
  if (g.type === "coins") {
    var amt = Number(g.amount);
    if (!isFinite(amt) || amt === 0 || Math.abs(amt) > 100000) return Promise.resolve(false);
    amt = Math.round(amt * 10) / 10;
    // Depolamadan taze oku: şehir penceresi açıksa eski bellek kopyasının üzerine yazmayalım
    return loadCity().then(function (d) {
      d.coins = roundCoins(Math.max(0, (d.coins || 0) + amt));
      cityState = d;
      return saveCity();
    }).then(function () {
      try { renderCity(); } catch (e) {}
      if (!silent) {
        showUpdateToast(amt > 0
          ? "🎁 Yönetici sana +" + amt + " altın ekledi" + (note ? ": " + note : "")
          : "Yönetici hesabından " + Math.abs(amt) + " altın düştü" + (note ? ": " + note : ""));
      }
      return true;
    });
  }
  if (g.type === "study") {
    var secs = Math.floor(Number(g.seconds));
    var date = String(g.date || "");
    var subject = String(g.subject || "Genel").trim().slice(0, 40) || "Genel";
    if (!isFinite(secs) || secs <= 0 || secs > 86400 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > dateStr(new Date())) {
      return Promise.resolve(false);
    }
    var key = "study-" + date;
    return storageGet(key).then(function (value) {
      var rec = { subjects: {}, running: false, activeSubject: null, startTs: null };
      if (value) {
        try { var parsed = JSON.parse(value); if (parsed && typeof parsed === "object") rec = parsed; } catch (e) {}
      }
      if (!rec.subjects || typeof rec.subjects !== "object") rec.subjects = {};
      rec.subjects[subject] = (Number(rec.subjects[subject]) || 0) + secs;
      return storageSet(key, JSON.stringify(rec)).then(function () { return rec; });
    }).then(function (rec) {
      // bugünkü ders süreleri bellekte de tutulur; çalışan sayaç alanlarına dokunmadan sadece süreleri güncelle
      if (date === dateStr(new Date())) studyState.subjects = rec.subjects;
      try { renderStudy(); renderSubjectPie(true); } catch (e) {}
      if (!silent) showUpdateToast("🎁 Yönetici sana " + adminDurationText(secs) + " çalışma süresi ekledi (" + subject + ")" + (note ? ": " + note : ""));
      return true;
    });
  }
  if (g.type === "message") {
    var text = String(g.text || "").trim().slice(0, 300);
    if (!text) return Promise.resolve(false);
    showAdminMessage(text);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}
window.yksApplyAdminGrant = function (id, g) {
  adminGrantChain = adminGrantChain.then(function () {
    return storageGet(ADMIN_APPLIED_KEY).then(function (v) {
      var ids = [];
      try { var a = JSON.parse(v); if (Array.isArray(a)) ids = a; } catch (e) {}
      if (ids.indexOf(id) >= 0) return true;   // daha önce uygulanmış; yalnızca Firestore işaretlemesi eksikti
      return doApplyAdminGrant(g).then(function () {
        // geçersiz işlemler de "işlendi" sayılır ki sonsuza dek yeniden denenmesin
        ids.push(id);
        if (ids.length > 300) ids = ids.slice(-300);
        return storageSet(ADMIN_APPLIED_KEY, JSON.stringify(ids)).then(function () {
          scheduleAdminSummarySync();
          return true;
        });
      });
    });
  }).catch(function () { return false; });
  return adminGrantChain;
};
// ---- Masaüstü çalışma tarayıcısı seanslarını çalışma süresine ve altına işle (v2.5) ----
// studentData/{uid}/focusSessions belgeleri okunur; her biri bir kez işlenir (kimlikler yerelde tutulur).
// Süre "Genel" dersine eklenir, altın odak moduyla aynı formülle (1.5x) verilir. Kötüye kullanıma karşı:
// bir seans planlanan süreyi aşamaz ve bir günde en fazla 10 saat tarayıcı süresi işlenir.
var BROWSER_APPLIED_KEY = "focus-browser-applied";
var BROWSER_DAILY_CAP_SECONDS = 10 * 3600;
// Seansta izlenen içeriklerin ders bazlı süreleri (breakdown: [{d: ders, k: konu, s: saniye}]).
// Toplam, işlenecek süreyi aşarsa orantılı küçültülür; kalan süre "Genel" dersine yazılır.
function browserSessionParts(breakdownJson, secs) {
  var byDers = {}, sum = 0;
  try {
    JSON.parse(breakdownJson || "[]").forEach(function (b) {
      var s = Math.floor(Number(b && b.s));
      var d = String((b && b.d) || "").trim().slice(0, 40);
      if (!d || !(s > 0)) return;
      byDers[d] = (byDers[d] || 0) + s;
      sum += s;
    });
  } catch (e) { byDers = {}; sum = 0; }
  var scale = sum > secs ? secs / sum : 1;
  var parts = [], used = 0;
  Object.keys(byDers).forEach(function (d) {
    var v = Math.floor(byDers[d] * scale);
    if (v > 0) { parts.push({ subject: d, seconds: v }); used += v; }
  });
  if (secs - used > 0) parts.push({ subject: "Genel", seconds: secs - used });
  return parts;
}

function mergeMaxDays(dst, src) {
  if (!src || typeof src !== "object") return dst;
  Object.keys(src).forEach(function (k) { dst[k] = Math.max(Number(dst[k]) || 0, Number(src[k]) || 0); });
  return dst;
}
function pruneDayTotals(days) {
  var keys = Object.keys(days).sort().slice(-30), out = {};
  keys.forEach(function (k) { out[k] = days[k]; });
  return out;
}
// "İşlendi" kaydı hem yerelde hem Firestore'da (studentData/{uid}/info/browserApplied) tutulur; böylece yeni cihazda/oturumda
// ya da yerel veri silindiğinde son 14 günün seansları ikinci kez eklenmez. Seans, kayıt bulutta işaretlendikten SONRA eklenir
// (yarıda kalırsa çift sayım yerine en kötü ihtimalle bir seans eksik kalır).
function applyBrowserSessions(uid) {
  if (!uid || typeof fbDb === "undefined" || !fbDb) return;
  adminGrantChain = adminGrantChain.then(function () {
    var userDoc = fbDb.collection("studentData").doc(uid);
    var claimRef = userDoc.collection("info").doc("browserApplied");
    return userDoc.collection("focusSessions")
      .where("startedAtMs", ">=", Date.now() - 14 * 86400000).get().then(function (snap) {
        return Promise.all([storageGet(BROWSER_APPLIED_KEY), localDataIsFresh()]).then(function (r) {
          var local = { ids: [], days: {} };
          try { var p = JSON.parse(r[0]); if (p && Array.isArray(p.ids)) local = { ids: p.ids, days: p.days || {} }; } catch (e) {}
          var fresh = !!r[1];
          var sessions = [];
          snap.forEach(function (d) { sessions.push({ id: d.id, s: d.data() || {} }); });
          return fbDb.runTransaction(function (tx) {
            return tx.get(claimRef).then(function (doc) {
              var cloud = doc.exists ? (doc.data() || {}) : null;
              var seen = {};
              local.ids.forEach(function (id) { seen[id] = true; });
              if (cloud && Array.isArray(cloud.ids)) cloud.ids.forEach(function (id) { seen[id] = true; });
              var days = mergeMaxDays(mergeMaxDays({}, local.days), cloud && cloud.days);
              var toApply = [];
              sessions.forEach(function (it) {
                if (seen[it.id]) return;
                seen[it.id] = true;
                var started = Number(it.s.startedAtMs);
                // yeni/boş cihazda ve bulutta kayıt yokken geçmiş seanslar zaten eski cihazda işlenmiştir
                var skip = !cloud && fresh;
                if (!skip) toApply.push(it);
              });
              var ids = Object.keys(seen);
              if (ids.length > 500) ids = ids.slice(-500);
              tx.set(claimRef, { ids: ids, days: pruneDayTotals(days), updatedAt: Date.now() });
              return { list: toApply, ids: ids, days: days };
            });
          });
        });
      }).then(function (claim) {
        var st = { ids: claim.ids, days: claim.days };
        var list = claim.list;
        list.sort(function (a, b) { return a.s.startedAtMs - b.s.startedAtMs; });
        var totalSecs = 0, totalCoins = 0, chain = Promise.resolve();
        list.forEach(function (item) {
          chain = chain.then(function () {
            var s = item.s, started = Number(s.startedAtMs);
            if (!isFinite(started)) return;
            var date = dateStr(new Date(started));
            var used = Number(st.days[date]) || 0;
            var mins = Math.min(Number(s.minutes) || 0, Number(s.plannedMinutes) || 0);
            var secs = Math.max(0, Math.min(Math.floor(mins * 60), BROWSER_DAILY_CAP_SECONDS - used));
            if (secs <= 0) return;
            var coins = roundCoins(computeFocusReward(secs * 1000) * FOCUS_REWARD_MULTIPLIER);
            st.days[date] = used + secs;
            totalSecs += secs;
            totalCoins += coins;
            var parts = browserSessionParts(s.breakdown, secs);
            var credit = Promise.resolve();
            parts.forEach(function (pt) {
              credit = credit.then(function () {
                return doApplyAdminGrant({ type: "study", seconds: pt.seconds, date: date, subject: pt.subject }, true);
              });
            });
            return credit.then(function () {
              if (coins > 0) return doApplyAdminGrant({ type: "coins", amount: coins }, true);
            });
          });
        });
        return chain.then(function () {
          return storageSet(BROWSER_APPLIED_KEY, JSON.stringify({ ids: st.ids, days: st.days }));
        }).then(function () {
          if (list.length) {
            // günlük toplamlar da buluta yazılır (en iyi çaba)
            fbDb.collection("studentData").doc(uid).collection("info").doc("browserApplied")
              .set({ days: pruneDayTotals(st.days) }, { merge: true }).catch(function () {});
          }
          if (totalSecs > 0) {
            showUpdateToast("🖥️ Çalışma tarayıcısından " + adminDurationText(totalSecs) + " çalışma ve " + roundCoins(totalCoins) + " altın eklendi.");
            scheduleAdminSummarySync();
          }
        });
      });
  }).catch(function () { /* çevrimdışı ya da kurallar yayınlanmamışsa sessizce geç; bir sonraki açılışta tekrar denenir */ });
  adminGrantChain = adminGrantChain.then(function () { return true; }, function () { return true; });
}

// Yeni/boş cihazda sıfırlarla buluttaki özeti ezmemek için: yerel veri yoksa yalnızca ad (ve etkinlik zamanı) gönderilir.
function buildStudentSummaryPayload() {
  return localDataIsFresh().then(function (fresh) {
    if (!fresh) return buildStudentSummaryPayloadFull();
    var name = (currentUserProfile && currentUserProfile.name) || "";
    return name ? { name: name } : {};
  });
}
function buildStudentSummaryPayloadFull() {
  var recs = (examState && examState.records) || [];
  var bestTYT = 0, bestAYT = 0;
  recs.forEach(function (r) {
    if (r.examKey === "TYT") bestTYT = Math.max(bestTYT, r.totalNet);
    else bestAYT = Math.max(bestAYT, r.totalNet);
  });
  var examRecordsPayload = recs.map(function (r) {
    return {
      id: r.id,
      date: r.date || "",
      examKey: r.examKey || "",
      name: r.name || "",
      totalNet: (typeof r.totalNet === "number") ? r.totalNet : 0,
      createdAt: r.createdAt || 0,
      subjects: r.subjects || {}
    };
  });

  return Promise.all([
    aggregateKeys(lastNDaysKeys(7)),
    aggregateKeys(lastNDaysKeys(30)),
    storageListKeys("study-").then(aggregateKeys),
    computeFocusStatsSummary()
  ]).then(function (results) {
    return {
      name: (currentUserProfile && currentUserProfile.name) || "",
      streak: (typeof streakDisplayedValue === "number") ? streakDisplayedValue : 0,
      cityCoins: (cityState && cityState.coins) || 0,
      cityBuildings: (cityState && cityState.buildings && ((typeof cityBuildingCount === "function") ? cityBuildingCount() : cityState.buildings.length)) || 0,
      cityPopulation: (typeof cityPopulation === "function") ? cityPopulation() : 0,
      examCount: recs.length,
      bestTYT: bestTYT,
      bestAYT: bestAYT,
      weeklySubjects: roundTotals(results[0]),
      monthlySubjects: roundTotals(results[1]),
      allSubjects: roundTotals(results[2]),
      examRecords: examRecordsPayload,
      focusStats: results[3],
      obp: (typeof state.obp === "number") ? state.obp : null
    };
  });
}


// ============================================================================
// Oturum sahibi koruması ve hesap verisi senkronu (v3.8.0)
// - Çıkış yapınca yerel veri silinmediği için başka bir hesapla girilince önceki hesabın verisi yeni hesaba karışıyordu:
//   hesap değişince yerel veri temizlenir, yeni hesabın verisi buluttan gelir.
// - Hesabın tüm verisi (çalışma süreleri, konular, notlar, şehir, ayarlar, denemeler…) buluta otomatik senkronlanır;
//   hangi cihazdan/tarayıcıdan girilirse girilsin hesabın içindeki bilgiler aynıdır. Yedekten geri yükleme kaldırıldı.
// ============================================================================
var LOCAL_OWNER_KEY = "local-owner-uid";
// Hesaba özel yerel durum anahtarları: hesap değişince temizlenir
var ACCOUNT_STATE_KEYS = ["admin-grants-applied", "focus-browser-applied", "auto-cloud-backup-last-date",
  "auto-backup-last-date", "yks-mistake-due-toast", "sync-meta", "sync-dirty"];
var sessionReadyResolve = null;
// Hesabın bulut verisi yerele alınana kadar otomatik yedek, seans işleme ve özet gönderme beklemeli
window.yksSessionReady = new Promise(function (resolve) { sessionReadyResolve = resolve; });

function storageRemove(key) {
  if (hasCloudStorage() && window.storage.delete) return window.storage.delete(key, false).catch(function () {});
  try { localStorage.removeItem(key); } catch (e) {}
  return Promise.resolve();
}
// Yerelde gerçek kullanıcı verisi var mı? (ayar dosyası tek başına veri sayılmaz)
function localDataIsFresh() {
  return Promise.all([
    storageListKeys("study-"), storageListKeys("topics-"), storageListKeys("progress-"),
    storageGet("focus-city"), storageGet("deneme-records"), storageGet("notes-pages")
  ]).then(function (r) {
    return !(r[0].length || r[1].length || r[2].length || r[3] || r[4] || r[5]);
  });
}
// Önceki hesabın verisini yerelde saklar (kaybolmasın), sonra temizler
function switchLocalOwner(oldUid, newUid) {
  return exportBackup().then(function (payload) {
    var real = Object.keys(payload.data).length;
    var text = JSON.stringify(payload);
    return storageListKeys("stash-owner-").then(function (olds) {
      return Promise.all(olds.map(storageRemove));
    }).then(function () {
      if (real && text.length < 1500000) return storageSet("stash-owner-" + oldUid, text);
    });
  }).then(function () {
    return collectAllBackupKeys();
  }).then(function (keys) {
    return Promise.all(keys.concat(ACCOUNT_STATE_KEYS).map(storageRemove));
  }).then(function () {
    return storageSet(LOCAL_OWNER_KEY, newUid);
  });
}
// { reload: true } -> hesap değişti, temizlendi, sayfa yenilenmeli; { fresh } -> bu cihazda henüz veri yok mu
function prepareSessionOwner(uid) {
  return storageGet(LOCAL_OWNER_KEY).then(function (owner) {
    if (owner && owner !== uid) {
      return switchLocalOwner(owner, uid).then(function () { return { reload: true }; });
    }
    return storageSet(LOCAL_OWNER_KEY, uid).then(function () {
      return localDataIsFresh().then(function (fresh) { return { fresh: fresh }; });
    });
  });
}

// ---------------------------------------------------------------------------
// Hesap verisi senkronu
// Yerel anahtarlar (BACKUP_PREFIXES / BACKUP_SINGLE_KEYS ile aynı küme) studentData/{uid}/info/ud_<anahtar> belgelerine
// yazılır; giriş yapılınca ve belirli aralıklarla buluttaki değişiklikler yerele birleştirilir.
//   - study-*: konuya göre en büyük süre alınır; çalışıyor/başlangıç gibi cihaza özel alanlar buluta gitmez
//   - progress-*: en büyük sayı · streak-celebrated-*: bayrak · focus-sessions-* ve işlenmiş kimlik listeleri: birleşim
//   - diğerleri (ayarlar, notlar, şehir, denemeler, günün konuları): en son değişen kazanır
// ---------------------------------------------------------------------------
var SYNC_META_KEY = "sync-meta";      // { synced: { anahtar: bulut zamanı }, lastPull }
var SYNC_DIRTY_KEY = "sync-dirty";    // { anahtar: son yerel değişiklik zamanı } — henüz buluta yazılmamışlar
var SYNC_DEVICE_KEY = "sync-device";
var SYNC_DOC_PREFIX = "ud_";
var SYNC_ID_RE = /^[\w.-]{1,120}$/;
var syncActiveUid = null;
var syncBusy = false;
var syncAgain = false;
var syncFlushTimer = null;
var syncLastPullAt = 0;
var syncReloadTimer = null;
var syncTimersStarted = false;

function lsGetJson(key, dflt) {
  try { var v = JSON.parse(localStorage.getItem(key)); return v && typeof v === "object" ? v : dflt; } catch (e) { return dflt; }
}
function lsSetJson(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }
function syncMetaLoad() {
  var m = lsGetJson(SYNC_META_KEY, {});
  if (!m.synced || typeof m.synced !== "object") m.synced = {};
  m.lastPull = Number(m.lastPull) || 0;
  return m;
}
function syncMetaSave(m) { lsSetJson(SYNC_META_KEY, m); }
function syncDirtyLoad() { return lsGetJson(SYNC_DIRTY_KEY, {}); }
function syncDirtySave(d) { lsSetJson(SYNC_DIRTY_KEY, d); }
function syncDeviceId() {
  var id = null;
  try { id = localStorage.getItem(SYNC_DEVICE_KEY); } catch (e) {}
  if (!id) {
    id = "d" + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(SYNC_DEVICE_KEY, id); } catch (e) {}
  }
  return id;
}
function isSyncKey(key) {
  if (typeof key !== "string" || !SYNC_ID_RE.test(key)) return false;
  if (BACKUP_SINGLE_KEYS.indexOf(key) >= 0) return true;
  return BACKUP_PREFIXES.some(function (p) { return key.indexOf(p) === 0 && key.length > p.length; });
}
function syncKind(key) {
  if (key.indexOf("study-") === 0) return "study";
  if (key.indexOf("progress-") === 0) return "int";
  if (key.indexOf("streak-celebrated-") === 0) return "flag";
  if (key.indexOf("focus-sessions-") === 0) return "union";
  if (key === "admin-grants-applied") return "ids";
  if (key === "focus-browser-applied") return "browserApplied";
  return "lww";
}
function syncParse(raw, dflt) { try { var v = JSON.parse(raw); return v === null || v === undefined ? dflt : v; } catch (e) { return dflt; } }
function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("zaman aşımı")); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
  });
}

// Her yerel yazma, senkron kümesindeki anahtarlar için "buluta yazılacak" olarak işaretlenir
var rawStorageSet = storageSet;
storageSet = function (key, value) {
  var p = rawStorageSet(key, value);
  if (isSyncKey(key)) markSyncDirty(key);
  return p;
};
function markSyncDirty(key) {
  var d = syncDirtyLoad();
  d[key] = Date.now();
  syncDirtySave(d);
  scheduleSyncFlush();
}
function scheduleSyncFlush(delay) {
  if (!syncActiveUid) return;
  clearTimeout(syncFlushTimer);
  syncFlushTimer = setTimeout(flushSync, delay || 4000);
}

function mergeSyncValue(key, localRaw, remoteRaw, localChanged, localT, remoteT) {
  var kind = syncKind(key), i;
  if (kind === "study") {
    var L = syncParse(localRaw, {}), R = syncParse(remoteRaw, {});
    var subs = {}, same = true;
    [L.subjects || {}, R.subjects || {}].forEach(function (src) {
      Object.keys(src).forEach(function (k) { subs[k] = Math.max(Number(subs[k]) || 0, Number(src[k]) || 0); });
    });
    var rs = R.subjects || {};
    Object.keys(subs).forEach(function (k) { if ((Number(rs[k]) || 0) !== subs[k]) same = false; });
    // çalışıyor / başlangıç / aktif ders bu cihazın durumudur: yerelden kalır
    return { value: JSON.stringify(Object.assign({}, L, { subjects: subs })), pushBack: !same };
  }
  if (kind === "int") {
    var m = Math.max(Number(localRaw) || 0, Number(remoteRaw) || 0);
    return { value: String(m), pushBack: m !== (Number(remoteRaw) || 0) };
  }
  if (kind === "flag") return { value: "1", pushBack: String(remoteRaw) !== "1" };
  if (kind === "union" || kind === "ids") {
    var a = syncParse(localRaw, []), b = syncParse(remoteRaw, []);
    if (!Array.isArray(a)) a = [];
    if (!Array.isArray(b)) b = [];
    var seen = {}, out = [];
    a.concat(b).forEach(function (it) {
      var s = typeof it === "string" ? "s:" + it : "j:" + JSON.stringify(it);
      if (!seen[s]) { seen[s] = 1; out.push(it); }
    });
    return { value: JSON.stringify(out), pushBack: out.length !== b.length };
  }
  if (kind === "browserApplied") {
    var la = syncParse(localRaw, {}), ra = syncParse(remoteRaw, {});
    var ids = {}, days = {};
    (la.ids || []).concat(ra.ids || []).forEach(function (id) { ids[id] = 1; });
    [la.days || {}, ra.days || {}].forEach(function (src) {
      Object.keys(src).forEach(function (k) { days[k] = Math.max(Number(days[k]) || 0, Number(src[k]) || 0); });
    });
    var idList = Object.keys(ids);
    if (idList.length > 500) idList = idList.slice(-500);
    return { value: JSON.stringify({ ids: idList, days: days }), pushBack: idList.length !== (ra.ids || []).length };
  }
  // en son değişen kazanır; yerelde hiç senkronlanmamış eski veri varsa (localT = 0) buluttaki geçerli olur
  if (!localChanged) return { value: remoteRaw, pushBack: false };
  if (localRaw === remoteRaw) return { value: localRaw, pushBack: false };
  return remoteT >= localT ? { value: remoteRaw, pushBack: false } : { value: localRaw, pushBack: true };
}

function encodeForCloud(key, raw) {
  if (raw === null || raw === undefined) return Promise.resolve(null);
  var text = String(raw);
  if (syncKind(key) === "study") {
    try { text = JSON.stringify({ subjects: (JSON.parse(text) || {}).subjects || {} }); } catch (e) {}
  }
  if (text.length <= 200000) return Promise.resolve({ v: text, z: 0 });
  try {
    return gzipText(text).then(function (bytes) {
      var b64 = backupBytesToBase64(bytes);
      return b64.length <= 950000 ? { v: b64, z: 1 } : null;
    }).catch(function () { return null; });
  } catch (e) {
    return Promise.resolve(null);   // sıkıştırma desteklenmiyorsa: büyük değer senkronlanmaz (sonsuz yeniden deneme yok)
  }
}
function decodeFromCloud(r) {
  if (r.z) return gunzipToText(backupBase64ToBytes(String(r.v)));
  return Promise.resolve(String(r.v));
}

function applyRemoteDoc(r, applied) {
  var k = r.k, t = Number(r.t) || 0;
  if (t <= (syncMetaLoad().synced[k] || 0)) return Promise.resolve();   // bu sürüm zaten yerelde
  return Promise.all([decodeFromCloud(r), storageGet(k)]).then(function (res) {
    var remoteRaw = res[0], localRaw = res[1];
    if (remoteRaw === null || remoteRaw === undefined) return;
    var meta = syncMetaLoad(), dirty = syncDirtyLoad();
    var localChanged = (k in dirty) || (localRaw !== null && localRaw !== undefined && !(k in meta.synced));
    var out = (localRaw === null || localRaw === undefined)
      ? { value: remoteRaw, pushBack: false }
      : mergeSyncValue(k, localRaw, remoteRaw, localChanged, dirty[k] || 0, t);
    var write = out.value !== localRaw ? rawStorageSet(k, out.value) : Promise.resolve();
    if (out.value !== localRaw) applied.push(k);
    return write.then(function () {
      var m = syncMetaLoad();
      m.synced[k] = t;
      syncMetaSave(m);
      if (out.pushBack) markSyncDirty(k);
    });
  }).catch(function () { /* bozuk ya da çözülemeyen belge: atla */ });
}

// Buluttaki yeni/değişen belgeleri yerele birleştirir. live = sayfa açıkken yapılan çekme (değişiklik varsa güvenle yenilenir)
function pullChanges(live) {
  if (!syncActiveUid || typeof fbDb === "undefined" || !fbDb) return Promise.resolve({ applied: [] });
  var uid = syncActiveUid;
  syncLastPullAt = Date.now();
  var meta = syncMetaLoad();
  // cihaz saatleri arasındaki farklara karşı 10 dakika pay bırakılır; zaten işlenmiş sürümler atlanır
  var since = meta.lastPull > 0 ? Math.max(0, meta.lastPull - 600000) : 0;
  return fbDb.collection("studentData").doc(uid).collection("info").where("t", ">", since).get().then(function (snap) {
    var docs = [];
    snap.forEach(function (d) {
      var v = d.data() || {};
      if (v.sync === 1 && typeof v.k === "string" && isSyncKey(v.k)) docs.push(v);
    });
    docs.sort(function (a, b) { return (Number(a.t) || 0) - (Number(b.t) || 0); });
    var applied = [], maxT = 0, chain = Promise.resolve();
    docs.forEach(function (r) {
      maxT = Math.max(maxT, Number(r.t) || 0);
      chain = chain.then(function () { return applyRemoteDoc(r, applied); });
    });
    return chain.then(function () {
      var m = syncMetaLoad();
      if (maxT > m.lastPull) m.lastPull = maxT;
      syncMetaSave(m);
      return { applied: applied };
    });
  }).then(function (res) {
    if (live && res.applied.length) scheduleSafeReload();
    return res;
  });
}

// Başka cihazdan gelen değişiklik ekrana yansısın diye sayfa yenilenir; çalışma sayacı/odak modu açıksa ya da bir alana yazılıyorsa beklenir
function scheduleSafeReload() {
  clearTimeout(syncReloadTimer);
  syncReloadTimer = setTimeout(function () {
    var ae = document.activeElement;
    var busy = (typeof studyState !== "undefined" && studyState && studyState.running) ||
      (typeof focusModeState !== "undefined" && focusModeState === "active") ||
      (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
    if (busy) { scheduleSafeReload(); return; }
    flushSync().then(function () { location.reload(); });
  }, 4000);
}

function flushSync() {
  if (!syncActiveUid || typeof fbDb === "undefined" || !fbDb) return Promise.resolve();
  if (syncBusy) { syncAgain = true; return Promise.resolve(); }
  if (!Object.keys(syncDirtyLoad()).length) return Promise.resolve();
  syncBusy = true;
  syncAgain = false;
  var uid = syncActiveUid;
  // yazmadan önce buluttakini birleştir: başka cihazın verisi ezilmesin
  return pullChanges(false).catch(function () {}).then(function () {
    var dirty = syncDirtyLoad();
    var keys = Object.keys(dirty).slice(0, 100);
    return Promise.all(keys.map(function (k) {
      return storageGet(k).then(function (raw) {
        return encodeForCloud(k, raw).then(function (enc) { return { k: k, mod: dirty[k], enc: enc }; });
      });
    }));
  }).then(function (items) {
    var stamp = Date.now();
    var writes = items.filter(function (it) { return it.enc; });
    var col = fbDb.collection("studentData").doc(uid).collection("info");
    var batch = fbDb.batch();
    writes.forEach(function (it) {
      batch.set(col.doc(SYNC_DOC_PREFIX + it.k), { sync: 1, k: it.k, v: it.enc.v, z: it.enc.z, t: stamp, d: syncDeviceId() });
    });
    return (writes.length ? batch.commit() : Promise.resolve()).then(function () {
      var m = syncMetaLoad(), d = syncDirtyLoad();
      writes.forEach(function (it) { m.synced[it.k] = stamp; });
      // yazma sırasında yeniden değişen anahtar "kirli" kalır; boş/çok büyük olanlar bir daha denenmez
      items.forEach(function (it) { if (d[it.k] === it.mod) delete d[it.k]; });
      syncMetaSave(m);
      syncDirtySave(d);
    });
  }).then(function () {
    syncBusy = false;
    if (syncAgain || Object.keys(syncDirtyLoad()).length) scheduleSyncFlush(1500);
  }, function () {
    syncBusy = false;
    scheduleSyncFlush(30000);   // çevrimdışı ya da geçici hata: sonra tekrar dene
  });
}

// Bu cihazda olup bulutta hiç görülmemiş anahtarları buluta gönderilecek olarak işaretler (ilk senkron)
function seedLocalOnlyKeys() {
  return collectAllBackupKeys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return storageGet(k).then(function (v) { return v === null || v === undefined ? null : k; });
    }));
  }).then(function (present) {
    var m = syncMetaLoad(), d = syncDirtyLoad(), now = Date.now(), added = 0;
    present.forEach(function (k) {
      if (k && isSyncKey(k) && !(k in m.synced) && !(k in d)) { d[k] = now; added++; }
    });
    if (added) syncDirtySave(d);
  });
}

function startDataSyncTimers() {
  if (syncTimersStarted) return;
  syncTimersStarted = true;
  setInterval(function () { if (!document.hidden) pullChanges(true).catch(function () {}); }, 90000);
  setInterval(function () { flushSync(); }, 20000);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) flushSync();
    else if (Date.now() - syncLastPullAt > 20000) pullChanges(true).catch(function () {});
  });
  window.addEventListener("pagehide", function () { flushSync(); });
  window.addEventListener("online", function () { flushSync(); pullChanges(true).catch(function () {}); });
}

// Giriş yapılınca: önce buluttaki hesap verisi yerele alınır (arayüz bundan sonra başlar), sonra senkron sürekli çalışır.
// Bulut okunamazsa (çevrimdışı) yerel veriyle devam edilir ve bulutta olup görülmemiş anahtarlar üzerine yazılmaz.
function dataSyncStart(uid) {
  syncActiveUid = uid;
  var pullOk = false;
  return withTimeout(pullChanges(false), 8000).then(function () { pullOk = true; }, function () {})
    .then(function () { return pullOk ? seedLocalOnlyKeys() : null; })
    .then(function () { startDataSyncTimers(); scheduleSyncFlush(800); });
}

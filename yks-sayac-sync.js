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
// ---- Yedekten geri yüklemeden sonra yönetici işlemlerini yeniden uygula ----
// Yedek, alındığı andaki altın/çalışma süresini içerir; yönetici o andan SONRA altın düştüyse ya da süre eklediyse,
// geri yükleme bunları silerdi (Firestore'da "uygulandı" işaretli oldukları için bir daha uygulanmazlar).
// Çözüm: yedeğin alındığı andan (exportedAt) sonra uygulanmış işlemler yeniden uygulanır. İlerleme yerelde tutulur;
// çevrimdışıysa ya da yarıda kesilirse bir sonraki açılışta kaldığı yerden devam eder, hiçbir işlem iki kez uygulanmaz.
var GRANT_REAPPLY_KEY = "grant-reapply-state";
function scheduleGrantReapply(sinceMs) {
  var since = Math.floor(Number(sinceMs));
  if (!isFinite(since) || since <= 0) return Promise.resolve();
  return storageSet(GRANT_REAPPLY_KEY, JSON.stringify({ since: since, done: [] }));
}
function promiseWithTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("zaman aşımı")); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
  });
}
function runGrantReapply() {
  if (typeof currentUserUid === "undefined" || !currentUserUid || typeof fbDb === "undefined" || !fbDb) return Promise.resolve(0);
  return storageGet(GRANT_REAPPLY_KEY).then(function (raw) {
    var st = null;
    try { st = JSON.parse(raw); } catch (e) {}
    var since = st ? Number(st.since) : 0;
    if (!st || !isFinite(since) || since <= 0) return 0;
    var done = Array.isArray(st.done) ? st.done.slice() : [];
    var col = fbDb.collection("studentData").doc(currentUserUid).collection("adminGrants");
    return promiseWithTimeout(col.get(), 15000).then(function (snap) {
      var list = [];
      snap.forEach(function (d) {
        var g = d.data() || {};
        if (g.applied !== true) return;                          // bekleyenler zaten normal akışla uygulanır
        if (g.type !== "coins" && g.type !== "study") return;    // duyurular tekrar gösterilmez
        if (done.indexOf(d.id) >= 0) return;
        var at = Number(g.appliedAt) || Number(g.createdAt) || 0;
        if (at > since) list.push({ id: d.id, at: at, g: g });
      });
      list.sort(function (a, b) { return a.at - b.at; });
      var count = 0;
      var chain = Promise.resolve();
      list.forEach(function (item) {
        chain = chain.then(function () {
          return doApplyAdminGrant(item.g, true).then(function (applied) {
            if (applied) count++;
            done.push(item.id);   // geçersiz olanlar da işlendi sayılır
            return storageSet(GRANT_REAPPLY_KEY, JSON.stringify({ since: since, done: done }));
          });
        });
      });
      return chain.then(function () { return count; });
    }).then(function (count) {
      return storageSet(GRANT_REAPPLY_KEY, "").then(function () {
        if (count > 0) {
          showUpdateToast("Yedekten sonraki " + count + " yönetici işlemin yeniden uygulandı.");
          scheduleAdminSummarySync();
        }
        return count;
      });
    });
  }).catch(function (err) {
    console.error("Yönetici işlemleri yeniden uygulanamadı (sonra tekrar denenecek):", err);
    return 0;
  });
}
function reapplyAdminGrantsSince() {
  // Normal işlem akışıyla aynı sıraya girer: altın/şehir verisi aynı anda iki yerden okunup yazılmasın.
  var run = adminGrantChain.then(function () { return runGrantReapply(); });
  adminGrantChain = run.then(function () { return true; }, function () { return true; });
  return run;
}
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
        return Promise.all([storageGet(BROWSER_APPLIED_KEY), storageGet("browser-restore-since"), localDataIsFresh()]).then(function (r) {
          var local = { ids: [], days: {} };
          try { var p = JSON.parse(r[0]); if (p && Array.isArray(p.ids)) local = { ids: p.ids, days: p.days || {} }; } catch (e) {}
          var since = Number(r[1]) || 0, fresh = !!r[2];
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
                // yeni/boş cihazda ve bulutta kayıt yokken geçmiş seanslar zaten eski cihazda/yedekte işlenmiştir;
                // yedekten geri yükleme sonrası da yedeğin alındığı andan önceki seanslar yeniden eklenmez
                var skip = (!cloud && fresh) || (since > 0 && isFinite(started) && started < since);
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
// Oturum sahibi ve yeni cihaz koruması (v3.7.0)
// - Çıkış yapınca yerel veri silinmediği için başka bir hesapla girilince önceki hesabın verisi yeni hesaba karışıyordu.
// - Yeni cihazda/tarayıcıda yerel veri boş olduğundan boş özet ve boş "otomatik yedek" buluta yazılıp gerçek yedeklerin
//   yerine geçiyordu (7 otomatik yedek sınırıyla eskiler siliniyordu).
// ============================================================================
var LOCAL_OWNER_KEY = "local-owner-uid";
var RESTORE_DISMISSED_KEY = "restore-offer-dismissed";
// Hesaba özel yerel durum anahtarları: hesap değişince temizlenir
var ACCOUNT_STATE_KEYS = ["admin-grants-applied", "focus-browser-applied", "grant-reapply-state", "auto-cloud-backup-last-date",
  "auto-backup-last-date", "yks-mistake-due-toast", "browser-restore-since", RESTORE_DISMISSED_KEY];
var sessionReadyResolve = null;
// Yeni cihaz kararı (bulut yedeğinden geri yükle / boş başla) verilene kadar otomatik yedek ve seans işleme beklemeli
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
function restoreCloudBackupNow(id) {
  return cloudBackupRef("payloads").doc(String(id)).get().then(function (doc) {
    var b64 = doc.exists ? (doc.data() || {}).payload : null;
    if (typeof b64 !== "string") throw new Error("yedek içeriği yok");
    return gunzipToText(backupBase64ToBytes(b64));
  }).then(function (text) {
    if (!stagePendingRestore(JSON.parse(text))) throw new Error("geçersiz yedek");
    confirmPendingRestore();   // geri yükler ve sayfayı yeniler
  });
}
function showRestoreOffer(best, uid, done) {
  var ov = document.createElement("div");
  ov.className = "admin-msg-overlay";
  ov.id = "restoreOfferOverlay";
  var box = document.createElement("div");
  box.className = "admin-msg-box";
  var title = document.createElement("div");
  title.className = "admin-msg-title";
  title.textContent = "☁️ Bulutta yedeğin var";
  var text = document.createElement("p");
  text.className = "admin-msg-text";
  text.textContent = "Bu cihazda henüz verin yok. Hesabında " + formatCloudBackupDate(best.createdAtMs) + " tarihli bir bulut yedeği (" + best.keyCount + " kayıt) bulunuyor. Geri yüklensin mi?";
  var yes = document.createElement("button");
  yes.type = "button"; yes.className = "save-btn"; yes.textContent = "Geri yükle";
  var no = document.createElement("button");
  no.type = "button"; no.className = "save-btn"; no.style.marginLeft = "8px"; no.textContent = "Boş başla";
  yes.addEventListener("click", function () {
    yes.disabled = true; no.disabled = true;
    text.textContent = "Yedek indiriliyor…";
    restoreCloudBackupNow(best.id).catch(function () {
      text.textContent = "Yedek geri yüklenemedi. İnternetini kontrol edip sayfayı yenile ya da Ayarlar'dan tekrar dene.";
      no.disabled = false; no.textContent = "Boş başla";
    });
  });
  no.addEventListener("click", function () {
    storageSet(RESTORE_DISMISSED_KEY, uid).then(function () { ov.remove(); done(); });
  });
  box.appendChild(title); box.appendChild(text); box.appendChild(yes); box.appendChild(no);
  ov.appendChild(box);
  document.body.appendChild(ov);
}
// Yeni cihazda bulut yedeği varsa geri yüklemeyi önerir; karar verilene (ya da öneri yoksa hemen) çözülür
function offerCloudRestoreIfFresh(uid) {
  return storageGet(RESTORE_DISMISSED_KEY).then(function (dismissed) {
    if (dismissed === uid || !cloudBackupAvailable()) return false;
    return listCloudBackups().then(function (items) {
      var best = null;
      items.forEach(function (it) { if (!best && it.keyCount > 1) best = it; });   // en yeni, içeriği olan yedek
      if (!best) return false;
      return new Promise(function (resolve) { showRestoreOffer(best, uid, resolve); });
    });
  }).catch(function () { return false; });
}

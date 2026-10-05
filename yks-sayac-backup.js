// ============================================================================
// YKS Sayaç — Yedekleme: dışa aktarma, bulut (Firestore) yedeği, otomatik yedek, yedekten geri yükleme
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Veri Yedekleme ----

var BACKUP_PREFIXES = ["progress-", "topics-", "study-", "streak-celebrated-"];
var BACKUP_SINGLE_KEYS = ["yks-settings", "notes-pages", "focus-city", "deneme-records"];
function collectAllBackupKeys() {
  return Promise.all(BACKUP_PREFIXES.map(function (p) { return storageListKeys(p); }))
    .then(function (results) {
      var all = BACKUP_SINGLE_KEYS.slice();
      results.forEach(function (keys) { all = all.concat(keys); });
      var seen = {};
      return all.filter(function (k) {
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
    });
}
function exportBackup() {
  return collectAllBackupKeys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      return storageGet(key).then(function (value) { return { key: key, value: value }; });
    }));
  }).then(function (entries) {
    var data = {};
    entries.forEach(function (e) {
      if (e.value !== null && e.value !== undefined) data[e.key] = e.value;
    });
    return { app: "yks-sayac", exportedAt: new Date().toISOString(), version: 1, data: data };
  });
}
function showBackupStatus(text, isError) {
  var noteEl = document.getElementById("backupStatusNote");
  if (!noteEl) return;
  noteEl.textContent = text;
  noteEl.style.color = isError ? "var(--danger)" : "var(--ink-dim)";
}
function downloadBackupFile() {
  return exportBackup().then(function (payload) {
    var count = Object.keys(payload.data).length;
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "yks-sayac-yedek-" + dateStr(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return { ok: true, count: count };
  }).catch(function (err) {
    console.error("Yedek alma hatası:", err);
    return { ok: false, error: err };
  });
}
// ---- Bulut yedeği (Firestore) ----
// userBackups/{uid}/items/{id}    -> küçük üst veri (liste için)
// userBackups/{uid}/payloads/{id} -> gzip + base64 yedek içeriği (tek belge ~1 MiB sınırı)
// Kurallar yalnızca sahibine okuma/yazma/silme izni verir; koç ve yönetici göremez.
var CLOUD_BACKUP_KEEP_AUTO = 7;
var CLOUD_BACKUP_KEEP_MANUAL = 5;
var CLOUD_BACKUP_MAX_CHARS = 900000;
function cloudBackupAvailable() {
  return typeof fbDb !== "undefined" && !!fbDb &&
    typeof currentUserUid !== "undefined" && !!currentUserUid &&
    typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}
function cloudBackupRef(sub) {
  return fbDb.collection("userBackups").doc(currentUserUid).collection(sub);
}
function backupBytesToBase64(bytes) {
  var s = "";
  var CH = 0x8000;
  for (var i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(s);
}
function backupBase64ToBytes(b64) {
  var s = atob(b64);
  var out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function backupStreamToBytes(readable) {
  var reader = readable.getReader();
  var chunks = [];
  var total = 0;
  function pump() {
    return reader.read().then(function (r) {
      if (r.done) {
        var out = new Uint8Array(total);
        var off = 0;
        chunks.forEach(function (c) { out.set(c, off); off += c.length; });
        return out;
      }
      chunks.push(r.value);
      total += r.value.length;
      return pump();
    });
  }
  return pump();
}
function gzipText(text) {
  var cs = new CompressionStream("gzip");
  var w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(text)).catch(function () {});
  w.close().catch(function () {});
  return backupStreamToBytes(cs.readable);
}
function gunzipToText(bytes) {
  var ds = new DecompressionStream("gzip");
  var w = ds.writable.getWriter();
  w.write(bytes).catch(function () {});
  w.close().catch(function () {});
  return backupStreamToBytes(ds.readable).then(function (b) {
    return new TextDecoder("utf-8").decode(b);
  });
}
function pruneCloudBackups() {
  return cloudBackupRef("items").orderBy("createdAtMs", "desc").limit(60).get().then(function (snap) {
    var seen = { auto: 0, manual: 0 };
    var drop = [];
    snap.forEach(function (d) {
      var kind = ((d.data() || {}).kind === "auto") ? "auto" : "manual";
      seen[kind]++;
      var keep = kind === "auto" ? CLOUD_BACKUP_KEEP_AUTO : CLOUD_BACKUP_KEEP_MANUAL;
      if (seen[kind] > keep) drop.push(d.id);
    });
    if (!drop.length) return null;
    var batch = fbDb.batch();
    drop.forEach(function (id) {
      batch.delete(cloudBackupRef("items").doc(id));
      batch.delete(cloudBackupRef("payloads").doc(id));
    });
    return batch.commit();
  });
}
function saveCloudBackup(kind) {
  if (!cloudBackupAvailable()) return Promise.resolve({ ok: false, reason: "unavailable" });
  return exportBackup().then(function (payload) {
    var keyCount = Object.keys(payload.data).length;
    return gzipText(JSON.stringify(payload)).then(function (bytes) {
      var b64 = backupBytesToBase64(bytes);
      if (b64.length > CLOUD_BACKUP_MAX_CHARS) {
        return { ok: false, reason: "too-big", kb: Math.round(b64.length / 1024) };
      }
      var now = Date.now();
      var id = "b" + now;
      var batch = fbDb.batch();
      batch.set(cloudBackupRef("payloads").doc(id), { payload: b64 });
      batch.set(cloudBackupRef("items").doc(id), {
        kind: kind === "auto" ? "auto" : "manual",
        createdAtMs: now,
        appVersion: String(APP_VERSION),
        keyCount: keyCount,
        bytes: b64.length
      });
      return batch.commit().then(function () {
        pruneCloudBackups().catch(function () {});
        return { ok: true, id: id, kb: Math.round(b64.length / 1024), count: keyCount };
      });
    });
  }).catch(function (err) {
    console.error("Bulut yedeği hatası:", err);
    return { ok: false, reason: "error", error: err };
  });
}
function listCloudBackups() {
  return cloudBackupRef("items").orderBy("createdAtMs", "desc").limit(20).get().then(function (snap) {
    var out = [];
    snap.forEach(function (d) {
      var v = d.data() || {};
      out.push({
        id: d.id,
        kind: v.kind === "auto" ? "auto" : "manual",
        createdAtMs: Number(v.createdAtMs) || 0,
        kb: Math.round((Number(v.bytes) || 0) / 1024),
        keyCount: Number(v.keyCount) || 0
      });
    });
    return out;
  });
}
function stageCloudRestore(id) {
  showBackupStatus("Yedek indiriliyor…", false);
  return cloudBackupRef("payloads").doc(String(id)).get().then(function (doc) {
    var b64 = doc.exists ? (doc.data() || {}).payload : null;
    if (typeof b64 !== "string") throw new Error("yedek içeriği yok");
    return gunzipToText(backupBase64ToBytes(b64));
  }).then(function (text) {
    var parsed = JSON.parse(text);
    showBackupStatus("", false);
    stagePendingRestore(parsed);
  }).catch(function (err) {
    console.error("Bulut yedeği okunamadı:", err);
    showBackupStatus("Bulut yedeği okunamadı.", true);
  });
}
function formatCloudBackupDate(ms) {
  var d = new Date(ms);
  return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function renderCloudBackupList() {
  var box = document.getElementById("cloudBackupList");
  if (!box) return Promise.resolve();
  box.textContent = "";
  if (!cloudBackupAvailable()) {
    showBackupStatus("Bulut yedeği için giriş yapmış olman gerekiyor.", true);
    return Promise.resolve();
  }
  showBackupStatus("Yedekler yükleniyor…", false);
  return listCloudBackups().then(function (items) {
    showBackupStatus("", false);
    if (!items.length) {
      showBackupStatus("Henüz bulutta yedeğin yok.", false);
      return;
    }
    items.forEach(function (it) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "backup-btn backup-btn-secondary";
      btn.style.cssText = "width: 100%; margin-top: 6px; text-align: left;";
      btn.textContent = formatCloudBackupDate(it.createdAtMs) + " · " + (it.kind === "auto" ? "otomatik" : "elle") + " · " + it.kb + " KB";
      btn.addEventListener("click", function () { stageCloudRestore(it.id); });
      box.appendChild(btn);
    });
  }).catch(function (err) {
    console.error("Bulut yedek listesi alınamadı:", err);
    showBackupStatus("Bulut yedekleri listelenemedi.", true);
  });
}
function cloudBackupNow() {
  if (!cloudBackupAvailable()) {
    showBackupStatus("Bulut yedeği için giriş yapmış olman gerekiyor.", true);
    return Promise.resolve({ ok: false });
  }
  showBackupStatus("Buluta yedekleniyor…", false);
  return saveCloudBackup("manual").then(function (res) {
    if (res.ok) {
      showBackupStatus("✓ Buluta yedeklendi (" + res.count + " kayıt, " + res.kb + " KB).", false);
    } else if (res.reason === "too-big") {
      showBackupStatus("Yedek bulut sınırını aşıyor (" + res.kb + " KB, sınır ~" + Math.round(CLOUD_BACKUP_MAX_CHARS / 1024) + " KB). Üstteki ⬇ ile dosyaya indir.", true);
    } else {
      showBackupStatus("Buluta yedeklenemedi. İnternetini kontrol edip tekrar dene ya da ⬇ ile dosyaya indir.", true);
    }
    return res;
  });
}
function maybeAutoBackup() {
  var todayStr = dateStr(new Date());
  if (cloudBackupAvailable()) {
    storageGet("auto-cloud-backup-last-date").then(function (value) {
      if (value === todayStr) return;
      saveCloudBackup("auto").then(function (res) {
        if (res && res.ok) {
          storageSet("auto-cloud-backup-last-date", todayStr);
          return;
        }
        // Bulut olmadı (çevrimdışı, yedek çok büyük...): eski yönteme dön, dosya indir.
        downloadBackupFile().then(function (r) {
          if (r && r.ok) storageSet("auto-cloud-backup-last-date", todayStr);
        });
      });
    }).catch(function (err) { console.error("Otomatik yedekleme hatası:", err); });
    return;
  }
  storageGet("auto-backup-last-date").then(function (value) {
    if (value === todayStr) return;
    downloadBackupFile().then(function (res) {
      if (res && res.ok) storageSet("auto-backup-last-date", todayStr);
    });
  }).catch(function (err) { console.error("Otomatik yedekleme hatası:", err); });
}
var pendingRestoreData = null;
var pendingRestoreExportedAt = 0;
// Dosyadan ya da buluttan gelen yedeği doğrular ve onay kutusunu açar (true = onaya hazır).
function stagePendingRestore(parsed) {
  if (!parsed || typeof parsed.data !== "object" || !parsed.data) {
    showBackupStatus("Bu yedek geçerli bir YKS Sayaç yedeği gibi görünmüyor.", true);
    return false;
  }
  var keys = Object.keys(parsed.data);
  if (!keys.length) {
    showBackupStatus("Yedek boş görünüyor.", true);
    return false;
  }
  pendingRestoreData = parsed.data;
  pendingRestoreExportedAt = Date.parse(parsed.exportedAt) || 0;   // yedeğin alındığı an: sonrasındaki yönetici işlemleri yeniden uygulanır
  var box = document.getElementById("backupConfirmBox");
  var text = document.getElementById("backupConfirmText");
  if (text) {
    text.textContent = keys.length + " kayıt geri yüklenecek ve mevcut verilerin üzerine yazılacak. Onaylıyor musun?";
  }
  if (box) box.classList.add("open");
  return true;
}
function restoreBackupFromFile(file) {
  showBackupStatus("", false);
  var reader = new FileReader();
  reader.onload = function () {
    var parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showBackupStatus("Dosya okunamadı. Geçerli bir yedek (.json) dosyası seç.", true);
      return;
    }
    stagePendingRestore(parsed);
  };
  reader.onerror = function () {
    showBackupStatus("Dosya okunamadı.", true);
  };
  reader.readAsText(file, "utf-8");
}
function cancelPendingRestore() {
  pendingRestoreData = null;
  var box = document.getElementById("backupConfirmBox");
  if (box) box.classList.remove("open");
}
function confirmPendingRestore() {
  if (!pendingRestoreData) return;
  var keys = Object.keys(pendingRestoreData);
  var data = pendingRestoreData;
  var box = document.getElementById("backupConfirmBox");
  if (box) box.classList.remove("open");
  showBackupStatus("Geri yükleniyor…", false);
  // Not sayfalarının HTML içeriği geri yüklenirken temizlenir (yedek dosyası güvenilmez girdidir)
  if (typeof data["notes-pages"] === "string") {
    try {
      var np = JSON.parse(data["notes-pages"]);
      if (np && Array.isArray(np.pages)) {
        np.pages.forEach(function (pg) {
          if (!pg || typeof pg !== "object") return;
          pg.content = sanitizeNoteHtml(pg.content || "");
          pg.title = String(pg.title || "").slice(0, 300);
          pg.tag = String(pg.tag || "").slice(0, 100);
        });
        data["notes-pages"] = JSON.stringify(np);
      }
    } catch (e) {}
  }
  var sinceMs = pendingRestoreExportedAt;
  Promise.all(keys.map(function (k) { return storageSet(k, data[k]); })).then(function () {
    pendingRestoreData = null;
    pendingRestoreExportedAt = 0;
    if (!(sinceMs > 0)) return null;
    showBackupStatus("Yönetici işlemleri kontrol ediliyor…", false);
    // Yedekten sonra yöneticinin düştüğü/eklediği altın ve süreler geri gelmesin; çevrimdışıysa sonraki açılışta uygulanır.
    return scheduleGrantReapply(sinceMs).then(function () {
      return Promise.race([reapplyAdminGrantsSince(), new Promise(function (resolve) { setTimeout(resolve, 8000); })]);
    });
  }).then(function () {
    showBackupStatus(keys.length + " kayıt geri yüklendi. Sayfa yenileniyor…", false);
    setTimeout(function () { location.reload(); }, 900);
  }).catch(function (err) {
    console.error("Geri yükleme hatası:", err);
    showBackupStatus("Geri yükleme sırasında bir hata oluştu.", true);
  });
}

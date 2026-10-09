// ============================================================================
// YKS Sayaç — Hata arşivi (yanlış defteri)
// Öğrenci çözemediği/yanlış yaptığı soruyu konu ağacından seçip görseliyle kaydeder.
// studentData/{uid}/errors/{id}        : küçük üst veri (liste için)
// studentData/{uid}/errorImages/{id}   : sıkıştırılmış görsel (sadece açılınca okunur)
// Koç için açık hata sayıları info/meta belgesinde errorStats olarak tutulur.
// ============================================================================

var MISTAKE_REASONS = { bilgi: "Bilgi eksiği", dikkat: "Dikkat hatası", sure: "Süre yetmedi", yorum: "Soruyu yanlış anladım", diger: "Diğer" };
var mistakeUid = null;
var mistakeList = [];
var mistakeNewImg = "";
var mistakeFilter = "open";
var mistakeWired = false;
var mistakeFilterPicked = false;
var MISTAKE_DAY = 86400000;

// Aralıklı tekrar: çözüldü işaretlenince 3 gün sonra, her başarılı tekrardan sonra 7 ve 14 gün sonra tekrar çıkar.
function mistakeIsDue(m) { return m.status === "solved" && m.nextReview > 0 && m.nextReview <= Date.now(); }
function mistakeReviewText(m) {
  if (m.status !== "solved") return "";
  if (m.reviewStep >= 4) return "Öğrenildi ✓";
  if (!(m.nextReview > 0)) return "";
  if (m.nextReview <= Date.now()) return "Tekrar zamanı!";
  return "Tekrar: " + Math.ceil((m.nextReview - Date.now()) / MISTAKE_DAY) + " gün sonra";
}
function mistakeAfterSolved() { return { status: "solved", reviewStep: 1, nextReview: Date.now() + 3 * MISTAKE_DAY }; }
function mistakeAfterReview(m, passed) {
  if (!passed) return { status: "open", reviewStep: 0, nextReview: 0 };
  var step = (m.reviewStep || 1) + 1;
  if (step === 2) return { reviewStep: 2, nextReview: Date.now() + 7 * MISTAKE_DAY };
  if (step === 3) return { reviewStep: 3, nextReview: Date.now() + 14 * MISTAKE_DAY };
  return { reviewStep: 4, nextReview: 0 };
}

function mistakeEl(id) { return document.getElementById(id); }

function mistakeCompress(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function () { reject(new Error("Görsel okunamadı.")); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { reject(new Error("Görsel açılamadı.")); };
      img.onload = function () {
        var scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        var q = 0.72;
        for (var i = 0; i < 5; i++) {
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          var ctx = c.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var out = c.toDataURL("image/jpeg", q);
          if (out.length < 650000) return resolve(out);
          scale *= 0.8;
          q = Math.max(0.5, q - 0.06);
        }
        reject(new Error("Görsel çok büyük."));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(blob);
  });
}

function mistakeFill(sel, names) {
  sel.innerHTML = "";
  names.forEach(function (n) {
    var o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
}
function mistakePopulateDers() {
  mistakeFill(mistakeEl("mistakeDers"), Object.keys(YKS_TOPICS[mistakeEl("mistakeExam").value] || {}));
  mistakePopulateKonu();
}
function mistakePopulateKonu() {
  var exam = mistakeEl("mistakeExam").value;
  mistakeFill(mistakeEl("mistakeKonu"), ((YKS_TOPICS[exam] || {})[mistakeEl("mistakeDers").value]) || []);
}

function mistakeSetImage(blob) {
  var msg = mistakeEl("mistakeFormMsg");
  msg.textContent = "Görsel hazırlanıyor…";
  return mistakeCompress(blob).then(function (data) {
    mistakeNewImg = data;
    var pv = mistakeEl("mistakePreview");
    pv.src = data;
    pv.style.display = "block";
    msg.textContent = "";
  }).catch(function (e) { msg.textContent = e.message || "Görsel eklenemedi."; });
}

function mistakeCol(name) { return fbDb.collection("studentData").doc(mistakeUid).collection(name); }

function mistakeSyncStats() {
  var by = {}, total = 0;
  mistakeList.forEach(function (m) {
    if (m.status !== "open") return;
    var k = m.ders + "\u0001" + m.konu;
    by[k] = (by[k] || 0) + 1;
    total++;
  });
  var stats = Object.keys(by).map(function (k) { var p = k.split("\u0001"); return { d: p[0], k: p[1], n: by[k] }; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 40);
  mistakeCol("info").doc("meta").set({ errorStats: stats, errorOpen: total }, { merge: true }).catch(function () {});
}

function mistakeLoad() {
  if (!mistakeUid) return;
  mistakeCol("errors").orderBy("createdAt", "desc").get().then(function (snap) {
    mistakeList = [];
    snap.forEach(function (d) { var x = d.data(); x.id = d.id; mistakeList.push(x); });
    if (!mistakeFilterPicked) { mistakeFilter = mistakeList.some(mistakeIsDue) ? "due" : "open"; mistakeFilterPicked = true; }
    mistakeRender();
  }).catch(function () {
    var e = mistakeEl("mistakeEmpty");
    e.textContent = "Liste yüklenemedi, tekrar dener misin?";
    e.style.display = "block";
  });
}

function mistakeRender() {
  var box = mistakeEl("mistakeList");
  box.innerHTML = "";
  var dueBtn = document.querySelector('.mistake-filter[data-f="due"]');
  if (dueBtn) dueBtn.textContent = "Tekrar (" + mistakeList.filter(mistakeIsDue).length + ")";
  Array.prototype.forEach.call(document.querySelectorAll(".mistake-filter"), function (b) {
    b.classList.toggle("active", b.getAttribute("data-f") === mistakeFilter);
  });
  var shown = mistakeList.filter(function (m) {
    return mistakeFilter === "all" || (mistakeFilter === "due" ? mistakeIsDue(m) : m.status === mistakeFilter);
  });
  var empty = mistakeEl("mistakeEmpty");
  empty.style.display = shown.length ? "none" : "block";
  empty.textContent = mistakeFilter === "due" ? "Bugün tekrar edilecek hata yok." : mistakeFilter === "solved" ? "Henüz çözülmüş hata yok." : "Burada gösterilecek hata yok.";
  shown.forEach(function (m) {
    var card = document.createElement("div");
    card.className = "mistake-card" + (m.status === "solved" ? " solved" : "");
    var head = document.createElement("div");
    head.className = "mistake-head";
    head.textContent = m.ders + " › " + m.konu;
    var meta = document.createElement("div");
    meta.className = "mistake-meta";
    meta.textContent = m.exam + " · " + (MISTAKE_REASONS[m.reason] || "Diğer") + " · " + new Date(m.createdAt).toLocaleDateString("tr-TR");
    card.appendChild(head);
    card.appendChild(meta);
    if (m.note) {
      var note = document.createElement("p");
      note.className = "mistake-note-text";
      note.textContent = m.note;
      card.appendChild(note);
    }
    if (m.coachNote) {
      var cn = document.createElement("p");
      cn.className = "mistake-note-text";
      cn.style.color = "var(--amber)";
      cn.textContent = "Koç notu: " + m.coachNote;
      card.appendChild(cn);
    }
    var rv = mistakeReviewText(m);
    if (rv) {
      var rvEl = document.createElement("div");
      rvEl.className = "mistake-meta";
      rvEl.textContent = rv;
      card.appendChild(rvEl);
    }
    var row = document.createElement("div");
    row.className = "mistake-actions";
    function btn(label, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", fn);
      row.appendChild(b);
    }
    btn("Görseli aç", function () { mistakeOpenImage(m.id); });
    if (mistakeIsDue(m)) {
      btn("Tekrar çözdüm ✓", function () { mistakeApply(m, mistakeAfterReview(m, true)); });
      btn("Yine yapamadım", function () { mistakeApply(m, mistakeAfterReview(m, false)); });
    } else if (m.status === "solved") {
      btn("Yeniden aç", function () { mistakeApply(m, { status: "open", reviewStep: 0, nextReview: 0 }); });
    } else {
      btn("✓ Çözüldü", function () { mistakeApply(m, mistakeAfterSolved()); });
    }
    btn("Sil", function () { mistakeDelete(m); });
    card.appendChild(row);
    box.appendChild(card);
  });
}

function mistakeOpenImage(id) {
  mistakeCol("errorImages").doc(id).get().then(function (d) {
    var src = d.exists ? d.data().img : "";
    if (!src) { showUpdateToast("Bu hata için görsel yok."); return; }
    mistakeEl("mistakeViewerImg").src = src;
    mistakeEl("mistakeViewer").style.display = "flex";
  }).catch(function () { showUpdateToast("Görsel yüklenemedi."); });
}

function mistakeApply(m, patch) {
  mistakeCol("errors").doc(m.id).update(patch).then(function () {
    Object.keys(patch).forEach(function (k) { m[k] = patch[k]; });
    mistakeRender();
    mistakeSyncStats();
  }).catch(function () { showUpdateToast("Güncellenemedi, tekrar dener misin?"); });
}

function mistakeDelete(m) {
  if (!window.confirm("Bu hata silinsin mi?")) return;
  var batch = fbDb.batch();
  batch.delete(mistakeCol("errors").doc(m.id));
  batch.delete(mistakeCol("errorImages").doc(m.id));
  batch.commit().then(function () {
    mistakeList = mistakeList.filter(function (x) { return x.id !== m.id; });
    mistakeRender();
    mistakeSyncStats();
  }).catch(function () { showUpdateToast("Silinemedi, tekrar dener misin?"); });
}

function mistakeSave() {
  var msg = mistakeEl("mistakeFormMsg");
  var konu = mistakeEl("mistakeKonu").value;
  if (!konu) { msg.textContent = "Önce bir konu seç."; return; }
  var meta = {
    exam: mistakeEl("mistakeExam").value,
    ders: mistakeEl("mistakeDers").value,
    konu: konu,
    reason: mistakeEl("mistakeReason").value,
    note: mistakeEl("mistakeNote").value.trim().slice(0, 300),
    status: "open",
    createdAt: Date.now()
  };
  var id = mistakeCol("errors").doc().id;
  var batch = fbDb.batch();
  batch.set(mistakeCol("errors").doc(id), meta);
  if (mistakeNewImg) batch.set(mistakeCol("errorImages").doc(id), { img: mistakeNewImg });
  var btn = mistakeEl("mistakeSaveBtn");
  btn.disabled = true;
  msg.textContent = "Kaydediliyor…";
  batch.commit().then(function () {
    meta.id = id;
    mistakeList.unshift(meta);
    mistakeNewImg = "";
    mistakeEl("mistakePreview").style.display = "none";
    mistakeEl("mistakeNote").value = "";
    mistakeEl("mistakeFile").value = "";
    msg.textContent = "Kaydedildi ✓";
    mistakeRender();
    mistakeSyncStats();
  }).catch(function () {
    msg.textContent = "Kaydedilemedi, tekrar dener misin?";
  }).then(function () { btn.disabled = false; });
}

function initMistakesView() {
  var dateEl = mistakeEl("errorsViewDate");
  if (dateEl) {
    var now = new Date();
    dateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
  }
  var themeBtn = mistakeEl("errorsThemeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
    });
  }
  if (!mistakeWired) {
    mistakeWired = true;
    mistakeEl("mistakeExam").addEventListener("change", mistakePopulateDers);
    mistakeEl("mistakeDers").addEventListener("change", mistakePopulateKonu);
    mistakeEl("mistakeFile").addEventListener("change", function (e) { if (e.target.files[0]) mistakeSetImage(e.target.files[0]); });
    mistakeEl("mistakeSaveBtn").addEventListener("click", mistakeSave);
    mistakeEl("mistakeViewer").addEventListener("click", function () { this.style.display = "none"; });
    document.addEventListener("paste", function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image/") === 0) { mistakeSetImage(items[i].getAsFile()); e.preventDefault(); return; }
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".mistake-filter"), function (b) {
      b.addEventListener("click", function () { mistakeFilter = b.getAttribute("data-f"); mistakeRender(); });
    });
  }
  mistakePopulateDers();
  fbAuth.onAuthStateChanged(function (user) {
    if (!user) {
      mistakeEl("mistakeLoggedOut").style.display = "block";
      mistakeEl("mistakeFormCard").style.display = "none";
      mistakeEl("mistakeListCard").style.display = "none";
      return;
    }
    mistakeUid = user.uid;
    mistakeLoad();
  });
}

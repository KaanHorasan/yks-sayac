// ============================================================================
// YKS Sayaç — Deneme takibi
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Deneme Takibi ----

var EXAM_TEMPLATES = {
  "TYT": { label: "TYT", subjects: [
    { name: "Türkçe", max: 40 }, { name: "Sosyal Bilimler", max: 20 },
    { name: "Matematik", max: 40 }, { name: "Fen Bilimleri", max: 20 }
  ] },
  "AYT-SAY": { label: "AYT (Sayısal)", subjects: [
    { name: "Matematik", max: 40 }, { name: "Fizik", max: 14 },
    { name: "Kimya", max: 13 }, { name: "Biyoloji", max: 13 }
  ] },
  "AYT-EA": { label: "AYT (Eşit Ağırlık)", subjects: [
    { name: "Matematik", max: 40 }, { name: "Türk Dili ve Edebiyatı", max: 24 },
    { name: "Tarih-1", max: 10 }, { name: "Coğrafya-1", max: 6 }
  ] },
  "AYT-SOZ": { label: "AYT (Sözel)", subjects: [
    { name: "Türk Dili ve Edebiyatı", max: 24 }, { name: "Tarih-1", max: 10 }, { name: "Coğrafya-1", max: 6 },
    { name: "Tarih-2", max: 11 }, { name: "Coğrafya-2", max: 11 },
    { name: "Felsefe Grubu", max: 12 }, { name: "Din Kültürü", max: 6 }
  ] }
};
var examState = { records: [] };
function examStorageKey() { return "deneme-records"; }
function loadExamRecords() {
  return storageGet(examStorageKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        if (parsed && Array.isArray(parsed.records)) return parsed;
      } catch (e) {}
    }
    return { records: [] };
  });
}
function saveExamRecords() {
  return storageSet(examStorageKey(), JSON.stringify(examState));
}
function computeNet(correct, wrong) {
  correct = correct || 0;
  wrong = wrong || 0;
  return Math.round((correct - wrong / 4) * 100) / 100;
}
function renderExamSubjectGrid() {
  var grid = document.getElementById("examSubjectGrid");
  var typeSel = document.getElementById("examTypeSelect");
  if (!grid || !typeSel) return;
  var tpl = EXAM_TEMPLATES[typeSel.value];
  grid.innerHTML =
    '<div class="exam-subject-row">' +
      '<span class="exam-subject-row-head">ders</span>' +
      '<span class="exam-subject-row-head">doğru</span>' +
      '<span class="exam-subject-row-head">yanlış</span>' +
      '<span class="exam-subject-row-head">boş</span>' +
      '<span class="exam-subject-row-head">net</span>' +
    '</div>';
  tpl.subjects.forEach(function (s, i) {
    var row = document.createElement("div");
    row.className = "exam-subject-row";
    row.dataset.subject = s.name;
    row.innerHTML =
      '<span class="exam-subject-name">' + s.name + '<small>' + s.max + ' soru</small></span>' +
      '<input type="number" min="0" max="' + s.max + '" class="exam-input-correct" data-idx="' + i + '">' +
      '<input type="number" min="0" max="' + s.max + '" class="exam-input-wrong" data-idx="' + i + '">' +
      '<span class="exam-subject-empty" id="examSubjectEmpty' + i + '">' + s.max + '</span>' +
      '<span class="exam-subject-net" id="examSubjectNet' + i + '">0.00</span>';
    grid.appendChild(row);
  });
  Array.prototype.forEach.call(grid.querySelectorAll("input"), function (inp) {
    inp.addEventListener("input", updateExamLiveTotals);
  });
  updateExamLiveTotals();
}
function updateExamLiveTotals() {
  var typeSel = document.getElementById("examTypeSelect");
  var tpl = EXAM_TEMPLATES[typeSel.value];
  var total = 0;
  var anyOverflow = false;
  tpl.subjects.forEach(function (s, i) {
    var c = parseFloat((document.querySelector('.exam-input-correct[data-idx="' + i + '"]') || {}).value) || 0;
    var w = parseFloat((document.querySelector('.exam-input-wrong[data-idx="' + i + '"]') || {}).value) || 0;
    var overflow = (c + w) > s.max;
    if (overflow) anyOverflow = true;
    var empty = Math.max(0, s.max - c - w);
    var net = computeNet(c, w);
    total += net;
    var emptyEl = document.getElementById("examSubjectEmpty" + i);
    if (emptyEl) {
      emptyEl.textContent = overflow ? "!" : empty;
      emptyEl.style.color = overflow ? "var(--danger)" : "";
    }
    var netEl = document.getElementById("examSubjectNet" + i);
    if (netEl) netEl.textContent = net.toFixed(2);
    var rowEl = emptyEl ? emptyEl.closest(".exam-subject-row") : null;
    if (rowEl) rowEl.classList.toggle("exam-row-invalid", overflow);
  });
  var totalEl = document.getElementById("examTotalNetValue");
  if (totalEl) totalEl.textContent = total.toFixed(2);
  var note = document.getElementById("examSaveNote");
  if (note && anyOverflow) {
    note.textContent = "Bir dersteki doğru+yanlış toplamı soru sayısını geçiyor (kırmızı satır) — kaydetmeden önce düzelt.";
    note.style.color = "var(--danger)";
  } else if (note && note.dataset.overflowMsg) {
    note.textContent = "";
    delete note.dataset.overflowMsg;
  }
  if (note && anyOverflow) note.dataset.overflowMsg = "1";
}
function saveNewExamRecord() {
  var dateInput = document.getElementById("examDateInput");
  var typeSel = document.getElementById("examTypeSelect");
  var nameInput = document.getElementById("examNameInput");
  var note = document.getElementById("examSaveNote");
  var tpl = EXAM_TEMPLATES[typeSel.value];
  var date = dateInput.value || dateStr(new Date());

  var subjects = {};
  var total = 0;
  var overflowSubject = null;
  tpl.subjects.forEach(function (s, i) {
    var c = parseInt((document.querySelector('.exam-input-correct[data-idx="' + i + '"]') || {}).value, 10) || 0;
    var w = parseInt((document.querySelector('.exam-input-wrong[data-idx="' + i + '"]') || {}).value, 10) || 0;
    if (c + w > s.max) overflowSubject = s.name;
    var b = Math.max(0, s.max - c - w);
    var net = computeNet(c, w);
    total += net;
    subjects[s.name] = { correct: c, wrong: w, empty: b };
  });

  if (overflowSubject) {
    if (note) {
      note.textContent = "\"" + overflowSubject + "\" dersinde doğru+yanlış, soru sayısını geçiyor. Düzeltmeden kaydedilemez.";
      note.style.color = "var(--danger)";
    }
    return;
  }

  var record = {
    id: "e" + Date.now() + Math.random().toString(36).slice(2, 6),
    date: date,
    examKey: typeSel.value,
    name: nameInput.value.trim(),
    subjects: subjects,
    totalNet: Math.round(total * 100) / 100,
    createdAt: Date.now()
  };
  examState.records.push(record);
  saveExamRecords();

  if (note) {
    note.textContent = "Kaydedildi: " + EXAM_TEMPLATES[record.examKey].label + " · " + record.totalNet.toFixed(2) + " net";
    note.style.color = "var(--ink-dim)";
  }
  nameInput.value = "";
  renderExamSubjectGrid();
  renderExamChartTab(document.querySelector("#examChartTabs .range-btn.active").getAttribute("data-exam"));
  renderExamSubjectAverages();
  renderExamYksEstimate();
  renderExamHistory();
}
function buildNetChartSvg(records) {
  var width = 600, height = 200, padL = 40, padR = 16, padT = 20, padB = 28;
  if (!records.length) {
    return '<p class="dash-empty" style="display:block;">Bu sınav türü için henüz kayıt yok.</p>';
  }
  var nets = records.map(function (r) { return r.totalNet; });
  var maxNet = Math.max.apply(null, nets);
  var minNet = Math.min.apply(null, nets);
  var pad = Math.max(3, (maxNet - minNet) * 0.25);
  var yMax = maxNet + pad;
  var yMin = Math.max(0, minNet - pad);
  if (yMax - yMin < 6) { yMax += 3; yMin = Math.max(0, yMin - 3); }

  var innerW = width - padL - padR;
  var innerH = height - padT - padB;
  var n = records.length;
  function xAt(i) { return padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW); }
  function yAt(v) { return padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH; }

  var avg = nets.reduce(function (a, b) { return a + b; }, 0) / n;
  var linePoints = records.map(function (r, i) { return xAt(i) + "," + yAt(r.totalNet); }).join(" ");
  var areaPoints = linePoints + " " + xAt(n - 1) + "," + (padT + innerH) + " " + xAt(0) + "," + (padT + innerH);

  var dots = records.map(function (r, i) {
    return '<circle cx="' + xAt(i) + '" cy="' + yAt(r.totalNet) + '" r="4" fill="#e7a33e" stroke="var(--panel)" stroke-width="1.5"/>';
  }).join("");

  var seen = {};
  var labels = records.map(function (r, i) {
    var show = n <= 6 || i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2);
    if (!show) return "";
    var d = new Date(r.date);
    var txt = d.getDate() + "." + (d.getMonth() + 1);
    if (seen[txt]) { seen[txt]++; txt += " (" + seen[txt] + ")"; } else { seen[txt] = 1; }
    return '<text x="' + xAt(i) + '" y="' + (height - 8) + '" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">' + txt + '</text>';
  }).join("");

  return '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="200" style="color:var(--ink-dim);">' +
    '<defs><linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#e7a33e" stop-opacity="0.35"/><stop offset="100%" stop-color="#e7a33e" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<text x="' + (padL - 6) + '" y="' + (yAt(yMax) + 4) + '" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">' + yMax.toFixed(0) + '</text>' +
    '<text x="' + (padL - 6) + '" y="' + (yAt(yMin) + 4) + '" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">' + yMin.toFixed(0) + '</text>' +
    '<line x1="' + padL + '" y1="' + yAt(avg) + '" x2="' + (width - padR) + '" y2="' + yAt(avg) + '" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4,4"/>' +
    '<polygon points="' + areaPoints + '" fill="url(#netAreaGrad)"/>' +
    '<polyline points="' + linePoints + '" fill="none" stroke="#e7a33e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    dots + labels +
    '</svg>';
}
function renderExamChartTab(examKey) {
  var wrap = document.getElementById("examChartWrap");
  var statsWrap = document.getElementById("examChartStats");
  if (!wrap) return;
  var records = examState.records
    .filter(function (r) { return r.examKey === examKey; })
    .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  wrap.innerHTML = buildNetChartSvg(records);

  if (statsWrap) {
    if (!records.length) {
      statsWrap.innerHTML = "";
    } else {
      var nets = records.map(function (r) { return r.totalNet; });
      var last = nets[nets.length - 1];
      var avg = Math.round((nets.reduce(function (a, b) { return a + b; }, 0) / nets.length) * 100) / 100;
      var best = Math.max.apply(null, nets);
      var diff = records.length > 1 ? Math.round((last - nets[nets.length - 2]) * 100) / 100 : 0;
      var diffClass = diff > 0 ? "positive" : (diff < 0 ? "negative" : "");
      var diffText = (diff > 0 ? "+" : "") + diff.toFixed(2);
      statsWrap.innerHTML =
        '<div class="exam-chart-stat"><span class="exam-chart-stat-value">' + last.toFixed(2) + '</span><span class="exam-chart-stat-label">son net</span></div>' +
        '<div class="exam-chart-stat"><span class="exam-chart-stat-value ' + diffClass + '">' + diffText + '</span><span class="exam-chart-stat-label">önceki denemeye göre</span></div>' +
        '<div class="exam-chart-stat"><span class="exam-chart-stat-value">' + avg.toFixed(2) + '</span><span class="exam-chart-stat-label">ortalama</span></div>' +
        '<div class="exam-chart-stat"><span class="exam-chart-stat-value">' + best.toFixed(2) + '</span><span class="exam-chart-stat-label">en yüksek</span></div>';
    }
  }
}
function renderExamSubjectAverages() {
  var wrap = document.getElementById("examSubjectAvg");
  if (!wrap) return;
  var sums = {}, counts = {}, maxes = {};
  examState.records.forEach(function (r) {
    Object.keys(r.subjects || {}).forEach(function (name) {
      var s = r.subjects[name];
      var net = computeNet(s.correct, s.wrong);
      sums[name] = (sums[name] || 0) + net;
      counts[name] = (counts[name] || 0) + 1;
    });
  });
  Object.keys(EXAM_TEMPLATES).forEach(function (key) {
    EXAM_TEMPLATES[key].subjects.forEach(function (s) { maxes[s.name] = s.max; });
  });
  var names = Object.keys(sums);
  if (!names.length) {
    wrap.innerHTML = '<p class="dash-empty" style="display:block;">Henüz veri yok.</p>';
    return;
  }
  wrap.innerHTML = "";
  names.sort(function (a, b) { return (sums[b] / counts[b]) - (sums[a] / counts[a]); });
  names.forEach(function (name) {
    var avg = sums[name] / counts[name];
    var max = maxes[name] || 40;
    var pct = Math.max(2, Math.min(100, (avg / max) * 100));
    var row = document.createElement("div");
    row.className = "exam-subject-avg-row";
    row.innerHTML =
      '<span class="exam-subject-avg-label">' + escapeHtmlText(name) + '</span>' +
      '<span class="exam-subject-avg-track"><span class="exam-subject-avg-fill" style="width:' + pct + '%;"></span></span>' +
      '<span class="exam-subject-avg-value">' + avg.toFixed(1) + '</span>';
    wrap.appendChild(row);
  });
}
function renderExamYksEstimate() {
  var box = document.getElementById("examYksEstimateBox");
  if (!box) return;
  box.innerHTML = buildYksEstimateRowsHtml(examState.records || [], state.obp);
}
function deleteExamRecord(id) {
  var rec = examState.records.filter(function (r) { return r.id === id; })[0];
  if (!rec) return;
  var label = (rec.name || (EXAM_TEMPLATES[rec.examKey] || { label: String(rec.examKey || "deneme") }).label) + " · " + dateStr(new Date(rec.date));
  if (!confirm('"' + label + '" kaydını silmek istediğine emin misin?')) return;
  examState.records = examState.records.filter(function (r) { return r.id !== id; });
  saveExamRecords();
  renderExamChartTab(document.querySelector("#examChartTabs .range-btn.active").getAttribute("data-exam"));
  renderExamSubjectAverages();
  renderExamYksEstimate();
  renderExamHistory();
}
var examExpandedIds = {};
function renderExamHistory() {
  var list = document.getElementById("examHistoryList");
  var empty = document.getElementById("examHistoryEmpty");
  if (!list) return;
  list.innerHTML = "";
  var sorted = examState.records.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  if (!sorted.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  sorted.forEach(function (r) {
    var d = new Date(r.date);
    var li = document.createElement("li");
    li.className = "exam-history-item";
    var expanded = !!examExpandedIds[r.id];
    var subjectRows = Object.keys(r.subjects || {}).map(function (name) {
      var s = r.subjects[name];
      var net = computeNet(s.correct, s.wrong);
      return '<div class="exam-history-subject-row"><span>' + escapeHtmlText(name) + '</span>' +
        '<span class="exam-history-subject-detail">' + (Number(s.correct) || 0) + 'D ' + (Number(s.wrong) || 0) + 'Y ' + (Number(s.empty) || 0) + 'B</span>' +
        '<span class="exam-history-subject-net">' + net.toFixed(2) + '</span></div>';
    }).join("");
    li.innerHTML =
      '<div class="exam-history-row">' +
      '<span class="exam-history-date">' + d.getDate() + " " + months[d.getMonth()] + '</span>' +
      '<span class="exam-history-info"><span class="exam-history-type">' + escapeHtmlText((EXAM_TEMPLATES[r.examKey] || { label: String(r.examKey || "?") }).label) + '</span>' +
      '<span class="exam-history-name">' + escapeHtmlText(r.name || "İsimsiz deneme") + '</span></span>' +
      '<span class="exam-history-net">' + r.totalNet.toFixed(2) + '</span>' +
      '<button type="button" class="exam-history-toggle" aria-label="Ders detayı">' + (expanded ? "▲" : "▼") + '</button>' +
      '<button type="button" class="exam-history-delete" aria-label="Sil"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>' +
      '</div>' +
      '<div class="exam-history-detail" style="display:' + (expanded ? "block" : "none") + ';">' + subjectRows + '</div>';
    li.querySelector(".exam-history-toggle").addEventListener("click", function () {
      examExpandedIds[r.id] = !examExpandedIds[r.id];
      renderExamHistory();
    });
    li.querySelector(".exam-history-delete").addEventListener("click", function () { deleteExamRecord(r.id); });
    list.appendChild(li);
  });
}
function initExamView() {
  var dateEl = document.getElementById("examViewDate");
  var dateInput = document.getElementById("examDateInput");
  if (dateInput) dateInput.value = dateStr(new Date());

  loadExamRecords().then(function (data) {
    examState = data;
    if (dateEl) {
      var now = new Date();
      dateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear() +
        " · " + examState.records.length + " kayıt";
    }
    renderExamSubjectGrid();
    renderExamChartTab("TYT");
    renderExamSubjectAverages();
    renderExamYksEstimate();
    renderExamHistory();
  });

  document.getElementById("examTypeSelect").addEventListener("change", renderExamSubjectGrid);
  document.getElementById("examSaveBtn").addEventListener("click", saveNewExamRecord);

  var tabs = document.getElementById("examChartTabs");
  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".range-btn");
    if (!btn) return;
    Array.prototype.forEach.call(tabs.querySelectorAll(".range-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderExamChartTab(btn.getAttribute("data-exam"));
  });

  var fsBtn = document.getElementById("examFullscreenBtn");
  if (fsBtn) {
    fsBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      else document.exitFullscreen().catch(function () {});
    });
  }
  var themeBtn = document.getElementById("examThemeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
    });
  }
}

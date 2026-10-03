// ============================================================================
// YKS Sayaç — Çalışma sayacı: seri (streak), kronometre, ders dağılımı pastası
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

function formatHM(totalSeconds) {
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? (h + "s " + m + "dk") : (m + "dk");
}
// ---- Seri (streak) sistemi ----

var STREAK_THRESHOLD_SECONDS = 3 * 3600;
var STREAK_MAX_LOOKBACK_DAYS = 1000;
var CONFETTI_COLORS = ["#e7a33e", "#8fae8b", "#6b8fae", "#c97064", "#b58fd9", "#d9b56b"];
var streakBase = 0;
var streakDateStr = null;
var streakCelebratedForDate = null;
var streakDisplayedValue = null;
function getStudyDaySeconds(key, isToday) {
  return storageGet(key).then(function (value) {
    if (!value) return 0;
    try {
      var parsed = JSON.parse(value);
      var total = 0;
      var subs = parsed.subjects || {};
      Object.keys(subs).forEach(function (n) { total += subs[n] || 0; });
      if (isToday && parsed.running && parsed.startTs) {
        total += (Date.now() - parsed.startTs) / 1000;
      }
      return total;
    } catch (e) {
      return 0;
    }
  });
}
function computeBaseStreak() {
  function walk(daysBack, acc) {
    if (daysBack > STREAK_MAX_LOOKBACK_DAYS) return Promise.resolve(acc);
    var d = new Date();
    d.setDate(d.getDate() - daysBack);
    return getStudyDaySeconds("study-" + dateStr(d), false).then(function (secs) {
      if (secs >= STREAK_THRESHOLD_SECONDS) return walk(daysBack + 1, acc + 1);
      return acc;
    });
  }
  return walk(1, 0).then(function (base) {
    streakBase = base;
    return base;
  });
}
function buildConfettiOverlay(container, count) {
  var overlay = document.createElement("div");
  overlay.className = "streak-celebration";
  var width = container.clientWidth || 280;
  for (var i = 0; i < count; i++) {
    var piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.left = Math.round(Math.random() * width) + "px";
    piece.style.animationDuration = (1.6 + Math.random() * 1.1).toFixed(2) + "s";
    piece.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    overlay.appendChild(piece);
  }
  return overlay;
}
function triggerCelebrationMessage(container, message) {
  if (!container) return;
  var existing = container.querySelector(".streak-celebration");
  if (existing) existing.parentNode.removeChild(existing);
  var overlay = buildConfettiOverlay(container, 26);
  var msg = document.createElement("div");
  msg.className = "streak-celebration-msg";
  msg.textContent = message;
  overlay.appendChild(msg);
  container.appendChild(overlay);
  setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, 3300);
}
function triggerStreakCelebration(container, streakNumber) {
  triggerCelebrationMessage(container, "🔥 " + streakNumber + " günlük seri!");
}
function pulseStreakBadge(el) {
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}
var STREAK_ZERO_MESSAGES = [
  "Bugün başla, seri bugün doğsun.",
  "3 saatle ilk gününü kazan.",
  "Henüz serin yok, başlamak sende.",
  "İlk adım: bugün 3 saat çalış.",
  "Bugün çalış, seriyi başlat."
];
function getZeroStreakMessage() {
  var idx = Math.floor(Date.now() / 86400000) % STREAK_ZERO_MESSAGES.length;
  return STREAK_ZERO_MESSAGES[idx];
}
function renderStreakBadge(streakValue) {
  var isZero = streakValue === 0;

  var widgetBadge = document.getElementById("streakBadge");
  var widgetCount = document.getElementById("streakCount");
  var widgetLabel = document.getElementById("streakLabel");
  if (widgetBadge && widgetCount && widgetLabel) {
    widgetBadge.classList.add("visible");
    widgetBadge.classList.toggle("dim", isZero);
    widgetCount.style.display = isZero ? "none" : "";
    widgetCount.textContent = streakValue;
    widgetLabel.textContent = isZero ? getZeroStreakMessage() : "günlük seri";
  }

  var dashBadge = document.getElementById("streakBadgeDash");
  var dashCount = document.getElementById("streakCountDash");
  if (dashBadge && dashCount) {
    dashBadge.classList.add("visible");
    dashBadge.classList.toggle("dim", isZero);
    dashCount.textContent = streakValue;
  }
}
var streakCelebrationChecking = false;
function maybeCelebrateStreak(displayValue, qualifiesToday) {
  if (!qualifiesToday) return;
  var todayStr = dateStr(new Date());
  if (streakCelebratedForDate === todayStr || streakCelebrationChecking) return;
  streakCelebrationChecking = true;

  storageGet("streak-celebrated-" + todayStr).then(function (value) {
    streakCelebrationChecking = false;
    if (streakCelebratedForDate === todayStr) return; // already handled meanwhile
    streakCelebratedForDate = todayStr;
    if (value) return; // another window already celebrated this today
    storageSet("streak-celebrated-" + todayStr, "1");

    var widgetEl = document.getElementById("widget");
    if (widgetEl && widgetEl.style.display !== "none") {
      triggerStreakCelebration(widgetEl, displayValue);
      pulseStreakBadge(document.getElementById("streakBadge"));
    }
    var stopwatchCard = document.getElementById("stopwatchSubject");
    var dashCardEl = stopwatchCard ? stopwatchCard.closest(".dash-card") : null;
    if (dashCardEl) {
      triggerStreakCelebration(dashCardEl, displayValue);
      pulseStreakBadge(document.getElementById("streakBadgeDash"));
    }
  }).catch(function () { streakCelebrationChecking = false; });
}
function updateStreakDisplay() {
  var todayStr = dateStr(new Date());
  if (streakDateStr !== todayStr) {
    streakDateStr = todayStr;
    streakCelebratedForDate = null;
    streakDisplayedValue = null;
    computeBaseStreak().then(pollTodayStreak);
    return;
  }
  pollTodayStreak();
}
function pollTodayStreak() {
  getStudyDaySeconds(studyKey(), true).then(function (todaySeconds) {
    var qualifies = todaySeconds >= STREAK_THRESHOLD_SECONDS;
    var display = streakBase + (qualifies ? 1 : 0);
    if (display !== streakDisplayedValue) {
      streakDisplayedValue = display;
      renderStreakBadge(display);
    }
    maybeCelebrateStreak(display, qualifies);
  });
}
function elapsedRunningSeconds() {
  return studyState.running && studyState.startTs ? (Date.now() - studyState.startTs) / 1000 : 0;
}
function renderStudy() {
  var input = document.getElementById("stopwatchSubject");
  input.disabled = studyState.running;
  if (studyState.running) input.value = studyState.activeSubject;

  var name = studyState.running ? studyState.activeSubject : input.value.trim();
  var base = studyState.subjects[name] || 0;
  var extra = studyState.running && studyState.activeSubject === name ? elapsedRunningSeconds() : 0;
  var total = Math.floor(base + extra);

  var h = Math.floor(total / 3600);
  var m = Math.floor((total % 3600) / 60);
  var s = total % 60;
  document.getElementById("stopwatchTime").textContent = pad(h) + ":" + pad(m) + ":" + pad(s);

  var btn = document.getElementById("stopwatchToggle");
  btn.textContent = studyState.running ? "duraklat" : "başlat";
  btn.classList.toggle("running", studyState.running);

  renderSubjectBreakdown();
  renderSubjectPie();
  updateStreakDisplay();
  updateFocusTick();
  accrueStudyGold();
}
var pieColors = ["#e7a33e", "#8fae8b", "#6b8fae", "#c97064", "#b58fd9", "#d9b56b", "#7fbfae"];
var pieRange = "day";
var pieFetchToken = 0;
var lastPieFetchTs = 0;
var PIE_REFRESH_MS = 5000;
function storageListKeys(prefix) {
  if (hasCloudStorage() && window.storage.list) {
    return window.storage.list(prefix, false).then(function (res) {
      return res && res.keys ? res.keys : [];
    }).catch(function () { return []; });
  }
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) keys.push(k);
    }
    return Promise.resolve(keys);
  } catch (e) {
    return Promise.resolve([]);
  }
}
function lastNDaysKeys(n) {
  var keys = [];
  for (var i = n - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    keys.push("study-" + dateStr(d));
  }
  return keys;
}
function getDayEntries() {
  return Object.keys(studyState.subjects).map(function (name) {
    var secs = (studyState.subjects[name] || 0) +
      (studyState.running && studyState.activeSubject === name ? elapsedRunningSeconds() : 0);
    return { name: name, secs: Math.floor(secs) };
  }).filter(function (e) { return e.secs > 0; })
    .sort(function (a, b) { return b.secs - a.secs; });
}
function entriesFromTotals(totals) {
  return Object.keys(totals).map(function (name) {
    return { name: name, secs: Math.floor(totals[name]) };
  }).filter(function (e) { return e.secs > 0; })
    .sort(function (a, b) { return b.secs - a.secs; });
}
function drawPie(entries) {
  var pie = document.getElementById("subjectPie");
  var legend = document.getElementById("subjectPieLegend");
  if (!pie || !legend) return;

  var total = entries.reduce(function (sum, e) { return sum + e.secs; }, 0);

  legend.innerHTML = "";

  if (total === 0) {
    pie.style.background = "var(--panel-2)";
    legend.innerHTML = '<p class="dash-empty" style="display:block;">Henüz veri yok.</p>';
    return;
  }

  var gradientParts = [];
  var cursor = 0;
  entries.forEach(function (e, i) {
    var color = pieColors[i % pieColors.length];
    var pct = (e.secs / total) * 100;
    gradientParts.push(color + " " + cursor + "% " + (cursor + pct) + "%");
    cursor += pct;

    var row = document.createElement("div");
    row.className = "pie-legend-row";
    var dot = document.createElement("span");
    dot.className = "pie-dot";
    dot.style.background = color;
    var label = document.createElement("span");
    label.className = "pie-legend-label";
    label.textContent = e.name;
    var pctLabel = document.createElement("span");
    pctLabel.className = "pie-legend-pct";
    pctLabel.textContent = Math.round(pct) + "% · " + formatHM(e.secs);
    row.appendChild(dot);
    row.appendChild(label);
    row.appendChild(pctLabel);
    legend.appendChild(row);
  });

  pie.style.background = "conic-gradient(" + gradientParts.join(", ") + ")";
}
function aggregateKeys(keys) {
  var todayK = studyKey();
  return Promise.all(keys.map(function (key) {
    return storageGet(key).then(function (value) {
      if (!value) return null;
      try {
        return { key: key, parsed: JSON.parse(value) };
      } catch (e) {
        return null;
      }
    });
  })).then(function (results) {
    var totals = {};
    results.forEach(function (r) {
      if (!r || !r.parsed) return;
      var subs = r.parsed.subjects || {};
      Object.keys(subs).forEach(function (name) {
        totals[name] = (totals[name] || 0) + (subs[name] || 0);
      });
      if (r.key === todayK && r.parsed.running && r.parsed.startTs && r.parsed.activeSubject) {
        totals[r.parsed.activeSubject] = (totals[r.parsed.activeSubject] || 0) +
          (Date.now() - r.parsed.startTs) / 1000;
      }
    });
    return totals;
  });
}
function renderSubjectPie(force) {
  if (pieRange === "day") {
    drawPie(getDayEntries());
    return;
  }

  var now = Date.now();
  if (!force && now - lastPieFetchTs < PIE_REFRESH_MS) return;
  lastPieFetchTs = now;

  var myToken = ++pieFetchToken;
  var keysPromise = pieRange === "week" ? Promise.resolve(lastNDaysKeys(7))
    : pieRange === "month" ? Promise.resolve(lastNDaysKeys(30))
    : storageListKeys("study-");

  keysPromise.then(aggregateKeys).then(function (totals) {
    if (myToken !== pieFetchToken) return;
    drawPie(entriesFromTotals(totals));
  });
}
function renderSubjectBreakdown() {
  var wrap = document.getElementById("subjectBreakdown");
  if (!wrap) return;
  var entries = Object.keys(studyState.subjects).map(function (name) {
    var secs = (studyState.subjects[name] || 0) +
      (studyState.running && studyState.activeSubject === name ? elapsedRunningSeconds() : 0);
    return { name: name, secs: Math.floor(secs) };
  }).filter(function (e) { return e.secs > 0; })
    .sort(function (a, b) { return b.secs - a.secs; });

  wrap.innerHTML = "";
  if (entries.length === 0) {
    wrap.innerHTML = '<p class="dash-empty" style="display:block;">Bugün henüz kayıtlı konu yok.</p>';
    return;
  }
  entries.forEach(function (e) {
    var row = document.createElement("div");
    row.className = "subject-row";
    var label = document.createElement("span");
    label.textContent = e.name;
    var val = document.createElement("span");
    val.textContent = formatHM(e.secs);
    row.appendChild(label);
    row.appendChild(val);
    wrap.appendChild(row);
  });
}
function toggleStudy() {
  var input = document.getElementById("stopwatchSubject");
  if (studyState.running) {
    var elapsed = elapsedRunningSeconds();
    studyState.subjects[studyState.activeSubject] = (studyState.subjects[studyState.activeSubject] || 0) + elapsed;
    studyState.running = false;
    studyState.startTs = null;
    if (focusModeActive) requestFocusExit();
  } else {
    var name = input.value.trim() || "Genel";
    if (!(name in studyState.subjects)) studyState.subjects[name] = 0;
    studyState.activeSubject = name;
    studyState.running = true;
    studyState.startTs = Date.now();
    lastGoldAccrualTs = Date.now();
  }
  saveStudy();
  renderStudy();
  renderSubjectPie(true);
  loadStudyHistory();
}
function resetStudy() {
  var input = document.getElementById("stopwatchSubject");
  var name = studyState.running ? studyState.activeSubject : input.value.trim();
  if (!name) return;
  if (studyState.running && studyState.activeSubject === name) {
    studyState.running = false;
    studyState.startTs = null;
  }
  delete studyState.subjects[name];
  saveStudy();
  renderStudy();
  renderSubjectPie(true);
  loadStudyHistory();
}

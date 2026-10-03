// ============================================================================
// YKS Sayaç — Odak modu ve odak istatistikleri
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Odak Modu ----

var FOCUS_DURATION_PRESETS = [30, 60, 90];
var FOCUS_REWARD_MULTIPLIER = 1.5; // odak modu normal kronometreye göre 1.5x altın verir
var FOCUS_CUSTOM_MIN_MINUTES = 5;
var FOCUS_CUSTOM_MAX_MINUTES = 480;
var FOCUS_EXIT_WARNING_SECONDS = 30;
var MAX_FOCUS_PAUSES = 2;
var FOCUS_PAUSE_MAX_MS = 5 * 60000;
var FOCUS_DISTRACTION_PENALTY_PER = 0.1; // her dikkat dağınıklığı ödülü %10 azaltır
var FOCUS_DISTRACTION_PENALTY_MAX = 0.5; // en fazla %50 azalır

var focusModeActive = false;
var lastGoldAccrualTs = null; // normal kronometre altını (odak dışı) icin son hesaplama zamani
var pendingStudyGold = 0; // 0.1 altina ulasana kadar biriken kesir (yuvarlama kaybini onlemek icin)
var focusModeState = "idle"; // "idle" | "active" | "paused" | "exit-warning" | "summary"
var focusDistractionCount = 0;
var focusSessionStartTs = null;
var focusTargetMinutes = 25;
var lastFocusSummary = null;
var focusExitWarningTimer = null;
var focusExitWarningSecondsLeft = FOCUS_EXIT_WARNING_SECONDS;
var focusPauseCount = 0;
var focusPauseStartTs = null;
var focusPauseAutoTimer = null;
var focusAudioCtx = null;
function formatFocusRemaining(ms) {
  var totalSec = Math.max(0, Math.ceil(ms / 1000));
  var mm = Math.floor(totalSec / 60);
  var ss = totalSec % 60;
  return (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
}
function clearFocusExitWarningTimer() {
  if (focusExitWarningTimer) {
    clearInterval(focusExitWarningTimer);
    focusExitWarningTimer = null;
  }
}
function ensureFocusAudioCtx() {
  if (focusAudioCtx) return focusAudioCtx;
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    focusAudioCtx = new AudioCtx();
    return focusAudioCtx;
  } catch (e) {
    return null;
  }
}
function playFocusTone(type) {
  var ctx = ensureFocusAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") { ctx.resume().catch(function () {}); }
  var now = ctx.currentTime;
  if (type === "complete") {
    [523.25, 659.25, 783.99].forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      var start = now + i * 0.14;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } else if (type === "warning") {
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.value = 440;
    gain2.gain.setValueAtTime(0.14, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }
}
function closeFocusAudioCtx() {
  if (focusAudioCtx) {
    var ctx = focusAudioCtx;
    focusAudioCtx = null;
    setTimeout(function () { ctx.close().catch(function () {}); }, 900);
  }
}
function clearFocusPauseAutoTimer() {
  if (focusPauseAutoTimer) {
    clearTimeout(focusPauseAutoTimer);
    focusPauseAutoTimer = null;
  }
}
function pauseFocusSession() {
  if (!focusModeActive || focusModeState !== "active") return;
  if (focusPauseCount >= MAX_FOCUS_PAUSES) return;
  focusPauseCount += 1;
  focusPauseStartTs = Date.now();
  focusModeState = "paused";
  // studyState.running kontrolünden önce state "paused" yapıldı, böylece
  // toggleStudy() içindeki "if (focusModeActive) requestFocusExit()" çağrısı
  // requestFocusExit'in kendi guard'ı (state !== "active") tarafından zaten es geçilir.
  if (studyState.running) toggleStudy();
  renderFocusModeBlock();
  clearFocusPauseAutoTimer();
  focusPauseAutoTimer = setTimeout(function () {
    resumeFocusSession(true);
  }, FOCUS_PAUSE_MAX_MS);
}
function resumeFocusSession(auto) {
  if (focusModeState !== "paused") return;
  clearFocusPauseAutoTimer();
  var pausedMs = Date.now() - (focusPauseStartTs || Date.now());
  focusSessionStartTs += pausedMs;
  focusPauseStartTs = null;
  focusModeState = "active";
  if (!studyState.running) toggleStudy();
  renderFocusModeBlock();
}
function requestFocusExit() {
  if (!focusModeActive || focusModeState !== "active") return;
  focusModeState = "exit-warning";
  focusExitWarningSecondsLeft = FOCUS_EXIT_WARNING_SECONDS;
  playFocusTone("warning");
  renderFocusModeBlock();
  clearFocusExitWarningTimer();
  focusExitWarningTimer = setInterval(function () {
    focusExitWarningSecondsLeft -= 1;
    if (focusExitWarningSecondsLeft <= 0) {
      clearFocusExitWarningTimer();
      exitFocusMode(true, false);
      return;
    }
    var el = document.getElementById("focusExitCountdown");
    if (el) el.textContent = focusExitWarningSecondsLeft;
  }, 1000);
}
function cancelFocusExitWarning() {
  clearFocusExitWarningTimer();
  if (focusModeState === "exit-warning") {
    if (!studyState.running) {
      toggleStudy();
    }
    focusModeState = "active";
    renderFocusModeBlock();
  }
}
function renderFocusModeBlock() {
  var block = document.getElementById("focusModeBlock");
  if (!block) return;

  if (focusModeState === "active") {
    var remainingMs = focusTargetMinutes * 60000 - (Date.now() - focusSessionStartTs);
    var pausesLeft = MAX_FOCUS_PAUSES - focusPauseCount;
    block.innerHTML =
      '<div class="focus-mode-active-row">' +
        '<span class="focus-mode-active-text">🎯 <b id="focusCountdown">' + formatFocusRemaining(remainingMs) +
        '</b> kaldı · <b id="focusDistractionCount">' + focusDistractionCount + '</b> kez dikkatin dağıldı</span>' +
        (pausesLeft > 0
          ? '<button type="button" class="focus-pause-btn" id="focusPauseBtn">Kısa Ara Ver (' + pausesLeft + ' hakkın var)</button>'
          : '') +
        '<button type="button" class="focus-mode-exit-btn" id="focusModeExitBtn">Odaktan çık</button>' +
      '</div>';
    document.getElementById("focusModeExitBtn").addEventListener("click", requestFocusExit);
    var pauseBtn = document.getElementById("focusPauseBtn");
    if (pauseBtn) pauseBtn.addEventListener("click", pauseFocusSession);
  } else if (focusModeState === "paused") {
    var pauseRemainMs = FOCUS_PAUSE_MAX_MS - (Date.now() - focusPauseStartTs);
    block.innerHTML =
      '<div class="focus-pause-row">' +
        '<span class="focus-pause-text">⏸ Kısa aradasın · en fazla <b id="focusPauseCountdown">' +
        formatFocusRemaining(pauseRemainMs) + '</b> içinde otomatik devam eder, ceza yok</span>' +
        '<button type="button" class="focus-resume-btn" id="focusResumeBtn">Devam Et</button>' +
      '</div>';
    document.getElementById("focusResumeBtn").addEventListener("click", function () {
      resumeFocusSession(false);
    });
  } else if (focusModeState === "exit-warning") {
    block.innerHTML =
      '<div class="focus-exit-warning">' +
        '<p class="focus-exit-warning-text">⚠️ Hedefe ulaşmadan çıkıyorsun. <b id="focusExitCountdown">' +
        focusExitWarningSecondsLeft + '</b> saniye içinde altın cezası ve dikkat dağınıklığı debuff\'u uygulanacak.</p>' +
        '<button type="button" class="focus-exit-continue-btn" id="focusExitContinueBtn">Vazgeç, Odakta Kal</button>' +
      '</div>';
    document.getElementById("focusExitContinueBtn").addEventListener("click", cancelFocusExitWarning);
  } else if (focusModeState === "summary" && lastFocusSummary) {
    var extra = "";
    if (lastFocusSummary.outcome === "reward") {
      extra = '<p class="focus-summary-text">🎉 Hedefi tamamladın! <b>' + lastFocusSummary.coins + ' altın</b> kazandın' +
        (lastFocusSummary.debuffActiveForThisReward ? ' <i>(dikkat dağınıklığı debuff\'u nedeniyle yarım kazanç)</i>' : '') +
        (lastFocusSummary.distractionPenaltyPercent > 0
          ? ' <i>(dikkatin ' + lastFocusSummary.distractions + ' kez dağıldığı için kazancın %' + lastFocusSummary.distractionPenaltyPercent + ' azaldı)</i>'
          : '') +
        '. "Detaylı görünüm" üzerinden market\'ten bina satın alabilirsin.</p>';
    } else if (lastFocusSummary.outcome === "penalty") {
      extra = '<p class="focus-summary-text">😔 Hedefe ulaşmadan çıktın: <b>' + lastFocusSummary.coinsPenalty + ' altın</b> ceza ödedin' +
        (lastFocusSummary.debuffApplied ? ' ve bir sonraki tamamlanan seansta kazancın <b>yarıya düşecek</b> (dikkat dağınıklığı).' : '.') +
        '</p>';
    }
    block.innerHTML =
      '<p class="focus-summary-text">Bu seansta <b>' + lastFocusSummary.minutesText + '</b> çalıştın, ' +
      '<b>' + lastFocusSummary.distractions + '</b> kez dikkatin dağıldı' +
      (lastFocusSummary.pauses > 0 ? ', <b>' + lastFocusSummary.pauses + '</b> kez kısa ara verdin' : '') + '.</p>' +
      extra +
      '<button type="button" class="focus-summary-close" id="focusSummaryCloseBtn">Tamam</button>';
    document.getElementById("focusSummaryCloseBtn").addEventListener("click", function () {
      focusModeState = "idle";
      renderFocusModeBlock();
    });
  } else {
    var debuffWarning = (cityState.debuffSessionsLeft || 0) > 0
      ? '<p class="focus-debuff-warning">⚠️ Dikkat dağınıklığı aktif — bir sonraki tamamlanan seansta altın kazancın yarıya düşecek.</p>'
      : "";
    var bonusHint = '<p class="focus-bonus-hint">💡 Odak modu normal kronometreye göre <b>1.5x</b> altın verir.</p>';
    block.innerHTML = debuffWarning + bonusHint + '<div class="focus-duration-row">' +
      FOCUS_DURATION_PRESETS.map(function (m) {
        return '<button type="button" class="focus-duration-btn" data-min="' + m + '">' + m + ' dk</button>';
      }).join("") +
      '</div>' +
      '<div class="focus-custom-row">' +
        '<input type="number" id="focusCustomMinutes" class="focus-custom-input" min="' + FOCUS_CUSTOM_MIN_MINUTES +
        '" max="' + FOCUS_CUSTOM_MAX_MINUTES + '" step="5" placeholder="özel süre (dakika, örn. 90)">' +
        '<button type="button" class="focus-custom-btn" id="focusCustomStartBtn">Başlat</button>' +
      '</div>';
    Array.prototype.forEach.call(block.querySelectorAll(".focus-duration-btn"), function (btn) {
      btn.addEventListener("click", function () {
        enterFocusMode(parseInt(btn.getAttribute("data-min"), 10));
      });
    });
    var customInput = document.getElementById("focusCustomMinutes");
    var customBtn = document.getElementById("focusCustomStartBtn");
    var startCustom = function () {
      var val = parseInt(customInput.value, 10);
      if (!val || isNaN(val)) return;
      val = Math.max(FOCUS_CUSTOM_MIN_MINUTES, Math.min(FOCUS_CUSTOM_MAX_MINUTES, val));
      enterFocusMode(val);
    };
    customBtn.addEventListener("click", startCustom);
    customInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") startCustom();
    });
  }
}
var focusHiddenTimer = null;
var FOCUS_HIDDEN_GRACE_MS = 10000; // sekme/pencere degistirince hemen sayma - 10sn tolerans

function handleFocusVisibilityChange() {
  if (!focusModeActive || focusModeState !== "active") return;
  if (document.hidden) {
    if (focusHiddenTimer) clearTimeout(focusHiddenTimer);
    focusHiddenTimer = setTimeout(function () {
      focusHiddenTimer = null;
      if (focusModeActive && focusModeState === "active" && document.hidden) {
        focusDistractionCount += 1;
        var el = document.getElementById("focusDistractionCount");
        if (el) el.textContent = focusDistractionCount;
      }
    }, FOCUS_HIDDEN_GRACE_MS);
  } else if (focusHiddenTimer) {
    clearTimeout(focusHiddenTimer);
    focusHiddenTimer = null;
  }
}
function handleFocusBeforeUnload(e) {
  if (!focusModeActive) return undefined;
  e.preventDefault();
  e.returnValue = "";
  return "";
}
function enterFocusMode(targetMinutes) {
  if (typeof widgetPipActive === "function" && widgetPipActive()) {
    showUpdateToast("Odak modu için önce widget'ı ana pencereye geri getir.");
    return;
  }
  if (!studyState.running) {
    toggleStudy();
  }
  focusModeActive = true;
  focusDistractionCount = 0;
  focusPauseCount = 0;
  focusPauseStartTs = null;
  clearFocusPauseAutoTimer();
  focusSessionStartTs = Date.now();
  focusTargetMinutes = targetMinutes || 25;
  focusModeState = "active";
  ensureFocusAudioCtx();
  renderFocusModeBlock();

  var dashboardEl = document.getElementById("dashboardView");
  if (dashboardEl) dashboardEl.classList.add("focus-active");

  document.addEventListener("visibilitychange", handleFocusVisibilityChange);
  window.addEventListener("beforeunload", handleFocusBeforeUnload);

  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
  }
}
function updateFocusTick() {
  if (!focusModeActive) return;
  if (focusModeState === "paused") {
    var pauseRemainMs = FOCUS_PAUSE_MAX_MS - (Date.now() - focusPauseStartTs);
    var pauseEl = document.getElementById("focusPauseCountdown");
    if (pauseEl) pauseEl.textContent = formatFocusRemaining(Math.max(0, pauseRemainMs));
    return;
  }
  if (focusModeState !== "active" && focusModeState !== "exit-warning") return;
  var remainingMs = focusTargetMinutes * 60000 - (Date.now() - focusSessionStartTs);
  if (remainingMs <= 0) {
    clearFocusExitWarningTimer();
    exitFocusMode(true, true);
    return;
  }
  if (focusModeState === "active") {
    var el = document.getElementById("focusCountdown");
    if (el) el.textContent = formatFocusRemaining(remainingMs);
  }
}
function logFocusSession(record) {
  var key = "focus-sessions-" + dateStr(new Date());
  storageGet(key).then(function (raw) {
    var list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
    list.push(record);
    return storageSet(key, JSON.stringify(list));
  }).then(function () {
    loadFocusStats();
  }).catch(function () {});
}
function exitFocusMode(showSummary, completed) {
  clearFocusExitWarningTimer();
  clearFocusPauseAutoTimer();
  if (focusHiddenTimer) { clearTimeout(focusHiddenTimer); focusHiddenTimer = null; }
  if (!focusModeActive) return;
  focusModeActive = false;
  // Odak boyunca stopwatch calismis olsa da normal kronometre altini bu sureyi
  // saymamali (odak zaten kendi 1.5x odulunu asagida veriyor) - saati simdiye kaydir.
  lastGoldAccrualTs = Date.now();

  var dashboardEl = document.getElementById("dashboardView");
  if (dashboardEl) dashboardEl.classList.remove("focus-active");

  document.removeEventListener("visibilitychange", handleFocusVisibilityChange);
  window.removeEventListener("beforeunload", handleFocusBeforeUnload);

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {});
  }

  var elapsedMs = Date.now() - (focusSessionStartTs || Date.now());
  var minutes = Math.max(1, Math.round(elapsedMs / 60000));

  var outcome = completed ? "reward" : "penalty";
  var coinsEarned = 0;
  var coinsPenalty = 0;
  var debuffApplied = false;
  var debuffActiveForThisReward = false;
  var distractionPenaltyPercent = 0;

  if (completed) {
    coinsEarned = roundCoins(computeFocusReward(elapsedMs) * FOCUS_REWARD_MULTIPLIER);
    var distractionMultiplier = Math.max(
      1 - FOCUS_DISTRACTION_PENALTY_MAX,
      1 - focusDistractionCount * FOCUS_DISTRACTION_PENALTY_PER
    );
    if (distractionMultiplier < 1) {
      distractionPenaltyPercent = Math.round((1 - distractionMultiplier) * 100);
      coinsEarned = roundCoins(coinsEarned * distractionMultiplier);
    }
    if ((cityState.debuffSessionsLeft || 0) > 0) {
      debuffActiveForThisReward = true;
      coinsEarned = roundCoins(coinsEarned * 0.5);
      cityState.debuffSessionsLeft = Math.max(0, (cityState.debuffSessionsLeft || 0) - 1);
    }
    cityState.coins = roundCoins((cityState.coins || 0) + coinsEarned);
    saveCity();
    playFocusTone("complete");
  } else {
    var potentialReward = roundCoins(computeFocusReward(focusTargetMinutes * 60000) * FOCUS_REWARD_MULTIPLIER);
    coinsPenalty = roundCoins(potentialReward * 0.5);
    cityState.coins = roundCoins(Math.max(0, (cityState.coins || 0) - coinsPenalty));
    cityState.debuffSessionsLeft = 1;
    debuffApplied = true;
    saveCity();
  }
  renderCity();
  closeFocusAudioCtx();

  logFocusSession({
    ts: Date.now(),
    targetMinutes: focusTargetMinutes,
    actualMinutes: minutes,
    completed: !!completed,
    distractions: focusDistractionCount,
    pauses: focusPauseCount
  });

  if (showSummary) {
    lastFocusSummary = {
      minutesText: minutes + " dakika",
      distractions: focusDistractionCount,
      pauses: focusPauseCount,
      outcome: outcome,
      coins: coinsEarned,
      coinsPenalty: coinsPenalty,
      debuffApplied: debuffApplied,
      debuffActiveForThisReward: debuffActiveForThisReward,
      distractionPenaltyPercent: distractionPenaltyPercent
    };
    focusModeState = "summary";
  } else {
    focusModeState = "idle";
  }
  renderFocusModeBlock();

  if (showSummary && outcome === "reward") {
    var stopwatchCardEl = document.querySelector(".stopwatch-card");
    if (stopwatchCardEl) {
      triggerCelebrationMessage(stopwatchCardEl, "🎉 " + coinsEarned + " altın kazandın!");
    }
  }
}
function loadStudyHistory() {
  var wrap = document.getElementById("studyHistoryBars");
  if (!wrap) return;
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  var todayStr = dateStr(new Date());
  Promise.all(days.map(function (d) {
    return storageGet("study-" + dateStr(d)).then(function (value) {
      var total = 0;
      if (value) {
        try {
          var parsed = JSON.parse(value);
          var subs = parsed.subjects || {};
          Object.keys(subs).forEach(function (k) { total += subs[k] || 0; });
          if (dateStr(d) === todayStr && parsed.running && parsed.startTs) {
            total += (Date.now() - parsed.startTs) / 1000;
          }
        } catch (e) {}
      }
      return { d: d, seconds: Math.floor(total) };
    });
  })).then(function (results) {
    var maxSec = Math.max.apply(null, results.map(function (r) { return r.seconds; }).concat([60]));
    wrap.innerHTML = "";
    results.forEach(function (r) {
      var col = document.createElement("div");
      col.className = "history-bar-col" + (dateStr(r.d) === todayStr ? " is-today" : "");

      var value = document.createElement("div");
      value.className = "history-bar-value";
      value.textContent = r.seconds > 0 ? formatHM(r.seconds) : "0dk";

      var bar = document.createElement("div");
      bar.className = "history-bar";
      var pct = Math.max((r.seconds / maxSec) * 100, r.seconds > 0 ? 6 : 0);
      bar.style.height = pct + "%";

      var label = document.createElement("div");
      label.className = "history-bar-label";
      label.textContent = dateStr(r.d) === todayStr ? "bugün" : r.d.getDate() + " " + months[r.d.getMonth()];

      col.appendChild(value);
      col.appendChild(bar);
      col.appendChild(label);
      wrap.appendChild(col);
    });
  });
}
function computeFocusStatsSummary() {
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return Promise.all(days.map(function (d) {
    return storageGet("focus-sessions-" + dateStr(d)).then(function (value) {
      var list = [];
      if (value) {
        try { list = JSON.parse(value) || []; } catch (e) { list = []; }
      }
      return list;
    });
  })).then(function (perDay) {
    var all = [].concat.apply([], perDay);
    var completed = all.filter(function (r) { return r.completed; });
    var totalDistractions = completed.reduce(function (a, r) { return a + (r.distractions || 0); }, 0);
    var avgDistractions = completed.length ? Math.round((totalDistractions / completed.length) * 10) / 10 : 0;
    var longest = completed.reduce(function (a, r) { return Math.max(a, r.actualMinutes || 0); }, 0);
    return {
      weekTotal: all.length,
      weekCompleted: completed.length,
      weekAbandoned: all.length - completed.length,
      weekAvgDistractions: avgDistractions,
      weekLongestMinutes: longest
    };
  });
}
function loadFocusStats() {
  var box = document.getElementById("focusStatsBox");
  if (!box) return;
  computeFocusStatsSummary().then(function (stats) {
    if (!stats.weekTotal) {
      box.innerHTML = '<p class="coach-subject-empty">Son 7 günde henüz odak seansı yok.</p>';
      return;
    }
    var pct = Math.round((stats.weekCompleted / stats.weekTotal) * 100);
    box.innerHTML =
      '<div class="yks-estimate-row">' +
        '<span class="yks-estimate-label">Tamamlanan / toplam</span>' +
        '<span class="yks-estimate-value"><b>' + stats.weekCompleted + '/' + stats.weekTotal + '</b> seans (%' + pct + ')</span>' +
      '</div>' +
      '<div class="yks-estimate-row">' +
        '<span class="yks-estimate-label">Bırakılan seans</span>' +
        '<span class="yks-estimate-value">' + stats.weekAbandoned + '</span>' +
      '</div>' +
      '<div class="yks-estimate-row">' +
        '<span class="yks-estimate-label">Ort. dikkat dağınıklığı</span>' +
        '<span class="yks-estimate-value">seans başına ' + stats.weekAvgDistractions + ' kez</span>' +
      '</div>' +
      '<div class="yks-estimate-row">' +
        '<span class="yks-estimate-label">En uzun tamamlanan seans</span>' +
        '<span class="yks-estimate-value">' + stats.weekLongestMinutes + ' dakika</span>' +
      '</div>';
  }).catch(function () {
    box.innerHTML = '<p class="coach-subject-empty">Yüklenemedi.</p>';
  });
}

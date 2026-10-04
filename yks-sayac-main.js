// ============================================================================
// YKS Sayaç — Başlatma: düğme bağlamaları, görünüm seçimi ve açılış akışı (HER ZAMAN EN SON yüklenir)
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

var inviteCodeSubmitBtn = document.getElementById("inviteCodeSubmitBtn");
if (inviteCodeSubmitBtn) {
  inviteCodeSubmitBtn.addEventListener("click", function () {
    var input = document.getElementById("inviteCodeInput");
    var noteEl = document.getElementById("inviteCodeNote");
    var code = (input.value || "").trim().toUpperCase();
    if (!code) {
      noteEl.textContent = "Önce bir davet kodu yaz.";
      noteEl.style.color = "var(--danger)";
      return;
    }
    if (typeof currentUserUid === "undefined" || !currentUserUid) {
      noteEl.textContent = "Bu özellik için giriş yapmış olman gerekiyor.";
      noteEl.style.color = "var(--danger)";
      return;
    }
    inviteCodeSubmitBtn.disabled = true;
    noteEl.textContent = "Bağlanıyor…";
    noteEl.style.color = "var(--ink-dim)";
    redeemInviteCode(currentUserUid, code).then(function () {
      if (currentUserProfile) currentUserProfile.coachId = "connected";
      input.value = "";
      noteEl.textContent = "✓ Bağlandın!";
      noteEl.style.color = "var(--sage)";
      renderCoachLinkStatus();
    }).catch(function (err) {
      noteEl.textContent = (err && err.message) || "Kod geçersiz görünüyor, tekrar dener misin?";
      noteEl.style.color = "var(--danger)";
    }).then(function () {
      inviteCodeSubmitBtn.disabled = false;
    });
  });
  document.getElementById("inviteCodeInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") inviteCodeSubmitBtn.click();
  });
}
document.getElementById("themeBtn").addEventListener("click", function () {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveSettings();
});
var settingsBtn = document.getElementById("settingsBtn");
var settingsPanel = document.getElementById("settingsPanel");
var topicsBtn = document.getElementById("topicsBtn");
settingsBtn.addEventListener("click", function () {
  var open = settingsPanel.classList.toggle("open");
  settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    fillSettingsForm();
    settingsBtn.classList.remove("has-update-badge");
  }
});
topicsBtn.addEventListener("click", function () {
  var w = Math.min(Math.round((screen.availWidth || 1600) * 0.75), 1300);
  var h = Math.min(Math.round((screen.availHeight || 900) * 0.85), 980);
  window.open(
    location.pathname + "?view=topics",
    "yksSayacTopics",
    "width=" + w + ",height=" + h + ",resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
  );
});
document.getElementById("addTopicBtn").addEventListener("click", addTopicFromInput);
document.getElementById("topicInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") addTopicFromInput();
});
document.getElementById("topicsGoalInput").addEventListener("change", function () {
  var v = Math.max(parseInt(this.value, 10) || 1, 1);
  this.value = v;
  state.dailyGoal = v;
  var mainGoalInput = document.getElementById("dailyGoal");
  if (mainGoalInput) mainGoalInput.value = v;
  saveSettings();
  renderProgress();
  loadHistory();
});
var pieRangeTabs = document.getElementById("pieRangeTabs");
if (pieRangeTabs) {
  pieRangeTabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".range-btn");
    if (!btn) return;
    pieRange = btn.getAttribute("data-range");
    Array.prototype.forEach.call(pieRangeTabs.querySelectorAll(".range-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderSubjectPie(true);
  });
}
var topicsRangeTabs = document.getElementById("topicsRangeTabs");
if (topicsRangeTabs) {
  topicsRangeTabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".range-btn");
    if (!btn) return;
    topicsRange = btn.getAttribute("data-range");
    Array.prototype.forEach.call(topicsRangeTabs.querySelectorAll(".range-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderTopicsView(true);
  });
}
document.getElementById("stopwatchToggle").addEventListener("click", toggleStudy);
document.getElementById("stopwatchReset").addEventListener("click", function () {
  var input = document.getElementById("stopwatchSubject");
  var name = studyState.running ? studyState.activeSubject : (input.value.trim() || "bu konu");
  if (confirm("\"" + name + "\" için bugünkü süreyi sıfırlamak istediğine emin misin?")) resetStudy();
});
document.getElementById("stopwatchSubject").addEventListener("input", function () {
  if (!studyState.running) renderStudy();
});
var fullscreenBtn = document.getElementById("fullscreenBtn");
if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", function () {
    if (typeof widgetPipActive === "function" && widgetPipActive()) {
      showUpdateToast("Tam ekran için önce widget'ı ana pencereye geri getir.");
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  });
}
var dashThemeBtn = document.getElementById("dashThemeBtn");
if (dashThemeBtn) {
  dashThemeBtn.addEventListener("click", function () {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveSettings();
  });
}
document.getElementById("saveBtn").addEventListener("click", function () {
  state.examDate = document.getElementById("examDate").value || state.examDate;
  state.examTime = document.getElementById("examTime").value || state.examTime;
  state.session = document.getElementById("sessionName").value || "TYT";
  state.dailyGoal = Math.max(parseInt(document.getElementById("dailyGoal").value, 10) || 5, 1);
  var obpRaw = (document.getElementById("obpInput") || {}).value;
  if (obpRaw === "" || obpRaw == null) {
    state.obp = null;
  } else {
    var obpVal = parseFloat(obpRaw);
    state.obp = isNaN(obpVal) ? null : Math.min(100, Math.max(0, obpVal));
  }
  saveSettings();
  renderFooter();
  renderProgress();
  var topicsGoalInput = document.getElementById("topicsGoalInput");
  if (topicsGoalInput) topicsGoalInput.value = state.dailyGoal;
  settingsPanel.classList.remove("open");
  settingsBtn.setAttribute("aria-expanded", "false");
  lastDays = null; // force favicon/title refresh
  tick();
});
var backupBtn = document.getElementById("backupBtn");
if (backupBtn) {
  var backupIconDefaultHTML = backupBtn.innerHTML;
  var backupIconCheckHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  backupBtn.addEventListener("click", function () {
    if (backupBtn.disabled) return;
    backupBtn.disabled = true;
    downloadBackupFile().then(function (res) {
      if (res && res.ok) {
        backupBtn.innerHTML = backupIconCheckHTML;
        backupBtn.classList.add("icon-btn-success");
      } else {
        showBackupStatus("Yedek alınamadı. Tekrar dener misin? Sorun sürerse widget'ı kapatıp yeniden aç.", true);
      }
      setTimeout(function () {
        backupBtn.innerHTML = backupIconDefaultHTML;
        backupBtn.classList.remove("icon-btn-success");
        backupBtn.disabled = false;
      }, 1400);
    });
  });
}
var backupImportBtn = document.getElementById("backupImportBtn");
var backupFileInput = document.getElementById("backupFileInput");
if (backupImportBtn && backupFileInput) {
  backupImportBtn.addEventListener("click", function () {
    backupFileInput.click();
  });
  backupFileInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (file) restoreBackupFromFile(file);
    backupFileInput.value = "";
  });
}
var backupConfirmCancel = document.getElementById("backupConfirmCancel");
var backupConfirmOk = document.getElementById("backupConfirmOk");
if (backupConfirmCancel) backupConfirmCancel.addEventListener("click", cancelPendingRestore);
if (backupConfirmOk) backupConfirmOk.addEventListener("click", confirmPendingRestore);
var pipBtn = document.getElementById("pipBtn");
if (pipBtn) {
  if (!widgetPipSupported()) pipBtn.style.display = "none";
  else pipBtn.addEventListener("click", openWidgetPip);
}
Array.prototype.forEach.call(document.querySelectorAll(".js-install-btn"), function (b) { b.addEventListener("click", installApp); });
Array.prototype.forEach.call(document.querySelectorAll(".js-reload-btn"), function (b) { b.addEventListener("click", function () { location.reload(); }); });
Array.prototype.forEach.call(document.querySelectorAll(".js-check-update-btn"), function (b) { b.addEventListener("click", checkForUpdateManually); });
setAppVersionNotes("Sürüm " + APP_VERSION, false);
initInstallPrompt();
registerServiceWorker();
var cloudBackupNowBtn = document.getElementById("cloudBackupNowBtn");
var cloudBackupRestoreBtn = document.getElementById("cloudBackupRestoreBtn");
if (cloudBackupNowBtn) {
  cloudBackupNowBtn.addEventListener("click", function () {
    if (cloudBackupNowBtn.disabled) return;
    cloudBackupNowBtn.disabled = true;
    cloudBackupNow().then(function () { cloudBackupNowBtn.disabled = false; });
  });
}
if (cloudBackupRestoreBtn) {
  cloudBackupRestoreBtn.addEventListener("click", function () {
    var box = document.getElementById("cloudBackupList");
    if (box && box.childNodes.length) { box.textContent = ""; showBackupStatus("", false); return; }
    renderCloudBackupList();
  });
}
var incBtn = document.getElementById("incBtn");
var decBtn = document.getElementById("decBtn");
if (incBtn) {
  incBtn.addEventListener("click", function () {
    todayCount += 1;
    saveProgress(todayCount);
    renderProgress();
  });
}
if (decBtn) {
  decBtn.addEventListener("click", function () {
    todayCount = Math.max(todayCount - 1, 0);
    saveProgress(todayCount);
    renderProgress();
  });
}
var isDashboard = new URLSearchParams(location.search).get("view") === "topics";
var isNotes = new URLSearchParams(location.search).get("view") === "notes";
var isCity = new URLSearchParams(location.search).get("view") === "city";
var isExam = new URLSearchParams(location.search).get("view") === "exam";
var isCoach = ["coach", "admin"].indexOf(new URLSearchParams(location.search).get("view")) >= 0;
var isPlan = new URLSearchParams(location.search).get("view") === "plan";
document.getElementById("widget").style.display = (isDashboard || isNotes || isCity || isExam || isCoach || isPlan) ? "none" : "";
document.getElementById("dashboardView").style.display = isDashboard ? "flex" : "none";
document.getElementById("notesView").style.display = isNotes ? "flex" : "none";
document.getElementById("cityView").style.display = isCity ? "flex" : "none";
document.getElementById("examView").style.display = isExam ? "flex" : "none";
document.getElementById("planView").style.display = isPlan ? "flex" : "none";
var notesBtn = document.getElementById("notesBtn");
if (notesBtn) {
  notesBtn.addEventListener("click", function () {
    var w = Math.min(Math.round((screen.availWidth || 1600) * 0.8), 1200);
    var h = Math.min(Math.round((screen.availHeight || 900) * 0.85), 850);
    window.open(
      location.pathname + "?view=notes",
      "yksSayacNotes",
      "width=" + w + ",height=" + h + ",resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no"
    );
  });
}
var cityBtn = document.getElementById("cityBtn");
if (cityBtn) cityBtn.addEventListener("click", openCityView);
var examBtn = document.getElementById("examBtn");
if (examBtn) examBtn.addEventListener("click", openExamView);
var planBtn = document.getElementById("planBtn");
if (planBtn) planBtn.addEventListener("click", openPlanView);
Promise.all([loadSettings(), loadProgress(), loadTopics(), loadStudy()]).then(function (results) {
  todayCount = results[1] || 0;
  todayTopics = results[2] || [];
  applyTheme();
  renderFooter();
  renderProgress();
  renderTopicsView();
  if (isDashboard) {
    var now = new Date();
    var dashDateEl = document.getElementById("dashDate");
    if (dashDateEl) {
      dashDateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
    }
    loadHistory();
    document.getElementById("topicsGoalInput").value = state.dailyGoal;
    document.title = "Konu Takibi · YKS Sayaç";
    renderStudy();
    loadStudyHistory();
    loadFocusStats();
    renderFocusModeBlock();
    loadCity().then(function (data) {
      cityState = data;
      renderCity();
    });
    document.addEventListener("fullscreenchange", function () {
      if (focusModeActive && !document.fullscreenElement) {
        requestFocusExit();
      }
    });
    var cityOpenBtn = document.getElementById("cityOpenBtn");
    if (cityOpenBtn) cityOpenBtn.addEventListener("click", openCityView);
    setInterval(renderStudy, 1000);
  } else if (isNotes) {
    document.title = "Not Defteri · YKS Sayaç";
    initNotesView();
  } else if (isCity) {
    document.title = "Şehrim · YKS Sayaç";
    initCityView();
  } else if (isExam) {
    document.title = "Deneme Takibi · YKS Sayaç";
    initExamView();
  } else if (isPlan) {
    document.title = "Haftalık Plan · YKS Sayaç";
    initPlanView();
  } else if (isCoach) {
    document.title = (new URLSearchParams(location.search).get("view") === "admin" ? "Yönetici Paneli" : "Koç Paneli") + " · YKS Sayaç";
    wireLogoutButtons();
    initAuthGate(true);
  } else {
    window.startStudentWidgetAfterAuth = function () {
      var cityReady = loadCity().then(function (d) { cityState = d; });
      var examReady = loadExamRecords().then(function (d) { examState = d; });
      tick();
      setInterval(tick, 1000);
      maybeAutoBackup();
      checkForUpdate();
      loadCoachQuotes();
      if (currentUserUid) {
        mergeTodayPlanIntoTopics();
        cityReady.then(function () { startAdminGrantListener(currentUserUid); });
        Promise.all([cityReady, examReady]).then(function () {
          return buildStudentSummaryPayload();
        }).then(function (payload) {
          syncStudentSummary(currentUserUid, payload);
        });
        setInterval(function () {
          mergeTodayPlanIntoTopics();
          buildStudentSummaryPayload().then(function (payload) {
            syncStudentSummary(currentUserUid, payload);
          });
        }, 180000);
      }
    };
    wireLogoutButtons();
    initAuthGate(false);
  }
});

// ============================================================================
// YKS Sayaç — Haftalık plan görünümü
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

var PLAN_DAY_ORDER = [
  { key: "mon", short: "Pzt" }, { key: "tue", short: "Sal" }, { key: "wed", short: "Çar" },
  { key: "thu", short: "Per" }, { key: "fri", short: "Cum" }, { key: "sat", short: "Cmt" }, { key: "sun", short: "Paz" }
];
var currentPlanStudentUid = null;
function initPlanView() {
  var dateEl = document.getElementById("planViewDate");
  if (dateEl) {
    var now = new Date();
    dateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
  }

  var themeBtn = document.getElementById("planThemeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
    });
  }

  fbAuth.onAuthStateChanged(function (user) {
    if (!user) {
      document.getElementById("planLoggedOutNote").style.display = "block";
      document.getElementById("planDaysCard").style.display = "none";
      return;
    }
    currentPlanStudentUid = user.uid;
    fbDb.collection("studentData").doc(user.uid).collection("info").doc("plan").get().then(function (doc) {
      renderPlanViewData(doc.exists ? doc.data() : {});
    }).catch(function () {
      var note = document.getElementById("planLoggedOutNote");
      if (note) {
        note.style.display = "block";
        note.textContent = "Plan yüklenemedi, tekrar dener misin?";
      }
    });
  });
}
function savePlanTaskField(dayKey, taskId, field, value) {
  if (!currentPlanStudentUid) return;
  var patch = { days: {} };
  patch.days[dayKey] = {};
  patch.days[dayKey][taskId] = {};
  patch.days[dayKey][taskId][field] = value;
  fbDb.collection("studentData").doc(currentPlanStudentUid).collection("info").doc("plan")
    .set(patch, { merge: true }).catch(function () {});
}
function planSafeNum(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}
function renderPlanViewData(data) {
  var days = (data && data.days) || {};
  var tbody = document.getElementById("planTableBody");
  var emptyEl = document.getElementById("planTableEmpty");
  if (tbody) {
    var rowsHtml = "";
    PLAN_DAY_ORDER.forEach(function (d) {
      var tasks = days[d.key] || {};
      Object.keys(tasks).sort(function (a, b) {
        return (tasks[a].createdAt || 0) - (tasks[b].createdAt || 0);
      }).forEach(function (taskId) {
        var t = tasks[taskId] || {};
        var label = escapeHtmlText((t.examType ? t.examType + " " : "") + (t.subject || "") + (t.topic ? ": " + t.topic : ""));
        rowsHtml += '<tr>' +
          '<td>' + d.short + '</td>' +
          '<td class="plan-cell-topic" title="' + label + '">' + label + '</td>' +
          '<td>' + (planSafeNum(t.minutes) ? planSafeNum(t.minutes) + "dk" : "—") + '</td>' +
          '<td>' + (planSafeNum(t.questionCount) || "—") + '</td>' +
          '<td><input type="number" min="0" class="plan-input-correct" data-day="' + escapeHtmlText(d.key) + '" data-id="' + escapeHtmlText(taskId) + '" value="' + planSafeNum(t.correct) + '"></td>' +
          '<td><input type="number" min="0" class="plan-input-wrong" data-day="' + escapeHtmlText(d.key) + '" data-id="' + escapeHtmlText(taskId) + '" value="' + planSafeNum(t.wrong) + '"></td>' +
          '<td><input type="checkbox" class="plan-input-done" data-day="' + escapeHtmlText(d.key) + '" data-id="' + escapeHtmlText(taskId) + '"' + (t.done ? " checked" : "") + '></td>' +
          '</tr>';
      });
    });
    tbody.innerHTML = rowsHtml;
    if (emptyEl) emptyEl.style.display = rowsHtml ? "none" : "block";

    function clampPlanInputToTarget(changedInput, otherInput, questionCount) {
      if (!questionCount || questionCount <= 0) return;
      var otherVal = parseInt(otherInput.value, 10) || 0;
      var changedVal = parseInt(changedInput.value, 10) || 0;
      var maxAllowed = Math.max(0, questionCount - otherVal);
      if (changedVal > maxAllowed) changedInput.value = maxAllowed;
    }

    Array.prototype.forEach.call(tbody.querySelectorAll(".plan-input-correct"), function (inp) {
      inp.addEventListener("change", function () {
        var day = inp.getAttribute("data-day"), id = inp.getAttribute("data-id");
        var wrongInp = tbody.querySelector('.plan-input-wrong[data-day="' + day + '"][data-id="' + id + '"]');
        var qCount = (days[day] && days[day][id] && days[day][id].questionCount) || 0;
        if (wrongInp) clampPlanInputToTarget(inp, wrongInp, qCount);
        savePlanTaskField(day, id, "correct", parseInt(inp.value, 10) || 0);
      });
    });
    Array.prototype.forEach.call(tbody.querySelectorAll(".plan-input-wrong"), function (inp) {
      inp.addEventListener("change", function () {
        var day = inp.getAttribute("data-day"), id = inp.getAttribute("data-id");
        var correctInp = tbody.querySelector('.plan-input-correct[data-day="' + day + '"][data-id="' + id + '"]');
        var qCount = (days[day] && days[day][id] && days[day][id].questionCount) || 0;
        if (correctInp) clampPlanInputToTarget(inp, correctInp, qCount);
        savePlanTaskField(day, id, "wrong", parseInt(inp.value, 10) || 0);
      });
    });
    Array.prototype.forEach.call(tbody.querySelectorAll(".plan-input-done"), function (inp) {
      inp.addEventListener("change", function () {
        savePlanTaskField(inp.getAttribute("data-day"), inp.getAttribute("data-id"), "done", inp.checked);
      });
    });
  }

  var noteCard = document.getElementById("planNoteCard");
  var noteText = document.getElementById("planNoteText");
  if (data && data.note && data.note.trim()) {
    if (noteCard) noteCard.style.display = "block";
    if (noteText) noteText.textContent = data.note;
  }

  var updatedEl = document.getElementById("planUpdatedAt");
  if (updatedEl) {
    updatedEl.textContent = (data && data.updatedAt)
      ? "son güncelleme: " + new Date(data.updatedAt).toLocaleDateString("tr-TR")
      : "";
  }
}

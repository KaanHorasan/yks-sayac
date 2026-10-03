// ============================================================================
// YKS Sayaç — Konu takibi görünümü: geçmiş, aralık sekmeleri, konu ekleme
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

var DAY_KEY_BY_JS_DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function mergeTodayPlanIntoTopics() {
  if (!currentUserUid) return;
  var todayKey = DAY_KEY_BY_JS_DAY[new Date().getDay()];
  fbDb.collection("studentData").doc(currentUserUid).collection("info").doc("plan").get().then(function (doc) {
    if (!doc.exists) return;
    var data = doc.data() || {};
    var tasks = (data.days && data.days[todayKey]) || {};
    var taskIds = Object.keys(tasks);
    if (!taskIds.length) return;
    var existingIds = {};
    todayTopics.forEach(function (t) { if (t.planTaskId) existingIds[t.planTaskId] = true; });
    var added = false;
    taskIds.forEach(function (taskId) {
      if (existingIds[taskId]) return;
      var t = tasks[taskId] || {};
      var label = (t.examType ? t.examType + " " : "") + (t.subject || "") + (t.topic ? ": " + t.topic : "");
      todayTopics.push({
        id: "plan-" + taskId,
        text: label,
        done: !!t.done,
        planTaskId: taskId,
        planDay: todayKey
      });
      added = true;
    });
    if (added) onTopicsChanged();
  }).catch(function () {});
}
var topicsRange = "day";
var topicsFetchToken = 0;
var lastTopicsFetchTs = 0;
var TOPICS_REFRESH_MS = 5000;
function topicsDateKeyFor(d) {
  return "topics-" + dateStr(d);
}
function mutateTopicsAt(dateKey, mutateFn) {
  return storageGet(dateKey).then(function (value) {
    var arr = [];
    if (value) {
      try {
        arr = JSON.parse(value) || [];
      } catch (e) {
        arr = [];
      }
    }
    mutateFn(arr);
    return storageSet(dateKey, JSON.stringify(arr));
  });
}
function afterTopicMutation(dateKey) {
  if (dateKey === topicsKey()) {
    loadTopics().then(function (topics) {
      todayTopics = topics;
      todayCount = todayTopics.filter(function (t) { return t.done; }).length;
      saveProgress(todayCount);
      renderProgress();
      loadHistory();
      if (topicsRange === "day") renderTopics();
    });
  }
  renderTopicsView(true);
}
function buildHistoryTopicLi(item, dateKey) {
  var li = document.createElement("li");
  li.className = "topic-item";

  var cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!item.done;
  cb.setAttribute("aria-label", "Tamamlandı");
  cb.addEventListener("change", function () {
    mutateTopicsAt(dateKey, function (arr) {
      var t = arr.filter(function (x) { return x.id === item.id; })[0];
      if (t) t.done = cb.checked;
    }).then(function () { afterTopicMutation(dateKey); });
  });

  var span = document.createElement("span");
  span.className = "topic-text" + (item.done ? " done" : "");
  span.textContent = item.text;

  var delBtn = document.createElement("button");
  delBtn.className = "topic-delete";
  delBtn.setAttribute("aria-label", "Sil");
  delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
  delBtn.addEventListener("click", function () {
    mutateTopicsAt(dateKey, function (arr) {
      var idx = -1;
      arr.forEach(function (x, i) { if (x.id === item.id) idx = i; });
      if (idx >= 0) arr.splice(idx, 1);
    }).then(function () { afterTopicMutation(dateKey); });
  });

  li.appendChild(cb);
  li.appendChild(span);
  li.appendChild(delBtn);
  return li;
}
function renderTopicsGroups(groups) {
  var list = document.getElementById("topicsList");
  list.innerHTML = "";
  var todayStr = dateStr(new Date());
  var any = false;
  groups.forEach(function (g) {
    if (!g.items || g.items.length === 0) return;
    any = true;
    var header = document.createElement("li");
    header.className = "topic-day-header";
    header.textContent = dateStr(g.date) === todayStr
      ? "bugün"
      : g.date.getDate() + " " + months[g.date.getMonth()] + " " + g.date.getFullYear();
    list.appendChild(header);
    g.items.forEach(function (item) {
      list.appendChild(buildHistoryTopicLi(item, g.key));
    });
  });
  var empty = document.getElementById("topicsEmpty");
  if (empty) empty.style.display = any ? "none" : "block";
}
function renderTopicsView(force) {
  var inputRow = document.getElementById("topicInputRow");
  if (topicsRange === "day") {
    if (inputRow) inputRow.style.display = "";
    renderTopics();
    return;
  }
  if (inputRow) inputRow.style.display = "none";

  var now = Date.now();
  if (!force && now - lastTopicsFetchTs < TOPICS_REFRESH_MS) return;
  lastTopicsFetchTs = now;

  var myToken = ++topicsFetchToken;
  var datesPromise;
  if (topicsRange === "week") {
    datesPromise = Promise.resolve((function () {
      var days = [];
      for (var i = 6; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
      return days;
    })());
  } else if (topicsRange === "month") {
    datesPromise = Promise.resolve((function () {
      var days = [];
      for (var i = 29; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
      return days;
    })());
  } else {
    datesPromise = storageListKeys("topics-").then(function (keys) {
      return keys.map(function (k) {
        var ds = k.slice("topics-".length);
        var parts = ds.split("-").map(Number);
        return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      });
    });
  }

  datesPromise.then(function (dates) {
    var sorted = dates.slice().sort(function (a, b) { return b - a; });
    return Promise.all(sorted.map(function (d) {
      var key = topicsDateKeyFor(d);
      return storageGet(key).then(function (value) {
        var arr = [];
        if (value) {
          try { arr = JSON.parse(value) || []; } catch (e) {}
        }
        return { date: d, key: key, items: arr };
      });
    }));
  }).then(function (groups) {
    if (myToken !== topicsFetchToken) return;
    renderTopicsGroups(groups);
  });
}
function addTopicFromInput() {
  var input = document.getElementById("topicInput");
  var text = input.value.trim();
  if (!text) return;
  todayTopics.push({ id: Date.now() + Math.random(), text: text, done: false });
  input.value = "";
  onTopicsChanged();
}
function loadHistory() {
  var wrap = document.getElementById("historyBars");
  if (!wrap) return;
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  Promise.all(days.map(function (d) {
    return storageGet("progress-" + dateStr(d)).then(function (value) {
      return { d: d, count: value ? (Number(value) || 0) : 0 };
    });
  })).then(function (results) {
    var maxCount = Math.max.apply(null, results.map(function (r) { return r.count; }).concat([state.dailyGoal || 1, 1]));
    var todayStr = dateStr(new Date());
    wrap.innerHTML = "";
    results.forEach(function (r) {
      var col = document.createElement("div");
      col.className = "history-bar-col" + (dateStr(r.d) === todayStr ? " is-today" : "");

      var value = document.createElement("div");
      value.className = "history-bar-value";
      value.textContent = r.count;

      var bar = document.createElement("div");
      bar.className = "history-bar";
      var pct = Math.max((r.count / maxCount) * 100, r.count > 0 ? 6 : 0);
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

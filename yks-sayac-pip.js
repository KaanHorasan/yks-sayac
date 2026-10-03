// ============================================================================
// YKS Sayaç — "Üstte tut" (Document Picture-in-Picture) ve uygulama olarak yükleme
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
//
// Widget (#widget) her zaman üstte kalan küçük bir pencereye TAŞINIR (kopyalanmaz); kodun geri kalanı
// document.getElementById(...) ile aynen çalışmaya devam etsin diye pencere açıkken document'in
// getElementById / querySelector(All) / body'si PiP penceresine de bakacak şekilde geçici olarak yamalanır.
// Pencere kapanınca her şey eski yerine döner. Gereksinim: Chrome/Edge 116+ ve HTTPS.
// ============================================================================

var widgetPip = {
  win: null,
  placeholder: null,
  moved: [],          // [{ el, parent, marker }]
  ticker: null,
  observer: null,
  shimmed: false
};
var deferredInstallPrompt = null;

function widgetPipSupported() {
  return typeof window.documentPictureInPicture === "object" && !!window.documentPictureInPicture &&
    typeof window.documentPictureInPicture.requestWindow === "function";
}
function widgetPipActive() {
  return !!(widgetPip.win && !widgetPip.win.closed);
}
function updatePipButtons() {
  var btn = document.getElementById("pipBtn");
  if (!btn) return;
  var on = widgetPipActive();
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.title = on ? "Ana pencereye geri getir" : "Üstte tut (her zaman üstte kalan mini pencere)";
}
function copyStylesToPip(pipDoc) {
  var nodes = document.querySelectorAll('link[rel="stylesheet"], style');
  Array.prototype.forEach.call(nodes, function (n) {
    if (n.tagName === "LINK") {
      var l = pipDoc.createElement("link");
      l.rel = "stylesheet";
      l.href = n.href;
      pipDoc.head.appendChild(l);
    } else {
      var s = pipDoc.createElement("style");
      s.textContent = n.textContent;
      pipDoc.head.appendChild(s);
    }
  });
}
function installPipShims(pipWin) {
  var mainDoc = document;
  var pipDoc = pipWin.document;
  var P = Document.prototype;
  mainDoc.getElementById = function (id) {
    return P.getElementById.call(mainDoc, id) || P.getElementById.call(pipDoc, id);
  };
  mainDoc.querySelector = function (sel) {
    return P.querySelector.call(mainDoc, sel) || P.querySelector.call(pipDoc, sel);
  };
  mainDoc.querySelectorAll = function (sel) {
    return Array.prototype.slice.call(P.querySelectorAll.call(mainDoc, sel))
      .concat(Array.prototype.slice.call(P.querySelectorAll.call(pipDoc, sel)));
  };
  Object.defineProperty(mainDoc, "body", { configurable: true, get: function () { return pipDoc.body; } });
  widgetPip.shimmed = true;
}
function removePipShims() {
  if (!widgetPip.shimmed) return;
  delete document.getElementById;
  delete document.querySelector;
  delete document.querySelectorAll;
  delete document.body;
  widgetPip.shimmed = false;
}
function moveIntoPip(el, pipBody, useMarker) {
  if (!el || !el.parentNode) return;
  var rec = { el: el, parent: el.parentNode, marker: null };
  if (useMarker) {
    rec.marker = widgetPip.placeholder;
    el.parentNode.insertBefore(rec.marker, el);
  }
  pipBody.appendChild(el);
  widgetPip.moved.push(rec);
}
function buildPipPlaceholder() {
  var ph = document.createElement("div");
  ph.id = "pipPlaceholder";
  ph.style.cssText = "max-width: 320px; margin: 60px auto; padding: 18px; text-align: center; font: 13px/1.5 'IBM Plex Mono', monospace; color: var(--ink, #ddd);";
  var msg = document.createElement("p");
  msg.textContent = "Widget şu an üstte duran mini pencerede. Bu pencereyi küçültüp diğer işlerine devam edebilirsin.";
  var back = document.createElement("button");
  back.type = "button";
  back.className = "save-btn";
  back.textContent = "Ana pencereye geri getir";
  back.addEventListener("click", function () { closeWidgetPip(); });
  ph.appendChild(msg);
  ph.appendChild(back);
  return ph;
}
function restoreWidgetFromPip() {
  var w = widgetPip.win;
  if (!w) return;
  try { w.clearInterval(widgetPip.ticker); } catch (e) {}
  if (widgetPip.observer) { try { widgetPip.observer.disconnect(); } catch (e2) {} }
  removePipShims();
  widgetPip.moved.forEach(function (rec) {
    if (rec.marker && rec.marker.parentNode) {
      rec.marker.parentNode.insertBefore(rec.el, rec.marker);
      rec.marker.parentNode.removeChild(rec.marker);
    } else if (rec.parent) {
      rec.parent.appendChild(rec.el);
    }
  });
  widgetPip.moved = [];
  widgetPip.win = null;
  widgetPip.placeholder = null;
  widgetPip.ticker = null;
  widgetPip.observer = null;
  updatePipButtons();
  try { tick(); } catch (e3) {}
}
function closeWidgetPip() {
  var w = widgetPip.win;
  if (!w) return;
  restoreWidgetFromPip();
  try { w.close(); } catch (e) {}
}
function openWidgetPip() {
  if (widgetPipActive()) { closeWidgetPip(); return Promise.resolve(false); }
  if (!widgetPipSupported()) {
    showUpdateToast("Bu tarayıcı 'Üstte tut' özelliğini desteklemiyor (Chrome/Edge 116 veya üstü gerekir).");
    return Promise.resolve(false);
  }
  if (typeof focusModeActive !== "undefined" && focusModeActive) {
    showUpdateToast("Odak modu açıkken 'Üstte tut' kullanılamaz.");
    return Promise.resolve(false);
  }
  var widgetEl = document.getElementById("widget");
  if (!widgetEl) return Promise.resolve(false);
  var rect = widgetEl.getBoundingClientRect();
  var width = Math.min(420, Math.max(300, Math.round(rect.width) || 340));
  var height = Math.min(760, Math.max(380, Math.round(rect.height) || 520));
  return window.documentPictureInPicture.requestWindow({ width: width, height: height }).then(function (pipWin) {
    var pipDoc = pipWin.document;
    pipDoc.documentElement.lang = "tr";
    pipDoc.title = "YKS Sayaç";
    var theme = document.documentElement.getAttribute("data-theme");
    if (theme) pipDoc.documentElement.setAttribute("data-theme", theme);
    copyStylesToPip(pipDoc);

    widgetPip.placeholder = buildPipPlaceholder();
    moveIntoPip(widgetEl, pipDoc.body, true);
    // açık kalmış bildirim/mesaj katmanları da widget'la birlikte taşınır
    ["updateToast", "adminMsgOverlay"].forEach(function (id) {
      var extra = document.getElementById(id);
      if (extra && extra.parentNode === document.body) moveIntoPip(extra, pipDoc.body, false);
    });
    widgetPip.win = pipWin;
    installPipShims(pipWin);

    widgetPip.observer = new MutationObserver(function () {
      var t = document.documentElement.getAttribute("data-theme");
      if (t) pipDoc.documentElement.setAttribute("data-theme", t);
    });
    widgetPip.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Ana pencere küçültülünce zamanlayıcıları kısılır; PiP penceresinin kendi zamanlayıcısı kısılmaz.
    widgetPip.ticker = pipWin.setInterval(function () {
      try { tick(); } catch (e) {}
    }, 1000);

    pipWin.addEventListener("pagehide", function () { restoreWidgetFromPip(); });
    updatePipButtons();
    tick();
    return true;
  }).catch(function (err) {
    console.error("Üstte tut açılamadı:", err);
    showUpdateToast("'Üstte tut' penceresi açılamadı.");
    return false;
  });
}

// ---- Uygulama olarak yükleme (PWA) ----
function setInstallRowVisible(visible) {
  var row = document.getElementById("installAppRow");
  if (row) row.style.display = visible ? "" : "none";
}
function initInstallPrompt() {
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (standalone) return;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    setInstallRowVisible(true);
  });
  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    setInstallRowVisible(false);
    showUpdateToast("Uygulama yüklendi. Artık masaüstünden açabilirsin.");
  });
}
function installApp() {
  var ev = deferredInstallPrompt;
  if (!ev) {
    showUpdateToast("Tarayıcı menüsünden 'Uygulamayı yükle' (Edge: Uygulamalar → Bu siteyi uygulama olarak yükle) seçeneğini kullan.");
    return;
  }
  deferredInstallPrompt = null;
  ev.prompt();
  ev.userChoice.then(function () { setInstallRowVisible(false); }).catch(function () {});
}

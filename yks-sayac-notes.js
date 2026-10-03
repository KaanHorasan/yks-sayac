// ============================================================================
// YKS Sayaç — Not defteri + not HTML temizleyici
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// ---- Not Defteri ----

var notesState = { pages: [], activeId: null };
var notesSaveTimer = null;
function notesKey() {
  return "notes-pages";
}
function loadNotes() {
  return storageGet(notesKey()).then(function (value) {
    if (value) {
      try {
        var parsed = JSON.parse(value);
        if (parsed && Array.isArray(parsed.pages)) {
          parsed.pages.forEach(function (pg) {
            if (pg && typeof pg.content === "string" && looksLikeHtml(pg.content)) pg.content = sanitizeNoteHtml(pg.content);
          });
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
}
function saveNotesNow() {
  return storageSet(notesKey(), JSON.stringify(notesState));
}
function scheduleNotesSave() {
  if (notesSaveTimer) clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(function () {
    notesSaveTimer = null;
    saveNotesNow();
  }, 400);
}
function flushNotesSave() {
  if (notesSaveTimer) {
    clearTimeout(notesSaveTimer);
    notesSaveTimer = null;
    saveNotesNow();
  }
}
function activeNotePage() {
  return notesState.pages.filter(function (p) { return p.id === notesState.activeId; })[0] || null;
}
function formatNoteTimestamp(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  var now = new Date();
  var hh = (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  return dateStr(d) === dateStr(now) ? ("bugün · " + hh) : (d.getDate() + " " + months[d.getMonth()] + " · " + hh);
}
function makeNotePage(title) {
  return {
    id: "p" + Date.now() + Math.random().toString(36).slice(2, 7),
    title: title || "",
    tag: "",
    content: "",
    updatedAt: Date.now()
  };
}
// ---- Not HTML'i temizleyici (beyaz liste) ----
// Notlar zengin metin (HTML) olarak saklanır. Yedek dosyasından içe aktarılan, panodan yapıştırılan ya da
// eski kayıtlardan gelen içerik <img onerror=...>, <script>, javascript: bağlantısı gibi şeyler içerebilir.
// DOMParser ile AYRIŞTIRMA güvenlidir (betik çalışmaz, resim yüklenmez, olaylar tetiklenmez); sonra sadece
// izin verilen etiket/öznitelikler yeni düğümlere kopyalanır.
var NOTE_OK_TAGS = {
  B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, DEL: 1, MARK: 1, SUB: 1, SUP: 1, CODE: 1, PRE: 1,
  UL: 1, OL: 1, LI: 1, DIV: 1, P: 1, BR: 1, SPAN: 1, FONT: 1, BLOCKQUOTE: 1, HR: 1,
  H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
  TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, A: 1, IMG: 1
};
// içeriğiyle birlikte tamamen atılanlar
var NOTE_DROP_TAGS = {
  SCRIPT: 1, STYLE: 1, IFRAME: 1, FRAME: 1, FRAMESET: 1, OBJECT: 1, EMBED: 1, APPLET: 1, LINK: 1, META: 1,
  BASE: 1, TEMPLATE: 1, NOSCRIPT: 1, SVG: 1, MATH: 1, FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1,
  OPTION: 1, AUDIO: 1, VIDEO: 1, SOURCE: 1, TRACK: 1, CANVAS: 1, TITLE: 1, HEAD: 1, XMP: 1, PLAINTEXT: 1
};
var NOTE_STYLE_PROPS = {
  "color": 1, "background-color": 1, "font-weight": 1, "font-style": 1, "text-decoration": 1,
  "text-decoration-line": 1, "text-align": 1, "font-size": 1
};
function sanitizeNoteStyle(v) {
  var out = [];
  String(v).split(";").forEach(function (decl) {
    var i = decl.indexOf(":");
    if (i < 1) return;
    var prop = decl.slice(0, i).trim().toLowerCase();
    var val = decl.slice(i + 1).trim();
    if (!NOTE_STYLE_PROPS[prop]) return;
    if (!/^[#a-z0-9%.,()\s\-]+$/i.test(val)) return;
    if (/url\s*\(|expression|javascript|@import|var\s*\(/i.test(val)) return;
    out.push(prop + ": " + val);
  });
  return out.join("; ");
}
function isSafeNoteColor(v) {
  return /^(#[0-9a-f]{3,8}|rgba?\([0-9\s.,%]+\)|[a-z]{3,20})$/i.test(String(v).trim());
}
function copyNoteAttrs(src, dst, tag) {
  var st = src.getAttribute("style");
  if (st) { var cleanStyle = sanitizeNoteStyle(st); if (cleanStyle) dst.setAttribute("style", cleanStyle); }
  if (tag === "FONT") {
    var col = src.getAttribute("color");
    if (col && isSafeNoteColor(col)) dst.setAttribute("color", col.trim());
    var sz = src.getAttribute("size");
    if (sz && /^[1-7]$/.test(sz.trim())) dst.setAttribute("size", sz.trim());
  } else if (tag === "A") {
    var href = (src.getAttribute("href") || "").trim();
    if (/^(https?:\/\/|mailto:)/i.test(href)) {
      dst.setAttribute("href", href);
      dst.setAttribute("target", "_blank");
      dst.setAttribute("rel", "noopener noreferrer");
    }
  } else if (tag === "IMG") {
    var s = (src.getAttribute("src") || "").trim();
    if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+\/=\s]+$/i.test(s)) {
      dst.setAttribute("src", s);
      var alt = src.getAttribute("alt");
      if (alt) dst.setAttribute("alt", alt.slice(0, 200));
      ["width", "height"].forEach(function (a) {
        var n = src.getAttribute(a);
        if (n && /^\d{1,4}$/.test(n.trim())) dst.setAttribute(a, n.trim());
      });
    }
  }
}
function sanitizeNoteInto(srcParent, dstParent, depth) {
  Array.prototype.forEach.call(srcParent.childNodes, function (n) {
    if (n.nodeType === 3) { dstParent.appendChild(document.createTextNode(n.nodeValue)); return; }
    if (n.nodeType !== 1) return;                       // yorum vb. atılır
    var tag = n.tagName.toUpperCase();
    if (NOTE_DROP_TAGS[tag]) return;
    if (depth > 60) { dstParent.appendChild(document.createTextNode(n.textContent || "")); return; }
    if (!NOTE_OK_TAGS[tag]) { sanitizeNoteInto(n, dstParent, depth + 1); return; }   // bilinmeyen etiket: içeriği korunur
    if (tag === "IMG" && !/^data:image\//i.test((n.getAttribute("src") || "").trim())) return;  // dış/geçersiz resim: at
    if (tag === "A" && !/^(https?:\/\/|mailto:)/i.test((n.getAttribute("href") || "").trim())) {
      sanitizeNoteInto(n, dstParent, depth + 1);   // güvenli adresi olmayan bağlantı: sadece metni kalır
      return;
    }
    var el = document.createElement(tag.toLowerCase());
    copyNoteAttrs(n, el, tag);
    if (tag === "IMG" && !el.getAttribute("src")) return;
    if (tag !== "BR" && tag !== "HR" && tag !== "IMG") sanitizeNoteInto(n, el, depth + 1);
    dstParent.appendChild(el);
  });
}
function sanitizeNoteHtml(html) {
  if (!html) return "";
  var doc = new DOMParser().parseFromString("<!doctype html><body>" + String(html), "text/html");
  var out = document.createElement("div");
  sanitizeNoteInto(doc.body, out, 0);
  return out.innerHTML;
}
function htmlToPlainText(html) {
  if (!html) return "";
  var doc = new DOMParser().parseFromString("<!doctype html><body>" + String(html), "text/html");
  Array.prototype.forEach.call(doc.querySelectorAll("script, style, template, noscript"), function (e) { e.remove(); });
  return doc.body.textContent || "";
}
function looksLikeHtml(str) {
  return /<\/?(b|strong|i|em|ul|ol|li|div|br|span)[ >]/i.test(str);
}
function escapeHtmlText(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function renderNoteContentInto(el, content) {
  if (!el) return;
  if (!content) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = looksLikeHtml(content) ? sanitizeNoteHtml(content) : escapeHtmlText(content).replace(/\n/g, "<br>");
}
function colorForPage(page) {
  var key = (page.tag && page.tag.trim()) ? page.tag.trim().toLowerCase() : page.id;
  var hash = 0;
  for (var i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return pieColors[hash % pieColors.length];
}
var noteSearchQuery = "";
var activeTagFilter = null;
function pageMatchesFilters(page) {
  var matchesTag = !activeTagFilter || (page.tag || "").trim() === activeTagFilter;
  if (!matchesTag) return false;
  if (!noteSearchQuery) return true;
  var haystack = (
    page.title + " " + (page.tag || "") + " " + htmlToPlainText(page.content || "")
  ).toLowerCase();
  return haystack.indexOf(noteSearchQuery) !== -1;
}
function renderNoteTagChips() {
  var container = document.getElementById("noteTagChips");
  if (!container) return;
  var tags = [];
  notesState.pages.forEach(function (p) {
    var t = (p.tag || "").trim();
    if (t && tags.indexOf(t) === -1) tags.push(t);
  });
  container.innerHTML = "";
  if (!tags.length) {
    container.style.display = "none";
    activeTagFilter = null;
    return;
  }
  container.style.display = "flex";
  tags.sort(function (a, b) { return a.localeCompare(b, "tr"); });
  tags.forEach(function (t) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "note-tag-chip" + (activeTagFilter === t ? " active" : "");
    chip.textContent = t;
    chip.addEventListener("click", function () {
      activeTagFilter = (activeTagFilter === t) ? null : t;
      renderNotePageList();
    });
    container.appendChild(chip);
  });
}
function renderNotePageList() {
  var list = document.getElementById("notePageList");
  if (!list) return;
  renderNoteTagChips();
  list.innerHTML = "";
  var visible = notesState.pages.filter(pageMatchesFilters);

  if (!visible.length) {
    var msg = document.createElement("li");
    msg.className = "note-page-empty-msg";
    msg.textContent = notesState.pages.length ? "Eşleşen not bulunamadı." : "Henüz sayfa yok.";
    list.appendChild(msg);
    return;
  }

  visible.forEach(function (page) {
    var li = document.createElement("li");
    li.className = "note-page-item" + (page.id === notesState.activeId ? " active" : "");
    li.dataset.pageId = page.id;
    li.style.borderLeftColor = colorForPage(page);

    var info = document.createElement("div");
    info.className = "note-page-info";
    var titleEl = document.createElement("span");
    titleEl.className = "note-page-title";
    titleEl.textContent = page.title.trim() || "Başlıksız sayfa";
    var metaEl = document.createElement("span");
    metaEl.className = "note-page-meta";
    var tagPart = (page.tag || "").trim();
    metaEl.textContent = (tagPart ? tagPart + " · " : "") + formatNoteTimestamp(page.updatedAt);
    info.appendChild(titleEl);
    info.appendChild(metaEl);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "note-page-delete";
    delBtn.setAttribute("aria-label", "Sayfayı sil");
    delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    delBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      deleteNotePage(page.id);
    });

    li.appendChild(info);
    li.appendChild(delBtn);
    li.addEventListener("click", function () { selectNotePage(page.id); });
    list.appendChild(li);
  });
}
function refreshActiveSidebarMeta() {
  var page = activeNotePage();
  if (!page) return;
  var li = document.querySelector('.note-page-item[data-page-id="' + page.id + '"]');
  if (!li) return;
  var titleEl = li.querySelector(".note-page-title");
  var metaEl = li.querySelector(".note-page-meta");
  if (titleEl) titleEl.textContent = page.title.trim() || "Başlıksız sayfa";
  if (metaEl) {
    var tagPart = (page.tag || "").trim();
    metaEl.textContent = (tagPart ? tagPart + " · " : "") + formatNoteTimestamp(page.updatedAt);
  }
  li.style.borderLeftColor = colorForPage(page);
}
function renderActiveNote() {
  var main = document.getElementById("notesMain");
  var empty = document.getElementById("notesEmpty");
  var page = activeNotePage();
  if (!page) {
    if (main) main.style.display = "none";
    if (empty) empty.style.display = "flex";
    return;
  }
  if (main) main.style.display = "flex";
  if (empty) empty.style.display = "none";
  var titleInput = document.getElementById("noteTitleInput");
  var tagInput = document.getElementById("noteTagInput");
  var contentInput = document.getElementById("noteContentInput");
  if (titleInput) titleInput.value = page.title;
  if (tagInput) tagInput.value = page.tag || "";
  renderNoteContentInto(contentInput, page.content);
}
function saveActiveNoteContent() {
  var page = activeNotePage();
  var contentInput = document.getElementById("noteContentInput");
  if (!page || !contentInput) return;
  page.content = sanitizeNoteHtml(contentInput.innerHTML);
  page.updatedAt = Date.now();
  scheduleNotesSave();
  refreshActiveSidebarMeta();
}
function selectNotePage(id) {
  if (id === notesState.activeId) return;
  flushNotesSave();
  notesState.activeId = id;
  saveNotesNow();
  renderNotePageList();
  renderActiveNote();
}
function addNotePage() {
  flushNotesSave();
  var page = makeNotePage("Sayfa " + (notesState.pages.length + 1));
  notesState.pages.push(page);
  notesState.activeId = page.id;
  saveNotesNow();
  renderNotePageList();
  renderActiveNote();
  var titleInput = document.getElementById("noteTitleInput");
  if (titleInput) titleInput.focus();
}
function deleteNotePage(id) {
  var page = notesState.pages.filter(function (p) { return p.id === id; })[0];
  if (!page) return;
  var label = page.title.trim() || "Başlıksız sayfa";
  if (!confirm("\"" + label + "\" sayfasını silmek istediğine emin misin? Bu işlem geri alınamaz.")) return;
  notesState.pages = notesState.pages.filter(function (p) { return p.id !== id; });
  if (notesState.activeId === id) {
    notesState.activeId = notesState.pages.length ? notesState.pages[0].id : null;
  }
  saveNotesNow();
  renderNotePageList();
  renderActiveNote();
}
function initNotesView() {
  var dateEl = document.getElementById("notesDate");
  try { document.execCommand("defaultParagraphSeparator", false, "br"); } catch (e) {}

  loadNotes().then(function (data) {
    if (data && data.pages.length) {
      notesState.pages = data.pages;
      notesState.pages.forEach(function (p) { if (typeof p.tag !== "string") p.tag = ""; });
      notesState.activeId = data.pages.some(function (p) { return p.id === data.activeId; })
        ? data.activeId : data.pages[0].id;
    } else {
      var firstPage = makeNotePage("Sayfa 1");
      notesState.pages = [firstPage];
      notesState.activeId = firstPage.id;
      saveNotesNow();
    }
    if (dateEl) {
      var now = new Date();
      dateEl.textContent = now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear() +
        " · " + notesState.pages.length + " sayfa";
    }
    renderNotePageList();
    renderActiveNote();
  });

  document.getElementById("noteAddBtn").addEventListener("click", addNotePage);

  document.getElementById("noteSearchInput").addEventListener("input", function (e) {
    noteSearchQuery = e.target.value.trim().toLowerCase();
    renderNotePageList();
  });

  document.getElementById("noteTitleInput").addEventListener("input", function (e) {
    var page = activeNotePage();
    if (!page) return;
    page.title = e.target.value;
    page.updatedAt = Date.now();
    scheduleNotesSave();
    refreshActiveSidebarMeta();
    var dEl = document.getElementById("notesDate");
    if (dEl) {
      var now2 = new Date();
      dEl.textContent = now2.getDate() + " " + months[now2.getMonth()] + " " + now2.getFullYear() +
        " · " + notesState.pages.length + " sayfa";
    }
  });

  document.getElementById("noteTagInput").addEventListener("input", function (e) {
    var page = activeNotePage();
    if (!page) return;
    page.tag = e.target.value;
    page.updatedAt = Date.now();
    scheduleNotesSave();
    refreshActiveSidebarMeta();
    renderNoteTagChips();
  });

  document.getElementById("noteContentInput").addEventListener("input", saveActiveNoteContent);

  // Panodan HTML yapıştırılırsa temizlenmiş halini ekle (düz metin yapıştırma değişmez)
  document.getElementById("noteContentInput").addEventListener("paste", function (e) {
    var cd = e.clipboardData;
    if (!cd) return;
    var pastedHtml = cd.getData("text/html");
    if (!pastedHtml) return;
    e.preventDefault();
    var clean = sanitizeNoteHtml(pastedHtml);
    if (clean) document.execCommand("insertHTML", false, clean);
    else document.execCommand("insertText", false, cd.getData("text/plain"));
    saveActiveNoteContent();
  });

  function wireToolbarButton(btnId, command) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    // Mousedown'da preventDefault: buton tıklanınca odağın/seçimin
    // editörden kaymasını (ve bu yüzden execCommand'ın seçimsiz kalıp
    // hiçbir şey yapmamasını) önler.
    btn.addEventListener("mousedown", function (e) {
      e.preventDefault();
    });
    btn.addEventListener("click", function () {
      document.getElementById("noteContentInput").focus();
      document.execCommand(command);
      saveActiveNoteContent();
    });
  }

  wireToolbarButton("noteBoldBtn", "bold");
  wireToolbarButton("noteBulletBtn", "insertUnorderedList");

  var noteColorBtn = document.getElementById("noteColorBtn");
  var noteColorPopover = document.getElementById("noteColorPopover");
  if (noteColorBtn && noteColorPopover) {
    noteColorBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    noteColorBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      noteColorPopover.classList.toggle("open");
    });

    Array.prototype.forEach.call(noteColorPopover.querySelectorAll(".note-color-swatch"), function (swatch) {
      // Buradaki mousedown preventDefault de aynı nedenle gerekli:
      // popover'ı açan tıklama zaten seçimi korudu, ama renge tıklamak
      // ayrı bir tıklama olduğu için o da seçimi koruyacak şekilde işaretlenmeli.
      swatch.addEventListener("mousedown", function (e) { e.preventDefault(); });
      swatch.addEventListener("click", function (e) {
        e.stopPropagation();
        var color = swatch.getAttribute("data-color");
        if (color === "default") {
          color = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#2b2b2b";
        }
        var contentEl = document.getElementById("noteContentInput");
        contentEl.focus();
        document.execCommand("foreColor", false, color);
        saveActiveNoteContent();
        noteColorPopover.classList.remove("open");
      });
    });

    document.addEventListener("click", function () {
      noteColorPopover.classList.remove("open");
    });
  }

  window.addEventListener("beforeunload", flushNotesSave);

  var notesFullscreenBtn = document.getElementById("notesFullscreenBtn");
  if (notesFullscreenBtn) {
    notesFullscreenBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
  }

  var notesThemeBtn = document.getElementById("notesThemeBtn");
  if (notesThemeBtn) {
    notesThemeBtn.addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      saveSettings();
    });
  }
}

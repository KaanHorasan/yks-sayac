// Genel hata yakalayici - "hata mesajlari" iyilestirmesi.
// Bunun amaci: beklenmedik bir JS hatasi olustugunda (once sadece
// tarayici konsoluna gidip kullanicinin hicbir sey gormedigi
// durumlarda) en azindan kisa, sakin bir bildirim gostermek.
// BILEREK diger her seyden once (body'nin en basinda) tanimlaniyor
// ki sayfadaki herhangi bir script (Firebase, cloud.js, ana widget
// kodu) hata verirse de yakalansin.
(function () {
  var toastTimer = null;
  function ensureGlobalErrorToast() {
    var el = document.getElementById("globalErrorToast");
    if (el) return el;
    el = document.createElement("div");
    el.id = "globalErrorToast";
    el.setAttribute("role", "alert");
    el.style.cssText =
      "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);" +
      "max-width:88%;z-index:99999;padding:10px 14px;border-radius:10px;" +
      "font:13px/1.4 -apple-system,'Segoe UI',Arial,sans-serif;" +
      "background:var(--danger,#c97064);color:#fff;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;text-align:center;";
    if (document.body) document.body.appendChild(el);
    return el;
  }
  function showGlobalError(message) {
    var el = ensureGlobalErrorToast();
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = "none"; }, 6000);
  }
  window.addEventListener("error", function () {
    showGlobalError("Beklenmeyen bir hata oluştu. Sorun sürerse widget'ı kapatıp yeniden aç.");
  });
  window.addEventListener("unhandledrejection", function () {
    showGlobalError("Beklenmeyen bir hata oluştu. Sorun sürerse widget'ı kapatıp yeniden aç.");
  });
  // Diger scriptler de (ozel, daha spesifik mesajlarla) kullanabilsin diye:
  window.showGlobalError = showGlobalError;
})();

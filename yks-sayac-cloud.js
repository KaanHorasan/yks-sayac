// ---- YKS Sayaç - Bulut (Firebase) Entegrasyonu ----

var firebaseConfig = {
  apiKey: "AIzaSyBuY_hjvqBMdYTeQwEwbUAZ7Ol_1TrEdS8",
  authDomain: "yks-koclugu-367ec.firebaseapp.com",
  projectId: "yks-koclugu-367ec",
  storageBucket: "yks-koclugu-367ec.firebasestorage.app",
  messagingSenderId: "107365183273",
  appId: "1:107365183273:web:94896ac71447b8fa279138",
  measurementId: "G-RR5BZXWPWC"
};

firebase.initializeApp(firebaseConfig);
var fbAuth = firebase.auth();
var fbDb = firebase.firestore();
// Ag/antivirus/guvenlik duvari Firestore'un normal (streaming) baglantisini surekli
// kesip sifirlatiyor (surekli yeniden baglanma dongusu). Bu ayar, kararli calisan
// ama biraz daha yavas olan uzun-polling yontemine sabitliyor.
fbDb.settings({ experimentalForceLongPolling: true });

var YKS_TOPICS = {
  TYT: {
    "Türkçe": [
      "Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", "Paragrafta Yapı",
      "Ses Bilgisi", "Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı/Ekler",
      "Sözcük Türleri", "Fiilde Anlam (Kip-Kişi-Yapı)", "Ek Fiil", "Fiilimsi",
      "Cümlenin Ögeleri", "Cümle Türleri", "Anlatım Bozuklukları"
    ],
    "Matematik": [
      "Temel Kavramlar", "Sayı Basamakları", "Bölme ve Bölünebilme", "OBEB-OKEK",
      "Rasyonel Sayılar", "Basit Eşitsizlikler", "Mutlak Değer", "Üslü Sayılar",
      "Köklü Sayılar", "Çarpanlara Ayırma", "Oran-Orantı", "Denklem Çözme",
      "Problemler", "Kümeler", "Fonksiyonlar (Temel)", "Permütasyon-Kombinasyon-Olasılık (Temel)",
      "İstatistik (Temel)"
    ],
    "Geometri": [
      "Doğruda ve Üçgende Açı", "Üçgende Alan-Kenar Bağıntıları", "Özel Üçgenler",
      "Açıortay-Kenarortay", "Çokgenler", "Dörtgenler", "Çember ve Daire", "Katı Cisimler (Temel)"
    ],
    "Fizik": [
      "Fizik Bilimine Giriş", "Madde ve Özellikleri", "Basınç", "Kaldırma Kuvveti",
      "Isı ve Sıcaklık", "Hareket", "Kuvvet ve Newton Yasaları", "İş-Güç-Enerji",
      "Elektrik (Temel)", "Manyetizma (Temel)", "Optik (Temel)", "Dalgalar (Temel)"
    ],
    "Kimya": [
      "Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler",
      "Maddenin Halleri", "Doğa ve Kimya", "Kimyanın Temel Kanunları", "Mol Kavramı",
      "Kimyasal Tepkimeler", "Karışımlar", "Asit-Baz-Tuz", "Kimya Her Yerde"
    ],
    "Biyoloji": [
      "Canlıların Ortak Özellikleri", "Hücre", "Canlıların Sınıflandırılması",
      "Hücre Bölünmeleri (Mitoz-Mayoz)", "Kalıtım (Temel)", "Ekosistem Ekolojisi",
      "Bitki Biyolojisi (Temel)"
    ],
    "Tarih": [
      "Tarih Bilimi ve Yöntemi", "İlk ve Orta Çağlarda Türk Dünyası", "İslamiyet ve Türkler",
      "Beylikten Devlete (Osmanlı Kuruluş)", "Dünya Gücü Osmanlı", "Osmanlı Kültür ve Medeniyeti",
      "Arayış Yılları (17-18.yy)", "Devrimler Çağında Osmanlı", "20.yy Başı Osmanlı",
      "I. Dünya Savaşı", "Milli Mücadele"
    ],
    "Coğrafya": [
      "Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum", "İklim Bilgisi",
      "Yerin Şekillenmesi", "Nüfus", "Göç", "Yerleşme", "Ekonomik Faaliyetler",
      "Türkiye'nin Yer Şekilleri", "Çevre ve Toplum"
    ],
    "Felsefe": [
      "Felsefenin Alanı", "Bilgi Felsefesi", "Varlık Felsefesi", "Din-Kültür-Felsefe",
      "Ahlak Felsefesi", "Sanat Felsefesi", "Din Felsefesi", "Siyaset Felsefesi", "Bilim Felsefesi"
    ],
    "Din Kültürü": [
      "Bilgi ve İnanç", "İslam ve İbadet", "Din ve Hayat", "Anadolu'da İslam", "İslam ve Bilim"
    ]
  },
  AYT: {
    "Matematik": [
      "Polinomlar", "2. Dereceden Denklemler", "Permütasyon-Kombinasyon-Olasılık",
      "İstatistik", "Trigonometri", "Logaritma", "Diziler", "Limit ve Süreklilik",
      "Türev", "İntegral", "Karmaşık Sayılar"
    ],
    "Geometri": [
      "Analitik Geometri", "Vektörler", "Katı Cisimler (İleri)", "Çokgenler (İleri)",
      "Trigonometri (Geometri)"
    ],
    "Fizik": [
      "Vektörler ve Kuvvet", "Tork ve Denge", "Basit Makineler", "İtme-Momentum",
      "Elektrik Alan", "Manyetik Alan", "Alternatif Akım", "Çift Yarık Deneyi",
      "Modern Fizik", "Atom Fiziği"
    ],
    "Kimya": [
      "Kimyasal Hesaplamalar (İleri)", "Gazlar", "Sıvı Çözeltiler",
      "Kimyasal Tepkimelerde Enerji", "Tepkime Hızı", "Kimyasal Denge",
      "Asit-Baz Dengesi", "Elektrokimya", "Organik Kimya", "Enerji Kaynakları"
    ],
    "Biyoloji": [
      "Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket Sistemi",
      "Sindirim Sistemi", "Dolaşım ve Bağışıklık", "Solunum Sistemi", "Üriner Sistem",
      "Üreme Sistemi ve Gelişme", "Bitki Biyolojisi (İleri)", "Canlılarda Enerji Dönüşümleri",
      "Komünite ve Popülasyon Ekolojisi"
    ],
    "Türk Dili ve Edebiyatı": [
      "Edebiyat Bilgi ve Kuramları", "Divan Edebiyatı", "Halk Edebiyatı", "Tanzimat Edebiyatı",
      "Servet-i Fünun Edebiyatı", "Fecr-i Ati", "Milli Edebiyat", "Cumhuriyet Dönemi Şiir",
      "Cumhuriyet Dönemi Roman/Hikaye", "Cumhuriyet Dönemi Tiyatro", "Dünya Edebiyatından Örnekler"
    ],
    "Tarih-1": [
      "Tarih ve Çağ Açımı", "İlk Türk Devletleri", "Türk-İslam Devletleri", "Beylikten Devlete",
      "Dünya Gücü Osmanlı", "Osmanlı Kültür ve Medeniyeti", "Arayış Yılları",
      "Milli Mücadele", "Türk İnkılabı"
    ],
    "Tarih-2": [
      "Atatürkçülük ve Dış Politika", "II. Dünya Savaşı", "Soğuk Savaş Dönemi",
      "Yumuşama Dönemi", "Küreselleşen Dünya", "Türkiye'de Toplumsal ve Ekonomik Gelişmeler"
    ],
    "Coğrafya-1": [
      "Ekosistem", "Nüfus Politikaları", "Şehirleşme", "Türkiye'de Tarım-Sanayi-Ticaret", "Göç Süreçleri"
    ],
    "Coğrafya-2": [
      "Bölgeler", "Ulaşım ve Ticaret", "Çevre ve Toplum", "Küresel Ortam", "Doğal Sistemler"
    ],
    "Felsefe Grubu": [
      "Psikolojiye Giriş", "Öğrenme-Bellek-Düşünme", "Ruh Sağlığı", "Sosyolojiye Giriş",
      "Toplumsal Yapı", "Toplumsal Değişme", "Mantığa Giriş", "Klasik Mantık", "Sembolik Mantık"
    ],
    "Din Kültürü": [
      "İslam Düşüncesinde İtikadi Yorumlar", "İslam ve Bilim", "İslam ve Sanat",
      "Yahudilik ve Hristiyanlık", "Hint ve Çin Dinleri"
    ]
  }
};

var currentUserUid = null;
var currentUserProfile = null;

// Tarayici az once acildiginda Firestore'un aginin henuz kurulmamis olma
// ihtimaline karsi, "client is offline" (code: unavailable) hatasinda birkac
// kez kisa aralikla tekrar dener; kalici bir sorun varsa yine de hatayi verir.
function firestoreGetWithRetry(docRef, attemptsLeft, delayMs) {
  return docRef.get().catch(function (err) {
    var isTransient = err && (err.code === "unavailable" || /offline/i.test(err.message || ""));
    if (attemptsLeft > 0 && isTransient) {
      return new Promise(function (resolve) { setTimeout(resolve, delayMs); })
        .then(function () {
          return firestoreGetWithRetry(docRef, attemptsLeft - 1, Math.min(delayMs * 1.6, 4000));
        });
    }
    throw err;
  });
}

function genInviteCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "";
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function redeemInviteCode(studentUid, code) {
  code = (code || "").trim().toUpperCase();
  if (!code) return Promise.resolve(false);
  return fbDb.collection("inviteCodes").doc(code).get().then(function (doc) {
    if (!doc.exists) throw new Error("Geçersiz davet kodu.");
    var coachUid = doc.data().coachUid;
    // redeemedCode: Firestore kuralları, koç bağlantısının geçerli bir davet koduyla yapıldığını bununla doğrular
    return fbDb.collection("users").doc(studentUid).update({ coachId: coachUid, redeemedCode: code }).then(function () {
      return true;
    });
  });
}

function registerUser(role, name, email, password, inviteCode) {
  return fbAuth.createUserWithEmailAndPassword(email, password).then(function (cred) {
    var uid = cred.user.uid;
    var profile = { role: role, name: name, email: email, createdAt: Date.now(), coachId: null };
    return fbDb.collection("users").doc(uid).set(profile).then(function () {
      if (role === "coach") {
        var code = genInviteCode();
        return fbDb.collection("inviteCodes").doc(code).set({ coachUid: uid }).then(function () {
          return fbDb.collection("users").doc(uid).update({ inviteCode: code });
        });
      } else if (inviteCode) {
        return redeemInviteCode(uid, inviteCode).catch(function () { /* kod gecersizse sessizce atla, sonra ayarlardan tekrar denenebilir */ });
      }
    }).then(function () {
      return { uid: uid, role: role };
    });
  });
}

function loginUser(email, password) {
  return fbAuth.signInWithEmailAndPassword(email, password);
}

function logoutUser() {
  return fbAuth.signOut();
}

function sendPasswordReset(email) {
  // Firebase'in gonderdigi e-posta Turkce olsun
  fbAuth.languageCode = "tr";
  return fbAuth.sendPasswordResetEmail(email);
}

function syncStudentSummary(uid, summary) {
  if (!uid) return Promise.resolve();
  summary.lastActive = Date.now();
  return fbDb.collection("studentData").doc(uid).collection("info").doc("meta")
    .set(summary, { merge: true }).catch(function () {});
}

function fetchCoachStudents(coachUid) {
  return fbDb.collection("users").where("coachId", "==", coachUid).get().then(function (snap) {
    var students = [];
    snap.forEach(function (doc) { students.push({ uid: doc.id, profile: doc.data() }); });
    return Promise.all(students.map(function (s) {
      var metaP = fbDb.collection("studentData").doc(s.uid).collection("info").doc("meta").get()
        .then(function (metaDoc) { s.meta = metaDoc.exists ? metaDoc.data() : {}; })
        .catch(function () { s.meta = {}; });
      var planP = fbDb.collection("studentData").doc(s.uid).collection("info").doc("plan").get()
        .then(function (planDoc) { s.plan = planDoc.exists ? planDoc.data() : {}; })
        .catch(function () { s.plan = {}; })
        .then(function () {
          return maybeAutoArchiveWeek(s.uid, s.plan).then(function (result) {
            if (result && result.archived) {
              s.plan.days = result.days;
              s.plan.updatedAt = Date.now();
              s.autoArchived = true;
            }
          });
        });
      return Promise.all([metaP, planP]).then(function () { return s; });
    }));
  });
}

function addPlanTask(studentUid, dayKey, task) {
  var id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var patch = { updatedAt: Date.now(), days: {} };
  patch.days[dayKey] = {};
  patch.days[dayKey][id] = {
    examType: task.examType || "TYT",
    subject: task.subject,
    topic: task.topic,
    minutes: task.minutes || 0,
    questionCount: task.questionCount || 0,
    done: false,
    correct: 0,
    wrong: 0,
    createdAt: Date.now()
  };
  return fbDb.collection("studentData").doc(studentUid).collection("info").doc("plan")
    .set(patch, { merge: true }).then(function () { return id; });
}

function removePlanTask(studentUid, dayKey, taskId) {
  var updateObj = {};
  updateObj["days." + dayKey + "." + taskId] = firebase.firestore.FieldValue.delete();
  return fbDb.collection("studentData").doc(studentUid).collection("info").doc("plan").update(updateObj);
}

function savePlanNote(studentUid, note) {
  return fbDb.collection("studentData").doc(studentUid).collection("info").doc("plan")
    .set({ note: note, updatedAt: Date.now() }, { merge: true });
}

function computePlanCompletion(days) {
  var total = 0, done = 0;
  Object.keys(days || {}).forEach(function (dayKey) {
    Object.keys(days[dayKey] || {}).forEach(function (taskId) {
      total++;
      if (days[dayKey][taskId] && days[dayKey][taskId].done) done++;
    });
  });
  return { total: total, done: done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function buildResetDays(days) {
  var resetDays = {};
  Object.keys(days || {}).forEach(function (dayKey) {
    resetDays[dayKey] = {};
    Object.keys(days[dayKey] || {}).forEach(function (taskId) {
      var t = days[dayKey][taskId] || {};
      resetDays[dayKey][taskId] = {
        examType: t.examType || "TYT",
        subject: t.subject,
        topic: t.topic,
        minutes: t.minutes || 0,
        questionCount: t.questionCount || 0,
        done: false,
        correct: 0,
        wrong: 0,
        createdAt: t.createdAt || Date.now()
      };
    });
  });
  return resetDays;
}

function resetPlanForNewWeek(studentUid, days) {
  var resetDays = buildResetDays(days);
  return fbDb.collection("studentData").doc(studentUid).collection("info").doc("plan")
    .set({ days: resetDays, updatedAt: Date.now() }, { merge: true })
    .then(function () { return resetDays; });
}

function archivePlanWeek(studentUid, days, note) {
  var weekId = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  var entry = {
    archivedAt: Date.now(),
    weekLabel: new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    note: note || "",
    days: days || {}
  };
  return fbDb.collection("studentData").doc(studentUid).collection("planHistory").doc(weekId)
    .set(entry).then(function () { return entry; });
}

function fetchPlanHistory(studentUid) {
  return fbDb.collection("studentData").doc(studentUid).collection("planHistory")
    .orderBy("archivedAt", "desc").limit(20).get()
    .then(function (snap) {
      var list = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        d.id = doc.id;
        list.push(d);
      });
      return list;
    });
}

function archiveAndResetPlanForNewWeek(studentUid, days, note) {
  // once bu haftanin durumunu (dogru/yanlis/tik dahil) kalici arsive yaz,
  // sonra sablonu bir sonraki hafta icin sifirla. Iki ayri yazma - atomik degil,
  // ama arsiv kaydinin tek basina var olmasi zararsiz (denetim amacli).
  return archivePlanWeek(studentUid, days, note).then(function () {
    return resetPlanForNewWeek(studentUid, days);
  });
}

function mondayKeyOf(d) {
  // verilen tarihin icinde bulundugu haftanin Pazartesi'sini "YYYY-MM-DD" olarak dondurur.
  // Haftanin gunlerini (mon..sun) zaten baska yerlerde de local saat/getDay() ile
  // kullaniyoruz (bkz. mergeTodayPlanIntoTopics, PLAN_DAYS) - tutarlilik icin ayni yontem.
  var date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  var day = date.getDay(); // 0=Paz..6=Cmt
  var diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  var y = date.getFullYear();
  var m = ("0" + (date.getMonth() + 1)).slice(-2);
  var dd = ("0" + date.getDate()).slice(-2);
  return y + "-" + m + "-" + dd;
}

function maybeAutoArchiveWeek(studentUid, plan) {
  // Koc paneli her acildiginda cagrilir. Plan'in son guncellenme haftasi (updatedAt)
  // ile bu haftanin Pazartesi'si farkliysa, yeni hafta baslamis demektir:
  // otomatik olarak arsivle + sifirla. Plan hic dokunulmamissa (updatedAt yok) dokunma.
  if (!plan || !plan.updatedAt) return Promise.resolve(null);
  var lastKey = mondayKeyOf(new Date(plan.updatedAt));
  var nowKey = mondayKeyOf(new Date());
  if (lastKey === nowKey) return Promise.resolve(null);
  var days = plan.days || {};
  if (!computePlanCompletion(days).total) {
    // arsivlenecek madde yok, sessizce haftayi ilerlet ki her acilista tekrar kontrol etmesin
    return fbDb.collection("studentData").doc(studentUid).collection("info").doc("plan")
      .set({ updatedAt: Date.now() }, { merge: true }).then(function () { return null; })
      .catch(function () { return null; });
  }
  return archiveAndResetPlanForNewWeek(studentUid, days, plan.note).then(function (resetDays) {
    return { archived: true, days: resetDays };
  }).catch(function () { return null; });
}

// ---- Kimlik Doğrulama Arayüzü ----

var authMode = "login"; // "login" | "register"
var authRole = "student"; // "student" | "coach"
var pendingAuthTask = null; // register/login akisinin promise'i - onAuthStateChanged bunu bekler

function showAuthError(msg) {
  var el = document.getElementById("authError");
  if (!el) return;
  el.classList.remove("is-info");
  el.textContent = msg || "";
}

function showAuthInfo(msg) {
  var el = document.getElementById("authError");
  if (!el) return;
  el.classList.add("is-info");
  el.textContent = msg || "";
}

var authBusyTimeoutId = null;

function setAuthBusy(isBusy, label) {
  var btn = document.getElementById("authSubmitBtn");
  var textEl = document.getElementById("authSubmitBtnText");
  var spinnerEl = document.getElementById("authSubmitSpinner");
  var toggleBtn = document.getElementById("authToggleModeBtn");
  var authBox = document.querySelector(".auth-box");
  if (!btn) return;

  if (authBox) authBox.classList.toggle("is-busy", isBusy);
  btn.disabled = isBusy;
  if (toggleBtn) toggleBtn.disabled = isBusy;
  Array.prototype.forEach.call(document.querySelectorAll(".auth-role-btn"), function (b) {
    b.disabled = isBusy;
  });

  if (spinnerEl) spinnerEl.style.display = isBusy ? "inline-block" : "none";
  if (textEl) {
    if (isBusy) {
      textEl.textContent = label || "Yükleniyor…";
    } else {
      textEl.textContent = authMode === "register" ? "Kayıt Ol" : "Giriş Yap";
    }
  }

  if (authBusyTimeoutId) {
    clearTimeout(authBusyTimeoutId);
    authBusyTimeoutId = null;
  }
  if (isBusy) {
    authBusyTimeoutId = setTimeout(function () {
      setAuthBusy(false);
      showAuthError("Bu işlem beklenenden uzun sürdü. Sayfayı yenileyip tekrar dener misin?");
    }, 15000);
  }
}

function renderAuthGate() {
  var extra = document.getElementById("authExtraFields");
  if (!extra) return;
  var html = "";
  if (authMode === "register") {
    html += '<input type="text" id="authName" placeholder="adın (öğrenciye/koça görünecek)" autocomplete="off">';
    if (authRole === "student") {
      html += '<input type="text" id="authInviteCode" placeholder="koçunun davet kodu (opsiyonel)" autocomplete="off">';
    }
  }
  extra.innerHTML = html;
  var btnTextEl = document.getElementById("authSubmitBtnText");
  if (btnTextEl) btnTextEl.textContent = authMode === "register" ? "Kayıt Ol" : "Giriş Yap";
  document.getElementById("authToggleModeBtn").textContent =
    authMode === "register" ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol";
  var forgotBtn = document.getElementById("authForgotBtn");
  if (forgotBtn) forgotBtn.style.display = authMode === "login" ? "" : "none";
  showAuthError("");
}

function handleAuthSubmit() {
  var email = document.getElementById("authEmail").value.trim();
  var password = document.getElementById("authPassword").value;
  if (!email || !password) { showAuthError("E-posta ve şifre gerekli."); return; }
  showAuthError("");

  var task;
  if (authMode === "register") {
    var name = (document.getElementById("authName") || {}).value || "";
    var invite = (document.getElementById("authInviteCode") || {}).value || "";
    if (!name.trim()) { showAuthError("Bir ad girmelisin."); return; }
    setAuthBusy(true, "Hesap oluşturuluyor…");
    task = registerUser(authRole, name.trim(), email, password, invite);
  } else {
    setAuthBusy(true, "Giriş yapılıyor…");
    task = loginUser(email, password);
  }

  // onAuthStateChanged, hesap adi Auth'ta olusur olusmaz (asagidaki tum yazma
  // islemleri bitmeden) tetiklenebiliyor. Bu yuzden promise'i paylasiyoruz ki
  // profil okuma islemi, kayit/giris akisi TAMAMEN bitene kadar beklesin.
  pendingAuthTask = task;

  // Basarili olursa yukleniyor durumunu burada KAPATMIYORUZ: kontrol
  // onAuthStateChanged'e geciyor, o da profil bilgisini getirene kadar
  // (ya da bir hata olusana kadar) yukleniyor gostermeye devam ediyor.
  task.catch(function (err) {
    pendingAuthTask = null;
    setAuthBusy(false);
    showAuthError(translateAuthError(err));
  });
}

var forgotCooldownTimer = null;

function startForgotCooldown(seconds) {
  var btn = document.getElementById("authForgotBtn");
  if (!btn) return;
  var left = seconds;
  btn.disabled = true;
  btn.textContent = "Tekrar göndermek için " + left + " sn";
  if (forgotCooldownTimer) clearInterval(forgotCooldownTimer);
  forgotCooldownTimer = setInterval(function () {
    left--;
    if (left <= 0) {
      clearInterval(forgotCooldownTimer);
      forgotCooldownTimer = null;
      btn.disabled = false;
      btn.textContent = "Şifremi unuttum";
    } else {
      btn.textContent = "Tekrar göndermek için " + left + " sn";
    }
  }, 1000);
}

function handleForgotPassword() {
  var btn = document.getElementById("authForgotBtn");
  if (!btn || btn.disabled) return;
  var email = document.getElementById("authEmail").value.trim();
  if (!email) {
    showAuthError("Önce yukarıya e-postanı yaz, sonra tekrar tıkla.");
    return;
  }
  showAuthError("");
  btn.disabled = true;
  btn.textContent = "Gönderiliyor…";
  sendPasswordReset(email).then(function () {
    // Firebase'de "e-posta numaralandirma korumasi" acik oldugu icin, adres kayitli
    // olmasa bile hata donmez. Bu yuzden mesaj bilerek "kayitliysa" diye yazildi.
    showAuthInfo("Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutusuna ve spam klasörüne bak.");
    startForgotCooldown(30);
  }).catch(function (err) {
    btn.disabled = false;
    btn.textContent = "Şifremi unuttum";
    showAuthError(translateAuthError(err));
  });
}

function translateAuthError(err) {
  var code = err && err.code || "";
  if (code === "auth/email-already-in-use") return "Bu e-posta zaten kayıtlı. Giriş yapmayı dener misin?";
  if (code === "auth/weak-password") return "Şifre en az 6 karakter olmalı.";
  if (code === "auth/invalid-email") return "Geçerli bir e-posta gir.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "E-posta veya şifre yanlış.";
  }
  if (code === "auth/too-many-requests") return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dener misin?";
  if (code === "auth/network-request-failed") return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dener misin?";
  if (code === "permission-denied") {
    return "Veritabanına yazma izni yok — Firestore güvenlik kurallarının yayınlandığından emin ol (Firebase konsolu > Firestore > Rules).";
  }
  return (err && err.message) || "Bir hata oluştu, tekrar dener misin?";
}

function wireAuthGateEvents() {
  Array.prototype.forEach.call(document.querySelectorAll(".auth-role-btn"), function (btn) {
    btn.addEventListener("click", function () {
      authRole = btn.getAttribute("data-role");
      Array.prototype.forEach.call(document.querySelectorAll(".auth-role-btn"), function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderAuthGate();
    });
  });
  document.getElementById("authToggleModeBtn").addEventListener("click", function () {
    authMode = authMode === "register" ? "login" : "register";
    renderAuthGate();
  });
  document.getElementById("authSubmitBtn").addEventListener("click", handleAuthSubmit);
  document.getElementById("authForgotBtn").addEventListener("click", handleForgotPassword);
  document.getElementById("authPassword").addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleAuthSubmit();
  });
  renderAuthGate();
}

// ---- Koç Paneli ----

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Öğrenci/koç verisinden gelen sayısal alanlar innerHTML'e girmeden önce SAYIYA çevrilir
// (Firestore'da öğrenci bu alanlara metin/HTML yazabilir; ham basılırsa koç panelinde
// script çalıştırabilir).
function safeNum(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function formatSecondsShort(totalSeconds) {
  var mins = Math.round((totalSeconds || 0) / 60);
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h <= 0) return m + "dk";
  return h + "s" + (m ? " " + m + "dk" : "");
}

function buildSubjectBarsHtml(weeklySubjects) {
  var entries = Object.keys(weeklySubjects || {}).map(function (name) {
    return { name: name, secs: weeklySubjects[name] || 0 };
  }).filter(function (e) { return e.secs > 0; })
    .sort(function (a, b) { return b.secs - a.secs; });

  if (!entries.length) {
    return '<p class="coach-subject-empty">Son 7 günde kayıtlı çalışma yok.</p>';
  }

  var maxSecs = entries[0].secs;
  return entries.map(function (e) {
    var pct = maxSecs > 0 ? Math.max(4, Math.round((e.secs / maxSecs) * 100)) : 0;
    return '<div class="coach-subject-row">' +
      '<span class="coach-subject-name" title="' + escapeHtml(e.name) + '">' + escapeHtml(e.name) + '</span>' +
      '<div class="coach-subject-bar-track"><div class="coach-subject-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="coach-subject-time">' + formatSecondsShort(e.secs) + '</span>' +
      '</div>';
  }).join("");
}

function computeNetFromCW(c, w) {
  return (c || 0) - (w || 0) / 4;
}

function buildExamSubjectsHtml(subjects) {
  var names = Object.keys(subjects || {});
  if (!names.length) {
    return '<p class="coach-subject-empty">Ders bazlı veri yok.</p>';
  }
  return names.map(function (name) {
    var s = subjects[name] || {};
    var net = computeNetFromCW(safeNum(s.correct), safeNum(s.wrong));
    return '<div class="coach-exam-subject-row">' +
      '<span class="coach-exam-subject-name">' + escapeHtml(name) + '</span>' +
      '<span class="coach-exam-subject-detail">D:' + safeNum(s.correct) + ' Y:' + safeNum(s.wrong) + ' B:' + safeNum(s.empty) + '</span>' +
      '<span class="coach-exam-subject-net">' + net.toFixed(2) + '</span>' +
      '</div>';
  }).join("");
}

function buildExamListHtml(records) {
  var list = (records || []).slice().sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  if (!list.length) {
    return '<p class="coach-subject-empty">Henüz girilmiş deneme yok.</p>';
  }
  return list.map(function (r) {
    var net = safeNum(r.totalNet).toFixed(2);
    var label = escapeHtml(r.name || r.examKey || "Deneme");
    return '<div class="coach-exam-item">' +
      '<button type="button" class="coach-exam-row">' +
      '<span class="coach-exam-date">' + escapeHtml(r.date || "") + '</span>' +
      '<span class="coach-exam-name" title="' + label + '">' + label + '</span>' +
      '<span class="coach-exam-net">' + net + ' net</span>' +
      '</button>' +
      '<div class="coach-exam-subjects" style="display:none;">' + buildExamSubjectsHtml(r.subjects) + '</div>' +
      '</div>';
  }).join("");
}

function buildPlanHistoryRowsHtml(days) {
  var rows = [];
  PLAN_DAYS.forEach(function (d) {
    var tasks = (days && days[d.key]) || {};
    Object.keys(tasks).sort(function (a, b) {
      return (tasks[a].createdAt || 0) - (tasks[b].createdAt || 0);
    }).forEach(function (taskId) {
      rows.push({ day: d, id: taskId, task: tasks[taskId] });
    });
  });
  if (!rows.length) return "";
  return rows.map(function (r) {
    var t = r.task || {};
    var label = escapeHtml((t.examType ? t.examType + " " : "") + (t.subject || "") + (t.topic ? ": " + t.topic : ""));
    return '<tr>' +
      '<td>' + r.day.shortLabel + '</td>' +
      '<td class="coach-plan-cell-topic" title="' + label + '">' + label + '</td>' +
      '<td>' + (safeNum(t.minutes) ? safeNum(t.minutes) + "dk" : "—") + '</td>' +
      '<td>' + (safeNum(t.questionCount) || "—") + '</td>' +
      '<td>' + safeNum(t.correct) + '</td>' +
      '<td>' + safeNum(t.wrong) + '</td>' +
      '<td>' + (t.done ? "✓" : "—") + '</td>' +
      '</tr>';
  }).join("");
}

function buildPlanHistoryEntryHtml(entry) {
  var c = computePlanCompletion(entry.days || {});
  var rowsHtml = buildPlanHistoryRowsHtml(entry.days);
  var noteHtml = entry.note ? '<p class="coach-plan-history-note">' + escapeHtml(entry.note) + '</p>' : "";
  var body = rowsHtml
    ? '<div class="coach-plan-table-wrap"><table class="coach-plan-table">' +
      '<thead><tr><th>gün</th><th>konu</th><th>süre</th><th>soru</th><th>D</th><th>Y</th><th>tik</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div>'
    : '<p class="coach-subject-empty">Bu haftada plan maddesi yok.</p>';
  return '<div class="coach-plan-history-item">' +
    '<button type="button" class="coach-plan-history-toggle">' + escapeHtml(entry.weekLabel || "") +
    ' — %' + c.pct + ' tamamlandı (' + c.done + '/' + c.total + ') ▾</button>' +
    '<div class="coach-plan-history-body" style="display:none;">' + noteHtml + body + '</div>' +
    '</div>';
}

function buildPlanHistoryListHtml(entries) {
  if (!entries || !entries.length) {
    return '<p class="coach-subject-empty">Henüz arşivlenmiş hafta yok.</p>';
  }
  return entries.map(buildPlanHistoryEntryHtml).join("");
}

function buildCoachNetChartSvg(records, gradientId, colorVar) {
  var width = 320, height = 130, padL = 32, padR = 10, padT = 16, padB = 22;
  if (!records.length) {
    return '<p class="coach-subject-empty">Bu sınav türü için henüz kayıt yok.</p>';
  }
  var nets = records.map(function (r) { return safeNum(r.totalNet); });
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

  var linePoints = records.map(function (r, i) { return xAt(i) + "," + yAt(safeNum(r.totalNet)); }).join(" ");
  var areaPoints = linePoints + " " + xAt(n - 1) + "," + (padT + innerH) + " " + xAt(0) + "," + (padT + innerH);

  var dots = records.map(function (r, i) {
    return '<circle cx="' + xAt(i) + '" cy="' + yAt(safeNum(r.totalNet)) + '" r="3" fill="currentColor" stroke="var(--panel)" stroke-width="1.2"/>';
  }).join("");

  var seen = {};
  var labels = records.map(function (r, i) {
    var show = n <= 5 || i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2);
    if (!show) return "";
    var d = new Date(r.date || r.createdAt || Date.now());
    var txt = d.getDate() + "." + (d.getMonth() + 1);
    if (seen[txt]) { seen[txt]++; txt += " (" + seen[txt] + ")"; } else { seen[txt] = 1; }
    return '<text x="' + xAt(i) + '" y="' + (height - 6) + '" font-size="9" text-anchor="middle" fill="var(--ink-dim)">' + txt + '</text>';
  }).join("");

  return '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '" style="color:var(' + colorVar + ');">' +
    '<defs><linearGradient id="' + gradientId + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<text x="' + (padL - 5) + '" y="' + (yAt(yMax) + 3) + '" font-size="9" text-anchor="end" fill="var(--ink-dim)">' + yMax.toFixed(0) + '</text>' +
    '<text x="' + (padL - 5) + '" y="' + (yAt(yMin) + 3) + '" font-size="9" text-anchor="end" fill="var(--ink-dim)">' + yMin.toFixed(0) + '</text>' +
    '<polygon points="' + areaPoints + '" fill="url(#' + gradientId + ')"/>' +
    '<polyline points="' + linePoints + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    dots + labels +
    '</svg>';
}

function buildCoachNetChartStatsHtml(records) {
  if (!records.length) return "";
  var nets = records.map(function (r) { return safeNum(r.totalNet); });
  var last = nets[nets.length - 1];
  var avg = Math.round((nets.reduce(function (a, b) { return a + b; }, 0) / nets.length) * 100) / 100;
  var best = Math.max.apply(null, nets);
  var diff = nets.length > 1 ? Math.round((last - nets[nets.length - 2]) * 100) / 100 : 0;
  var diffClass = diff > 0 ? "positive" : (diff < 0 ? "negative" : "");
  var diffText = (diff > 0 ? "+" : "") + diff.toFixed(2);
  return '<span class="coach-examchart-stat"><b>' + last.toFixed(2) + '</b>son</span>' +
    '<span class="coach-examchart-stat ' + diffClass + '"><b>' + diffText + '</b>önceki denemeye göre</span>' +
    '<span class="coach-examchart-stat"><b>' + avg.toFixed(2) + '</b>ortalama</span>' +
    '<span class="coach-examchart-stat"><b>' + best.toFixed(2) + '</b>en yüksek</span>';
}

function renderCoachExamChart(svgWrapEl, statsWrapEl, examRecords, examType, studentUid) {
  var records = (examRecords || [])
    .filter(function (r) { return r.examKey === examType; })
    .sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
  var colorVar = examType === "TYT" ? "--amber" : "--sage";
  var gradientId = "netGrad_" + studentUid + "_" + examType;
  if (svgWrapEl) svgWrapEl.innerHTML = buildCoachNetChartSvg(records, gradientId, colorVar);
  if (statsWrapEl) statsWrapEl.innerHTML = buildCoachNetChartStatsHtml(records);
}

// ---- YKS 2026 tahmini puan/sıralama hesaplama ----
// ÖNEMLİ: ÖSYM'nin gerçek katsayıları (ortalama/standart sapmaya bağlı) her yıl değişir ve
// resmi olarak yayınlanmaz; bu yüzden burada TYT/AYT toplam soru sayısına göre eşit ağırlıklı,
// taban=100/tavan=500 varsayımıyla türetilmiş BASİTLEŞTİRİLMİŞ bir yaklaşım kullanılıyor
// (Kaan'ın onayıyla — bkz. sohbet: "~%5-10 sapma olabilir" kabul edildi).
// OBP (öğrenci bir kez giriyor, tüm denemelerde aynı deger kullanılıyor): yaygın bilinen
// basitleştirilmiş katkı oranıyla (ilk kez yerleşme için ~0.12) puana ekleniyor. Önceki
// denemede OBP eklemesi puanı 500 tavanının üstüne taşıyıp sıralama tablosunun tek bir en
// üst ankor noktasına kilitlenmesine yol açmıştı (bkz. sohbet) — bunu, tavanı biraz yükseltip
// tabloya üstte birkaç ek ankor noktası ekleyerek çözüyoruz; her deneme hâlâ SADECE KENDİ
// NETİ + OBP üzerinden, ayrı ayrı hesaplanıyor (TYT ve AYT birleştirilmiyor).
var YKS_EXAM_SORU_SAYISI = { "TYT": 120, "AYT-SAY": 80, "AYT-EA": 80, "AYT-SOZ": 80 };
var YKS_EXAM_LABELS = { "TYT": "TYT", "AYT-SAY": "AYT Sayısal", "AYT-EA": "AYT Eşit Ağırlık", "AYT-SOZ": "AYT Sözel" };
var YKS_OBP_KATKI_KATSAYISI = 0.12;
var YKS_PUAN_TAVANI = 560; // OBP katkısıyla da olsa gerçekçi bir üst sınır

// puan → tahmini sıralama ankor noktaları (azalan puan sırasıyla). Bilinen genel
// taban puan/sıralama referanslarından (tıp/mühendislik/ortalama bölüm taban aralıkları,
// deneme-sıralama örnekleri) türetilmiş yaklaşık noktalar — kesin bir kaynak tablo değil.
var YKS_SIRALAMA_ANKORLARI = [
  [560, 1], [540, 20], [520, 50], [500, 100], [480, 2000], [460, 10000], [440, 30000], [420, 70000],
  [400, 150000], [380, 300000], [360, 500000], [340, 800000],
  [320, 1100000], [300, 1500000], [280, 1900000], [260, 2300000],
  [240, 2600000], [220, 2900000], [200, 3100000], [150, 3400000]
];

function yksHamPuan(examKey, net, obp) {
  var totalQ = YKS_EXAM_SORU_SAYISI[examKey];
  if (!totalQ || net == null) return null;
  var coef = 400 / totalQ;
  var puan = 100 + net * coef;
  if (puan < 100) puan = 100;
  if (puan > 500) puan = 500;
  if (obp && obp > 0) {
    puan += obp * YKS_OBP_KATKI_KATSAYISI;
  }
  if (puan > YKS_PUAN_TAVANI) puan = YKS_PUAN_TAVANI;
  return puan;
}

function yksTahminiSiralama(puan) {
  if (puan == null) return null;
  var table = YKS_SIRALAMA_ANKORLARI;
  if (puan >= table[0][0]) return table[0][1];
  if (puan <= table[table.length - 1][0]) return table[table.length - 1][1];
  for (var i = 0; i < table.length - 1; i++) {
    var pHigh = table[i][0], pLow = table[i + 1][0];
    if (puan <= pHigh && puan >= pLow) {
      var rHigh = table[i][1], rLow = table[i + 1][1];
      var frac = (pHigh - puan) / (pHigh - pLow);
      // siralama katlanarak buyudugu icin log uzayinda dogrusal enterpolasyon
      var logR = Math.log(rHigh) + frac * (Math.log(rLow) - Math.log(rHigh));
      return Math.exp(logR);
    }
  }
  return null;
}

function formatSiralama(n) {
  if (n == null) return "—";
  var rounded;
  if (n < 5000) rounded = Math.round(n / 100) * 100;
  else if (n < 50000) rounded = Math.round(n / 1000) * 1000;
  else rounded = Math.round(n / 5000) * 5000;
  return "~" + rounded.toLocaleString("tr-TR");
}

function yksEstimateForRecord(record, obp) {
  var puan = yksHamPuan(record.examKey, record.totalNet, obp);
  return { puan: puan, siralama: yksTahminiSiralama(puan) };
}

function buildYksEstimateRow(record, obp) {
  var est = yksEstimateForRecord(record, obp);
  var label = YKS_EXAM_LABELS[record.examKey] || record.examKey;
  var d = new Date(record.date || record.createdAt || Date.now());
  var dateTxt = d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
  var nameTxt = record.name ? " (" + escapeHtml(record.name) + ")" : "";
  if (est.puan == null) {
    return '<div class="yks-estimate-row">' +
      '<span class="yks-estimate-label">' + dateTxt + ' · ' + escapeHtml(label) + nameTxt + '</span>' +
      '<span class="yks-estimate-value">hesaplanamadı</span>' +
      '</div>';
  }
  return '<div class="yks-estimate-row">' +
    '<span class="yks-estimate-label">' + dateTxt + ' · ' + escapeHtml(label) + nameTxt + '</span>' +
    '<span class="yks-estimate-value">' + safeNum(record.totalNet).toFixed(2) + ' net → <b>~' + est.puan.toFixed(0) + '</b> puan, <b>' + formatSiralama(est.siralama) + '</b> sıralama</span>' +
    '</div>';
}

function buildYksEstimateRowsHtml(records, obp) {
  var list = (records || []).slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  if (!list.length) {
    return '<p class="coach-subject-empty">Henüz deneme kaydı yok.</p>';
  }
  return list.map(function (r) { return buildYksEstimateRow(r, obp); }).join("");
}

var coachRange = "month"; // "week" | "month" | "all"
var coachLastStudents = [];

function subjectsForRange(m) {
  if (coachRange === "week") return m.weeklySubjects;
  if (coachRange === "all") return m.allSubjects;
  return m.monthlySubjects;
}

function rangeLabel() {
  if (coachRange === "week") return "son 7 gün";
  if (coachRange === "all") return "tüm zamanlar";
  return "son 30 gün";
}

var PLAN_DAYS = [
  { key: "mon", label: "Pazartesi", shortLabel: "Pzt" },
  { key: "tue", label: "Salı", shortLabel: "Sal" },
  { key: "wed", label: "Çarşamba", shortLabel: "Çar" },
  { key: "thu", label: "Perşembe", shortLabel: "Per" },
  { key: "fri", label: "Cuma", shortLabel: "Cum" },
  { key: "sat", label: "Cumartesi", shortLabel: "Cmt" },
  { key: "sun", label: "Pazar", shortLabel: "Paz" }
];

function buildPlanEditorHtml(plan) {
  var subjectOptions = Object.keys(YKS_TOPICS.TYT).map(function (name) {
    return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
  }).join("");
  var dayOptions = PLAN_DAYS.map(function (d) {
    return '<option value="' + d.key + '">' + d.label + '</option>';
  }).join("");
  var picker =
    '<div class="coach-plan-picker">' +
    '<select class="coach-plan-picker-examtype"><option value="TYT">TYT</option><option value="AYT">AYT</option></select>' +
    '<select class="coach-plan-picker-subject">' + subjectOptions + '</select>' +
    '<select class="coach-plan-picker-topic" disabled><option value="">önce ders seç</option></select>' +
    '<input type="number" min="0" class="coach-plan-picker-minutes" placeholder="dakika">' +
    '<input type="number" min="0" class="coach-plan-picker-questions" placeholder="soru">' +
    '<select class="coach-plan-picker-day">' + dayOptions + '</select>' +
    '<button type="button" class="coach-plan-picker-add">+ Ekle</button>' +
    '</div>';
  var table =
    '<div class="coach-plan-table-wrap">' +
    '<table class="coach-plan-table">' +
    '<thead><tr><th>gün</th><th>konu</th><th>süre</th><th>soru</th><th>D</th><th>Y</th><th>tik</th><th></th></tr></thead>' +
    '<tbody class="coach-plan-tbody"></tbody>' +
    '</table>' +
    '<p class="coach-subject-empty coach-plan-table-empty" style="display:none;">Henüz plan eklenmedi.</p>' +
    '</div>';
  var weekActions =
    '<div class="coach-plan-week-actions">' +
    '<button type="button" class="coach-plan-reset-week">Haftayı Arşivle ve Sıfırla</button>' +
    '</div>';
  var noteVal = escapeHtml((plan && plan.note) || "");
  var noteSection =
    '<div class="coach-plan-note-row">' +
    '<textarea class="coach-plan-note-input" rows="2" placeholder="genel not (opsiyonel)">' + noteVal + '</textarea>' +
    '<div class="coach-plan-actions">' +
    '<button type="button" class="save-btn coach-plan-note-save">Notu Kaydet</button>' +
    '<span class="coach-plan-status"></span>' +
    '</div>' +
    '</div>';
  var historySection =
    '<div class="coach-plan-history-section">' +
    '<button type="button" class="coach-plan-history-main-toggle">geçmiş haftalar ▾</button>' +
    '<div class="coach-plan-history-list" style="display:none;"></div>' +
    '</div>';
  return picker + table + weekActions + noteSection + historySection;
}

function buildPlanRowsHtml(days) {
  var rows = [];
  PLAN_DAYS.forEach(function (d) {
    var tasks = (days && days[d.key]) || {};
    Object.keys(tasks).sort(function (a, b) {
      return (tasks[a].createdAt || 0) - (tasks[b].createdAt || 0);
    }).forEach(function (taskId) {
      rows.push({ day: d, id: taskId, task: tasks[taskId] });
    });
  });
  if (!rows.length) return "";
  return rows.map(function (r) {
    var t = r.task || {};
    var label = escapeHtml((t.examType ? t.examType + " " : "") + (t.subject || "") + (t.topic ? ": " + t.topic : ""));
    return '<tr>' +
      '<td>' + r.day.shortLabel + '</td>' +
      '<td class="coach-plan-cell-topic" title="' + label + '">' + label + '</td>' +
      '<td>' + (safeNum(t.minutes) ? safeNum(t.minutes) + "dk" : "—") + '</td>' +
      '<td>' + (safeNum(t.questionCount) || "—") + '</td>' +
      '<td>' + safeNum(t.correct) + '</td>' +
      '<td>' + safeNum(t.wrong) + '</td>' +
      '<td>' + (t.done ? "✓" : "—") + '</td>' +
      '<td><button type="button" class="coach-plan-row-del" data-day="' + escapeHtml(r.day.key) + '" data-id="' + escapeHtml(r.id) + '">×</button></td>' +
      '</tr>';
  }).join("");
}

function renderPlanTable(tbodyEl, emptyEl, days) {
  var html = buildPlanRowsHtml(days);
  if (tbodyEl) tbodyEl.innerHTML = html;
  if (emptyEl) emptyEl.style.display = html ? "none" : "block";
}

// Masaüstü çalışma tarayıcısında son 7 günde tamamlanan seansların toplam süresi
function loadCoachBrowserMinutes(studentUid, card) {
  var el = card.querySelector(".coach-browser-stat b");
  if (!el) return;
  fbDb.collection("studentData").doc(studentUid).collection("focusSessions")
    .where("startedAtMs", ">=", Date.now() - 7 * 86400000).get()
    .then(function (snap) {
      var t = 0;
      snap.forEach(function (d) { t += Number(d.data().minutes) || 0; });
      el.textContent = t >= 60 ? Math.floor(t / 60) + " sa " + (t % 60) + " dk" : t + " dk";
    })
    .catch(function () { el.textContent = "—"; });
}

function renderCoachStudentList() {
  var list = document.getElementById("coachStudentList");
  var empty = document.getElementById("coachStudentsEmpty");
  if (!list) return;
  list.innerHTML = "";
  var students = coachLastStudents;
  if (!students.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  students.forEach(function (s) {
    var m = s.meta || {};
    var lastActiveText = m.lastActive ? timeAgoText(m.lastActive) : "hiç bağlanmadı";
    var examRecords = Array.isArray(m.examRecords) ? m.examRecords : [];
    var focusStats = (m.focusStats && typeof m.focusStats === "object") ? m.focusStats : {};
    var card = document.createElement("div");
    card.className = "coach-student-card";
    card.innerHTML =
      '<div class="coach-student-head"><span class="coach-student-name">' + escapeHtml(s.profile.name || s.profile.email) + '</span>' +
      '<span class="coach-student-active">' + lastActiveText + '</span></div>' +
      '<div class="coach-student-stats">' +
      '<div class="coach-student-stat"><b>' + safeNum(m.streak) + '</b><span>gün seri</span></div>' +
      '<div class="coach-student-stat"><b>' + safeNum(m.bestTYT).toFixed(1) + '</b><span>en iyi TYT net</span></div>' +
      '<div class="coach-student-stat"><b>' + safeNum(m.bestAYT).toFixed(1) + '</b><span>en iyi AYT net</span></div>' +
      '<div class="coach-student-stat"><b>' + safeNum(m.cityPopulation) + '</b><span>şehir nüfusu</span></div>' +
      '<div class="coach-student-stat"><b>' + safeNum(focusStats.weekCompleted) + '/' + safeNum(focusStats.weekTotal) + '</b><span>odak seansı (7g)</span></div>' +
      '<div class="coach-student-stat coach-browser-stat"><b>…</b><span>tarayıcıda çalışma (7g)</span></div>' +
      '</div>' +
      '<div class="coach-subject-section">' +
      '<div class="coach-subject-title">' + rangeLabel() + ' · konu dağılımı</div>' +
      buildSubjectBarsHtml(subjectsForRange(m)) +
      '</div>' +
      '<div class="coach-exam-section">' +
      '<button type="button" class="coach-exam-toggle">denemeler (' + examRecords.length + ') ▾</button>' +
      '<div class="coach-exam-list" style="display:none;">' + buildExamListHtml(examRecords) + '</div>' +
      '</div>' +
      '<div class="coach-examchart-section">' +
      '<button type="button" class="coach-examchart-toggle">net grafiği ▾</button>' +
      '<div class="coach-examchart-body" style="display:none;">' +
      '<div class="coach-examchart-tabs">' +
      '<button type="button" class="coach-examchart-tab active" data-extype="TYT">TYT</button>' +
      '<button type="button" class="coach-examchart-tab" data-extype="AYT-SAY">AYT-SAY</button>' +
      '<button type="button" class="coach-examchart-tab" data-extype="AYT-EA">AYT-EA</button>' +
      '<button type="button" class="coach-examchart-tab" data-extype="AYT-SOZ">AYT-SOZ</button>' +
      '</div>' +
      '<div class="coach-examchart-svgwrap"></div>' +
      '<div class="coach-examchart-stats"></div>' +
      '</div>' +
      '</div>' +
      '<div class="coach-yksest-section">' +
      '<button type="button" class="coach-yksest-toggle">tahmini puan ve sıralama ▾</button>' +
      '<div class="coach-yksest-body" style="display:none;">' +
      '<div class="yks-estimate-box">' + buildYksEstimateRowsHtml(examRecords, m.obp) + '</div>' +
      '<p class="yks-estimate-disclaimer">Bu bir TAHMİNDİR — her deneme sadece kendi netiyle (girilmişse OBP dahil), genel geçer yaklaşık katsayılarla ayrı ayrı hesaplanmıştır (TYT ve AYT birleştirilmemiştir). ÖSYM\'nin resmi sonucu değildir, ±%5-10 sapabilir.</p>' +
      '</div>' +
      '</div>' +
      '<div class="coach-plan-section">' +
      '<div class="coach-plan-header-row">' +
      '<button type="button" class="coach-plan-toggle">haftalık plan ✎</button>' +
      '<span class="coach-plan-completion"></span>' +
      '</div>' +
      (s.autoArchived
        ? '<p class="coach-plan-auto-note">Yeni hafta başladı — geçen hafta otomatik arşivlendi ✓ ("geçmiş haftalar"da görebilirsin)</p>'
        : '') +
      '<div class="coach-plan-editor" style="display:none;">' + buildPlanEditorHtml(s.plan) + '</div>' +
      '</div>';

    loadCoachBrowserMinutes(s.uid, card);

    var toggleBtn = card.querySelector(".coach-exam-toggle");
    var examListEl = card.querySelector(".coach-exam-list");
    if (toggleBtn && examListEl) {
      toggleBtn.addEventListener("click", function () {
        var isOpen = examListEl.style.display !== "none";
        examListEl.style.display = isOpen ? "none" : "flex";
        toggleBtn.textContent = "denemeler (" + examRecords.length + ") " + (isOpen ? "▾" : "▴");
      });
    }
    Array.prototype.forEach.call(card.querySelectorAll(".coach-exam-row"), function (rowBtn) {
      rowBtn.addEventListener("click", function () {
        var subjectsEl = rowBtn.parentElement.querySelector(".coach-exam-subjects");
        if (!subjectsEl) return;
        subjectsEl.style.display = subjectsEl.style.display !== "none" ? "none" : "flex";
      });
    });

    var examChartToggle = card.querySelector(".coach-examchart-toggle");
    var examChartBody = card.querySelector(".coach-examchart-body");
    var examChartSvgWrap = card.querySelector(".coach-examchart-svgwrap");
    var examChartStatsWrap = card.querySelector(".coach-examchart-stats");
    var examChartTabs = card.querySelectorAll(".coach-examchart-tab");
    var examChartLoaded = false;
    var activeExamType = "TYT";

    function renderActiveExamChart() {
      renderCoachExamChart(examChartSvgWrap, examChartStatsWrap, examRecords, activeExamType, s.uid);
    }

    if (examChartToggle && examChartBody) {
      examChartToggle.addEventListener("click", function () {
        var isOpen = examChartBody.style.display !== "none";
        examChartBody.style.display = isOpen ? "none" : "block";
        examChartToggle.textContent = "net grafiği " + (isOpen ? "▾" : "▴");
        if (!isOpen && !examChartLoaded) {
          examChartLoaded = true;
          renderActiveExamChart();
        }
      });
    }
    Array.prototype.forEach.call(examChartTabs, function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        activeExamType = tabBtn.getAttribute("data-extype");
        Array.prototype.forEach.call(examChartTabs, function (b) { b.classList.toggle("active", b === tabBtn); });
        renderActiveExamChart();
      });
    });

    var yksEstToggle = card.querySelector(".coach-yksest-toggle");
    var yksEstBody = card.querySelector(".coach-yksest-body");
    if (yksEstToggle && yksEstBody) {
      yksEstToggle.addEventListener("click", function () {
        var isOpen = yksEstBody.style.display !== "none";
        yksEstBody.style.display = isOpen ? "none" : "block";
        yksEstToggle.textContent = "tahmini puan ve sıralama " + (isOpen ? "▾" : "▴");
      });
    }

    var planToggleBtn = card.querySelector(".coach-plan-toggle");
    var planEditorEl = card.querySelector(".coach-plan-editor");
    if (planToggleBtn && planEditorEl) {
      planToggleBtn.addEventListener("click", function () {
        planEditorEl.style.display = planEditorEl.style.display !== "none" ? "none" : "block";
      });
    }

    var planTbody = card.querySelector(".coach-plan-tbody");
    var planTableEmptyEl = card.querySelector(".coach-plan-table-empty");
    var planCompletionEl = card.querySelector(".coach-plan-completion");

    function updateCompletionBadge() {
      if (!planCompletionEl) return;
      var c = computePlanCompletion((s.plan && s.plan.days) || {});
      planCompletionEl.textContent = c.total
        ? ("%" + c.pct + " tamamlandı (" + c.done + "/" + c.total + ")")
        : "plan boş";
    }

    function wirePlanDeleteButtons() {
      Array.prototype.forEach.call(card.querySelectorAll(".coach-plan-row-del"), function (btn) {
        btn.addEventListener("click", function () {
          var dayKey = btn.getAttribute("data-day");
          var taskId = btn.getAttribute("data-id");
          btn.disabled = true;
          removePlanTask(s.uid, dayKey, taskId).then(function () {
            if (s.plan && s.plan.days && s.plan.days[dayKey]) delete s.plan.days[dayKey][taskId];
            renderPlanTable(planTbody, planTableEmptyEl, (s.plan && s.plan.days) || {});
            wirePlanDeleteButtons();
            updateCompletionBadge();
          }).catch(function () { btn.disabled = false; });
        });
      });
    }
    renderPlanTable(planTbody, planTableEmptyEl, (s.plan && s.plan.days) || {});
    wirePlanDeleteButtons();
    updateCompletionBadge();

    var pickerExamType = card.querySelector(".coach-plan-picker-examtype");
    var pickerSubject = card.querySelector(".coach-plan-picker-subject");
    var pickerTopic = card.querySelector(".coach-plan-picker-topic");
    var pickerMinutes = card.querySelector(".coach-plan-picker-minutes");
    var pickerQuestions = card.querySelector(".coach-plan-picker-questions");
    var pickerDay = card.querySelector(".coach-plan-picker-day");
    var pickerAddBtn = card.querySelector(".coach-plan-picker-add");

    function resetTopicSelect() {
      pickerTopic.innerHTML = '<option value="">önce ders seç</option>';
      pickerTopic.disabled = true;
    }
    function populateSubjects() {
      var group = YKS_TOPICS[pickerExamType.value] || {};
      pickerSubject.innerHTML = Object.keys(group).map(function (name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join("");
      resetTopicSelect();
    }
    if (pickerExamType) {
      pickerExamType.addEventListener("change", populateSubjects);
    }
    if (pickerSubject && pickerTopic) {
      pickerSubject.addEventListener("change", function () {
        var group = YKS_TOPICS[pickerExamType ? pickerExamType.value : "TYT"] || {};
        var topics = group[pickerSubject.value] || [];
        if (!topics.length) {
          resetTopicSelect();
          return;
        }
        pickerTopic.innerHTML = topics.map(function (t) {
          return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
        }).join("");
        pickerTopic.disabled = false;
      });
    }
    if (pickerAddBtn) {
      pickerAddBtn.addEventListener("click", function () {
        var examTypeVal = pickerExamType ? pickerExamType.value : "TYT";
        var subjectVal = pickerSubject ? pickerSubject.value : "";
        var topicVal = pickerTopic ? pickerTopic.value : "";
        var dayVal = pickerDay ? pickerDay.value : "mon";
        var minutesVal = parseInt((pickerMinutes && pickerMinutes.value) || "0", 10) || 0;
        var questionsVal = parseInt((pickerQuestions && pickerQuestions.value) || "0", 10) || 0;
        if (!subjectVal || !topicVal) return;
        pickerAddBtn.disabled = true;
        addPlanTask(s.uid, dayVal, { examType: examTypeVal, subject: subjectVal, topic: topicVal, minutes: minutesVal, questionCount: questionsVal })
          .then(function (taskId) {
            if (!s.plan) s.plan = {};
            if (!s.plan.days) s.plan.days = {};
            if (!s.plan.days[dayVal]) s.plan.days[dayVal] = {};
            s.plan.days[dayVal][taskId] = {
              examType: examTypeVal, subject: subjectVal, topic: topicVal, minutes: minutesVal, questionCount: questionsVal,
              done: false, correct: 0, wrong: 0, createdAt: Date.now()
            };
            renderPlanTable(planTbody, planTableEmptyEl, s.plan.days);
            wirePlanDeleteButtons();
            updateCompletionBadge();
            if (pickerMinutes) pickerMinutes.value = "";
            if (pickerQuestions) pickerQuestions.value = "";
          })
          .catch(function () {})
          .then(function () { pickerAddBtn.disabled = false; });
      });
    }

    var historyMainToggle = card.querySelector(".coach-plan-history-main-toggle");
    var historyListEl = card.querySelector(".coach-plan-history-list");
    var historyLoaded = false;

    function wirePlanHistoryToggles() {
      if (!historyListEl) return;
      Array.prototype.forEach.call(historyListEl.querySelectorAll(".coach-plan-history-toggle"), function (btn) {
        btn.addEventListener("click", function () {
          var body = btn.parentElement.querySelector(".coach-plan-history-body");
          if (!body) return;
          body.style.display = body.style.display !== "none" ? "none" : "block";
        });
      });
    }

    function loadPlanHistory() {
      if (!historyListEl) return;
      historyListEl.innerHTML = '<p class="coach-subject-empty">Yükleniyor…</p>';
      fetchPlanHistory(s.uid).then(function (entries) {
        historyLoaded = true;
        historyListEl.innerHTML = buildPlanHistoryListHtml(entries);
        wirePlanHistoryToggles();
      }).catch(function () {
        historyListEl.innerHTML = '<p class="coach-subject-empty">Yüklenemedi, tekrar dener misin?</p>';
      });
    }

    if (historyMainToggle && historyListEl) {
      historyMainToggle.addEventListener("click", function () {
        var isOpen = historyListEl.style.display !== "none";
        if (isOpen) {
          historyListEl.style.display = "none";
          historyMainToggle.textContent = "geçmiş haftalar ▾";
          return;
        }
        historyListEl.style.display = "block";
        historyMainToggle.textContent = "geçmiş haftalar ▴";
        if (!historyLoaded) loadPlanHistory();
      });
    }

    var resetWeekBtn = card.querySelector(".coach-plan-reset-week");
    if (resetWeekBtn) {
      resetWeekBtn.addEventListener("click", function () {
        var days = (s.plan && s.plan.days) || {};
        if (!computePlanCompletion(days).total) {
          window.alert("Arşivlenecek/kopyalanacak bir plan yok.");
          return;
        }
        var ok = window.confirm(
          "Bu haftanın planı (ders/konu/süre/soru/doğru/yanlış/tik) geçmiş haftalar arşivine kaydedilecek, sonra aynı plan maddeleri kalacak ama tüm doğru/yanlış/tik işaretleri sıfırlanacak. Onaylıyor musun?"
        );
        if (!ok) return;
        resetWeekBtn.disabled = true;
        archiveAndResetPlanForNewWeek(s.uid, days, s.plan && s.plan.note).then(function (resetDays) {
          s.plan.days = resetDays;
          renderPlanTable(planTbody, planTableEmptyEl, s.plan.days);
          wirePlanDeleteButtons();
          updateCompletionBadge();
          historyLoaded = false;
          if (historyListEl && historyListEl.style.display !== "none") loadPlanHistory();
        }).catch(function (err) {
          window.alert("Arşivleme/sıfırlama başarısız oldu: " + translateAuthError(err));
        }).then(function () {
          resetWeekBtn.disabled = false;
        });
      });
    }

    var noteSaveBtn = card.querySelector(".coach-plan-note-save");
    var noteInputEl = card.querySelector(".coach-plan-note-input");
    var planStatusEl = card.querySelector(".coach-plan-status");
    if (noteSaveBtn) {
      noteSaveBtn.addEventListener("click", function () {
        noteSaveBtn.disabled = true;
        if (planStatusEl) planStatusEl.textContent = "Kaydediliyor…";
        savePlanNote(s.uid, noteInputEl ? noteInputEl.value : "").then(function () {
          if (planStatusEl) planStatusEl.textContent = "Kaydedildi ✓";
          setTimeout(function () { if (planStatusEl) planStatusEl.textContent = ""; }, 2000);
        }).catch(function () {
          if (planStatusEl) planStatusEl.textContent = "Hata: kaydedilemedi, tekrar dener misin?";
        }).then(function () {
          noteSaveBtn.disabled = false;
        });
      });
    }
    list.appendChild(card);
  });
}

var coachTabsWired = false;

function wireCoachRangeTabs() {
  if (coachTabsWired) return;
  var tabs = document.getElementById("coachRangeTabs");
  if (!tabs) return;
  coachTabsWired = true;
  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".range-btn");
    if (!btn) return;
    coachRange = btn.getAttribute("data-range");
    Array.prototype.forEach.call(tabs.querySelectorAll(".range-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderCoachStudentList();
  });
}

var coachQuotesWired = false;

function wireCoachQuotesEditor(coachUid, profile) {
  var textarea = document.getElementById("coachQuotesInput");
  var saveBtn = document.getElementById("coachQuotesSaveBtn");
  var note = document.getElementById("coachQuotesNote");
  if (!textarea || !saveBtn) return;
  var existing = Array.isArray(profile.motivationQuotes) ? profile.motivationQuotes : [];
  textarea.value = existing.join("\n");
  if (coachQuotesWired) return;
  coachQuotesWired = true;
  saveBtn.addEventListener("click", function () {
    var lines = textarea.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    saveBtn.disabled = true;
    if (note) note.textContent = "";
    fbDb.collection("users").doc(coachUid).set({ motivationQuotes: lines }, { merge: true }).then(function () {
      if (note) { note.textContent = "Kaydedildi ✓"; note.style.color = "var(--sage)"; }
    }).catch(function (err) {
      if (note) { note.textContent = "Kaydedilemedi: " + ((err && err.message) || "bilinmeyen hata"); note.style.color = "var(--danger)"; }
    }).then(function () {
      saveBtn.disabled = false;
    });
  });
}

var focusEditorWired = false;
var FOCUS_DEFAULT_PROCS = ["chrome.exe", "msedge.exe", "firefox.exe", "opera.exe", "brave.exe", "discord.exe", "steam.exe", "telegram.exe", "whatsapp.exe", "spotify.exe"];

function focusYtId(s) {
  s = (s || "").trim();
  var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : "";
}

function focusTextToConfig() {
  var g = function (id) { return document.getElementById(id); };
  var cats = [], byName = {}, problems = [], domains = [], procs = [];
  g("focusMenuInput").value.split("\n").forEach(function (line, i) {
    line = line.trim();
    if (!line) return;
    var p = line.split("|").map(function (s) { return s.trim(); });
    var n = "Satır " + (i + 1) + ": ";
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) { problems.push(n + "Kategori | Başlık | adres biçiminde yaz."); return; }
    var isYtUrl = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)(\/|$)/i.test(p[2]);
    var yt = (isYtUrl || /^[\w-]{11}$/.test(p[2])) ? focusYtId(p[2]) : "";
    var item;
    if (yt) item = { title: p[1], youtubeId: yt };
    else if (isYtUrl) { problems.push(n + "YouTube için tek bir video bağlantısı kullan."); return; }
    else if (/^https:\/\/\S+$/i.test(p[2])) item = { title: p[1], url: p[2] };
    else { problems.push(n + "Adres https:// ile başlamalı."); return; }
    if (!byName[p[0]]) { byName[p[0]] = { category: p[0], items: [] }; cats.push(byName[p[0]]); }
    byName[p[0]].items.push(item);
  });
  g("focusDomainsInput").value.split("\n").forEach(function (l) {
    var d = l.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    if (!d) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) problems.push("Geçersiz alan adı: " + l.trim());
    else if (domains.indexOf(d) < 0) domains.push(d);
  });
  g("focusProcsInput").value.split("\n").forEach(function (l) {
    var p = l.trim().toLowerCase();
    if (!p) return;
    if (!/\.exe$/.test(p)) p += ".exe";
    if (!/^[\w.\- ]+\.exe$/.test(p)) problems.push("Geçersiz program adı: " + l.trim());
    else if (procs.indexOf(p) < 0) procs.push(p);
  });
  var mins = [];
  g("focusMinsInput").value.split(",").map(Number).forEach(function (m) {
    if (m >= 1 && m <= 600 && Math.floor(m) === m && mins.indexOf(m) < 0) mins.push(m);
  });
  mins.sort(function (a, b) { return a - b; });
  if (!mins.length) mins = [45, 90, 120];
  return { cfg: { menu: cats, extraDomains: domains, blockedProcesses: procs, sessionMinutes: mins }, problems: problems };
}

function focusFillEditor(cfg) {
  var g = function (id) { return document.getElementById(id); };
  var lines = [];
  (cfg.menu || []).forEach(function (c) {
    (c.items || []).forEach(function (it) {
      lines.push(c.category + " | " + it.title + " | " + (it.youtubeId ? "https://www.youtube.com/watch?v=" + it.youtubeId : it.url));
    });
  });
  g("focusMenuInput").value = lines.join("\n");
  g("focusDomainsInput").value = (cfg.extraDomains || []).join("\n");
  g("focusProcsInput").value = (cfg.blockedProcesses || []).join("\n");
  g("focusMinsInput").value = (cfg.sessionMinutes || []).join(", ");
}

function wireCoachFocusEditor(coachUid) {
  var saveBtn = document.getElementById("focusSaveBtn");
  var note = document.getElementById("focusNote");
  if (!saveBtn) return;
  var ref = fbDb.collection("focusConfigs").doc(coachUid);
  focusFillEditor({ blockedProcesses: FOCUS_DEFAULT_PROCS, sessionMinutes: [45, 90, 120] });
  ref.get().then(function (snap) {
    if (!snap.exists) return;
    var cfg;
    try { cfg = JSON.parse(snap.data().json); } catch (e) { return; }
    focusFillEditor(cfg);
  }).catch(function () {});
  if (focusEditorWired) return;
  focusEditorWired = true;
  saveBtn.addEventListener("click", function () {
    var res = focusTextToConfig();
    if (res.problems.length) {
      note.textContent = res.problems.slice(0, 3).join(" ");
      note.style.color = "var(--danger)";
      return;
    }
    saveBtn.disabled = true;
    note.textContent = "";
    ref.set({ json: JSON.stringify(res.cfg), updatedAt: Date.now() }).then(function () {
      note.textContent = "Kaydedildi ✓ (öğrencilerin tarayıcısı bir sonraki açılışta yeni listeyi alır)";
      note.style.color = "var(--sage)";
    }).catch(function (err) {
      note.textContent = "Kaydedilemedi: " + ((err && err.message) || "bilinmeyen hata");
      note.style.color = "var(--danger)";
    }).then(function () {
      saveBtn.disabled = false;
    });
  });
}

function renderCoachDashboard(coachUid, profile) {
  var codeEl = document.getElementById("coachInviteCode");
  if (codeEl) codeEl.textContent = profile.inviteCode || "—";
  wireCoachRangeTabs();
  wireCoachQuotesEditor(coachUid, profile);
  wireCoachFocusEditor(coachUid);

  fetchCoachStudents(coachUid).then(function (students) {
    students.sort(function (a, b) { return (b.meta.lastActive || 0) - (a.meta.lastActive || 0); });
    coachLastStudents = students;
    renderCoachStudentList();
  });
}

function timeAgoText(ts) {
  var diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 2) return "az önce aktif";
  if (diffMin < 60) return diffMin + " dk önce aktif";
  var diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + " sa önce aktif";
  var diffD = Math.floor(diffH / 24);
  return diffD + " gün önce aktif";
}

// ---------------------------------------------------------------------------
// Yönetici paneli (deneme amaçlı)
// Tüm öğrencileri listeler; seçilen öğrencilere altın, çalışma süresi ve duyuru gönderir.
// YETKİ SUNUCUDA: bir kullanıcı ancak Firestore'da admins/{uid} belgesi varsa yönetici sayılır
// (belgeyi sadece Firebase konsolundan oluşturabilirsin; client yazamaz). Buradaki kontrol
// yalnızca arayüzü göstermek içindir — kurallar (firestore.rules) olmadan hiçbir şey yazılamaz.
// Şifre koda gömülü DEĞİL: yönetici, Firebase Authentication'daki normal bir hesaptır.
// Gönderilen işlemler studentData/{uid}/adminGrants/{id} belgeleri olarak durur; öğrencinin
// widget'ı bunları açılınca ya da açıkken birkaç saniye içinde uygular (bkz. yksApplyAdminGrant).
// ---------------------------------------------------------------------------
var adminState = { uid: null, email: "", coaches: {}, students: [], sel: {}, sort: "active", q: "", coach: "all", tab: "coins", wired: false, loading: false };

function hideAdminView() {
  var el = document.getElementById("adminView");
  if (el) el.style.display = "none";
}

function checkAdmin(uid) {
  function attempt(n) {
    return fbDb.collection("admins").doc(uid).get().then(function (d) {
      return d.exists;
    }).catch(function () {
      if (n <= 0) return false;
      return new Promise(function (res) { setTimeout(res, 700); }).then(function () { return attempt(n - 1); });
    });
  }
  return attempt(1);
}

function admById(id) { return document.getElementById(id); }

function adminDateStr(d) {
  function p(n) { return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function adminStatus(msg, isErr) {
  var el = admById("admStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isErr ? "var(--danger)" : "var(--amber)";
}

function adminStudentName(st) {
  return st.name || (st.meta && st.meta.name) || st.email || "İsimsiz";
}

function adminWeekSeconds(meta) {
  var o = (meta && meta.weeklySubjects && typeof meta.weeklySubjects === "object") ? meta.weeklySubjects : {};
  var t = 0;
  Object.keys(o).forEach(function (k) { t += safeNum(o[k]); });
  return t;
}

function adminFetchAll() {
  return fbDb.collection("users").get().then(function (snap) {
    var coaches = {}, students = [];
    snap.forEach(function (d) {
      var u = d.data() || {};
      u._uid = d.id;
      if (u.role === "coach") coaches[d.id] = u;
      else if (u.role === "student") students.push(u);
    });
    return Promise.all(students.map(function (st) {
      return fbDb.collection("studentData").doc(st._uid).collection("info").doc("meta").get().then(function (m) {
        st.meta = m.exists ? (m.data() || {}) : {};
      }).catch(function () { st.meta = {}; });
    })).then(function () { return { coaches: coaches, students: students }; });
  });
}

function adminReload() {
  if (adminState.loading) return;
  adminState.loading = true;
  adminStatus("Öğrenciler yükleniyor…", false);
  adminFetchAll().then(function (res) {
    adminState.coaches = res.coaches;
    adminState.students = res.students;
    // artık var olmayan seçimleri temizle
    var alive = {};
    res.students.forEach(function (s) { alive[s._uid] = true; });
    Object.keys(adminState.sel).forEach(function (u) { if (!alive[u]) delete adminState.sel[u]; });
    adminStatus("", false);
    adminRenderCoachOptions();
    adminRender();
  }).catch(function (err) {
    adminStatus("Veri okunamadı: " + ((err && err.message) || "bilinmeyen hata") +
      " — Firestore kurallarını (firestore.rules) yayınladın ve admins/{uid} belgesini oluşturdun mu?", true);
  }).then(function () { adminState.loading = false; });
}

function adminCoachName(coachId) {
  var c = coachId ? adminState.coaches[coachId] : null;
  return c ? (c.name || c.email || "Koç") : "";
}

function adminRenderCoachOptions() {
  var sel = admById("admCoachFilter");
  if (!sel) return;
  var ids = Object.keys(adminState.coaches).sort(function (a, b) {
    return adminCoachName(a).localeCompare(adminCoachName(b), "tr");
  });
  var html = '<option value="all">Tüm koçlar</option><option value="none">Koçu olmayanlar</option>';
  ids.forEach(function (id) { html += '<option value="' + escapeHtml(id) + '">' + escapeHtml(adminCoachName(id)) + '</option>'; });
  sel.innerHTML = html;
  sel.value = adminState.coach;
  if (sel.value !== adminState.coach) { adminState.coach = "all"; sel.value = "all"; }
}

function adminVisibleStudents() {
  var q = adminState.q.trim().toLocaleLowerCase("tr");
  var list = adminState.students.filter(function (st) {
    if (adminState.coach === "none" && st.coachId) return false;
    if (adminState.coach !== "all" && adminState.coach !== "none" && st.coachId !== adminState.coach) return false;
    if (!q) return true;
    var hay = (adminStudentName(st) + " " + (st.email || "")).toLocaleLowerCase("tr");
    return hay.indexOf(q) >= 0;
  });
  var key = adminState.sort;
  list.sort(function (a, b) {
    var ma = a.meta || {}, mb = b.meta || {};
    if (key === "name") return adminStudentName(a).localeCompare(adminStudentName(b), "tr");
    if (key === "coins") return safeNum(mb.cityCoins) - safeNum(ma.cityCoins);
    if (key === "streak") return safeNum(mb.streak) - safeNum(ma.streak);
    if (key === "week") return adminWeekSeconds(mb) - adminWeekSeconds(ma);
    return safeNum(mb.lastActive) - safeNum(ma.lastActive);
  });
  return list;
}

function adminSelectedUids() {
  return Object.keys(adminState.sel).filter(function (u) { return adminState.sel[u]; });
}

function adminRender() {
  var listEl = admById("admList");
  if (!listEl) return;
  var all = adminState.students;
  var totalCoins = 0, activeToday = 0;
  all.forEach(function (st) {
    var m = st.meta || {};
    totalCoins += safeNum(m.cityCoins);
    if (safeNum(m.lastActive) && Date.now() - safeNum(m.lastActive) < 86400000) activeToday++;
  });
  var sum = admById("admSummary");
  if (sum) {
    sum.innerHTML =
      '<span class="adm-chip"><b>' + all.length + '</b> öğrenci</span>' +
      '<span class="adm-chip"><b>' + Object.keys(adminState.coaches).length + '</b> koç</span>' +
      '<span class="adm-chip"><b>' + activeToday + '</b> son 24 saatte aktif</span>' +
      '<span class="adm-chip"><b>' + (Math.round(totalCoins * 10) / 10) + '</b> toplam altın (son eşitlemeye göre)</span>';
  }

  var vis = adminVisibleStudents();
  var coachIds = Object.keys(adminState.coaches).sort(function (a, b) {
    return adminCoachName(a).localeCompare(adminCoachName(b), "tr");
  });
  var html = "";
  vis.forEach(function (st) {
    var m = st.meta || {};
    var uid = escapeHtml(st._uid);
    var coachOpts = '<option value="">— koç yok —</option>';
    coachIds.forEach(function (id) {
      coachOpts += '<option value="' + escapeHtml(id) + '"' + (st.coachId === id ? " selected" : "") + '>' + escapeHtml(adminCoachName(id)) + '</option>';
    });
    var last = safeNum(m.lastActive) ? timeAgoText(safeNum(m.lastActive)) : "henüz aktif olmadı";
    html += '<div class="adm-row" data-uid="' + uid + '">' +
      '<label class="adm-check"><input type="checkbox" class="adm-sel" data-uid="' + uid + '"' + (adminState.sel[st._uid] ? " checked" : "") + '></label>' +
      '<div class="adm-main">' +
        '<div class="adm-name">' + escapeHtml(adminStudentName(st)) + ' <span class="adm-mail">' + escapeHtml(st.email || "") + '</span></div>' +
        '<div class="adm-chips">' +
          '<span class="adm-chip sm">🔥 seri <b>' + safeNum(m.streak) + '</b></span>' +
          '<span class="adm-chip sm">🪙 <b>' + (Math.round(safeNum(m.cityCoins) * 10) / 10) + '</b> altın</span>' +
          '<span class="adm-chip sm">🏙 nüfus <b>' + safeNum(m.cityPopulation) + '</b></span>' +
          '<span class="adm-chip sm">⏱ hafta <b>' + escapeHtml(formatSecondsShort(adminWeekSeconds(m))) + '</b></span>' +
          '<span class="adm-chip sm">' + escapeHtml(last) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="adm-side">' +
        '<select class="adm-coach" data-uid="' + uid + '" title="Koçu değiştir">' + coachOpts + '</select>' +
        '<button type="button" class="adm-mini adm-only" data-uid="' + uid + '">sadece bunu seç</button>' +
        '<button type="button" class="adm-mini adm-hist" data-uid="' + uid + '">geçmiş</button>' +
      '</div>' +
      '<div class="adm-hist-box" id="admHist_' + uid + '" style="display:none;"></div>' +
    '</div>';
  });
  listEl.innerHTML = html;
  var empty = admById("admEmpty");
  if (empty) empty.style.display = vis.length ? "none" : "block";
  admUpdateSelectionUi(vis);
}

function admUpdateSelectionUi(vis) {
  vis = vis || adminVisibleStudents();
  var n = adminSelectedUids().length;
  var lab = admById("admTarget");
  if (lab) lab.textContent = n ? (n + " öğrenci seçili") : "Hiç öğrenci seçili değil";
  var all = admById("admSelectAll");
  if (all) {
    var visSel = vis.filter(function (st) { return adminState.sel[st._uid]; }).length;
    all.checked = vis.length > 0 && visSel === vis.length;
    all.indeterminate = visSel > 0 && visSel < vis.length;
  }
}

function adminSendGrants(base, label) {
  var uids = adminSelectedUids();
  if (!uids.length) { adminStatus("Önce listeden en az bir öğrenci seç.", true); return; }
  if (!window.confirm(label + "\n\n" + uids.length + " öğrenciye gönderilsin mi?")) return;
  var now = Date.now();
  var chunks = [];
  for (var i = 0; i < uids.length; i += 200) chunks.push(uids.slice(i, i + 200));
  adminStatus("Gönderiliyor…", false);
  chunks.reduce(function (p, chunk) {
    return p.then(function () {
      var batch = fbDb.batch();
      chunk.forEach(function (u) {
        var ref = fbDb.collection("studentData").doc(u).collection("adminGrants").doc();
        var d = {};
        Object.keys(base).forEach(function (k) { d[k] = base[k]; });
        d.createdAt = now;
        d.createdBy = adminState.uid;
        d.createdByEmail = adminState.email;
        d.applied = false;
        batch.set(ref, d);
      });
      return batch.commit();
    });
  }, Promise.resolve()).then(function () {
    adminStatus("✓ " + uids.length + " öğrenciye gönderildi. Öğrencinin widget'ı açıkken birkaç saniye içinde, kapalıysa bir sonraki açılışta uygulanır. " +
      "(Bu listedeki altın/seri değerleri öğrenci eşitleme yaptıktan sonra — en geç ~3 dk — güncellenir.)", false);
  }).catch(function (err) {
    adminStatus("Gönderilemedi: " + ((err && err.message) || "bilinmeyen hata") + " — kuralların yayınlandığından emin ol.", true);
  });
}

function adminNeedSelection() {
  if (adminSelectedUids().length) return false;
  adminStatus("Önce aşağıdaki listeden en az bir öğrenci seç.", true);
  return true;
}

function adminSendCoins() {
  if (adminNeedSelection()) return;
  var raw = parseFloat(String(admById("admCoinsAmount").value).replace(",", "."));
  if (!isFinite(raw) || raw === 0 || Math.abs(raw) > 100000) {
    adminStatus("Altın miktarı 0 olamaz ve ±100000 aralığında olmalı (çıkarmak için eksi yaz).", true);
    return;
  }
  var amount = Math.round(raw * 10) / 10;
  var note = admById("admCoinsNote").value.trim().slice(0, 80);
  adminSendGrants({ type: "coins", amount: amount, note: note }, (amount > 0 ? "+" : "") + amount + " altın");
}

function adminSendStudy() {
  if (adminNeedSelection()) return;
  var h = Math.floor(Number(admById("admStudyH").value) || 0);
  var m = Math.floor(Number(admById("admStudyM").value) || 0);
  var total = h * 3600 + m * 60;
  if (h < 0 || m < 0 || m > 59 || total <= 0 || total > 24 * 3600) {
    adminStatus("Süre 0'dan büyük ve en fazla 24 saat olmalı (dakika 0–59).", true);
    return;
  }
  var date = admById("admStudyDate").value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { adminStatus("Geçerli bir tarih seç.", true); return; }
  if (date > adminDateStr(new Date())) { adminStatus("Gelecek bir tarihe çalışma süresi eklenemez.", true); return; }
  var d0 = new Date(date + "T00:00:00");
  if (isNaN(d0.getTime()) || (Date.now() - d0.getTime()) / 86400000 > 400) { adminStatus("Tarih en fazla 400 gün geride olabilir.", true); return; }
  var subject = admById("admStudySubject").value.trim().slice(0, 40) || "Genel";
  var note = admById("admStudyNote").value.trim().slice(0, 80);
  var label = (h ? h + " sa " : "") + (m ? m + " dk " : "") + "çalışma süresi · " + subject + " · " + date;
  adminSendGrants({ type: "study", seconds: total, subject: subject, date: date, note: note }, label);
}

function adminSendMessage() {
  if (adminNeedSelection()) return;
  var text = admById("admMsgText").value.trim().slice(0, 300);
  if (!text) { adminStatus("Duyuru metni boş olamaz.", true); return; }
  adminSendGrants({ type: "message", text: text }, "Duyuru: " + text.slice(0, 80));
}

function adminSetTab(tab) {
  adminState.tab = tab;
  Array.prototype.forEach.call(document.querySelectorAll(".adm-tab"), function (b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === tab);
  });
  ["coins", "study", "message"].forEach(function (t) {
    var el = admById("admPane_" + t);
    if (el) el.style.display = (t === tab) ? "block" : "none";
  });
}

function adminGrantLine(g) {
  var t = "";
  if (g.type === "coins") t = "🪙 " + (safeNum(g.amount) > 0 ? "+" : "") + safeNum(g.amount) + " altın";
  else if (g.type === "study") t = "⏱ " + formatSecondsShort(safeNum(g.seconds)) + " · " + escapeHtml(g.subject || "Genel") + " · " + escapeHtml(g.date || "");
  else if (g.type === "message") t = "📣 duyuru: " + escapeHtml(String(g.text || "").slice(0, 60));
  else t = "işlem";
  var when = safeNum(g.createdAt) ? new Date(safeNum(g.createdAt)).toLocaleString("tr-TR") : "";
  var st = g.applied ? "✓ uygulandı" : "⏳ bekliyor";
  return '<div class="adm-hist-line"><span>' + t + '</span><span class="adm-hist-meta">' + escapeHtml(when) + ' · ' + st + '</span></div>';
}

function adminToggleHistory(uid) {
  var box = admById("admHist_" + uid);
  if (!box) return;
  if (box.style.display !== "none") { box.style.display = "none"; return; }
  box.style.display = "block";
  box.innerHTML = '<span class="adm-hist-meta">yükleniyor…</span>';
  fbDb.collection("studentData").doc(uid).collection("adminGrants").orderBy("createdAt", "desc").limit(10).get().then(function (snap) {
    var html = "";
    snap.forEach(function (d) { html += adminGrantLine(d.data() || {}); });
    box.innerHTML = html || '<span class="adm-hist-meta">Bu öğrenciye henüz işlem gönderilmedi.</span>';
  }).catch(function (err) {
    box.innerHTML = '<span class="adm-hist-meta" style="color:var(--danger);">Okunamadı: ' + escapeHtml((err && err.message) || "hata") + '</span>';
  });
}

function adminAssignCoach(uid, coachId) {
  var st = adminState.students.filter(function (s) { return s._uid === uid; })[0];
  if (!st) return;
  var name = adminStudentName(st);
  var target = coachId ? adminCoachName(coachId) : "koçsuz";
  if (!window.confirm(name + " → " + target + " olarak değiştirilsin mi?")) { adminRender(); return; }
  fbDb.collection("users").doc(uid).update({ coachId: coachId || null }).then(function () {
    st.coachId = coachId || null;
    adminStatus("✓ " + name + " için koç güncellendi.", false);
    adminRender();
  }).catch(function (err) {
    adminStatus("Koç değiştirilemedi: " + ((err && err.message) || "hata"), true);
    adminRender();
  });
}

function wireAdminEvents() {
  if (adminState.wired) return;
  adminState.wired = true;
  admById("admSearch").addEventListener("input", function (e) { adminState.q = e.target.value || ""; adminRender(); });
  admById("admCoachFilter").addEventListener("change", function (e) { adminState.coach = e.target.value; adminRender(); });
  admById("admSort").addEventListener("change", function (e) { adminState.sort = e.target.value; adminRender(); });
  admById("admRefresh").addEventListener("click", adminReload);
  admById("admSelectAll").addEventListener("change", function (e) {
    var on = !!e.target.checked;
    adminVisibleStudents().forEach(function (st) { adminState.sel[st._uid] = on; });
    adminRender();
  });
  admById("admClearSel").addEventListener("click", function () { adminState.sel = {}; adminRender(); });
  admById("admList").addEventListener("change", function (e) {
    var t = e.target;
    if (t.classList.contains("adm-sel")) {
      adminState.sel[t.getAttribute("data-uid")] = !!t.checked;
      admUpdateSelectionUi();
    } else if (t.classList.contains("adm-coach")) {
      adminAssignCoach(t.getAttribute("data-uid"), t.value);
    }
  });
  admById("admList").addEventListener("click", function (e) {
    var t = e.target;
    if (!t.classList) return;
    var uid = t.getAttribute("data-uid");
    if (t.classList.contains("adm-only")) {
      adminState.sel = {};
      adminState.sel[uid] = true;
      adminRender();
    } else if (t.classList.contains("adm-hist")) {
      adminToggleHistory(uid);
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll(".adm-tab"), function (b) {
    b.addEventListener("click", function () { adminSetTab(b.getAttribute("data-tab")); });
  });
  admById("admCoinsSend").addEventListener("click", adminSendCoins);
  admById("admStudySend").addEventListener("click", adminSendStudy);
  admById("admMsgSend").addEventListener("click", adminSendMessage);

  // ders adı önerileri
  var dl = admById("admSubjectList");
  if (dl) {
    var seen = { "Genel": true }, opts = '<option value="Genel"></option>';
    ["TYT", "AYT"].forEach(function (g) {
      Object.keys(YKS_TOPICS[g] || {}).forEach(function (name) {
        if (!seen[name]) { seen[name] = true; opts += '<option value="' + escapeHtml(name) + '"></option>'; }
      });
    });
    dl.innerHTML = opts;
  }
  var dateInput = admById("admStudyDate");
  if (dateInput) { dateInput.value = adminDateStr(new Date()); dateInput.max = adminDateStr(new Date()); }
}

function showAdminView(user) {
  adminState.uid = user.uid;
  adminState.email = user.email || "";
  document.getElementById("authGate").style.display = "none";
  document.getElementById("widget").style.display = "none";
  document.getElementById("coachView").style.display = "none";
      hideAdminView();
  document.getElementById("adminView").style.display = "flex";
  var who = admById("adminWho");
  if (who) who.textContent = adminState.email || "yönetici";
  wireAdminEvents();
  adminSetTab(adminState.tab);
  adminReload();
}

// ---- Öğrenci tarafı: yönetici işlemlerini dinle ve uygula ----
var adminGrantUnsub = null;

function startAdminGrantListener(uid) {
  if (adminGrantUnsub || !uid) return;
  try {
    adminGrantUnsub = fbDb.collection("studentData").doc(uid).collection("adminGrants")
      .where("applied", "==", false)
      .onSnapshot(function (snap) {
        snap.docChanges().forEach(function (ch) {
          if (ch.type === "added") handleAdminGrantDoc(ch.doc);
        });
      }, function () { /* kurallar yayınlanmadıysa ya da çevrimdışıysa sessizce geç */ });
  } catch (e) {}
}

function handleAdminGrantDoc(doc) {
  if (!window.yksApplyAdminGrant) return;
  var ref = doc.ref;
  Promise.resolve(window.yksApplyAdminGrant(doc.id, doc.data())).then(function (ok) {
    if (ok) return ref.update({ applied: true, appliedAt: Date.now() });
  }).catch(function () { /* bir sonraki açılışta tekrar denenir; yerel kimlik listesi çift uygulamayı engeller */ });
}

// ---- Giriş Kapısı Orkestrasyonu ----

function initAuthGate(coachModeRequested) {
  wireAuthGateEvents();
  var logoutRow = document.getElementById("authLogoutRow");
  logoutRow.innerHTML = '<button type="button" class="auth-link-btn" id="authGateSignOutBtn">Farklı bir hesapla dene / çıkış yap</button>';
  logoutRow.style.display = "none";
  document.getElementById("authGateSignOutBtn").addEventListener("click", function () {
    logoutUser().then(function () { location.reload(); });
  });

  fbAuth.onAuthStateChanged(function (user) {
    if (!user) {
      document.getElementById("authGate").style.display = "flex";
      document.getElementById("widget").style.display = "none";
      document.getElementById("coachView").style.display = "none";
      hideAdminView();
      logoutRow.style.display = "none";
      setAuthBusy(false);
      return;
    }
    setAuthBusy(true, "Bilgiler getiriliyor…");
    document.getElementById("authGate").style.display = "flex";
    document.getElementById("widget").style.display = "none";
    document.getElementById("coachView").style.display = "none";
      hideAdminView();

    // Register/giris akisindan (varsa) devraldigimiz is - kayit sirasindaki
    // ardisik yazmalar (profil + davet kodu) tamamen bitmeden profili okumaya
    // baslamamak icin bunu bekliyoruz.
    var waitForAuthFlow = pendingAuthTask || Promise.resolve();
    pendingAuthTask = null;

    waitForAuthFlow.catch(function () { /* hata zaten handleAuthSubmit'te gosterildi */ }).then(function () {
      return checkAdmin(user.uid);
    }).then(function (isAdm) {
      if (isAdm) return "admin";
      return firestoreGetWithRetry(fbDb.collection("users").doc(user.uid), 4, 900);
    }).then(function (doc) {
      if (doc === "admin") {
        setAuthBusy(false);
        showAdminView(user);
        return;
      }
      if (!doc.exists) {
        document.getElementById("authGate").style.display = "flex";
        document.getElementById("widget").style.display = "none";
        document.getElementById("coachView").style.display = "none";
      hideAdminView();
        logoutRow.style.display = "block";
        setAuthBusy(false);
        showAuthError("Hesabın var ama profil bilgisi bulunamadı. Tekrar kayıt olmayı dene ya da çıkış yap.");
        return;
      }
      currentUserUid = user.uid;
      currentUserProfile = doc.data();
      document.getElementById("authGate").style.display = "none";
      setAuthBusy(false);

      if (currentUserProfile.role === "coach") {
        document.getElementById("widget").style.display = "none";
        document.getElementById("coachView").style.display = "flex";
        renderCoachDashboard(user.uid, currentUserProfile);
      } else {
        document.getElementById("coachView").style.display = "none";
      hideAdminView();
        document.getElementById("widget").style.display = "";
        if (window.startStudentWidgetAfterAuth) window.startStudentWidgetAfterAuth();
      }
    }).catch(function (err) {
      document.getElementById("authGate").style.display = "flex";
      document.getElementById("widget").style.display = "none";
      document.getElementById("coachView").style.display = "none";
      hideAdminView();
      logoutRow.style.display = "block";
      setAuthBusy(false);
      showAuthError("Sunucudan veri okunamadı: " + ((err && err.message) || "bilinmeyen hata") +
        ". Firestore güvenlik kurallarını yayınladığından emin ol.");
    });
  });
}

function wireLogoutButtons() {
  Array.prototype.forEach.call(document.querySelectorAll(".auth-logout-btn"), function (btn) {
    btn.addEventListener("click", function () {
      logoutUser().then(function () { location.reload(); });
    });
  });
}

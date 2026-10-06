// ============================================================================
// YKS Sayaç — Çekirdek: sürüm, durum değişkenleri, tarih yardımcıları, yerel/bulut depolama, ayar ve ilerleme yükleme/kaydetme
// Klasik <script> (IIFE değil): üst düzey tanımlar diğer dosyalarla ortak global kapsamdadır.
// Yükleme sırası yks-sayac.html içindeki <script> sırasıdır.
// ============================================================================

// Her yeni surum yayinladiginda bu numarayi guncelle (orn. "1.1.0").
// Firestore'daki appConfig/latestVersion belgesindeki "version" alani
// bundan BUYUK olursa, kullaniciya yeni surum oldugu bildirilir.
var APP_VERSION = "2.5.0";
(function () {
  var tag = document.getElementById("cornerVersionTag");
  if (tag) tag.textContent = "v" + APP_VERSION;
})();
var state = {
  examDate: "2027-06-19",
  examTime: "10:15",
  session: "TYT",
  dailyGoal: 5,
  theme: "dark"
};
var todayCount = 0;
var todayTopics = [];
var studyState = { subjects: {}, running: false, activeSubject: null, startTs: null };
var lastDays = null;
var lastQuoteIndex = null;
var quotes = [
  "Bugün çözdüğün her soru, sınava bir adım daha yaklaştırır.",
  "Yorulduğunda dur, ama vazgeçme.",
  "Düzenli çalışan, yetenekli olandan daha uzağa gider.",
  "Bir konu daha bitti; bu da bir kazanım.",
  "Bugünün emeği, sınav günü rahatlığı.",
  "Zorlandığın an, aslında geliştiğin andır.",
  "Bildiğini pekiştir, bilmediğini bul.",
  "Hata yaptığın soru, en çok şey öğrettiğin sorudur.",
  "Bugün bıraktığın yerden değil, kaldığın yerden devam et.",
  "Her deneme, seni sınav gününe biraz daha alıştırır.",
  "Yorgunluk geçicidir, kazandığın bilgi kalıcı.",
  "Bugün olduğun yerden başla, yeter ki başla.",
  "Sakin çalışmak, telaşla çalışmaktan daha çok net getirir.",
  "Bir saatlik odaklanmış çalışma, dağınık bir günden daha değerlidir.",
  "Küçük ama düzenli adımlar, büyük ama düzensiz çabalardan daha etkilidir.",
  "Tekrar ettiğin bilgi, sınavda seni yarı yolda bırakmaz.",
  "Bugün çalışmak, yarının kaygısını azaltır.",
  "Konsantrasyon, saatlerce masada oturmaktan daha değerlidir.",
  "Zor gelen konu, üzerinde en çok durman gereken konudur.",
  "Bir gün ara vermek sorun değil; asıl olan devam etmek.",
  "Planına sadık kal, sonucu zamanla göreceksin.",
  "Sınav bir maraton; bugünkü çalışma da o maratonun bir parçası.",
  "Bugün öğrendiğin, yarın sınavda karşına çıkabilecek bilgidir.",
  "Kendine güven, ama çalışmayı da elden bırakma.",
  "Az ve öz çalışmak, çok ama dağınık çalışmaktan iyidir.",
  "Bugünkü disiplinin, haziranda seni rahatlatacak."
];
var months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
function pad(n) { return String(n).padStart(2, "0"); }
function dateStr(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function todayKey() {
  return "progress-" + dateStr(new Date());
}
function topicsKey() {
  return "topics-" + dateStr(new Date());
}
function studyKey() {
  return "study-" + dateStr(new Date());
}
function hasCloudStorage() {
  return typeof window.storage !== "undefined" && window.storage;
}
function storageGet(key) {
  if (hasCloudStorage()) {
    return window.storage.get(key, false).then(function (res) {
      return res ? res.value : null;
    }).catch(function () { return null; });
  }
  try {
    return Promise.resolve(localStorage.getItem(key));
  } catch (e) {
    return Promise.resolve(null);
  }
}
function storageSet(key, value) {
  if (hasCloudStorage()) {
    return window.storage.set(key, value, false).catch(function () {});
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
  return Promise.resolve();
}
function loadSettings() {
  return storageGet("yks-settings").then(function (value) {
    if (value) {
      try {
        Object.assign(state, JSON.parse(value));
      } catch (e) {}
    }
  });
}
function saveSettings() {
  return storageSet("yks-settings", JSON.stringify(state));
}
function loadProgress() {
  return storageGet(todayKey()).then(function (value) {
    return value ? (Number(value) || 0) : 0;
  });
}
function saveProgress(n) {
  return storageSet(todayKey(), String(n));
}

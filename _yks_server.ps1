# YKS Sayac - Yerel HTTP Sunucusu
# Amac: dosyayi file:// yerine http://localhost uzerinden sunup Firestore'un
# ayni-origin koprusunu kullanabilmesini saglamak. Harici bagimlilik yok,
# Windows'ta hazir gelen .NET siniflarini kullanir.
#
# GUVENLIK NOTLARI (v1.1.2):
# - Bu sunucu sadece loopback'e bagli olsa da, tarayicida acik olan HERHANGI
#   bir web sitesi http://localhost:8917/... adresine istek gonderebilir.
#   Bu yuzden "sadece localhost" tek basina bir yetkilendirme DEGILDIR.
# - /apply-update ucu (dosya indirip uzerine yazan uc) bu yuzden:
#     1) sadece POST kabul eder,
#     2) Origin basligi widget'in kendi adresi (localhost:PORT) degilse reddeder,
#     3) ozel bir baslik (X-YKS-Update: 1) ister (baska site bunu CORS onayi
#        olmadan gonderemez),
#     4) sadece asagida sabitlenmis GitHub deposundan (KaanHorasan/yks-sayac-updates)
#        indirir - istekle gelen baska hicbir adresi kabul etmez,
#     5) ZIP'in icinden sadece bilinen dosya adlarini kopyalar.
# - Host basligi kontrol edilir (DNS rebinding'e karsi ek katman).
# - Sadece bilinen uzantilar sunulur (.ps1/.vbs gibi dosyalar sunulmaz).

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8917

# --- Guncelleme kaynagi (SABIT - istekle degistirilemez) ---
# Depo adini degistirirsen sadece burayi guncelle.
$updateAllowedHosts = @("raw.githubusercontent.com", "github.com")
$updateRepoPath = "/KaanHorasan/yks-sayac-updates/"
$maxZipBytes = 25MB

# Guncelleme ZIP'inden kopyalanmasina IZIN verilen dosyalar (baska her sey yok sayilir)
$allowedUpdateFiles = @(
  "yks-sayac.html",
  "yks-sayac-cloud.js",
  "yks-sayac-images.js",
  "yks-sayac-baslat.vbs",
  "_yks_server.ps1",
  "_yks_prefs.ps1",
  "yks-sayac.ico"
)
# v1.6'dan itibaren widget birden cok dosyaya bolundu (yks-sayac-<ad>.js ve yks-sayac.css).
# Bu kalip YALNIZCA bu onekli .js/.css dosyalarina izin verir (alt klasor/yol gezintisi yok).
$allowedUpdatePattern = '^yks-sayac(-[a-z0-9]+)*\.(js|css)$'

# Kabul edilen Host / Origin degerleri
$allowedHostHeaders = @(("localhost:" + $port), ("127.0.0.1:" + $port))
$allowedOrigins = @(("http://localhost:" + $port), ("http://127.0.0.1:" + $port))

function Test-PortFree($p) {
  try {
    $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
    $l.Start()
    $l.Stop()
    return $true
  } catch {
    return $false
  }
}

# Onceki sunucu surecinin kapanmasi icin kisa sure bekle (baslatici eskisini
# kapatip yenisini acarken port bir an dolu gorunebilir).
$portTries = 0
while ((-not (Test-PortFree $port)) -and ($portTries -lt 10)) {
  Start-Sleep -Milliseconds 300
  $portTries++
}
# Hala doluysa gercekten baska bir sunucu calisiyordur - tekrar baslatma
if (-not (Test-PortFree $port)) {
  exit
}

# Eski Windows'larda varsayilan TLS surumu GitHub icin yetersiz olabiliyor
try {
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
} catch {}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
} catch {
  exit
}

$mimeMap = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
}

function Test-UpdateUrl($url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return $false }
  $uri = $null
  if (-not [System.Uri]::TryCreate($url, [System.UriKind]::Absolute, [ref]$uri)) { return $false }
  if ($uri.Scheme -ne "https") { return $false }
  if (-not [string]::IsNullOrEmpty($uri.UserInfo)) { return $false }
  if (-not $uri.IsDefaultPort) { return $false }
  if ($updateAllowedHosts -notcontains $uri.Host.ToLower()) { return $false }
  $decodedPath = [System.Uri]::UnescapeDataString($uri.AbsolutePath)
  if ($decodedPath -match '(^|[/\\])\.\.([/\\]|$)') { return $false }
  if (-not $decodedPath.StartsWith($updateRepoPath, [System.StringComparison]::OrdinalIgnoreCase)) { return $false }
  return $true
}

function Send-Json($response, $obj, $statusCode) {
  $response.StatusCode = $statusCode
  $json = ($obj | ConvertTo-Json -Compress)
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $response.ContentType = "application/json; charset=utf-8"
  $response.ContentLength64 = $jsonBytes.Length
  $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
}

function Invoke-ApplyUpdate($request, $response) {
  # 1) Yontem: sadece POST
  if ($request.HttpMethod -ne "POST") {
    Send-Json $response @{ ok = $false; error = "yalnizca POST kabul edilir" } 405
    return
  }
  # 2) Origin: istek widget'in KENDI sayfasindan gelmeli
  $origin = $request.Headers["Origin"]
  if ([string]::IsNullOrEmpty($origin) -or ($allowedOrigins -notcontains $origin.ToLower())) {
    Send-Json $response @{ ok = $false; error = "gecersiz kaynak (Origin)" } 403
    return
  }
  # 3) Modern tarayicilar Sec-Fetch-Site gonderir; same-origin disinda ise reddet
  $fetchSite = $request.Headers["Sec-Fetch-Site"]
  if ((-not [string]::IsNullOrEmpty($fetchSite)) -and ($fetchSite -ne "same-origin")) {
    Send-Json $response @{ ok = $false; error = "gecersiz istek kaynagi" } 403
    return
  }
  # 4) Ozel baslik: baska bir site CORS onayi olmadan bunu gonderemez
  if ($request.Headers["X-YKS-Update"] -ne "1") {
    Send-Json $response @{ ok = $false; error = "gerekli baslik eksik" } 403
    return
  }
  # 5) Adres: sadece sabitlenmis GitHub deposu
  $updateUrl = $request.QueryString["url"]
  if (-not (Test-UpdateUrl $updateUrl)) {
    Send-Json $response @{ ok = $false; error = "bu guncelleme adresine izin verilmiyor" } 403
    return
  }

  $result = @{ ok = $false; error = "" }
  $tempZip = Join-Path $env:TEMP ("yks-sayac-update-" + [guid]::NewGuid().ToString("N") + ".zip")
  $tempExtract = Join-Path $env:TEMP ("yks-sayac-update-" + [guid]::NewGuid().ToString("N"))
  try {
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri $updateUrl -OutFile $tempZip -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 3

    if ((Get-Item $tempZip).Length -gt $maxZipBytes) {
      throw "indirilen dosya beklenenden buyuk"
    }

    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

    # Sadece izinli dosya adlarini topla (ZIP'te alt klasor olsa da olmasa da calisir)
    $toCopy = @()
    Get-ChildItem -Path $tempExtract -File -Recurse | ForEach-Object {
      $lname = $_.Name.ToLower()
      if (($allowedUpdateFiles -contains $lname) -or ($lname -match $allowedUpdatePattern)) {
        $toCopy += $_
      }
    }

    # Ana dosya yoksa bu, bizim guncelleme paketimiz degildir - hicbir sey kopyalama
    $hasHtml = $false
    foreach ($f in $toCopy) { if ($f.Name.ToLower() -eq "yks-sayac.html") { $hasHtml = $true } }
    if (-not $hasHtml) {
      throw "ZIP beklenen dosyalari icermiyor"
    }

    # yks-sayac.html EN SON kopyalanir: arada bir hata olursa eski html + eski dosyalar
    # calismaya devam eder (yarim guncelleme widget'i bozmaz).
    $ordered = @($toCopy | Where-Object { $_.Name.ToLower() -ne "yks-sayac.html" }) + @($toCopy | Where-Object { $_.Name.ToLower() -eq "yks-sayac.html" })
    foreach ($f in $ordered) {
      Copy-Item -Path $f.FullName -Destination (Join-Path $scriptDir $f.Name.ToLower()) -Force
    }

    $result.ok = $true
  } catch {
    $result.error = $_.Exception.Message
  } finally {
    Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
  }
  Send-Json $response $result 200
}

$fullScriptDir = (Resolve-Path $scriptDir).Path
if (-not $fullScriptDir.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
  $fullScriptDirWithSep = $fullScriptDir + [System.IO.Path]::DirectorySeparatorChar
} else {
  $fullScriptDirWithSep = $fullScriptDir
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
  } catch {
    # Tek bir bozuk/yarim kesilen istek sunucuyu oldurmesin (yerel DoS'a karsi).
    # Sadece dinleyici gercekten kapandiysa donguden cik.
    if (-not $listener.IsListening) { break }
    Start-Sleep -Milliseconds 50
    continue
  }
  try {
    $request = $context.Request
    $response = $context.Response
    $response.Headers.Add("Cache-Control", "no-store, must-revalidate")
    $response.Headers.Add("X-Content-Type-Options", "nosniff")
    $response.Headers.Add("X-Frame-Options", "DENY")
    $response.Headers.Add("Content-Security-Policy", "frame-ancestors 'none'")
    $response.Headers.Add("Cross-Origin-Resource-Policy", "same-origin")

    # DNS rebinding'e karsi: Host basligi bizim adresimiz degilse hicbir sey sunma
    $hostHeader = $request.Headers["Host"]
    if ([string]::IsNullOrEmpty($hostHeader) -or ($allowedHostHeaders -notcontains $hostHeader.ToLower())) {
      $response.StatusCode = 403
      $forbiddenBytes = [System.Text.Encoding]::UTF8.GetBytes("403")
      $response.OutputStream.Write($forbiddenBytes, 0, $forbiddenBytes.Length)
      continue
    }

    $localPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath).TrimStart("/")
    if ([string]::IsNullOrEmpty($localPath)) { $localPath = "yks-sayac.html" }

    if ($localPath -eq "apply-update") {
      Invoke-ApplyUpdate $request $response
    } else {
      # Sadece GET/HEAD ile, sadece bilinen uzantilarda, sadece bu klasorun icinden sun
      $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
      $isReadMethod = ($request.HttpMethod -eq "GET") -or ($request.HttpMethod -eq "HEAD")
      $filePath = $null
      $resolvedRequested = $null
      if ($isReadMethod -and $mimeMap.ContainsKey($ext) -and ($localPath.IndexOfAny([System.IO.Path]::GetInvalidPathChars()) -lt 0)) {
        $filePath = Join-Path $scriptDir $localPath
        if (Test-Path $filePath -PathType Leaf) {
          $resolvedRequested = (Resolve-Path $filePath).Path
        }
      }

      if ($resolvedRequested -and $resolvedRequested.StartsWith($fullScriptDirWithSep, [System.StringComparison]::OrdinalIgnoreCase)) {
        $bytes = [System.IO.File]::ReadAllBytes($resolvedRequested)
        $response.ContentType = $mimeMap[$ext]
        $response.ContentLength64 = $bytes.Length
        if ($request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      } else {
        $response.StatusCode = 404
        $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - dosya bulunamadi")
        $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
      }
    }
  } catch {
    try { $context.Response.StatusCode = 500 } catch {}
  } finally {
    try { $context.Response.OutputStream.Close() } catch {}
  }
}

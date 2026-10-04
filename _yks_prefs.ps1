param(
    [Parameter(Mandatory=$true)][string]$ProfileDir,
    [Parameter(Mandatory=$true)][string]$SavesDir
)

# YKS Sayac - indirme ayarlarini otomatik yapan yardimci betik
# ------------------------------------------------------------
# Eskiden kullanici "yks-indirme-ayari.vbs" ile tarayici ayarlar
# sayfasina gidip elle iki ayar yapiyordu. Bu betik ayni ayarlari
# (yedek dosyasinin nereye kaydedilecegi ve "nereye kaydedilsin"
# diye sormamasi) widget'in KENDI OZEL profilindeki Preferences
# JSON dosyasina dogrudan yazarak otomatiklestiriyor. Kullanicinin
# ana tarayici profiline hic dokunulmuyor - sadece bu widget'a
# ozel profil etkileniyor.
#
# Bu betik her baslatmada calisir ve ayarlari "onarir"; boylece
# tarayici bir gun bu ayarlari sifirlasa bile bir sonraki acilista
# kendini duzeltir. Herhangi bir hata olursa sessizce cikar ki
# widget'in acilmasini engellemesin (en kotu durumda kullanici eski
# manuel yontemi kullanabilir).

try {
    $defaultDir = Join-Path $ProfileDir 'Default'
    if (-not (Test-Path $defaultDir)) {
        New-Item -ItemType Directory -Path $defaultDir -Force | Out-Null
    }

    $prefsPath = Join-Path $defaultDir 'Preferences'

    $prefs = $null
    if (Test-Path $prefsPath) {
        try {
            $raw = Get-Content -Path $prefsPath -Raw -ErrorAction Stop
            if ($raw -and $raw.Trim().Length -gt 0) {
                $prefs = $raw | ConvertFrom-Json -ErrorAction Stop
            }
        } catch {
            $prefs = $null
        }
    }
    if ($null -eq $prefs) {
        $prefs = [PSCustomObject]@{}
    }

    function Set-JsonProp {
        param($Obj, [string]$Name, $Value)
        if ($Obj.PSObject.Properties.Name -contains $Name) {
            $Obj.$Name = $Value
        } else {
            $Obj | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
        }
    }

    if (-not ($prefs.PSObject.Properties.Name -contains 'download')) {
        Set-JsonProp $prefs 'download' ([PSCustomObject]@{})
    }
    Set-JsonProp $prefs.download 'default_directory' $SavesDir
    Set-JsonProp $prefs.download 'prompt_for_download' $false
    Set-JsonProp $prefs.download 'directory_upgrade' $true

    if (-not ($prefs.PSObject.Properties.Name -contains 'savefile')) {
        Set-JsonProp $prefs 'savefile' ([PSCustomObject]@{})
    }
    Set-JsonProp $prefs.savefile 'default_directory' $SavesDir

    $json = $prefs | ConvertTo-Json -Depth 100 -Compress
    [System.IO.File]::WriteAllText($prefsPath, $json, (New-Object System.Text.UTF8Encoding($false)))
}
catch {
    exit 0
}

' YKS Sayac - Windows baslangicinda otomatik acma betigi
' Bu dosyayi yks-sayac.html ile AYNI klasorde tut.

Const DEBUG_MODE = False
Const SERVER_PORT = "8917" ' _yks_server.ps1 icindeki port ile ayni olmali

Dim objShell, objFSO, scriptDir, htmlPath, fileUrl
Dim bravePath, edgePath, chromePath

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim Q
Q = Chr(34)

scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
htmlPath = scriptDir & "\yks-sayac.html"

If objFSO.FileExists(htmlPath) = False Then
    MsgBox "yks-sayac.html bulunamadi. Bu betikle ayni klasorde oldugundan emin ol.", 16, "YKS Sayac"
    WScript.Quit
End If

' Firestore (bulut senkronu) file:// altinda guvenilir calismadigi icin widget'i
' dosyadan degil, ayni klasordeki _yks_server.ps1'in actigi kucuk bir yerel HTTP
' sunucusundan (http://localhost) aciyoruz.
Dim serverPsPath
serverPsPath = scriptDir & "\_yks_server.ps1"
If objFSO.FileExists(serverPsPath) = False Then
    MsgBox "_yks_server.ps1 bulunamadi. Bu betikle ayni klasorde oldugundan emin ol.", 16, "YKS Sayac"
    WScript.Quit
End If
' Onceki acilistan kalmis bir sunucu sureci varsa KAPAT. Sunucu surekli calisan bir
' PowerShell sureci oldugundan, otomatik guncelleme _yks_server.ps1'i degistirse bile
' eski surec eski kodla calismaya devam eder (guvenlik duzeltmeleri devreye girmez).
' Sadece komut satirinda _yks_server.ps1 gecen powershell.exe surecleri kapatilir.
Sub StopOldServer()
    Dim wmi, procs, p
    On Error Resume Next
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    If Err.Number <> 0 Then
        Err.Clear
        On Error Goto 0
        Exit Sub
    End If
    Set procs = wmi.ExecQuery("Select * From Win32_Process Where Name = 'powershell.exe'")
    For Each p In procs
        If Not IsNull(p.CommandLine) Then
            If InStr(LCase(p.CommandLine), "_yks_server.ps1") > 0 Then
                p.Terminate
            End If
        End If
    Next
    Err.Clear
    On Error Goto 0
End Sub

StopOldServer
WScript.Sleep 400
objShell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Q & serverPsPath & Q, 0, False

fileUrl = "http://localhost:" & SERVER_PORT & "/yks-sayac.html"

' Sabit bir bekleme suresi yerine, sunucu gercekten cevap verene kadar
' (en fazla SERVER_MAX_WAIT_MS kadar) kisa araliklarla kontrol ediyoruz.
' Boylece yavas bilgisayarlarda erken acilip bos/bozuk ekranla karsilasmayi,
' hizli bilgisayarlarda da gereksiz bekelemeyi onluyoruz.
' Sunucu hic ayaga kalkmazsa (antivirus/guvenlik politikasi PowerShell'i
' engellemis olabilir, ya da port baska bir uygulama tarafindan kullaniliyor
' olabilir) kullaniciya net bir hata gosterip DURUYORUZ - asla dosyayi
' file:// ile acmaya DUSMUYORUZ, cunku Firestore girisi file:// altinda
' calismiyor ve bu, anlasilmasi cok zor bir "client is offline" hatasina
' yol aciyor.
Const SERVER_MAX_WAIT_MS = 15000
Const SERVER_POLL_INTERVAL_MS = 400

Function IsServerReady(checkUrl)
    Dim http
    IsServerReady = False
    On Error Resume Next
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    If Err.Number <> 0 Then
        Err.Clear
        On Error Goto 0
        Exit Function
    End If
    http.SetTimeouts 500, 500, 500, 500
    http.Open "GET", checkUrl, False
    http.Send
    If Err.Number = 0 Then
        If http.Status = 200 Then
            IsServerReady = True
        End If
    End If
    Err.Clear
    On Error Goto 0
End Function

Dim serverReady, waitedMs
serverReady = False
waitedMs = 0
Do While waitedMs < SERVER_MAX_WAIT_MS
    If IsServerReady(fileUrl) Then
        serverReady = True
        Exit Do
    End If
    WScript.Sleep SERVER_POLL_INTERVAL_MS
    waitedMs = waitedMs + SERVER_POLL_INTERVAL_MS
Loop

If serverReady = False Then
    MsgBox "Yerel sunucu baslatilamadi, widget acilamiyor." & vbCrLf & vbCrLf & _
           "Olasi sebepler:" & vbCrLf & _
           "- Antivirus/guvenlik yazilimi PowerShell betigini engelledi" & vbCrLf & _
           "- Bilgisayarin guvenlik politikasi betik calistirmaya izin vermiyor" & vbCrLf & _
           "- " & SERVER_PORT & " portu baska bir uygulama tarafindan kullaniliyor" & vbCrLf & vbCrLf & _
           "Lutfen BT/destek ekibine basvur.", 16, "YKS Sayac - Sunucu Baslatilamadi"
    WScript.Quit
End If

Function RegPath(keyPath)
    Dim val
    On Error Resume Next
    val = objShell.RegRead(keyPath)
    If Err.Number <> 0 Then
        val = ""
        Err.Clear
    End If
    On Error Goto 0
    RegPath = val
End Function

' Komut satirindan ("C:\yol\program.exe" -bayrak "%1" gibi) sadece exe yolunu ayikla
Function ExtractExePath(cmdLine)
    Dim result, pos
    result = ""
    If cmdLine <> "" Then
        If Left(cmdLine, 1) = """" Then
            pos = InStr(2, cmdLine, """")
            If pos > 0 Then
                result = Mid(cmdLine, 2, pos - 2)
            End If
        Else
            pos = InStr(cmdLine, " ")
            If pos > 0 Then
                result = Left(cmdLine, pos - 1)
            Else
                result = cmdLine
            End If
        End If
    End If
    ExtractExePath = result
End Function

' --- Yontem 1: .html icin Windows'ta secili varsayilan tarayicinin komutunu oku ---
Dim progId, defaultCmd, defaultExe
progId = RegPath("HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.html\UserChoice\ProgId")
defaultCmd = ""
defaultExe = ""
If progId <> "" Then
    defaultCmd = RegPath("HKCR\" & progId & "\shell\open\command\")
    defaultExe = ExtractExePath(defaultCmd)
End If

' --- Yontem 2: brave.exe icin App Paths kaydi ---
bravePath = RegPath("HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\brave.exe\")
If bravePath = "" Then bravePath = RegPath("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\brave.exe\")
If bravePath = "" Then bravePath = RegPath("HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\brave.exe\")

' --- Yontem 3: bilinen standart klasorler ---
Dim localAppData
localAppData = objShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
Dim guessPaths(2)
guessPaths(0) = localAppData & "\BraveSoftware\Brave-Browser\Application\brave.exe"
guessPaths(1) = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
guessPaths(2) = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"

Dim guessFound
guessFound = ""
Dim i
For i = 0 To 2
    If objFSO.FileExists(guessPaths(i)) Then
        guessFound = guessPaths(i)
        Exit For
    End If
Next

' --- Hangisi gecerliyse (dosya gercekten var mi diye kontrol ederek) onu kullan ---
Dim finalBrave
finalBrave = ""
If defaultExe <> "" And objFSO.FileExists(defaultExe) Then
    finalBrave = defaultExe
ElseIf bravePath <> "" And objFSO.FileExists(bravePath) Then
    finalBrave = bravePath
ElseIf guessFound <> "" Then
    finalBrave = guessFound
End If

If DEBUG_MODE Then
    MsgBox _
        "ProgId: [" & progId & "]" & vbCrLf & _
        "Varsayilan tarayici komutu: [" & defaultCmd & "]" & vbCrLf & _
        "Varsayilan tarayici exe: [" & defaultExe & "]" & vbCrLf & _
        "(var mi: " & objFSO.FileExists(defaultExe) & ")" & vbCrLf & vbCrLf & _
        "App Paths brave.exe: [" & bravePath & "]" & vbCrLf & _
        "Klasor taramasiyla bulunan: [" & guessFound & "]" & vbCrLf & vbCrLf & _
        "SECILEN YOL: [" & finalBrave & "]", _
        64, "YKS Sayac - Teshis"
End If

edgePath = RegPath("HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe\")
If edgePath = "" Then edgePath = RegPath("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe\")
If edgePath = "" And objFSO.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
    edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
End If

chromePath = RegPath("HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
If chromePath = "" Then chromePath = RegPath("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
If chromePath = "" And objFSO.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
End If

Dim widgetProfileDir
widgetProfileDir = localAppData & "\YksSayacWidgetProfile"
If objFSO.FolderExists(widgetProfileDir) = False Then
    objFSO.CreateFolder(widgetProfileDir)
End If
widgetProfileDir = objFSO.GetFolder(widgetProfileDir).ShortPath

' --- Yedeklerin inecegi klasoru garanti altina al: Masaustu\yks sayac\Saves ---
Dim desktopPath, appFolder, savesFolder
desktopPath = objShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop"
appFolder = desktopPath & "\yks sayac"
savesFolder = appFolder & "\Saves"
If objFSO.FolderExists(desktopPath) Then
    If objFSO.FolderExists(appFolder) = False Then
        objFSO.CreateFolder(appFolder)
    End If
    If objFSO.FolderExists(savesFolder) = False Then
        objFSO.CreateFolder(savesFolder)
    End If
End If

' --- Yedekleme indirmelerinin "nereye kaydedilsin" diye sormadan,
' dogrudan Saves klasorune inmesini sagla ---
' Eskiden bunun icin kullanici yks-indirme-ayari.vbs'yi calistirip
' tarayici ayarlarina elle girmesi gerekiyordu. Simdi bu ayari
' otomatik olarak widget'in ozel profiline yaziyoruz; eksikse
' sessizce atlanir (widget yine de acilir).
Dim prefsPsPath
prefsPsPath = scriptDir & "\_yks_prefs.ps1"
If objFSO.FileExists(prefsPsPath) Then
    objShell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Q & prefsPsPath & Q & _
                 " -ProfileDir " & Q & widgetProfileDir & Q & _
                 " -SavesDir " & Q & savesFolder & Q, 0, True
End If

Dim chosenExe
chosenExe = ""
If finalBrave <> "" Then
    chosenExe = finalBrave
ElseIf edgePath <> "" And objFSO.FileExists(edgePath) Then
    chosenExe = edgePath
ElseIf chromePath <> "" And objFSO.FileExists(chromePath) Then
    chosenExe = chromePath
End If

' ONEMLI: Burada artik file:// 'a DUSMUYORUZ. Eskiden tarayici bulunamazsa
' widget dosyadan (file://) aciliyordu; ama Firestore girisi file:// altinda
' calismiyor, bu da kullanicinin hicbir sey anlamayacagi bir "client is
' offline" hatasiyla sonuclaniyordu. Simdi durumu acikca bildirip duruyoruz.
If chosenExe = "" Then
    MsgBox "Desteklenen bir tarayici (Google Chrome, Microsoft Edge veya Brave) bulunamadi." & vbCrLf & vbCrLf & _
           "YKS Sayac'in dogru calismasi icin bu tarayicilardan birinin kurulu olmasi gerekiyor." & vbCrLf & _
           "(Not: Firefox bu widget ile uyumlu degildir.)" & vbCrLf & vbCrLf & _
           "Bir tarayici kurduktan sonra bu kisayolu tekrar calistirabilirsin.", _
           16, "YKS Sayac - Tarayici Bulunamadi"
    WScript.Quit
End If

Dim cmd
cmd = Q & chosenExe & Q & " --app=" & Q & fileUrl & Q & _
      " --window-size=300,470" & _
      " --user-data-dir=" & Q & widgetProfileDir & Q

If DEBUG_MODE Then
    MsgBox "Calistirilacak tam komut:" & vbCrLf & vbCrLf & cmd, 64, "YKS Sayac - Komut"
End If

objShell.Run cmd, 1, False

' Widget penceresini bulup "her zaman ustte" yapan gizli bir
' PowerShell yardimci betigi calistir. Pencere basliginda "YKS"
' gectigi icin onu ana Brave penceresinden ayirt edebiliyor.
Dim psPath, tsPs
psPath = scriptDir & "\_yks_topmost.ps1"
Set tsPs = objFSO.CreateTextFile(psPath, True)
tsPs.WriteLine "$deadline = (Get-Date).AddSeconds(15)"
tsPs.WriteLine "$hwnd = [IntPtr]::Zero"
tsPs.WriteLine "while ((Get-Date) -lt $deadline -and $hwnd -eq [IntPtr]::Zero) {"
tsPs.WriteLine "  Start-Sleep -Milliseconds 400"
tsPs.WriteLine "  $p = Get-Process -Name brave,msedge,chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*YKS*' }"
tsPs.WriteLine "  if ($p) { $hwnd = ($p | Select-Object -First 1).MainWindowHandle }"
tsPs.WriteLine "}"
tsPs.WriteLine "if ($hwnd -ne [IntPtr]::Zero) {"
tsPs.WriteLine "  Add-Type -Name Win32 -Namespace YksSayac -MemberDefinition '[DllImport(""user32.dll"")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);'"
tsPs.WriteLine "  [YksSayac.Win32]::SetWindowPos($hwnd, [IntPtr](-1), 0, 0, 0, 0, 0x0001 -bor 0x0002)"
tsPs.WriteLine "}"
tsPs.Close

objShell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Q & psPath & Q, 0, False

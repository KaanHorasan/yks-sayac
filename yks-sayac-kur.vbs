' YKS Sayac - Kurulum Betigi
' ------------------------------------------------------------
' Bu dosyayi, ZIP'ten cikan diger tum YKS Sayac dosyalariyla
' (yks-sayac.html, yks-sayac.css ve tum yks-sayac-*.js dosyalari,
' yks-sayac-baslat.vbs, _yks_server.ps1, _yks_prefs.ps1,
' istersen yks-sayac.ico) AYNI klasorde birakip cift tikla.
' Tek seferlik bir islemdir:
'   1) Dosyalari sabit bir klasore kopyalar
'   2) Masaustune (ve istersen Baslangic'a) bir kisayol olusturur
'   3) Istersen widget'i hemen baslatir
' (Yedekleme indirmelerinin dogru klasore sormadan kaydedilmesi
' artik otomatik: elle tarayici ayari yapmaya gerek yok.)

Dim objShell, objFSO, Q
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
Q = Chr(34)

Dim sourceDir, installDir, localAppData
sourceDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
localAppData = objShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
installDir = localAppData & "\YksSayac"

' --- 1) Gerekli dosyalarin hepsi burada mi kontrol et ---
Dim requiredFiles(23), missing, i
requiredFiles(0) = "yks-sayac.html"
requiredFiles(1) = "yks-sayac.css"
requiredFiles(2) = "yks-sayac-backup.js"
requiredFiles(3) = "yks-sayac-city-sprites.js"
requiredFiles(4) = "yks-sayac-city-walkers.js"
requiredFiles(5) = "yks-sayac-city.js"
requiredFiles(6) = "yks-sayac-cloud.js"
requiredFiles(7) = "yks-sayac-core.js"
requiredFiles(8) = "yks-sayac-errors.js"
requiredFiles(9) = "yks-sayac-exam.js"
requiredFiles(10) = "yks-sayac-focus.js"
requiredFiles(11) = "yks-sayac-images.js"
requiredFiles(12) = "yks-sayac-main.js"
requiredFiles(13) = "yks-sayac-notes.js"
requiredFiles(14) = "yks-sayac-plan.js"
requiredFiles(15) = "yks-sayac-study.js"
requiredFiles(16) = "yks-sayac-sync.js"
requiredFiles(17) = "yks-sayac-topics.js"
requiredFiles(18) = "yks-sayac-ui.js"
requiredFiles(19) = "yks-sayac-update.js"
requiredFiles(20) = "yks-sayac-widget.js"
requiredFiles(21) = "yks-sayac-baslat.vbs"
requiredFiles(22) = "_yks_server.ps1"
requiredFiles(23) = "_yks_prefs.ps1"

missing = ""
For i = 0 To UBound(requiredFiles)
    If objFSO.FileExists(sourceDir & "\" & requiredFiles(i)) = False Then
        missing = missing & "- " & requiredFiles(i) & vbCrLf
    End If
Next

If missing <> "" Then
    MsgBox "Kurulum tamamlanamadi, su dosya(lar) eksik:" & vbCrLf & vbCrLf & missing & vbCrLf & _
           "ZIP'ten cikan tum dosyalarin bu betikle ayni klasorde oldugundan emin ol.", _
           16, "YKS Sayac - Kurulum"
    WScript.Quit
End If

' --- 2) Kalici kurulum klasorunu olustur ve dosyalari kopyala ---
' (Bu betik daha sonra guncelleme icin de kullanilabilir: ustune yazar.)
If objFSO.FolderExists(installDir) = False Then
    objFSO.CreateFolder(installDir)
End If

On Error Resume Next
For i = 0 To UBound(requiredFiles)
    objFSO.CopyFile sourceDir & "\" & requiredFiles(i), installDir & "\" & requiredFiles(i), True
Next
If Err.Number <> 0 Then
    MsgBox "Dosyalar kopyalanirken bir sorun olustu (" & Err.Description & ")." & vbCrLf & _
           "YKS Sayac su an acik olabilir mi? Acikca kapatip tekrar dene.", 16, "YKS Sayac - Kurulum"
    Err.Clear
    On Error Goto 0
    WScript.Quit
End If
On Error Goto 0

' --- Ikon dosyasini kopyala (varsa) - eksik olsa da kurulumu bozmasin ---
Dim iconFile, iconInstallPath
iconFile = "yks-sayac.ico"
iconInstallPath = ""
If objFSO.FileExists(sourceDir & "\" & iconFile) Then
    On Error Resume Next
    objFSO.CopyFile sourceDir & "\" & iconFile, installDir & "\" & iconFile, True
    If Err.Number = 0 Then
        iconInstallPath = installDir & "\" & iconFile
    End If
    Err.Clear
    On Error Goto 0
End If
' --- 3) Widget profil klasorunu once burada olustur ---
' (yks-sayac-baslat.vbs bunu ilk acilista da olusturuyor, ama
' onceden hazir etmek zarar vermez.)
Dim widgetProfileDir
widgetProfileDir = localAppData & "\YksSayacWidgetProfile"
If objFSO.FolderExists(widgetProfileDir) = False Then
    objFSO.CreateFolder(widgetProfileDir)
End If

' --- 4) Masaustune kisayol olustur ---
Dim desktopPath, shortcutPath, shortcut
desktopPath = objShell.SpecialFolders("Desktop")
shortcutPath = desktopPath & "\YKS Sayac.lnk"
Set shortcut = objShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = installDir & "\yks-sayac-baslat.vbs"
shortcut.WorkingDirectory = installDir
shortcut.Description = "YKS Sayac'i baslat"
If iconInstallPath <> "" Then
    shortcut.IconLocation = iconInstallPath & ",0"
End If
shortcut.Save

' --- 5) (Istege bagli) Windows acilisinda otomatik baslat ---
Dim autoStartAnswer
autoStartAnswer = MsgBox("Bilgisayar acildiginda YKS Sayac otomatik baslasin mi?" & vbCrLf & vbCrLf & _
                          "(Istersen bunu daha sonra da Baslangic klasorunden kaldirabilirsin.)", _
                          vbQuestion + vbYesNo, "YKS Sayac - Otomatik Baslatma")
If autoStartAnswer = vbYes Then
    Dim startupPath, startupShortcut
    startupPath = objShell.SpecialFolders("Startup") & "\YKS Sayac.lnk"
    Set startupShortcut = objShell.CreateShortcut(startupPath)
    startupShortcut.TargetPath = installDir & "\yks-sayac-baslat.vbs"
    startupShortcut.WorkingDirectory = installDir
    startupShortcut.Description = "YKS Sayac'i baslat"
    If iconInstallPath <> "" Then
        startupShortcut.IconLocation = iconInstallPath & ",0"
    End If
    startupShortcut.Save
End If

' --- 6) Kurulumu bitir, istersen simdi ac ---
Dim launchAnswer
launchAnswer = MsgBox("Kurulum tamamlandi!" & vbCrLf & vbCrLf & _
                       "Masaustunde 'YKS Sayac' kisayolu olusturuldu; bundan sonra uygulamayi " & _
                       "acmak icin sadece bu kisayola cift tiklaman yeterli." & vbCrLf & vbCrLf & _
                       "Simdi acilsin mi?", vbQuestion + vbYesNo, "YKS Sayac - Kurulum Tamamlandi")

If launchAnswer = vbYes Then
    objShell.Run "wscript.exe " & Q & installDir & "\yks-sayac-baslat.vbs" & Q, 1, False
End If

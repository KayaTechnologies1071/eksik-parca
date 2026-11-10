$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

Write-Host "=== 1. Vite Uretim Paketi Derleniyor (npm run build) ===" -ForegroundColor Cyan
npm run build

if (-not (Test-Path "android")) {
  Write-Host "=== 2. Capacitor Android Projesi Olusturuluyor ===" -ForegroundColor Cyan
  npx cap add android
}

Write-Host "=== 3. Capacitor Varliklari Senkronize Ediliyor ===" -ForegroundColor Cyan
$capTemplateJs = "node_modules\@capacitor\cli\dist\util\template.js"
if (Test-Path $capTemplateJs) {
  $tplContent = Get-Content $capTemplateJs -Raw
  if ($tplContent -match 'tar_1\.default\.extract\(' -and $tplContent -notmatch 'extractFn') {
    $tplContent = $tplContent -replace 'await tar_1\.default\.extract\(\{ file: src, cwd: dir \}\);', 'const extractFn = (tar_1.default && tar_1.default.extract) ? tar_1.default.extract : tar_1.extract; await extractFn({ file: src, cwd: dir });'
    Set-Content -Path $capTemplateJs -Value $tplContent -Encoding UTF8
  }
}
npx cap sync android

# Android SDK yolunu local.properties dosyasina yaz
$sdkDir = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdkDir)) {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $sdkDir = $env:ANDROID_HOME
  }
}
$escapedSdk = $sdkDir.Replace('\', '\\').Replace(':', '\:')
Set-Content -Path "android\local.properties" -Value "sdk.dir=$escapedSdk" -Encoding ASCII

# AndroidManifest.xml icine VIBRATE izni ve usesCleartextTraffic="true" (LAN + HTTPS destegi) ekle
$manifestPath = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifestPath) {
  $manifest = Get-Content $manifestPath -Raw
  if ($manifest -notmatch 'usesCleartextTraffic') {
    $manifest = $manifest -replace '<application', '<application android:usesCleartextTraffic="true"'
  }
  if ($manifest -notmatch 'android.permission.VIBRATE') {
    $manifest = $manifest -replace '</manifest>', "    <uses-permission android:name=`"android.permission.VIBRATE`" />`n</manifest>"
  }
  Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8
}

# JDK secimi (JDK 17 veya Android Studio JBR / Sistem JDK 21)
if (Test-Path "C:\Program Files\Android\Android Studio\jbr") {
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
} elseif (Test-Path "C:\Program Files\Microsoft\jdk-17.0.13.11-hotspot") {
  $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.13.11-hotspot"
}

Write-Host "=== 4. Gradle ile Android APK Derleniyor (assembleDebug) ===" -ForegroundColor Cyan
Push-Location "android"
try {
  .\gradlew.bat assembleDebug --no-daemon
} finally {
  Pop-Location
}

$apkSource = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkSource) {
  New-Item -ItemType Directory -Force -Path "release" | Out-Null
  $apkDest = "release\EksikParca-v2.0.apk"
  Copy-Item $apkSource $apkDest -Force
  $sizeMb = [math]::Round((Get-Item $apkDest).Length / 1MB, 2)
  Write-Host "================================================================" -ForegroundColor Green
  Write-Host "ANDROID APK BASARIYLA OLUSTURULDU!" -ForegroundColor Green
  Write-Host "Dosya Yolu : $(Resolve-Path $apkDest)" -ForegroundColor Yellow
  Write-Host "Paket Boyutu: $sizeMb MB (SLA Hedefi: < 25 MB)" -ForegroundColor Yellow
  Write-Host "================================================================" -ForegroundColor Green
} else {
  throw "APK cikti dosyasi bulunamadi!"
}

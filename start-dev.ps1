# PowerShell 스크립트: 개발 환경 시작
Write-Host "개발 환경 시작 중..." -ForegroundColor Cyan

# 현재 디렉토리를 확인
$currentDir = Get-Location
Write-Host "현재 디렉토리: $currentDir" -ForegroundColor Gray

# Next.js 서버 시작
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run server" -PassThru -NoNewWindow
Write-Host "Next.js 서버 시작됨 (PID: $($serverProcess.Id))" -ForegroundColor Green

# 5초 대기
Write-Host "Next.js 서버 초기화 중... 5초 대기" -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Electron 앱 시작
$electronProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run electron" -PassThru -NoNewWindow
Write-Host "Electron 앱 시작됨 (PID: $($electronProcess.Id))" -ForegroundColor Green

Write-Host "개발 환경이 시작되었습니다." -ForegroundColor Cyan
Write-Host "서버와 Electron이 별도의 창에서 실행 중입니다." -ForegroundColor Cyan
Write-Host "종료하려면 두 창을 모두 닫으세요." -ForegroundColor DarkYellow

# 사용자가 Ctrl+C를 누를 때 프로세스 종료
try {
    Wait-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
}
catch {
    Write-Host "스크립트가 중단되었습니다." -ForegroundColor Red
}
finally {
    # 프로세스 종료 시도
    if (-not $serverProcess.HasExited) {
        Write-Host "Next.js 서버 종료 중..." -ForegroundColor Yellow
        try { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
    
    if (-not $electronProcess.HasExited) {
        Write-Host "Electron 앱 종료 중..." -ForegroundColor Yellow
        try { Stop-Process -Id $electronProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
    
    Write-Host "모든 프로세스가 종료되었습니다." -ForegroundColor Green
} 
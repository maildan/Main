# Script for thoroughly cleaning node_modules directory on Windows
# Must be run in PowerShell

Write-Host "🧹 Starting thorough node_modules cleanup..." -ForegroundColor Green

$projectPath = $PSScriptRoot
$nodeModulesPath = Join-Path $projectPath "node_modules"

# 1. Check if node_modules exists
if (Test-Path $nodeModulesPath) {
    Write-Host "📂 Found node_modules directory, preparing to remove..." -ForegroundColor Yellow
    
    # 2. Stop any processes that might be locking files
    Write-Host "🔒 Attempting to stop any processes locking npm files..." -ForegroundColor Yellow
    try {
        Stop-Process -Name "node" -ErrorAction SilentlyContinue
        Stop-Process -Name "npm" -ErrorAction SilentlyContinue
    } catch {
        Write-Host "⚠️ Could not stop some processes. If deletion fails, close your editor/terminal and try again." -ForegroundColor Yellow
    }
    
    # 3. Remove read-only attributes
    Write-Host "🔓 Removing read-only attributes..." -ForegroundColor Yellow
    try {
        attrib -r "$nodeModulesPath\*.*" /s /d
    } catch {
        Write-Host "⚠️ Failed to remove read-only attributes: $_" -ForegroundColor Yellow
    }

    # 4. First deletion attempt - PowerShell native
    Write-Host "🗑️ Attempting to delete node_modules (Method 1: PowerShell)..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $nodeModulesPath -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Successfully deleted node_modules!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ PowerShell deletion failed, trying alternative method..." -ForegroundColor Yellow
        
        # 5. Second deletion attempt - Using cmd's RD command (more powerful)
        Write-Host "🗑️ Attempting to delete node_modules (Method 2: CMD)..." -ForegroundColor Yellow
        try {
            cmd /c "rd /s /q `"$nodeModulesPath`""
            Start-Sleep -Seconds 2
            
            if (-not (Test-Path $nodeModulesPath)) {
                Write-Host "✅ Successfully deleted node_modules with CMD!" -ForegroundColor Green
            } else {
                # 6. Third deletion attempt - Using robocopy trick (empty out directory then remove)
                Write-Host "🗑️ Attempting to delete node_modules (Method 3: Robocopy)..." -ForegroundColor Yellow
                
                $emptyDir = Join-Path $env:TEMP "empty_dir"
                if (-not (Test-Path $emptyDir)) {
                    New-Item -ItemType Directory -Path $emptyDir | Out-Null
                }
                
                robocopy $emptyDir $nodeModulesPath /MIR /NFL /NDL /NJH /NJS /NC /NS /NP > $null
                Remove-Item -Path $nodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
                
                if (-not (Test-Path $nodeModulesPath)) {
                    Write-Host "✅ Successfully deleted node_modules with Robocopy!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Failed to delete node_modules using all methods." -ForegroundColor Red
                    Write-Host "Please try closing all applications and running this script with administrator privileges." -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "❌ Failed to delete node_modules: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✅ No node_modules directory found. Already clean!" -ForegroundColor Green
}

# 7. Delete package-lock.json
$packageLockPath = Join-Path $projectPath "package-lock.json"
if (Test-Path $packageLockPath) {
    Write-Host "🗑️ Removing package-lock.json..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $packageLockPath -Force
        Write-Host "✅ Successfully removed package-lock.json!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to delete package-lock.json: $_" -ForegroundColor Red
    }
}

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm cache clean --force" -ForegroundColor White
Write-Host "2. Run: npm install --no-package-lock --legacy-peer-deps" -ForegroundColor White
Write-Host "`n💡 If you're working with Google Drive, consider pausing sync before running npm commands" -ForegroundColor Cyan

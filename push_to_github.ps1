<#
.SYNOPSIS
    One-click script to push project repositories from the root workspace to GitHub.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "College Project - Push to GitHub"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         College Project - Push to GitHub Hub            " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select what you want to push to GitHub:" -ForegroundColor White
Write-Host " [1] Main LMS Application (EduConnect-LMS-Production) [RECOMMENDED]" -ForegroundColor Green
Write-Host " [2] Research & Experiments (EduConnect-LMS-Experimental)" -ForegroundColor Cyan
Write-Host " [3] Entire Workspace (Root Project)" -ForegroundColor Magenta
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or 3) [Default: 1]"
if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "1"
}

function Push-Repo($repoPath, $repoName) {
    Write-Host "`n---> Entering $repoName ($repoPath)..." -ForegroundColor Cyan
    Set-Location -Path $repoPath

    if (-not (Test-Path "$repoPath\.git")) {
        Write-Host "No Git repository found in $repoPath." -ForegroundColor Yellow
        $initChoice = Read-Host "Do you want to initialize a new git repository here? (y/N)"
        if ($initChoice -match "^[yY]") {
            git init
            $remoteUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/YourUsername/Repo.git)"
            if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
                git remote add origin $remoteUrl
                git branch -M main
            }
        } else {
            return
        }
    }

    $currentBranch = (git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
        $currentBranch = "main"
        git checkout -b main 2>$null
    }
    $remoteUrl = (git remote get-url origin 2>$null)

    Write-Host "  Branch: $currentBranch" -ForegroundColor Yellow
    Write-Host "  Remote: $remoteUrl" -ForegroundColor Yellow
    Write-Host ""

    $status = git status --short
    if (-not $status) {
        Write-Host "[INFO] No local file changes to commit." -ForegroundColor Green
        $pushExisting = Read-Host "Push existing commits to GitHub origin/$currentBranch? (y/N)"
        if ($pushExisting -match "^[yY]") {
            git push origin $currentBranch
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n[SUCCESS] Everything is up-to-date on GitHub!" -ForegroundColor Green
            } else {
                Write-Host "`n[WARNING] Push failed. Check your GitHub authentication or remote permissions." -ForegroundColor Red
            }
        }
        return
    }

    Write-Host "Detected modifications:" -ForegroundColor Magenta
    git status --short
    Write-Host ""

    $defaultMsg = "Update $repoName: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $commitMsg = Read-Host "Enter commit message (Press Enter for '$defaultMsg')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = $defaultMsg
    }

    Write-Host "Staging files..." -ForegroundColor Cyan
    git add .

    Write-Host "Committing changes..." -ForegroundColor Cyan
    git commit -m "$commitMsg"

    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push origin $currentBranch

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] $repoName pushed to GitHub successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n[NOTE] If this is your first push to this remote branch, running:" -ForegroundColor Yellow
        Write-Host "  git push -u origin $currentBranch" -ForegroundColor Yellow
        git push -u origin $currentBranch
    }
}

switch ($choice) {
    "1" {
        $target = Join-Path $PSScriptRoot "EduConnect-LMS-Production"
        Push-Repo $target "EduConnect LMS Production"
    }
    "2" {
        $target = Join-Path $PSScriptRoot "EduConnect-LMS-Experimental"
        Push-Repo $target "EduConnect LMS Experimental"
    }
    "3" {
        Push-Repo $PSScriptRoot "Entire College Project"
    }
    Default {
        Write-Host "Invalid selection. Exiting." -ForegroundColor Red
    }
}

Set-Location -Path $PSScriptRoot

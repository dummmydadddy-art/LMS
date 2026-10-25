<#
.SYNOPSIS
    One-click script to stage, commit, and push LMS project updates to GitHub.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "EduConnect LMS - Push to GitHub"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       EduConnect LMS - Git Sync & Push to GitHub         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git is not installed or not in your system PATH." -ForegroundColor Red
    Write-Host "Please install Git for Windows from https://git-scm.com/ and restart VS Code." -ForegroundColor Yellow
    exit 1
}

# Ensure we are in a git repository
$isGitRepo = git rev-parse --is-inside-work-tree 2>$null
if ($isGitRepo -ne "true") {
    Write-Host "[ERROR] Current directory is not a Git repository!" -ForegroundColor Red
    exit 1
}

$currentBranch = (git branch --show-current).Trim()
$remoteUrl = (git remote get-url origin 2>$null)

Write-Host "[Repository Status]" -ForegroundColor Green
Write-Host "  Current Branch : " -NoNewline; Write-Host "$currentBranch" -ForegroundColor Yellow
Write-Host "  Remote URL     : " -NoNewline; Write-Host "$remoteUrl" -ForegroundColor Yellow
Write-Host ""

# Check status
Write-Host "Checking for file modifications..." -ForegroundColor Cyan
$status = git status --short

if (-not $status) {
    Write-Host "[INFO] Working tree is clean. No local modifications to commit." -ForegroundColor Green
    Write-Host ""
    $pushChoice = Read-Host "Do you want to attempt pushing existing commits to GitHub now? (y/N)"
    if ($pushChoice -match "^[yY]") {
        Write-Host "Pushing to origin $currentBranch..." -ForegroundColor Cyan
        git push origin $currentBranch
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n[SUCCESS] Everything is up-to-date on GitHub!" -ForegroundColor Green
        } else {
            Write-Host "`n[WARNING] Push failed. Please check credentials or network connection." -ForegroundColor Red
        }
    }
    exit 0
}

Write-Host "Modified/Untracked files detected:" -ForegroundColor Magenta
git status --short
Write-Host ""

# Prompt for commit message
$defaultMsg = "Update project: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$commitMsg = Read-Host "Enter commit message (Press Enter for '$defaultMsg')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = $defaultMsg
}

Write-Host "`n1. Staging files (git add .)..." -ForegroundColor Cyan
git add .

Write-Host "2. Committing changes..." -ForegroundColor Cyan
git commit -m "$commitMsg"

Write-Host "3. Pushing to GitHub (origin $currentBranch)..." -ForegroundColor Cyan
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] All files successfully pushed to GitHub!       " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARNING] Git push encountered an error." -ForegroundColor Red
    Write-Host "If this is your first push or authentication is required:" -ForegroundColor Yellow
    Write-Host " - Ensure you are logged into GitHub in VS Code (Accounts icon bottom-left)." -ForegroundColor Yellow
    Write-Host " - Or run: git push -u origin $currentBranch" -ForegroundColor Yellow
}

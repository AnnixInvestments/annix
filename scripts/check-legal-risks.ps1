#!/usr/bin/env pwsh
# Legal risk detection for the Annix project (Windows)
# Scans staged/changed files for content that could create legal exposure

param(
    [ValidateSet("staged", "pushed", "all")]
    [string]$Mode = "staged"
)

$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$Errors = 0
$Warnings = 0

if ($Mode -eq "staged") {
    $files = git diff --cached --name-only --diff-filter=ACMR 2>$null | Where-Object { $_ -match '\.(ts|tsx|js|jsx|json|html|md)$' }
} elseif ($Mode -eq "pushed") {
    $remoteHead = git rev-parse origin/main 2>$null
    if ($remoteHead) {
        $files = git diff --name-only "$remoteHead..HEAD" --diff-filter=ACMR 2>$null | Where-Object { $_ -match '\.(ts|tsx|js|jsx|json|html|md)$' }
    } else {
        $files = git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.html' '*.md'
    }
} else {
    $files = git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.html' '*.md'
}

$files = $files | Where-Object {
    $_ -and
    $_ -notmatch 'node_modules/' -and
    $_ -notmatch 'dist/' -and
    $_ -notmatch '\.next/' -and
    $_ -notmatch 'check-legal-risks' -and
    $_ -notmatch 'CLAUDE\.md'
}

if (-not $files -or $files.Count -eq 0) {
    exit 0
}

Write-Host "Scanning for legal risks..." -ForegroundColor Cyan

function Test-Pattern {
    param(
        [string]$Label,
        [string]$Severity,
        [string]$Pattern,
        [string]$ExcludePattern = ""
    )

    $allMatches = @()
    foreach ($f in $files) {
        $fullPath = Join-Path $RootDir $f
        if (-not (Test-Path $fullPath)) { continue }
        $lineNum = 0
        foreach ($line in Get-Content $fullPath -ErrorAction SilentlyContinue) {
            $lineNum++
            if ($line -match $Pattern) {
                if ($ExcludePattern -and $line -match $ExcludePattern) { continue }
                $allMatches += "${f}:${lineNum}: $($line.Trim())"
            }
        }
    }

    if ($allMatches.Count -gt 0) {
        if ($Severity -eq "error") {
            Write-Host "ERROR: $Label" -ForegroundColor Red
            $script:Errors++
        } else {
            Write-Host "WARNING: $Label" -ForegroundColor Yellow
            $script:Warnings++
        }
        $allMatches | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
        if ($allMatches.Count -gt 10) {
            Write-Host "  ... and $($allMatches.Count - 10) more"
        }
        Write-Host ""
    }
}

Test-Pattern `
    -Label "Fake .co.za email addresses - use @example.com instead (RFC 2606)" `
    -Severity "error" `
    -Pattern '"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.co\.za"' `
    -ExcludePattern '(\.env|annix\.co\.za|sahrc\.org\.za)'

Test-Pattern `
    -Label "Realistic South African phone numbers in test/example data - use +27 11 000 xxxx" `
    -Severity "warning" `
    -Pattern '"\+27 [0-9]{2} [1-9][0-9]{2} [0-9]{4}"' `
    -ExcludePattern '\.env'

Test-Pattern `
    -Label "Hardcoded external URLs to standards bodies (ASTM, ISO, AWWA, etc.)" `
    -Severity "warning" `
    -Pattern 'https?://(www\.)?(astm\.org|iso\.org|awwa\.org|asme\.org|api\.org|nace\.org|en-standard\.eu|plasticpipe\.org)'

Test-Pattern `
    -Label "Direct Anthropic/Claude API usage - must use Gemini via AiChatService" `
    -Severity "error" `
    -Pattern '(new Anthropic|import.*from.*@anthropic|ClaudeChatProvider|providerOverride.*claude)' `
    -ExcludePattern '(node_modules|ai-providers[\\/]claude-chat\.provider|ai-providers[\\/]ai-chat\.service|ai-providers[\\/]index)'

Test-Pattern `
    -Label "Potential secret or credential in source code" `
    -Severity "error" `
    -Pattern '(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{48}|ghp_[a-zA-Z0-9]{36})'

Test-Pattern `
    -Label "Hardcoded localhost URL that may need environment variable" `
    -Severity "warning" `
    -Pattern 'https?://localhost:[0-9]+' `
    -ExcludePattern '(\.env|\.spec\.|\.test\.|check-legal|\.md|\.claude-swarm|config\.json)'

if ($Errors -gt 0) {
    Write-Host "Found $Errors error(s) and $Warnings warning(s). Fix errors before pushing." -ForegroundColor Red
    exit 1
} elseif ($Warnings -gt 0) {
    Write-Host "Found $Warnings warning(s). Review before pushing." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "No legal risks detected." -ForegroundColor Green
    exit 0
}

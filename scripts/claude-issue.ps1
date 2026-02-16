param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$IssueNumber,

    [Parameter(Position=1)]
    [string]$Prompt = ""
)

$Repo = "AnnixInvestments/annix"
$Workflow = "claude.yml"

if ($Prompt -ne "") {
    gh workflow run $Workflow --repo $Repo -f issue_number=$IssueNumber -f prompt=$Prompt
} else {
    gh workflow run $Workflow --repo $Repo -f issue_number=$IssueNumber
}

Write-Host "Triggered Claude on issue #$IssueNumber"
Write-Host "Watch progress: https://github.com/$Repo/actions"

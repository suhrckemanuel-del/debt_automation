[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^P\d{2}$")]
    [string]$ParticipantId,

    [datetime]$SessionDate = (Get-Date)
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $repoRoot "docs\phase-1\session_evidence_template.md"
$sessionsPath = Join-Path $repoRoot "docs\phase-1\sessions"
$outputPath = Join-Path $sessionsPath ("session-{0}.md" -f $ParticipantId)

if (-not (Test-Path -LiteralPath $templatePath)) {
    throw "Session evidence template not found: $templatePath"
}

if (-not (Test-Path -LiteralPath $sessionsPath)) {
    throw "Sessions directory not found: $sessionsPath"
}

if (Test-Path -LiteralPath $outputPath) {
    throw "Session record already exists: $outputPath"
}

$content = Get-Content -Raw -Encoding utf8 -LiteralPath $templatePath
$content = $content.Replace(
    "- ``participant_id``:",
    "- ``participant_id``: $ParticipantId"
)
$content = $content.Replace(
    "- ``session_date``:",
    "- ``session_date``: $($SessionDate.ToString('yyyy-MM-dd'))"
)

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $content, $utf8WithoutBom)

Write-Output $outputPath

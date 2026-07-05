$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $repoRoot "scripts\Test-Phase1.ps1"
$citationValidator = Join-Path $repoRoot "scripts\Test-ReviewerPackCitations.ps1"
$sessionCreator = Join-Path $repoRoot "scripts\New-Phase1Session.ps1"
$fixture = Join-Path $PSScriptRoot "fixtures\evidence_log_five_sessions.csv"

$json = & $validator -EvidenceLog $fixture -Json
if ($LASTEXITCODE -ne 0) {
    throw "Phase -1 validator returned exit code $LASTEXITCODE."
}

$result = $json | ConvertFrom-Json

$assertions = @(
    @("structural errors", $result.repository.structural_errors, 0),
    @("outreach questions", $result.repository.outreach_questions, 10),
    @("reviewer-pack questions", $result.repository.reviewer_pack_questions, 3),
    @("agent packets", $result.repository.agent_packets, 7),
    @("baseline leaks", $result.repository.baseline_leaks, 0),
    @("serious sessions", $result.evidence.serious_sessions, 5),
    @("recurring pain signals", $result.evidence.recurring_pain_yes, 3),
    @("specific workarounds", $result.evidence.specific_workaround_yes, 2),
    @("costly next steps", $result.evidence.costly_next_steps, 2),
    @("decision review ready", $result.evidence.decision_review_ready, $true)
)

foreach ($assertion in $assertions) {
    $label = $assertion[0]
    $actual = $assertion[1]
    $expected = $assertion[2]
    if ($actual -ne $expected) {
        throw "Assertion failed for ${label}: expected '$expected', got '$actual'."
    }
}

$notReadyJson = & $validator -RequireDecisionReady -Json
if ($LASTEXITCODE -ne 2) {
    throw "Expected not-ready validation to exit 2; got $LASTEXITCODE."
}

$notReady = $notReadyJson | ConvertFrom-Json
if ($notReady.evidence.decision_review_ready -ne $false) {
    throw "Empty local evidence state must not be decision-ready."
}

$citationJson = & $citationValidator -Json
if ($LASTEXITCODE -ne 0) {
    throw "Citation validator returned exit code $LASTEXITCODE."
}

$citationResult = $citationJson | ConvertFrom-Json
if ($citationResult.summary.manifest_entries -ne 17) {
    throw "Expected 17 citation manifest entries; got $($citationResult.summary.manifest_entries)."
}
if ($citationResult.summary.passing_entries -ne 17) {
    throw "Expected all citation entries to pass; got $($citationResult.summary.passing_entries)."
}

$sessionsRoot = (Resolve-Path -LiteralPath (Join-Path $repoRoot "docs\phase-1\sessions")).Path
$testSessionPath = Join-Path $sessionsRoot "session-P99.md"
if (Test-Path -LiteralPath $testSessionPath) {
    throw "Test session path already exists: $testSessionPath"
}

try {
    $createdSession = & $sessionCreator -ParticipantId P99 -SessionDate "2026-07-02"
    $resolvedSession = (Resolve-Path -LiteralPath $createdSession).Path
    if (-not $resolvedSession.StartsWith($sessionsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Session helper created a file outside the sessions directory."
    }
    $sessionContent = Get-Content -Raw -Encoding utf8 -LiteralPath $resolvedSession
    if (-not $sessionContent.Contains("- ``participant_id``: P99")) {
        throw "Session helper did not populate participant ID."
    }
    if (-not $sessionContent.Contains("- ``session_date``: 2026-07-02")) {
        throw "Session helper did not populate session date."
    }
}
finally {
    if (Test-Path -LiteralPath $testSessionPath) {
        $resolvedCleanup = (Resolve-Path -LiteralPath $testSessionPath).Path
        if (-not $resolvedCleanup.StartsWith($sessionsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clean up a test file outside the sessions directory."
        }
        Remove-Item -LiteralPath $resolvedCleanup -Force
    }
}

Write-Output "Phase -1 validator tests passed: $($assertions.Count + 6) assertions."
exit 0

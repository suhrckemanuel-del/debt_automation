[CmdletBinding()]
param(
    [string]$EvidenceLog,
    [switch]$RequireDecisionReady,
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $EvidenceLog) {
    $EvidenceLog = Join-Path $repoRoot "docs\phase-1\evidence_log.csv"
}

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Resolve-RepoPath {
    param([string]$RelativePath)
    return Join-Path $repoRoot $RelativePath
}

function Normalize-Value {
    param($Value)
    if ($null -eq $Value) {
        return ""
    }
    return $Value.ToString().Trim().ToLowerInvariant()
}

function Is-Yes {
    param($Value)
    $normalized = Normalize-Value $Value
    return $normalized -in @("yes", "true", "1")
}

$requiredFiles = @(
    "README.md",
    "AGENTS.md",
    "docs\phase-1\README.md",
    "docs\phase-1\baseline_task.md",
    "docs\phase-1\recruitment_plan.md",
    "docs\phase-1\outreach\P01_brief.md",
    "docs\phase-1\three_question_reviewer_pack.md",
    "docs\phase-1\session_script.md",
    "docs\phase-1\session_evidence_template.md",
    "docs\phase-1\evidence_log_template.csv",
    "docs\phase-1\outreach_tracker_template.csv",
    "docs\phase-1\decision_record.md",
    "docs\phase-1\trust_review.md",
    "docs\phase-1\contrarian_review.md",
    "docs\quality\citation_manifest.json",
    "docs\quality\phase1_acceptance_matrix.md",
    "docs\implementation\architecture_decisions.md",
    "docs\implementation\phase0_phase1_backlog.md",
    "scripts\Test-ReviewerPackCitations.ps1",
    "scripts\New-Phase1Session.ps1"
)

foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Resolve-RepoPath $relativePath))) {
        $errors.Add("Missing required file: $relativePath")
    }
}

$outreachPath = Resolve-RepoPath "docs\phase-1\outreach_questions.md"
$reviewerPackPath = Resolve-RepoPath "docs\phase-1\three_question_reviewer_pack.md"
$baselinePath = Resolve-RepoPath "docs\phase-1\baseline_task.md"
$corpusPath = Resolve-RepoPath "docs\phase-1\synthetic-corpus"
$packetPath = Resolve-RepoPath "docs\phase-1\agent-packets"
$decisionPath = Resolve-RepoPath "docs\phase-1\decision_record.md"

$outreachQuestionCount = 0
if (Test-Path -LiteralPath $outreachPath) {
    $outreachQuestionCount = @(
        Select-String -Encoding utf8 -LiteralPath $outreachPath -Pattern "^\d+\. "
    ).Count
    if ($outreachQuestionCount -ne 10) {
        $errors.Add("Expected 10 outreach questions; found $outreachQuestionCount.")
    }
}

$reviewerPackQuestionCount = 0
if (Test-Path -LiteralPath $reviewerPackPath) {
    $reviewerPackQuestionCount = @(
        Select-String -Encoding utf8 -LiteralPath $reviewerPackPath -Pattern "^## [123]\. "
    ).Count
    if ($reviewerPackQuestionCount -ne 3) {
        $errors.Add("Expected 3 reviewer-pack questions; found $reviewerPackQuestionCount.")
    }
}

$agentPacketCount = 0
if (Test-Path -LiteralPath $packetPath) {
    $agentPacketCount = @(
        Get-ChildItem -LiteralPath $packetPath -Filter "*.md" |
            Where-Object { $_.Name -ne "README.md" }
    ).Count
    if ($agentPacketCount -ne 7) {
        $errors.Add("Expected 7 bounded agent packets; found $agentPacketCount.")
    }
}

$syntheticDisclaimerCount = 0
if (Test-Path -LiteralPath $corpusPath) {
    $corpusFiles = @(Get-ChildItem -LiteralPath $corpusPath -Filter "*.md")
    foreach ($file in $corpusFiles) {
        $content = Get-Content -Raw -Encoding utf8 -LiteralPath $file.FullName
        if ($content.Contains("Synthetic training material only")) {
            $syntheticDisclaimerCount++
        }
        else {
            $errors.Add("Synthetic disclaimer missing from $($file.Name).")
        }
    }
    if ($corpusFiles.Count -ne 3) {
        $errors.Add("Expected exactly 3 Phase -1 source documents; found $($corpusFiles.Count).")
    }
}

$baselineLeakTerms = @(
    "65.0%",
    "70.0%",
    "72.0%",
    "30 September 2026",
    "current contractual LTV threshold",
    "Human legal review is required"
)
$baselineLeaks = New-Object System.Collections.Generic.List[string]
if (Test-Path -LiteralPath $baselinePath) {
    $baselineContent = Get-Content -Raw -Encoding utf8 -LiteralPath $baselinePath
    foreach ($term in $baselineLeakTerms) {
        if ($baselineContent.Contains($term)) {
            $baselineLeaks.Add($term)
            $errors.Add("Baseline task leaks answer content: $term")
        }
    }
}

$brokenLinks = New-Object System.Collections.Generic.List[string]
$markdownFiles = @(
    Get-ChildItem -LiteralPath $repoRoot -Recurse -Filter "*.md" |
        Where-Object {
            # Generated, vendor, Git, and local persistence trees are not
            # repository-authored documentation and may contain Markdown-like
            # syntax that is not a local-link contract for this repository.
            $_.FullName -notmatch '[\\/](node_modules|\.next|\.git|\.data)[\\/]'
        }
)
foreach ($file in $markdownFiles) {
    $content = Get-Content -Raw -Encoding utf8 -LiteralPath $file.FullName
    $matches = [regex]::Matches($content, "\[[^\]]+\]\(([^)]+)\)")
    foreach ($match in $matches) {
        $target = $match.Groups[1].Value
        if ($target -match "^(https?://|#)") {
            continue
        }
        $resolvedTarget = Join-Path $file.DirectoryName $target
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            $brokenLinks.Add("$($file.FullName) -> $target")
            $errors.Add("Broken local Markdown link: $($file.Name) -> $target")
        }
    }
}

$criteriaFrozen = $false
$plannedDecisionDateSet = $false
if (Test-Path -LiteralPath $decisionPath) {
    $decisionContent = Get-Content -Raw -Encoding utf8 -LiteralPath $decisionPath
    $criteriaFrozen = $decisionContent -match '(?m)^- `criteria_frozen_on`: 2026-07-02\s*$'
    $plannedDecisionDateSet = $decisionContent -match '(?m)^- `planned_decision_date`:[ \t]+\S.*$'
    if (-not $criteriaFrozen) {
        $errors.Add("Phase -1 criteria freeze date is missing or changed.")
    }
    if (-not $plannedDecisionDateSet) {
        $warnings.Add("Planned decision date is not set.")
    }
}

$requiredEvidenceColumns = @(
    "participant_id",
    "session_date",
    "role_category",
    "serious_session",
    "recent_real_example",
    "maps_to_recurring_pain",
    "specific_workaround",
    "manual_task_minutes",
    "pack_review_minutes",
    "citation_trust_effect",
    "missing_info_trust_effect",
    "total_time_saving_meaningful",
    "preferred_output",
    "next_step",
    "existing_tools_sufficient",
    "confidentiality_system_blocker",
    "legal_compliance_blocker",
    "adapt_signal",
    "stop_signal"
)

$evidenceLogExists = Test-Path -LiteralPath $EvidenceLog
$rows = @()
$missingEvidenceColumns = New-Object System.Collections.Generic.List[string]

if ($evidenceLogExists) {
    $headerLine = Get-Content -Encoding utf8 -LiteralPath $EvidenceLog -TotalCount 1
    $headers = @($headerLine -split ",")
    foreach ($column in $requiredEvidenceColumns) {
        if ($column -notin $headers) {
            $missingEvidenceColumns.Add($column)
            $errors.Add("Evidence log missing column: $column")
        }
    }
    $rows = @(Import-Csv -Encoding utf8 -LiteralPath $EvidenceLog)
}
else {
    $warnings.Add("Local evidence log not initialized. Copy evidence_log_template.csv to evidence_log.csv before Session P01.")
}

$seriousRows = @($rows | Where-Object { Is-Yes $_.serious_session })
$recurringPainCount = @($seriousRows | Where-Object { Is-Yes $_.maps_to_recurring_pain }).Count
$workaroundCount = @($seriousRows | Where-Object { Is-Yes $_.specific_workaround }).Count
$nextStepCount = @(
    $seriousRows | Where-Object {
        (Normalize-Value $_.next_step) -in @(
            "follow_up_requested",
            "introduction_offered",
            "additional_scenario_requested",
            "sanitized_pilot_discussion"
        )
    }
).Count
$trustImprovedCount = @(
    $seriousRows | Where-Object {
        (Normalize-Value $_.citation_trust_effect) -eq "improved" -or
        (Normalize-Value $_.missing_info_trust_effect) -eq "improved"
    }
).Count
$meaningfulSavingCount = @(
    $seriousRows | Where-Object { Is-Yes $_.total_time_saving_meaningful }
).Count
$majorBlockerCount = @(
    $seriousRows | Where-Object {
        (Normalize-Value $_.confidentiality_system_blocker) -eq "major" -or
        (Normalize-Value $_.legal_compliance_blocker) -eq "major"
    }
).Count
$explicitStopSignalCount = @(
    $seriousRows | Where-Object {
        (Normalize-Value $_.stop_signal) -notin @("", "none", "no")
    }
).Count

$decisionReviewReady = $seriousRows.Count -ge 5
$statusMessage = if ($decisionReviewReady) {
    "Five serious sessions are present. Human proceed/adapt/stop review is required; this script does not make the decision."
}
else {
    "Demand gate is not ready: $($seriousRows.Count) of 5 serious sessions are present."
}

$result = [ordered]@{
    repository = [ordered]@{
        structural_errors = $errors.Count
        warnings = $warnings.Count
        outreach_questions = $outreachQuestionCount
        reviewer_pack_questions = $reviewerPackQuestionCount
        agent_packets = $agentPacketCount
        synthetic_disclaimers = $syntheticDisclaimerCount
        baseline_leaks = $baselineLeaks.Count
        broken_links = $brokenLinks.Count
        criteria_frozen = $criteriaFrozen
        planned_decision_date_set = $plannedDecisionDateSet
    }
    evidence = [ordered]@{
        log_exists = $evidenceLogExists
        records = $rows.Count
        serious_sessions = $seriousRows.Count
        recurring_pain_yes = $recurringPainCount
        specific_workaround_yes = $workaroundCount
        costly_next_steps = $nextStepCount
        trust_improved = $trustImprovedCount
        meaningful_total_saving = $meaningfulSavingCount
        major_blockers = $majorBlockerCount
        explicit_stop_signals = $explicitStopSignalCount
        decision_review_ready = $decisionReviewReady
    }
    status = $statusMessage
    errors = @($errors)
    warnings = @($warnings)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
}
else {
    [pscustomobject]$result.repository | Format-List
    [pscustomobject]$result.evidence | Format-List
    Write-Output $result.status
    foreach ($warning in $warnings) {
        Write-Warning $warning
    }
    foreach ($errorMessage in $errors) {
        Write-Error $errorMessage
    }
}

if ($errors.Count -gt 0) {
    exit 1
}

if ($RequireDecisionReady -and -not $decisionReviewReady) {
    exit 2
}

exit 0

[CmdletBinding()]
param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot "docs\quality\citation_manifest.json"
$packPath = Join-Path $repoRoot "docs\phase-1\three_question_reviewer_pack.md"

$errors = New-Object System.Collections.Generic.List[string]
$results = New-Object System.Collections.Generic.List[object]

if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Error "Citation manifest not found: $manifestPath"
    exit 1
}

if (-not (Test-Path -LiteralPath $packPath)) {
    Write-Error "Reviewer pack not found: $packPath"
    exit 1
}

$manifestJson = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath
$parsedManifest = ConvertFrom-Json -InputObject $manifestJson
$manifest = @($parsedManifest | ForEach-Object { $_ })
$packContent = Get-Content -Raw -Encoding utf8 -LiteralPath $packPath

foreach ($entry in $manifest) {
    $sourcePath = Join-Path $repoRoot $entry.source_path
    $sourceExists = Test-Path -LiteralPath $sourcePath
    $sourceContainsText = $false
    $packContainsText = $packContent.Contains($entry.exact_text)
    $locatorFound = $false
    $actualPage = $null
    $pageMatches = $false

    if (-not $sourceExists) {
        $errors.Add("$($entry.id): source file not found: $($entry.source_path)")
    }
    else {
        $sourceContent = Get-Content -Raw -Encoding utf8 -LiteralPath $sourcePath
        $sourceContainsText = $sourceContent.Contains($entry.exact_text)
        if (-not $sourceContainsText) {
            $errors.Add("$($entry.id): exact text not found in source.")
        }

        $lines = @(Get-Content -Encoding utf8 -LiteralPath $sourcePath)
        $locatorIndex = -1
        for ($index = 0; $index -lt $lines.Count; $index++) {
            if ($lines[$index] -match ("^##\s+" + [regex]::Escape($entry.locator) + "(\s|$)")) {
                $locatorIndex = $index
                break
            }
        }

        if ($locatorIndex -ge 0) {
            $locatorFound = $true
            for ($index = $locatorIndex; $index -ge 0; $index--) {
                if ($lines[$index] -match "^<!-- page: (\d+) -->$") {
                    $actualPage = [int]$Matches[1]
                    break
                }
            }
            $pageMatches = $actualPage -eq [int]$entry.page
            if (-not $pageMatches) {
                $errors.Add("$($entry.id): locator page mismatch; expected $($entry.page), got $actualPage.")
            }
        }
        else {
            $errors.Add("$($entry.id): locator not found: $($entry.locator)")
        }
    }

    if (-not $packContainsText) {
        $errors.Add("$($entry.id): exact source text is not quoted in the reviewer pack.")
    }

    $results.Add([pscustomobject]@{
        id = $entry.id
        source_exists = $sourceExists
        source_contains_text = $sourceContainsText
        pack_contains_text = $packContainsText
        locator_found = $locatorFound
        expected_page = [int]$entry.page
        actual_page = $actualPage
        page_matches = $pageMatches
    })
}

$summary = [ordered]@{
    manifest_entries = $manifest.Count
    passing_entries = @(
        $results | Where-Object {
            $_.source_exists -and
            $_.source_contains_text -and
            $_.pack_contains_text -and
            $_.locator_found -and
            $_.page_matches
        }
    ).Count
    errors = $errors.Count
}

if ($Json) {
    [ordered]@{
        summary = $summary
        results = @($results | ForEach-Object { $_ })
        errors = @($errors | ForEach-Object { $_ })
    } | ConvertTo-Json -Depth 5
}
else {
    [pscustomobject]$summary | Format-List
    foreach ($errorMessage in $errors) {
        Write-Error $errorMessage
    }
}

if ($errors.Count -gt 0) {
    exit 1
}

exit 0

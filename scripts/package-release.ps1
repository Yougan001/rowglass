param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'

$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Get-Content -Raw -LiteralPath (Join-Path $project 'package.json') | ConvertFrom-Json
$version = $manifest.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'A plain semantic version is required.' }
$release = Join-Path $project "work/release-$version"
$cliZip = Join-Path $release "rowglass-$version-cli.zip"
$webZip = Join-Path $release "rowglass-$version-web.zip"
$checksums = Join-Path $release 'SHA256SUMS.txt'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Write-Archive([string]$path, [System.Collections.IDictionary]$files) {
    $archive = [IO.Compression.ZipFile]::Open($path, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $files.GetEnumerator()) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $entry.Value, $entry.Key, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $archive.Dispose() }
}

if (-not $VerifyOnly) {
    foreach ($path in @($cliZip, $webZip, $checksums)) {
        if (Test-Path -LiteralPath $path) { throw "Refusing to overwrite $path. Use -VerifyOnly to inspect existing packages." }
    }
    $index = Join-Path $project 'dist/index.html'
    if (-not (Test-Path -LiteralPath $index)) { throw 'Build the web app first with ROWGLASS_BASE_PATH=./.' }
    if ((Get-Content -Raw -LiteralPath $index) -notmatch 'src="\./assets/') { throw 'The web build must use relative asset paths (ROWGLASS_BASE_PATH=./).' }
    New-Item -ItemType Directory -Path $release -Force | Out-Null
    $cliFiles = [ordered]@{
        'README.md' = Join-Path $project 'docs/cli-download.md'
        'LICENSE' = Join-Path $project 'LICENSE'
        'CHANGELOG.md' = Join-Path $project 'CHANGELOG.md'
    }
    foreach ($folder in @('cli', 'core', 'examples')) {
        foreach ($file in Get-ChildItem -LiteralPath (Join-Path $project $folder) -File -Recurse) {
            $relative = [IO.Path]::GetRelativePath($project, $file.FullName).Replace('\', '/')
            $cliFiles[$relative] = $file.FullName
        }
    }
    $webFiles = [ordered]@{
        'README.md' = Join-Path $project 'docs/web-download.md'
        'LICENSE' = Join-Path $project 'LICENSE'
        'THIRD_PARTY_NOTICES.md' = Join-Path $project 'THIRD_PARTY_NOTICES.md'
        'CHANGELOG.md' = Join-Path $project 'CHANGELOG.md'
    }
    $dist = Join-Path $project 'dist'
    foreach ($file in Get-ChildItem -LiteralPath $dist -File -Recurse) {
        $relative = [IO.Path]::GetRelativePath($dist, $file.FullName).Replace('\', '/')
        if ($relative.EndsWith('.map')) { throw 'Do not distribute an unreviewed source map.' }
        $webFiles[$relative] = $file.FullName
    }
    Push-Location $project
    try {
        $runtimePackages = @(& npm ls --omit=dev --all --parseable)
        if ($LASTEXITCODE -ne 0) { throw 'Install the locked dependencies before packaging.' }
    } finally { Pop-Location }
    $licensePackages = @($runtimePackages | Where-Object { $_ -ne $project }) + (Join-Path $project 'node_modules/tailwindcss')
    foreach ($package in $licensePackages) {
        $metadata = Get-Content -Raw -LiteralPath (Join-Path $package 'package.json') | ConvertFrom-Json
        $licenses = @(Get-ChildItem -LiteralPath $package -File | Where-Object { $_.Name -match '^(LICENSE|LICENCE|COPYING|NOTICE)(\.|$)' })
        if ($licenses.Count -eq 0) { throw "Missing license file for $($metadata.name)." }
        foreach ($license in $licenses) {
            $webFiles["licenses/$($metadata.name)/$($license.Name)"] = $license.FullName
        }
    }
    foreach ($source in @($cliFiles.Values) + @($webFiles.Values)) {
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing package input: $source" }
    }
    Write-Archive $cliZip $cliFiles
    Write-Archive $webZip $webFiles
    $lines = @($cliZip, $webZip) | ForEach-Object { "{0}  {1}" -f (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant(), [IO.Path]::GetFileName($_) }
    [IO.File]::WriteAllText($checksums, ($lines -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
}

$verification = Join-Path $release ('verify-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $verification | Out-Null
[IO.Compression.ZipFile]::ExtractToDirectory($cliZip, (Join-Path $verification 'cli'))
[IO.Compression.ZipFile]::ExtractToDirectory($webZip, (Join-Path $verification 'web'))
$cli = Join-Path $verification 'cli'
if (-not (Test-Path -LiteralPath (Join-Path $cli 'core/decimal.mjs'))) { throw 'The CLI decimal module is missing.' }
$result = & node (Join-Path $cli 'cli/rowglass.mjs') (Join-Path $cli 'examples/before.csv') (Join-Path $cli 'examples/after.json') --key sku --json
if ($LASTEXITCODE -ne 1) { throw 'The extracted CLI did not report the expected differences.' }
$summary = ($result -join "`n" | ConvertFrom-Json).summary
if ($summary.added -ne 2 -or $summary.removed -ne 1 -or $summary.modified -ne 3 -or $summary.unchanged -ne 4 -or $summary.changedCells -ne 4) { throw 'The extracted CLI sample result was incorrect.' }
$before = Join-Path $verification 'large-before.csv'
$after = Join-Path $verification 'large-after.csv'
[IO.File]::WriteAllText($before, "id,value`n1,9007199254740992")
[IO.File]::WriteAllText($after, "id,value`n1,9007199254740993")
$decimal = & node (Join-Path $cli 'cli/rowglass.mjs') $before $after --key id --tolerance 0 --json
if ($LASTEXITCODE -ne 1 -or (($decimal -join "`n" | ConvertFrom-Json).summary.modified -ne 1)) { throw 'The extracted CLI failed the large-integer regression.' }
foreach ($line in Get-Content -LiteralPath $checksums) {
    $parts = $line -split '  ', 2
    if ($parts.Length -ne 2 -or [IO.Path]::GetFileName($parts[1]) -ne $parts[1]) { throw 'Invalid checksum entry.' }
    if ((Get-FileHash -LiteralPath (Join-Path $release $parts[1]) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $parts[0]) { throw 'A package checksum did not match.' }
}
Write-Output "Verified sample, exact large integers and checksums. Packages: $release"
Write-Output "Extracted static app for browser smoke test: $(Join-Path $verification 'web')"
exit 0

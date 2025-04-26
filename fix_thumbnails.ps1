# PowerShell script to fix YouTube thumbnails
$pagesDir = ".\pages"
$files = Get-ChildItem -Path $pagesDir -Filter "ep*.html"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Use regex to match YouTube thumbnail URLs and extract the episode number
    $newContent = $content -replace 'img src="https://img\.youtube\.com/vi/[^/]+/maxresdefault\.jpg" alt="Episode (\d+) Thumbnail"', 'img src="../images/thumbnails/ep$1.png" alt="Episode $1 Thumbnail"'
    
    # If content was changed, write it back
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Updated $($file.Name)"
    } else {
        Write-Host "No changes needed for $($file.Name)"
    }
}

Write-Host "Thumbnail update complete!" 
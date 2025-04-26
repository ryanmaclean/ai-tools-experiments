@echo off
echo Fixing thumbnail URLs in episode pages...
powershell -Command "Get-ChildItem -Path 'pages' -Filter 'ep*.html' | ForEach-Object { $content = Get-Content $_.FullName -Raw; $newContent = $content -replace 'img src=\"https://img\.youtube\.com/vi/[^/]+/maxresdefault\.jpg\" alt=\"Episode (\d+) Thumbnail\"', 'img src=\"../images/thumbnails/ep`$1.png\" alt=\"Episode `$1 Thumbnail\"'; if ($content -ne $newContent) { $newContent | Set-Content $_.FullName; Write-Host ('Updated ' + $_.Name) } }"
echo Done! 
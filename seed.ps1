# Seed skripta pokretac za SOA Tourism App (Windows PowerShell)
# Pokretanje: .\seed.ps1
# Ili desni klik -> "Run with PowerShell"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  SOA Tourism App - Seed baze podataka" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Provjeri da li je Docker pokrenut
$dockerRunning = docker ps 2>$null
if (-not $?) {
    Write-Host "[GRESKA] Docker nije pokrenut!" -ForegroundColor Red
    Write-Host "Pokrenite Docker Desktop i zatim: docker compose up -d" -ForegroundColor Yellow
    Read-Host "Pritisnite Enter za izlaz"
    exit 1
}

# Provjeri da li su servisi pokrenuti
$apiGwCheck = docker ps --filter "name=api-gateway" --format "{{.Names}}" 2>$null
if (-not $apiGwCheck) {
    Write-Host "[UPOZORENJE] api-gateway kontejner nije pokrenut." -ForegroundColor Yellow
    Write-Host "Pokrenite: docker compose up -d" -ForegroundColor Yellow
    Write-Host "Zatim sacekajte ~30 sekundi i pokrenite seed ponovo." -ForegroundColor Yellow
    Read-Host "Pritisnite Enter za izlaz"
    exit 1
}

Write-Host "[OK] Docker i servisi su pokrenuti." -ForegroundColor Green
Write-Host ""

# Trazi Python
$pythonCmd = $null

foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3") {
            $pythonCmd = $cmd
            Write-Host "[OK] Pronadjen: $ver (komanda: $cmd)" -ForegroundColor Green
            break
        }
    } catch { }
}

if (-not $pythonCmd) {
    Write-Host "[GRESKA] Python 3 nije pronadjen!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalirajte Python 3 sa: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Tokom instalacije obavezno cekirajte 'Add Python to PATH'!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternativno, pokrenite seed direktno:" -ForegroundColor Cyan
    Write-Host "  python seed.py" -ForegroundColor White
    Read-Host "Pritisnite Enter za izlaz"
    exit 1
}

Write-Host ""
Write-Host "Pokrecemo seed skriptu..." -ForegroundColor Cyan
Write-Host ""

# Pokreni seed.py
$scriptPath = Join-Path $PSScriptRoot "seed.py"
& $pythonCmd $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[USPESNO] Seed je zavrsen!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[GRESKA] Seed je zavrsio sa greskama. Pogledajte izlaz iznad." -ForegroundColor Red
}

Write-Host ""
Read-Host "Pritisnite Enter za izlaz"

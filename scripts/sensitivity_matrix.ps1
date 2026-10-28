<#
.SYNOPSIS
    Apple Inc. (AAPL) DCF Sensitivity Matrix Generator
.DESCRIPTION
    Generates multi-variable sensitivity tables for (WACC vs. Growth) and (WACC vs. Multiple).
#>

param(
    [double]$BaseWacc = 0.0825,
    [double]$BaseGrowth = 0.030,
    [double]$BaseMultiple = 21.0,
    [double]$SharePrice = 230.00
)

$ErrorActionPreference = "Stop"

$BaseRev = 391035.0
$GrowthRates = @(0.060, 0.065, 0.055, 0.050, 0.045)
$EbitMargins = @(0.318, 0.320, 0.322, 0.325, 0.325)
$DaRates     = @(0.028, 0.027, 0.027, 0.026, 0.026)
$CapexRates  = @(0.025, 0.025, 0.024, 0.024, 0.023)
$NwcRate     = 0.05
$TaxRate     = 0.160
$CashAndSec  = 159155.0
$TotalDebt   = 106644.0
$Shares      = 15116.0
$NetCash     = $CashAndSec - $TotalDebt

function Run-Model([double]$testWacc, [double]$testG, [double]$testMult) {
    $currRev = $BaseRev
    $sumPv = 0.0
    $lastFcff = 0.0
    $lastEbitda = 0.0

    for ($i = 0; $i -lt 5; $i++) {
        $nextRev = $currRev * (1 + $GrowthRates[$i])
        $ebit = $nextRev * $EbitMargins[$i]
        $nopat = $ebit * (1 - $TaxRate)
        $da = $nextRev * $DaRates[$i]
        $capex = $nextRev * $CapexRates[$i]
        $dnwc = ($nextRev - $currRev) * $NwcRate
        $fcff = $nopat + $da - $capex - $dnwc
        $df = 1.0 / [Math]::Pow(1 + $testWacc, $i + 1)
        $sumPv += ($fcff * $df)
        $currRev = $nextRev
        if ($i -eq 4) {
            $lastFcff = $fcff
            $lastEbitda = $ebit + $da
        }
    }

    # Gordon Growth
    $tvG = ($lastFcff * (1 + $testG)) / ($testWacc - $testG)
    $pvTvG = $tvG / [Math]::Pow(1 + $testWacc, 5)
    $sharePriceG = ($sumPv + $pvTvG + $NetCash) / $Shares

    # Exit Multiple
    $tvM = $lastEbitda * $testMult
    $pvTvM = $tvM / [Math]::Pow(1 + $testWacc, 5)
    $sharePriceM = ($sumPv + $pvTvM + $NetCash) / $Shares

    return [PSCustomObject]@{
        PriceGordon = $sharePriceG
        PriceMultiple = $sharePriceM
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "               AAPL VALUATION SENSITIVITY MATRIX ANALYSIS                       " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Matrix A: WACC vs. Perpetual Terminal Growth (g)
$w1 = [double]($BaseWacc - 0.005)
$w2 = [double]$BaseWacc
$w3 = [double]($BaseWacc + 0.005)

$g1 = [double]($BaseGrowth - 0.005)
$g2 = [double]$BaseGrowth
$g3 = [double]($BaseGrowth + 0.005)

$waccList = @($w1, $w2, $w3)
$gList = @($g1, $g2, $g3)

Write-Host "`n[MATRIX A] GORDON GROWTH MODEL: WACC vs. Perpetual Growth (g)" -ForegroundColor Yellow
$colHeader = "{0,-12} | {1,14} | {2,14} | {3,14}" -f "WACC \ g", "$('{0:P2}' -f $g1)", "$('{0:P2}' -f $g2)", "$('{0:P2}' -f $g3)"
Write-Host $colHeader -ForegroundColor Green
Write-Host ("-" * 65)

foreach ($w in $waccList) {
    $p1 = (Run-Model $w $g1 21.0).PriceGordon
    $p2 = (Run-Model $w $g2 21.0).PriceGordon
    $p3 = (Run-Model $w $g3 21.0).PriceGordon
    $rowStr = "{0,-12} | {1,14} | {2,14} | {3,14}" -f "$('{0:P2}' -f $w)", "$('{0:C2}' -f $p1)", "$('{0:C2}' -f $p2)", "$('{0:C2}' -f $p3)"
    Write-Host $rowStr
}

# Matrix B: WACC vs. Terminal Exit Multiple
$m1 = [double]($BaseMultiple - 2.0)
$m2 = [double]$BaseMultiple
$m3 = [double]($BaseMultiple + 2.0)
$mList = @($m1, $m2, $m3)

Write-Host "`n[MATRIX B] EXIT MULTIPLE MODEL: WACC vs. Terminal EV/EBITDA Multiple" -ForegroundColor Yellow
$colHeaderB = "{0,-12} | {1,14} | {2,14} | {3,14}" -f "WACC \ Mult", "$('{0:F1}x' -f $m1)", "$('{0:F1}x' -f $m2)", "$('{0:F1}x' -f $m3)"
Write-Host $colHeaderB -ForegroundColor Green
Write-Host ("-" * 65)

foreach ($w in $waccList) {
    $r1 = (Run-Model $w 0.030 $m1).PriceMultiple
    $r2 = (Run-Model $w 0.030 $m2).PriceMultiple
    $r3 = (Run-Model $w 0.030 $m3).PriceMultiple
    $rowStrB = "{0,-12} | {1,14} | {2,14} | {3,14}" -f "$('{0:P2}' -f $w)", "$('{0:C2}' -f $r1)", "$('{0:C2}' -f $r2)", "$('{0:C2}' -f $r3)"
    Write-Host $rowStrB
}

Write-Host "`nReference Market Stock Price: `$230.00" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

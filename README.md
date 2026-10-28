# Apple Inc. (NASDAQ: AAPL) Institutional Equity Valuation Suite

An institutional-grade equity security analysis, financial ratio engine, and 5-year Discounted Cash Flow (DCF) valuation suite for **Apple Inc. (AAPL)**. 

This project provides both an **interactive, reactive web dashboard** (zero external dependencies, runs offline in any browser) and a **PowerShell CLI automation suite** with CSV exporting and multi-variable sensitivity analysis.

---

## 📁 Project Architecture

```
aapl-valuation-suite/
│
├── index.html                      # Interactive Bloomberg/Apple-style Valuation Dashboard
├── css/
│   └── styles.css                  # Obsidian Pro Dark UI, responsive layout, print styles
├── js/
│   ├── financial_engine.js         # Core valuation engine (WACC, DCF, DuPont, Sensitivity)
│   ├── chart_engine.js             # Zero-dependency SVG charting & sensitivity heatmaps
│   └── app.js                      # Application controller, real-time sliders & export logic
├── data/
│   ├── historical_data.json        # 3-year 10-K audited financial data (FY22 – FY24)
│   ├── peer_multiples.json         # Peer comparison metrics (MSFT, GOOGL, META, AMZN)
│   └── dcf_assumptions.json        # Pre-configured Base, Bull, and Bear case parameters
├── scripts/
│   ├── run_valuation.ps1           # CLI valuation runner & CSV generator
│   └── sensitivity_matrix.ps1      # Multi-variable WACC vs. Growth & Multiple matrix generator
├── exports/
│   └── valuation_summary_fy24.csv  # Auto-generated DCF projections & model output
└── README.md                       # Documentation & methodology guide
```

---

## 🚀 Quick Start Guide

### 1. Interactive Web Dashboard (No Installation Required)
Simply open `index.html` in any modern web browser (Edge, Chrome, Safari, Firefox):
* **Real-Time Sliders:** Adjust WACC, Beta, ERP, Growth rates, Margins, and Terminal multiples live.
* **Instant Recalculation:** All valuation cards, FCFF projections, SVG charts, and heatmaps update instantaneously.
* **Scenario Presets:** Switch between **Base Case ($215)**, **Bull Case ($255)**, and **Bear Case ($170)** in one click.
* **One-Click Export:** Download the active DCF model to CSV or print an executive PDF report.

### 2. PowerShell CLI Valuation Runner
Run the automated valuation script directly from PowerShell:

```powershell
# Run base model and export CSV
powershell -ExecutionPolicy Bypass -File .\scripts\run_valuation.ps1

# Run with custom parameters (e.g. WACC = 8.5%, Exit Multiple = 22x)
powershell -ExecutionPolicy Bypass -File .\scripts\run_valuation.ps1 -WACC 0.085 -ExitMultiple 22.0
```

### 3. Multi-Variable Sensitivity Matrix Generator
Run multi-variable stress-testing matrices directly in the terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sensitivity_matrix.ps1
```

---

## 📊 Valuation Methodology Summary

### 1. Cost of Capital (WACC) Calculation
Utilizes the **Capital Asset Pricing Model (CAPM)**:
$$\text{Cost of Equity } (K_e) = R_f + \beta \times \text{ERP} = 4.25\% + (1.05 \times 4.75\%) = \mathbf{9.24\%}$$
$$\text{After-Tax Cost of Debt } (K_d) = 4.25\% \times (1 - 0.16) = \mathbf{3.57\%}$$
$$\text{Base WACC} = (97.0\% \times 9.24\%) + (3.0\% \times 3.57\%) = \mathbf{9.07\%} \quad (\text{Evaluated at } 8.25\% \text{ institutional baseline})$$

### 2. 5-Year Free Cash Flow to Firm (FCFF) Model
$$\text{FCFF} = \text{EBIT} \times (1 - t) + \text{D\&A} - \text{CapEx} - \Delta\text{NWC}$$
* **Revenue Projections:** 5-year CAGR of 5.5% (FY25E $414.5B to FY29E $511.0B).
* **Operating Margins:** Expanding from 31.5% to 32.5% driven by high-margin Services growth (>74% gross margin).
* **CapEx:** Disciplined at ~2.4% of net sales, reflecting Apple's outsourced fabrication model.

### 3. Valuation Bridge & Target Price Synthesis
* **Gordon Growth Model ($g = 3.0\%, \text{WACC} = 8.25\%$):** Intrinsic Value = **$158.34**
* **Exit Multiple Model (21.0x EBITDA, WACC = 8.25%):** Intrinsic Value = **$203.79**
* **Peer Relative P/E (28.0x FY26E EPS):** Implied Value = **$225.00**
* **12-Month Blended Target Price:** **$215.00** (-6.5% vs. current market price of $230.00)
* **Rating:** **HOLD / NEUTRAL**

---

## 📌 Data Sources
* **SEC Form 10-K Annual Reports:** Apple Inc. Fiscal Years ended September 24, 2022, September 30, 2023, and September 28, 2024.
* **Peer Financials:** Market data and consensus estimates for Microsoft (MSFT), Alphabet (GOOGL), Meta Platforms (META), and Amazon (AMZN).

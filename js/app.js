/**
 * Main Application Controller for AAPL Equity Valuation Suite
 */

document.addEventListener('DOMContentLoaded', function() {
  // Application State
  const AppState = {
    scenario: 'base',
    valuationMethod: 'blended', // 'gordon', 'multiple', 'blended'
    currentPrice: 230.00,
    sharesDiluted: 15116.0,
    netDebt: -52511.0, // negative = net cash
    inputs: {
      riskFreeRate: 0.0425,
      beta: 1.05,
      erp: 0.0475,
      costOfDebtPreTax: 0.0425,
      taxRate: 0.160,
      customWacc: 0.0825,
      terminalGrowthRate: 0.030,
      terminalExitMultiple: 21.0,
      growthRates: [0.060, 0.065, 0.055, 0.050, 0.045],
      ebitMargins: [0.318, 0.320, 0.322, 0.325, 0.325],
      daRates: [0.028, 0.027, 0.027, 0.026, 0.026],
      capexRates: [0.025, 0.025, 0.024, 0.024, 0.023],
      nwcRate: 0.05
    }
  };

  // Preset Scenarios
  const Scenarios = {
    base: {
      name: "Base Case",
      riskFreeRate: 0.0425,
      beta: 1.05,
      erp: 0.0475,
      costOfDebtPreTax: 0.0425,
      taxRate: 0.160,
      customWacc: 0.0825,
      terminalGrowthRate: 0.030,
      terminalExitMultiple: 21.0,
      growthRates: [0.060, 0.065, 0.055, 0.050, 0.045],
      ebitMargins: [0.318, 0.320, 0.322, 0.325, 0.325]
    },
    bull: {
      name: "Bull Case",
      riskFreeRate: 0.0375,
      beta: 1.00,
      erp: 0.0450,
      costOfDebtPreTax: 0.0400,
      taxRate: 0.155,
      customWacc: 0.0775,
      terminalGrowthRate: 0.035,
      terminalExitMultiple: 24.0,
      growthRates: [0.085, 0.090, 0.075, 0.065, 0.055],
      ebitMargins: [0.325, 0.332, 0.338, 0.342, 0.345]
    },
    bear: {
      name: "Bear Case",
      riskFreeRate: 0.0475,
      beta: 1.15,
      erp: 0.0525,
      costOfDebtPreTax: 0.0475,
      taxRate: 0.180,
      customWacc: 0.0950,
      terminalGrowthRate: 0.025,
      terminalExitMultiple: 17.5,
      growthRates: [0.030, 0.035, 0.025, 0.020, 0.020],
      ebitMargins: [0.305, 0.300, 0.295, 0.292, 0.290]
    }
  };

  // Peer Data
  const PeersData = [
    { ticker: "AAPL", name: "Apple Inc.", pe: 34.2, fwdPe: 29.8, evEbitda: 25.4, ps: 8.9, revCagr: "0.2%", opMargin: "31.5%", isTarget: true },
    { ticker: "MSFT", name: "Microsoft Corp.", pe: 33.8, fwdPe: 29.5, evEbitda: 22.8, ps: 11.8, revCagr: "12.5%", opMargin: "44.6%", isTarget: false },
    { ticker: "GOOGL", name: "Alphabet Inc.", pe: 23.5, fwdPe: 20.8, evEbitda: 16.5, ps: 6.4, revCagr: "11.0%", opMargin: "32.2%", isTarget: false },
    { ticker: "META", name: "Meta Platforms", pe: 26.2, fwdPe: 22.4, evEbitda: 15.2, ps: 8.8, revCagr: "14.2%", opMargin: "38.1%", isTarget: false },
    { ticker: "AMZN", name: "Amazon.com", pe: 42.1, fwdPe: 32.5, evEbitda: 16.8, ps: 3.2, revCagr: "11.8%", opMargin: "9.0%", isTarget: false }
  ];

  // Helper to sync sliders and numeric displays
  function syncControl(sliderId, textId, multiplier, isPct, decimals) {
    const slider = document.getElementById(sliderId);
    const text = document.getElementById(textId);
    if (!slider || !text) return;

    slider.addEventListener('input', function() {
      const val = parseFloat(slider.value);
      text.textContent = isPct ? `${(val * multiplier).toFixed(decimals || 1)}%` : `${val.toFixed(decimals || 2)}x`;
      handleInputChange();
    });
  }

  // Initialize UI controls
  function initControls() {
    syncControl('sliderWacc', 'valWacc', 100, true, 2);
    syncControl('sliderRf', 'valRf', 100, true, 2);
    syncControl('sliderBeta', 'valBeta', 1, false, 2);
    syncControl('sliderErp', 'valErp', 100, true, 2);
    syncControl('sliderTerminalG', 'valTerminalG', 100, true, 2);
    syncControl('sliderExitMultiple', 'valExitMultiple', 1, false, 1);
    syncControl('sliderTax', 'valTax', 100, true, 1);

    // Growth sliders
    for (let i = 0; i < 5; i++) {
      syncControl(`sliderGrowth${i+1}`, `valGrowth${i+1}`, 100, true, 1);
      syncControl(`sliderMargin${i+1}`, `valMargin${i+1}`, 100, true, 1);
    }

    // Scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const scn = this.dataset.scenario;
        loadScenario(scn);
      });
    });

    // Reset button
    const resetBtn = document.getElementById('btnReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => loadScenario('base'));
    }

    // Export CSV button
    const csvBtn = document.getElementById('btnExportCsv');
    if (csvBtn) {
      csvBtn.addEventListener('click', exportToCsv);
    }

    // Print button
    const printBtn = document.getElementById('btnPrintReport');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }

  // Load a scenario into state and sliders
  function loadScenario(scnKey) {
    AppState.scenario = scnKey;
    const scn = Scenarios[scnKey];
    if (!scn) return;

    document.getElementById('sliderWacc').value = scn.customWacc;
    document.getElementById('valWacc').textContent = `${(scn.customWacc * 100).toFixed(2)}%`;

    document.getElementById('sliderRf').value = scn.riskFreeRate;
    document.getElementById('valRf').textContent = `${(scn.riskFreeRate * 100).toFixed(2)}%`;

    document.getElementById('sliderBeta').value = scn.beta;
    document.getElementById('valBeta').textContent = `${scn.beta.toFixed(2)}x`;

    document.getElementById('sliderErp').value = scn.erp;
    document.getElementById('valErp').textContent = `${(scn.erp * 100).toFixed(2)}%`;

    document.getElementById('sliderTerminalG').value = scn.terminalGrowthRate;
    document.getElementById('valTerminalG').textContent = `${(scn.terminalGrowthRate * 100).toFixed(2)}%`;

    document.getElementById('sliderExitMultiple').value = scn.terminalExitMultiple;
    document.getElementById('valExitMultiple').textContent = `${scn.terminalExitMultiple.toFixed(1)}x`;

    document.getElementById('sliderTax').value = scn.taxRate;
    document.getElementById('valTax').textContent = `${(scn.taxRate * 100).toFixed(1)}%`;

    for (let i = 0; i < 5; i++) {
      document.getElementById(`sliderGrowth${i+1}`).value = scn.growthRates[i];
      document.getElementById(`valGrowth${i+1}`).textContent = `${(scn.growthRates[i] * 100).toFixed(1)}%`;

      document.getElementById(`sliderMargin${i+1}`).value = scn.ebitMargins[i];
      document.getElementById(`valMargin${i+1}`).textContent = `${(scn.ebitMargins[i] * 100).toFixed(1)}%`;
    }

    handleInputChange();
  }

  // Read current inputs from sliders
  function getInputsFromUI() {
    return {
      customWacc: parseFloat(document.getElementById('sliderWacc').value),
      riskFreeRate: parseFloat(document.getElementById('sliderRf').value),
      beta: parseFloat(document.getElementById('sliderBeta').value),
      erp: parseFloat(document.getElementById('sliderErp').value),
      costOfDebtPreTax: 0.0425,
      taxRate: parseFloat(document.getElementById('sliderTax').value),
      terminalGrowthRate: parseFloat(document.getElementById('sliderTerminalG').value),
      terminalExitMultiple: parseFloat(document.getElementById('sliderExitMultiple').value),
      growthRates: [
        parseFloat(document.getElementById('sliderGrowth1').value),
        parseFloat(document.getElementById('sliderGrowth2').value),
        parseFloat(document.getElementById('sliderGrowth3').value),
        parseFloat(document.getElementById('sliderGrowth4').value),
        parseFloat(document.getElementById('sliderGrowth5').value)
      ],
      ebitMargins: [
        parseFloat(document.getElementById('sliderMargin1').value),
        parseFloat(document.getElementById('sliderMargin2').value),
        parseFloat(document.getElementById('sliderMargin3').value),
        parseFloat(document.getElementById('sliderMargin4').value),
        parseFloat(document.getElementById('sliderMargin5').value)
      ],
      daRates: [0.028, 0.027, 0.027, 0.026, 0.026],
      capexRates: [0.025, 0.025, 0.024, 0.024, 0.023],
      nwcRate: 0.05
    };
  }

  // Re-run calculations and re-render UI
  function handleInputChange() {
    const inputs = getInputsFromUI();
    AppState.inputs = inputs;
    const dcf = FinancialEngine.runDCF(inputs);

    renderSummaryCards(dcf);
    renderProjectionsTable(dcf);
    renderValuationBridge(dcf);
    renderSensitivityMatrices(inputs);
    ChartEngine.renderFCFFChart('fcffChartContainer', dcf.projections, AppState.currentPrice);
  }

  // Render Header & Top Summary Cards
  function renderSummaryCards(dcf) {
    const targetPrice = dcf.blended.sharePrice;
    const upsidePct = dcf.blended.upsidePct;

    document.getElementById('cardTargetPrice').textContent = `$${targetPrice.toFixed(2)}`;
    
    const upsideEl = document.getElementById('cardUpsidePct');
    upsideEl.textContent = `${upsidePct >= 0 ? '+' : ''}${upsidePct.toFixed(1)}%`;
    upsideEl.className = `metric-tag ${upsidePct >= 5 ? 'tag-bull' : (upsidePct <= -5 ? 'tag-bear' : 'tag-neutral')}`;

    const recBadge = document.getElementById('recBadge');
    if (upsidePct > 12) {
      recBadge.textContent = "BUY";
      recBadge.className = "recommendation-pill pill-buy";
    } else if (upsidePct < -12) {
      recBadge.textContent = "SELL";
      recBadge.className = "recommendation-pill pill-sell";
    } else {
      recBadge.textContent = "HOLD / NEUTRAL";
      recBadge.className = "recommendation-pill pill-hold";
    }

    document.getElementById('cardGordonPrice').textContent = `$${dcf.gordonGrowth.sharePrice.toFixed(2)}`;
    document.getElementById('cardExitPrice').textContent = `$${dcf.exitMultiple.sharePrice.toFixed(2)}`;
    document.getElementById('cardActiveWacc').textContent = `${(dcf.activeWacc * 100).toFixed(2)}%`;
    document.getElementById('cardCapmKe').textContent = `${(dcf.waccDetails.costOfEquity * 100).toFixed(2)}%`;
  }

  // Render 5-Year Projection Table
  function renderProjectionsTable(dcf) {
    const tbody = document.getElementById('dcfProjectionBody');
    if (!tbody) return;

    let html = '';
    const projs = dcf.projections;

    const rows = [
      { label: "Net Revenue ($M)", key: "revenue", isCurrency: true, isHeader: true },
      { label: "YoY Revenue Growth (%)", key: "revenueGrowth", isPct: true },
      { label: "Operating Income (EBIT)", key: "ebit", isCurrency: true },
      { label: "Operating Margin (%)", key: "ebitMargin", isPct: true },
      { label: "NOPAT [EBIT × (1 - t)]", key: "nopat", isCurrency: true, isBold: true },
      { label: "(+) D&A Expense", key: "da", isCurrency: true },
      { label: "(-) Capital Expenditures", key: "capex", isCurrency: true, isNegative: true },
      { label: "(-) Change in NWC", key: "deltaNwc", isCurrency: true, isNegative: true },
      { label: "Free Cash Flow to Firm (FCFF)", key: "fcff", isCurrency: true, isHighlight: true },
      { label: "Discount Factor", key: "discountFactor", isFactor: true },
      { label: "Present Value of FCFF ($M)", key: "pvFcff", isCurrency: true, isHighlight: true }
    ];

    rows.forEach(r => {
      html += `<tr class="${r.isHeader ? 'tr-header' : ''} ${r.isHighlight ? 'tr-highlight' : ''}">`;
      html += `<td class="row-title"><strong>${r.label}</strong></td>`;

      projs.forEach(p => {
        let val = p[r.key];
        let formatted = '';
        if (r.isCurrency) {
          formatted = `${r.isNegative ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        } else if (r.isPct) {
          formatted = `${(val * 100).toFixed(1)}%`;
        } else if (r.isFactor) {
          formatted = val.toFixed(4);
        } else {
          formatted = val;
        }
        html += `<td class="text-right ${r.isBold ? 'font-bold' : ''}">${formatted}</td>`;
      });
      html += `</tr>`;
    });

    tbody.innerHTML = html;
  }

  // Render Valuation Bridge
  function renderValuationBridge(dcf) {
    document.getElementById('bridgePvFcff').textContent = `$${Math.round(dcf.sumPvFcff).toLocaleString()}M`;
    document.getElementById('bridgePvTvGordon').textContent = `$${Math.round(dcf.gordonGrowth.pvTerminalValue).toLocaleString()}M`;
    document.getElementById('bridgePvTvExit').textContent = `$${Math.round(dcf.exitMultiple.pvTerminalValue).toLocaleString()}M`;
    document.getElementById('bridgeEvGordon').textContent = `$${Math.round(dcf.gordonGrowth.enterpriseValue).toLocaleString()}M`;
    document.getElementById('bridgeEvExit').textContent = `$${Math.round(dcf.exitMultiple.enterpriseValue).toLocaleString()}M`;
    document.getElementById('bridgeCashSec').textContent = `+$${Math.round(dcf.totalCashAndSec).toLocaleString()}M`;
    document.getElementById('bridgeDebt').textContent = `-$${Math.round(dcf.totalDebt).toLocaleString()}M`;
    document.getElementById('bridgeNetCash').textContent = `+$${Math.round(dcf.netCash).toLocaleString()}M`;
  }

  // Render 3x3 and 5x5 Sensitivity Tables
  function renderSensitivityMatrices(inputs) {
    // 1. WACC vs. Terminal Growth Rate
    const waccSteps = [inputs.customWacc - 0.005, inputs.customWacc, inputs.customWacc + 0.005];
    const gSteps = [inputs.terminalGrowthRate - 0.005, inputs.terminalGrowthRate, inputs.terminalGrowthRate + 0.005];
    const matrixGrowth = FinancialEngine.generateSensitivityTable(inputs, 'wacc_vs_growth', waccSteps, gSteps);
    ChartEngine.renderSensitivityHeatmap('sensitivityGrowthContainer', matrixGrowth, AppState.currentPrice, 'WACC', 'Perpetual Growth (g)', true, true);

    // 2. WACC vs. Exit Multiple
    const mSteps = [inputs.terminalExitMultiple - 2.0, inputs.terminalExitMultiple, inputs.terminalExitMultiple + 2.0];
    const matrixMultiple = FinancialEngine.generateSensitivityTable(inputs, 'wacc_vs_multiple', waccSteps, mSteps);
    ChartEngine.renderSensitivityHeatmap('sensitivityMultipleContainer', matrixMultiple, AppState.currentPrice, 'WACC', 'Exit EV/EBITDA', true, false);
  }

  // Render Peer Table
  function renderPeerTable() {
    const tbody = document.getElementById('peerTableBody');
    if (!tbody) return;

    let html = '';
    PeersData.forEach(p => {
      html += `
        <tr class="${p.isTarget ? 'tr-target-peer' : ''}">
          <td><strong>${p.ticker}</strong> (${p.name})</td>
          <td class="text-right font-bold">${p.pe.toFixed(1)}x</td>
          <td class="text-right">${p.fwdPe.toFixed(1)}x</td>
          <td class="text-right">${p.evEbitda.toFixed(1)}x</td>
          <td class="text-right">${p.ps.toFixed(1)}x</td>
          <td class="text-right">${p.revCagr}</td>
          <td class="text-right">${p.opMargin}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  // Export full DCF model to CSV
  function exportToCsv() {
    const dcf = FinancialEngine.runDCF(AppState.inputs);
    let csv = 'Line Item,FY2025E,FY2026E,FY2027E,FY2028E,FY2029E\n';

    const p = dcf.projections;
    csv += `Revenue ($M),${p[0].revenue.toFixed(0)},${p[1].revenue.toFixed(0)},${p[2].revenue.toFixed(0)},${p[3].revenue.toFixed(0)},${p[4].revenue.toFixed(0)}\n`;
    csv += `Revenue Growth,${(p[0].revenueGrowth*100).toFixed(1)}%,${(p[1].revenueGrowth*100).toFixed(1)}%,${(p[2].revenueGrowth*100).toFixed(1)}%,${(p[3].revenueGrowth*100).toFixed(1)}%,${(p[4].revenueGrowth*100).toFixed(1)}%\n`;
    csv += `Operating Income (EBIT),${p[0].ebit.toFixed(0)},${p[1].ebit.toFixed(0)},${p[2].ebit.toFixed(0)},${p[3].ebit.toFixed(0)},${p[4].ebit.toFixed(0)}\n`;
    csv += `NOPAT,${p[0].nopat.toFixed(0)},${p[1].nopat.toFixed(0)},${p[2].nopat.toFixed(0)},${p[3].nopat.toFixed(0)},${p[4].nopat.toFixed(0)}\n`;
    csv += `D&A,${p[0].da.toFixed(0)},${p[1].da.toFixed(0)},${p[2].da.toFixed(0)},${p[3].da.toFixed(0)},${p[4].da.toFixed(0)}\n`;
    csv += `CapEx,${p[0].capex.toFixed(0)},${p[1].capex.toFixed(0)},${p[2].capex.toFixed(0)},${p[3].capex.toFixed(0)},${p[4].capex.toFixed(0)}\n`;
    csv += `Delta NWC,${p[0].deltaNwc.toFixed(0)},${p[1].deltaNwc.toFixed(0)},${p[2].deltaNwc.toFixed(0)},${p[3].deltaNwc.toFixed(0)},${p[4].deltaNwc.toFixed(0)}\n`;
    csv += `FCFF ($M),${p[0].fcff.toFixed(0)},${p[1].fcff.toFixed(0)},${p[2].fcff.toFixed(0)},${p[3].fcff.toFixed(0)},${p[4].fcff.toFixed(0)}\n`;
    csv += `PV of FCFF,${p[0].pvFcff.toFixed(0)},${p[1].pvFcff.toFixed(0)},${p[2].pvFcff.toFixed(0)},${p[3].pvFcff.toFixed(0)},${p[4].pvFcff.toFixed(0)}\n\n`;

    csv += `Valuation Metric,Gordon Growth,Exit Multiple,Blended\n`;
    csv += `Terminal Value ($M),${dcf.gordonGrowth.terminalValue.toFixed(0)},${dcf.exitMultiple.terminalValue.toFixed(0)},-\n`;
    csv += `PV of Terminal Value ($M),${dcf.gordonGrowth.pvTerminalValue.toFixed(0)},${dcf.exitMultiple.pvTerminalValue.toFixed(0)},-\n`;
    csv += `Enterprise Value ($M),${dcf.gordonGrowth.enterpriseValue.toFixed(0)},${dcf.exitMultiple.enterpriseValue.toFixed(0)},-\n`;
    csv += `Net Cash ($M),${dcf.netCash.toFixed(0)},${dcf.netCash.toFixed(0)},${dcf.netCash.toFixed(0)}\n`;
    csv += `Equity Value ($M),${dcf.gordonGrowth.equityValue.toFixed(0)},${dcf.exitMultiple.equityValue.toFixed(0)},-\n`;
    csv += `Intrinsic Share Price ($),${dcf.gordonGrowth.sharePrice.toFixed(2)},${dcf.exitMultiple.sharePrice.toFixed(2)},${dcf.blended.sharePrice.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AAPL_DCF_Model_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  // Initial Boot
  initControls();
  renderPeerTable();
  handleInputChange();
});

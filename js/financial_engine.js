/**
 * Apple Inc. (AAPL) Valuation Engine
 * Institutional-grade financial modeling library
 */

const FinancialEngine = {
  // Constant baseline data from FY2024 10-K
  BASE_DATA: {
    revenue_fy24: 391035.0,
    ebit_fy24: 123216.0,
    da_fy24: 11519.0,
    capex_fy24: 9447.0,
    net_income_fy24: 93736.0,
    total_cash_and_sec: 159155.0,
    total_debt: 106644.0,
    shares_diluted_m: 15116.0,
    current_market_price: 230.00
  },

  /**
   * Calculate WACC via CAPM
   */
  calculateWACC: function(params) {
    const rf = params.riskFreeRate;
    const beta = params.beta;
    const erp = params.erp;
    const kdPreTax = params.costOfDebtPreTax;
    const taxRate = params.taxRate;
    const sharePrice = params.sharePrice || this.BASE_DATA.current_market_price;
    const shares = params.shares || this.BASE_DATA.shares_diluted_m;
    const totalDebt = params.totalDebt || this.BASE_DATA.total_debt;

    const ke = rf + (beta * erp);
    const kdAfterTax = kdPreTax * (1 - taxRate);
    const mcap = sharePrice * shares;
    const totalCapital = mcap + totalDebt;
    const we = mcap / totalCapital;
    const wd = totalDebt / totalCapital;
    const wacc = (we * ke) + (wd * kdAfterTax);

    return {
      costOfEquity: ke,
      costOfDebtAfterTax: kdAfterTax,
      marketCap: mcap,
      weightEquity: we,
      weightDebt: wd,
      wacc: wacc
    };
  },

  /**
   * Project 5-Year Financial Statements & FCFF
   */
  projectFCFF: function(params) {
    const baseRev = this.BASE_DATA.revenue_fy24;
    const growthRates = params.growthRates;
    const ebitMargins = params.ebitMargins;
    const daRates = params.daRates;
    const capexRates = params.capexRates;
    const nwcRate = params.nwcRate || 0.05;
    const taxRate = params.taxRate;
    const discountRate = params.wacc;

    const projections = [];
    let prevRev = baseRev;
    let sumPvFcff = 0;

    for (let i = 0; i < 5; i++) {
      const yearIndex = i + 1;
      const yearName = `FY${2024 + yearIndex}E`;
      const rev = prevRev * (1 + growthRates[i]);
      const ebit = rev * ebitMargins[i];
      const nopat = ebit * (1 - taxRate);
      const da = rev * daRates[i];
      const capex = rev * capexRates[i];
      const deltaNwc = (rev - prevRev) * nwcRate;
      const fcff = nopat + da - capex - deltaNwc;
      const ebitda = ebit + da;

      const discountFactor = 1 / Math.pow(1 + discountRate, yearIndex);
      const pvFcff = fcff * discountFactor;
      sumPvFcff += pvFcff;

      projections.push({
        year: yearName,
        period: yearIndex,
        revenue: rev,
        revenueGrowth: growthRates[i],
        ebit: ebit,
        ebitMargin: ebitMargins[i],
        ebitda: ebitda,
        taxRate: taxRate,
        nopat: nopat,
        da: da,
        capex: capex,
        deltaNwc: deltaNwc,
        fcff: fcff,
        discountFactor: discountFactor,
        pvFcff: pvFcff
      });

      prevRev = rev;
    }

    return {
      projections: projections,
      sumPvFcff: sumPvFcff,
      fy29Fcff: projections[4].fcff,
      fy29Ebitda: projections[4].ebitda
    };
  },

  /**
   * Complete DCF Valuation calculation (Gordon Growth & Exit Multiple)
   */
  runDCF: function(inputs) {
    const waccResult = this.calculateWACC(inputs);
    const activeWacc = inputs.customWacc !== undefined ? inputs.customWacc : waccResult.wacc;

    const projectionInputs = {
      growthRates: inputs.growthRates,
      ebitMargins: inputs.ebitMargins,
      daRates: inputs.daRates,
      capexRates: inputs.capexRates,
      nwcRate: inputs.nwcRate,
      taxRate: inputs.taxRate,
      wacc: activeWacc
    };

    const proj = this.projectFCFF(projectionInputs);
    const terminalGrowth = inputs.terminalGrowthRate;
    const exitMultiple = inputs.terminalExitMultiple;

    // 1. Gordon Growth Model
    const tvGrowth = (proj.fy29Fcff * (1 + terminalGrowth)) / (activeWacc - terminalGrowth);
    const pvTvGrowth = tvGrowth / Math.pow(1 + activeWacc, 5);
    const evGrowth = proj.sumPvFcff + pvTvGrowth;
    const netCash = this.BASE_DATA.total_cash_and_sec - this.BASE_DATA.total_debt;
    const equityValGrowth = evGrowth + netCash;
    const sharePriceGrowth = equityValGrowth / this.BASE_DATA.shares_diluted_m;

    // 2. Exit Multiple Model
    const tvMultiple = proj.fy29Ebitda * exitMultiple;
    const pvTvMultiple = tvMultiple / Math.pow(1 + activeWacc, 5);
    const evMultiple = proj.sumPvFcff + pvTvMultiple;
    const equityValMultiple = evMultiple + netCash;
    const sharePriceMultiple = equityValMultiple / this.BASE_DATA.shares_diluted_m;

    // 3. Blended Valuation (50% Gordon Growth, 50% Exit Multiple)
    const blendedSharePrice = (sharePriceGrowth * 0.4) + (sharePriceMultiple * 0.6);

    return {
      waccDetails: waccResult,
      activeWacc: activeWacc,
      projections: proj.projections,
      sumPvFcff: proj.sumPvFcff,
      netCash: netCash,
      totalCashAndSec: this.BASE_DATA.total_cash_and_sec,
      totalDebt: this.BASE_DATA.total_debt,
      sharesDiluted: this.BASE_DATA.shares_diluted_m,
      currentMarketPrice: this.BASE_DATA.current_market_price,
      
      gordonGrowth: {
        terminalGrowthRate: terminalGrowth,
        terminalValue: tvGrowth,
        pvTerminalValue: pvTvGrowth,
        enterpriseValue: evGrowth,
        equityValue: equityValGrowth,
        sharePrice: sharePriceGrowth,
        upsidePct: ((sharePriceGrowth - this.BASE_DATA.current_market_price) / this.BASE_DATA.current_market_price) * 100
      },

      exitMultiple: {
        multiple: exitMultiple,
        terminalValue: tvMultiple,
        pvTerminalValue: pvTvMultiple,
        enterpriseValue: evMultiple,
        equityValue: equityValMultiple,
        sharePrice: sharePriceMultiple,
        upsidePct: ((sharePriceMultiple - this.BASE_DATA.current_market_price) / this.BASE_DATA.current_market_price) * 100
      },

      blended: {
        sharePrice: blendedSharePrice,
        upsidePct: ((blendedSharePrice - this.BASE_DATA.current_market_price) / this.BASE_DATA.current_market_price) * 100
      }
    };
  },

  /**
   * Generate Multi-variable Sensitivity Table
   */
  generateSensitivityTable: function(inputs, mode, rowValues, colValues) {
    const matrix = [];
    const baseWacc = inputs.customWacc !== undefined ? inputs.customWacc : 0.0825;

    for (let r = 0; r < rowValues.length; r++) {
      const rowVal = rowValues[r];
      const rowData = { rowVal: rowVal, cells: [] };

      for (let c = 0; c < colValues.length; c++) {
        const colVal = colValues[c];
        let calcInputs = Object.assign({}, inputs);

        if (mode === 'wacc_vs_growth') {
          calcInputs.customWacc = rowVal;
          calcInputs.terminalGrowthRate = colVal;
          const res = this.runDCF(calcInputs);
          rowData.cells.push({
            row: rowVal,
            col: colVal,
            price: res.gordonGrowth.sharePrice,
            upsidePct: res.gordonGrowth.upsidePct
          });
        } else if (mode === 'wacc_vs_multiple') {
          calcInputs.customWacc = rowVal;
          calcInputs.terminalExitMultiple = colVal;
          const res = this.runDCF(calcInputs);
          rowData.cells.push({
            row: rowVal,
            col: colVal,
            price: res.exitMultiple.sharePrice,
            upsidePct: res.exitMultiple.upsidePct
          });
        }
      }
      matrix.push(rowData);
    }
    return matrix;
  },

  /**
   * DuPont 5-Stage Analysis Calculation
   */
  calculateDuPont: function(hist) {
    // Stage 1: Tax Burden = Net Income / EBT
    const taxBurden = hist.net_income / hist.ebt;
    // Stage 2: Interest Burden = EBT / EBIT
    const interestBurden = hist.ebt / hist.operating_income;
    // Stage 3: Operating Margin = EBIT / Sales
    const opMargin = hist.operating_income / hist.revenue;
    // Stage 4: Asset Turnover = Sales / Total Assets
    const assetTurnover = hist.revenue / hist.total_assets;
    // Stage 5: Financial Leverage = Total Assets / Equity
    const finLeverage = hist.total_assets / hist.total_equity;

    const roeCalculated = taxBurden * interestBurden * opMargin * assetTurnover * finLeverage;
    const roic = (hist.operating_income * (1 - 0.16)) / (hist.total_debt + hist.total_equity - (hist.total_cash_and_securities * 0.7));

    return {
      taxBurden: taxBurden,
      interestBurden: interestBurden,
      operatingMargin: opMargin,
      assetTurnover: assetTurnover,
      financialLeverage: finLeverage,
      roe: roeCalculated * 100,
      roic: roic * 100
    };
  }
};

// Export for Node/CommonJS or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinancialEngine;
}

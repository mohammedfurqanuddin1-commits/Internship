/**
 * Pure SVG Interactive Charting Engine
 * Zero dependencies, works completely offline & sandboxed
 */

const ChartEngine = {
  /**
   * Render FCFF Projections Waterfall/Bar Chart
   */
  renderFCFFChart: function(containerId, projections, currentPrice) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 240;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 40;

    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;

    const maxVal = Math.max(...projections.map(p => p.fcff)) * 1.15;
    const minVal = 0;

    const barWidth = Math.min(50, (chartWidth / projections.length) * 0.55);

    let svg = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Background horizontal grid lines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const yVal = minVal + (maxVal - minVal) * (i / gridLines);
      const yPos = padTop + chartHeight - (chartHeight * (i / gridLines));
      svg += `
        <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
        <text x="${padLeft - 10}" y="${yPos + 4}" fill="#8892b0" font-size="11" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
          $${(yVal / 1000).toFixed(0)}B
        </text>
      `;
    }

    // Bars and labels
    const step = chartWidth / projections.length;
    let pathD = '';

    projections.forEach((item, idx) => {
      const x = padLeft + (idx * step) + (step / 2);
      const barHeight = (item.fcff / maxVal) * chartHeight;
      const y = padTop + chartHeight - barHeight;

      if (idx === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }

      svg += `
        <defs>
          <linearGradient id="barGrad${idx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#4facfe" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
        <rect x="${x - (barWidth / 2)}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="url(#barGrad${idx})" stroke="#00f2fe" stroke-width="1.2">
          <title>${item.year}: $${item.fcff.toLocaleString()}M FCFF</title>
        </rect>
        <text x="${x}" y="${y - 8}" fill="#00f2fe" font-size="11" font-weight="600" text-anchor="middle" font-family="-apple-system, sans-serif">
          $${(item.fcff / 1000).toFixed(1)}B
        </text>
        <text x="${x}" y="${height - padBottom + 18}" fill="#ccd6f6" font-size="12" font-weight="500" text-anchor="middle" font-family="-apple-system, sans-serif">
          ${item.year}
        </text>
      `;
    });

    // Trend line over bars
    svg += `<path d="${pathD}" fill="none" stroke="#64ffda" stroke-width="2.5" stroke-dasharray="4,2"/>`;

    // Points on trend line
    projections.forEach((item, idx) => {
      const x = padLeft + (idx * step) + (step / 2);
      const barHeight = (item.fcff / maxVal) * chartHeight;
      const y = padTop + chartHeight - barHeight;
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="#0a192f" stroke="#64ffda" stroke-width="2" />`;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  },

  /**
   * Render Sensitivity Matrix Table with Dynamic Heatmap Coloring
   */
  renderSensitivityHeatmap: function(containerId, matrix, currentPrice, rowHeader, colHeader, isPctRow, isPctCol) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `<div class="heatmap-wrapper"><table class="financial-table heatmap-table">`;

    // Table Header
    html += `<thead><tr><th class="corner-header">${rowHeader} \\ ${colHeader}</th>`;
    matrix[0].cells.forEach(cell => {
      const label = isPctCol ? `${(cell.col * 100).toFixed(2)}%` : `${cell.col.toFixed(1)}x`;
      html += `<th>${label}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Table Rows
    matrix.forEach(row => {
      const rowLabel = isPctRow ? `${(row.rowVal * 100).toFixed(2)}%` : `${row.rowVal.toFixed(1)}x`;
      html += `<tr><td class="row-header"><strong>${rowLabel}</strong></td>`;

      row.cells.forEach(cell => {
        const diffPct = ((cell.price - currentPrice) / currentPrice) * 100;
        let colorClass = 'heat-neutral';
        let badgeColor = '#ffb703';

        if (diffPct > 15) {
          colorClass = 'heat-super-bull';
          badgeColor = '#00f59b';
        } else if (diffPct > 0) {
          colorClass = 'heat-bull';
          badgeColor = '#2ec4b6';
        } else if (diffPct < -20) {
          colorClass = 'heat-super-bear';
          badgeColor = '#ff4d6d';
        } else if (diffPct < 0) {
          colorClass = 'heat-bear';
          badgeColor = '#ff758f';
        }

        const isBase = Math.abs(diffPct) < 3;
        const cellClass = `${colorClass} ${isBase ? 'heat-base-cell' : ''}`;

        html += `
          <td class="${cellClass}">
            <div class="cell-price">$${cell.price.toFixed(2)}</div>
            <div class="cell-diff" style="color: ${badgeColor};">
              ${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%
            </div>
          </td>
        `;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }
};

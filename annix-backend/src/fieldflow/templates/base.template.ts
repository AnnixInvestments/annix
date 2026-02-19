export function formatCurrencyZA(value: number): string {
  return `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateZA(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function baseStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12px;
        color: #374151;
        line-height: 1.5;
        padding: 40px;
        background: #fff;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 20px;
        border-bottom: 2px solid #2563EB;
        margin-bottom: 30px;
      }

      .header-logo {
        font-size: 24px;
        font-weight: 700;
        color: #2563EB;
      }

      .header-info {
        text-align: right;
      }

      .header-info h1 {
        font-size: 18px;
        color: #111827;
        margin-bottom: 4px;
      }

      .header-info p {
        font-size: 11px;
        color: #6B7280;
      }

      h2 {
        font-size: 14px;
        color: #111827;
        margin: 20px 0 12px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid #E5E7EB;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }

      .stat-card {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 12px;
      }

      .stat-card.green {
        background: #F0FDF4;
        border-color: #BBF7D0;
      }

      .stat-card.blue {
        background: #EFF6FF;
        border-color: #BFDBFE;
      }

      .stat-card.red {
        background: #FEF2F2;
        border-color: #FECACA;
      }

      .stat-card.yellow {
        background: #FFFBEB;
        border-color: #FDE68A;
      }

      .stat-label {
        font-size: 10px;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
        margin-top: 4px;
      }

      .stat-subvalue {
        font-size: 10px;
        color: #6B7280;
        margin-top: 2px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      th {
        background: #F9FAFB;
        padding: 10px 12px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #E5E7EB;
      }

      td {
        padding: 10px 12px;
        border-bottom: 1px solid #F3F4F6;
        font-size: 11px;
      }

      tr:last-child td {
        border-bottom: none;
      }

      .status-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
      }

      .status-new { background: #E5E7EB; color: #374151; }
      .status-contacted { background: #DBEAFE; color: #1D4ED8; }
      .status-qualified { background: #FEF3C7; color: #B45309; }
      .status-proposal { background: #EDE9FE; color: #7C3AED; }
      .status-won { background: #D1FAE5; color: #047857; }
      .status-lost { background: #FEE2E2; color: #DC2626; }
      .status-completed { background: #D1FAE5; color: #047857; }
      .status-cancelled { background: #E5E7EB; color: #6B7280; }
      .status-no_show { background: #FEE2E2; color: #DC2626; }
      .status-scheduled { background: #DBEAFE; color: #1D4ED8; }

      .chart-container {
        margin: 20px 0;
        padding: 16px;
        background: #F9FAFB;
        border-radius: 8px;
      }

      .bar-chart {
        display: flex;
        align-items: flex-end;
        height: 120px;
        gap: 8px;
      }

      .bar-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bar {
        width: 100%;
        background: #3B82F6;
        border-radius: 4px 4px 0 0;
        min-height: 4px;
      }

      .bar.secondary {
        background: #22C55E;
      }

      .bar-label {
        font-size: 9px;
        color: #6B7280;
        margin-top: 6px;
        text-align: center;
      }

      .legend {
        display: flex;
        gap: 16px;
        margin-top: 12px;
        font-size: 10px;
        color: #6B7280;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #E5E7EB;
        text-align: center;
        font-size: 10px;
        color: #9CA3AF;
      }

      .page-break {
        page-break-before: always;
      }
    </style>
  `;
}

export function wrapHtml(
  content: string,
  title: string,
  repName: string,
  dateRange: string,
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${baseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="header-logo">Annix Rep</div>
        <div class="header-info">
          <h1>${title}</h1>
          <p>${dateRange}</p>
          <p>Generated for: ${repName}</p>
        </div>
      </div>

      ${content}

      <div class="footer">
        <p>Generated by Annix Rep on ${new Date().toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
      </div>
    </body>
    </html>
  `;
}

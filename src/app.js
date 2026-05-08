const DATA_URL = "./data/holdings.json";

const fallbackData = {
  sourceUrl:
    "https://www.imgp.com/us/fund/us53700t8273-imgp-dbi-managed-futures-strategy-etf/#portfolio",
  fetchedAt: "2026-05-08T00:00:00.000Z",
  asOf: "05/08/2026",
  netAssets: 3542036199.99,
  holdings: [
    ["US 2YR NOTE (CBT) JUN26", "TUM6", -3021400000, -3127267015.88, -0.88],
    ["JPN YEN CURR FUT  JUN26", "JYM6", -23826250, -1524880000, -0.43],
    ["US 10YR NOTE (CBT)JUN26", "TYM6", -839100000, -927336609.38, -0.26],
    ["US LONG BOND(CBT) JUN26", "USM6", -377300000, -426938531.25, -0.12],
    ["MSCI EAFEJUN26", "MFSM6", -87600, -268231200, -0.08],
    ["GOLD 100 OZ FUTR JUN26", "GCM6", -23900, -112590510, -0.03],
    ["TREASURY BILL", "-", 30000000, 29841220.8, 0.01],
    ["TREASURY BILL", "-", 37000000, 36693753.22, 0.01],
    ["TREASURY BILL", "-", 58000000, 57560730.62, 0.02],
    ["TREASURY BILL", "-", 147000000, 146635051.92, 0.04],
    ["TREASURY BILL", "-", 405000000, 402781782.6, 0.11],
    ["WTI CRUDEFUTURE  JUL26", "CLN6", 6282000, 572101740, 0.16],
    ["MSCI EMGMKT       JUN26", "MESM6", 451850, 768958330, 0.22],
    ["S+P500 EMINI FUT  JUN26", "ESM6", 122950, 905280850, 0.26],
    ["TREASURY BILL", "-", 2121000000, 2106419524.86, 0.59],
    ["EURO FX CURR FUT  JUN26", "ECM6", 1907250000, 2244928612.5, 0.63]
  ].map(([securityName, ticker, sharesQty, marketValue, weight]) => ({
    date: "05/08/2026",
    securityName,
    cusip: "-",
    ticker,
    sharesQty,
    marketValue,
    weight
  }))
};

const state = {
  data: fallbackData,
  query: "",
  absolute: false
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

function percent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function classify(name) {
  const n = name.toUpperCase();
  if (n.includes("TREASURY BILL") || n.includes("TOTAL NET ASSETS")) return "Cash";
  if (n.includes("NOTE") || n.includes("BOND")) return "Rates";
  if (n.includes("YEN") || n.includes("EURO FX") || n.includes("CURR")) return "FX";
  if (n.includes("MSCI") || n.includes("S+P") || n.includes("EMINI")) return "Equity";
  if (n.includes("GOLD") || n.includes("CRUDE") || n.includes("WTI")) return "Commodity";
  return "Other";
}

function identifyProduct(name) {
  const n = name.toUpperCase().replace(/\s+/g, " ");
  if (n.includes("US 2YR NOTE")) return "U.S. 2-Year Treasury";
  if (n.includes("US 10YR NOTE")) return "U.S. 10-Year Treasury";
  if (n.includes("US LONG BOND")) return "U.S. Long Bond";
  if (n.includes("JPN YEN")) return "Japanese Yen";
  if (n.includes("EURO FX")) return "Euro";
  if (n.includes("WTI") || n.includes("CRUDE")) return "WTI Crude Oil";
  if (n.includes("GOLD")) return "Gold";
  if (n.includes("S+P500") || n.includes("EMINI")) return "S&P 500";
  if (n.includes("MSCI EMGMKT")) return "MSCI Emerging Markets";
  if (n.includes("MSCI EAFE")) return "MSCI EAFE";
  if (n.includes("TREASURY BILL")) return "U.S. Treasury Bills / Cash Collateral";
  return name.trim();
}

function cleanHoldings(holdings) {
  return holdings
    .filter((item) => !item.securityName.toUpperCase().includes("TOTAL NET ASSETS"))
    .map((item) => ({
      ...item,
      product: identifyProduct(item.securityName),
      assetClass: classify(item.securityName),
      absWeight: Math.abs(item.weight)
    }));
}

function groupByProduct(holdings) {
  const groups = new Map();
  for (const item of holdings) {
    const current = groups.get(item.product) || 0;
    groups.set(item.product, current + item.weight);
  }
  return [...groups.entries()]
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

function renderSummary(holdings) {
  const net = holdings.reduce((sum, item) => sum + item.weight, 0);
  const gross = holdings.reduce((sum, item) => sum + Math.abs(item.weight), 0);
  document.querySelector("#asOf").textContent = state.data.asOf || "-";
  document.querySelector("#netAssets").textContent = money.format(state.data.netAssets || 0);
  document.querySelector("#netExposure").textContent = percent(net);
  document.querySelector("#grossExposure").textContent = percent(gross);
  document.querySelector("#fetchedAt").textContent = `Updated ${new Date(
    state.data.fetchedAt
  ).toLocaleString("ko-KR")}`;
}

function renderClassChart(holdings) {
  const groups = groupByProduct(holdings);
  const max = Math.max(...groups.map((item) => Math.abs(item.weight)), 1);
  document.querySelector("#classChart").innerHTML = groups
    .map((item) => {
      const width = Math.max(1, (Math.abs(item.weight) / max) * 50);
      const direction = item.weight >= 0 ? "long" : "short";
      return `
        <div class="class-row">
          <div class="class-name">${escapeHtml(item.name)}</div>
          <div class="axis">
            <div class="bar ${direction}" style="width:${width}%"></div>
          </div>
          <div class="class-value">${percent(item.weight)}</div>
        </div>
      `;
    })
    .join("");
}

function renderTopPositions(holdings) {
  document.querySelector("#topPositions").innerHTML = [...holdings]
    .sort((a, b) => b.absWeight - a.absWeight)
    .slice(0, 5)
    .map((item) => {
      const direction = item.weight >= 0 ? "long" : "short";
      return `
        <article class="position-card">
          <div>
            <div class="security">${escapeHtml(item.securityName)}</div>
            <div class="meta">${escapeHtml(item.product)} / ${escapeHtml(item.assetClass)} / ${escapeHtml(item.ticker || "-")}</div>
          </div>
          <div class="pill ${direction}">${percent(item.weight)}</div>
        </article>
      `;
    })
    .join("");
}

function renderTable(holdings) {
  const query = state.query.trim().toUpperCase();
  const filtered = holdings
    .filter((item) => {
      if (!query) return true;
      return `${item.securityName} ${item.product} ${item.ticker} ${item.assetClass}`
        .toUpperCase()
        .includes(query);
    })
    .sort((a, b) => {
      const left = state.absolute ? a.absWeight : a.weight;
      const right = state.absolute ? b.absWeight : b.weight;
      return right - left;
    });

  document.querySelector("#holdingsBody").innerHTML = filtered
    .map(
      (item) => `
        <tr>
          <td data-label="Security"><strong>${escapeHtml(item.securityName)}</strong></td>
          <td data-label="Product"><span class="product-tag">${escapeHtml(item.product)}</span></td>
          <td data-label="Class"><span class="class-tag">${escapeHtml(item.assetClass)}</span></td>
          <td data-label="Ticker">${escapeHtml(item.ticker || "-")}</td>
          <td data-label="Shares Qty">${number.format(item.sharesQty || 0)}</td>
          <td data-label="Market Value">${money.format(item.marketValue || 0)}</td>
          <td data-label="Weight">${percent(item.weight)}</td>
        </tr>
      `
    )
    .join("");
}

function render() {
  const holdings = cleanHoldings(state.data.holdings || []);
  renderSummary(holdings);
  renderClassChart(holdings);
  renderTopPositions(holdings);
  renderTable(holdings);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    console.warn("Using fallback DBMF data", error);
  }
  render();
}

document.querySelector("#searchBox").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

document.querySelector("#toggleSign").addEventListener("click", () => {
  state.absolute = !state.absolute;
  document.querySelector("#toggleSign").textContent = state.absolute ? "Absolute" : "Signed";
  render();
});

loadData();

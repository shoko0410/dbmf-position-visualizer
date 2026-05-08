import { mkdir, writeFile } from "node:fs/promises";

const SOURCE_URL =
  "https://www.imgp.com/us/fund/us53700t8273-imgp-dbi-managed-futures-strategy-etf/";
const OUTPUT_PATH = new URL("../data/holdings.json", import.meta.url);

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#038;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function textFromCell(cell) {
  return decodeHtml(cell.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function parseNumber(value) {
  const cleaned = value.replace(/[$,%\s,]/g, "");
  if (!cleaned || cleaned === "-") return null;
  return Number(cleaned);
}

function extractRows(html) {
  const table = html.match(
    /<table[^>]+id=["']breakdown-holdings-us["'][\s\S]*?<\/table>/i
  )?.[0];

  if (!table) {
    throw new Error("Could not find #breakdown-holdings-us in source HTML.");
  }

  return [...table.matchAll(/<tr[^>]*class=["'][^"']*holding[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textFromCell(cell[1])))
    .filter((cells) => cells.length === 7 && cells[0] !== "Date")
    .map(([date, securityName, cusip, ticker, sharesQty, marketValue, weight]) => ({
      date,
      securityName,
      cusip,
      ticker,
      sharesQty: parseNumber(sharesQty),
      marketValue: parseNumber(marketValue),
      weight: parseNumber(weight)
    }));
}

function extractPricingNetAssets(html) {
  const match = html.match(
    /Net Assets of the Fund[\s\S]*?<span class=["']content["'][^>]*>\s*([^<]+)\s*<\/span>/i
  );
  return match ? parseNumber(textFromCell(match[1])) : null;
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; DBMFPositionMonitor/1.0; +https://github.com/)"
    }
  });

  if (!response.ok) {
    throw new Error(`Source request failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  const holdings = extractRows(html);
  const totalRow = holdings.find((item) => item.securityName === "TOTAL NET ASSETS");
  const firstHolding = holdings.find((item) => item.securityName !== "TOTAL NET ASSETS");

  const output = {
    sourceUrl: `${SOURCE_URL}#portfolio`,
    fetchedAt: new Date().toISOString(),
    asOf: firstHolding?.date || null,
    netAssets: totalRow?.marketValue || extractPricingNetAssets(html),
    holdings
  };

  if (!output.asOf || !output.holdings.length) {
    throw new Error("Parsed holdings are empty.");
  }

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Wrote ${holdings.length} DBMF rows for ${output.asOf}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const sampleQuotes = {
  MSFT: { name: "Microsoft", price: 421.8, dailyChange: 3.05, color: "#4c8f73", background: "#eaf3ed" },
  AAPL: { name: "Apple", price: 191.45, dailyChange: -1.12, color: "#8a75b5", background: "#f0edf7" },
  TSLA: { name: "Tesla", price: 176.6, dailyChange: 2.44, color: "#bd7181", background: "#f7ecef" },
};

const exampleHoldings = [
  { symbol: "MSFT", shares: 12, averageCost: 380.5 },
  { symbol: "AAPL", shares: 20, averageCost: 175.2 },
  { symbol: "TSLA", shares: 15, averageCost: 185.75 },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
const holdingsBody = document.querySelector("#holdings-body");
const allocationList = document.querySelector("#allocation-list");
const statusMessage = document.querySelector("#portfolio-status");
const fileInput = document.querySelector("#csv-file");
let holdings = exampleHoldings.map((holding) => ({ ...holding }));

function formatCurrency(value) {
  return currency.format(value);
}

function appendCell(row, value, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function renderHoldings() {
  holdingsBody.replaceChildren();
  let totalValue = 0;
  let investedValue = 0;
  let quotedInvested = 0;
  let totalReturn = 0;
  let dailyChange = 0;
  let quotedCount = 0;
  const allocations = [];

  for (const holding of holdings) {
    const quote = sampleQuotes[holding.symbol];
    const cost = holding.shares * holding.averageCost;
    investedValue += cost;
    const row = document.createElement("tr");
    const assetCell = document.createElement("td");
    const asset = document.createElement("div");
    asset.className = "asset-cell";
    const mark = document.createElement("span");
    mark.className = "asset-mark";
    mark.textContent = holding.symbol.slice(0, 1);
    if (quote) {
      mark.style.setProperty("--asset-bg", quote.background);
      mark.style.setProperty("--asset-color", quote.color);
    }
    const assetName = document.createElement("span");
    assetName.className = "asset-name";
    const ticker = document.createElement("strong");
    ticker.textContent = holding.symbol;
    const company = document.createElement("span");
    company.textContent = quote?.name ?? "No sample quote";
    assetName.append(ticker, company);
    asset.append(mark, assetName);
    assetCell.append(asset);
    row.append(assetCell);
    appendCell(row, number.format(holding.shares));
    appendCell(row, formatCurrency(holding.averageCost));

    if (quote) {
      const value = holding.shares * quote.price;
      const gain = value - cost;
      totalValue += value;
      quotedInvested += cost;
      totalReturn += gain;
      dailyChange += holding.shares * quote.dailyChange;
      quotedCount += 1;
      allocations.push({ ...holding, value, quote });
      appendCell(row, formatCurrency(quote.price));
      appendCell(row, formatCurrency(value), "value-cell");
      appendCell(row, `${gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(gain))}`, gain >= 0 ? "positive" : "negative");
    } else {
      appendCell(row, "Unavailable");
      appendCell(row, "—", "value-cell");
      appendCell(row, "Unavailable");
    }
    holdingsBody.append(row);
  }

  if (!holdings.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-row";
    cell.textContent = "No positions yet. Import a CSV to get started.";
    row.append(cell);
    holdingsBody.append(row);
  }

  const returnPercent = quotedInvested ? (totalReturn / quotedInvested) * 100 : 0;
  document.querySelector("#total-value").textContent = formatCurrency(totalValue);
  document.querySelector("#invested-value").textContent = formatCurrency(investedValue);
  document.querySelector("#holding-count").textContent = number.format(holdings.length);
  document.querySelector("#holding-count-badge").textContent = number.format(holdings.length);

  const dailyElement = document.querySelector("#daily-change");
  dailyElement.textContent = `${dailyChange >= 0 ? "+" : "−"}${formatCurrency(Math.abs(dailyChange))}`;
  dailyElement.className = dailyChange >= 0 ? "change-positive" : "negative";

  const returnElement = document.querySelector("#return-value");
  returnElement.textContent = `${totalReturn >= 0 ? "+" : "−"}${formatCurrency(Math.abs(totalReturn))}`;
  returnElement.className = `summary-value ${totalReturn >= 0 ? "positive" : "negative"}`;
  const percentElement = document.querySelector("#return-percent");
  percentElement.textContent = `${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(2)}% on quoted positions`;
  percentElement.className = `summary-foot ${totalReturn >= 0 ? "positive" : "negative"}`;

  renderAllocation(allocations, totalValue);
}

function renderAllocation(allocations, totalValue) {
  allocationList.replaceChildren();
  if (!allocations.length || !totalValue) {
    const empty = document.createElement("li");
    empty.className = "allocation-empty";
    empty.textContent = "Allocation will appear when positions have sample prices.";
    allocationList.append(empty);
    return;
  }

  for (const holding of [...allocations].sort((a, b) => b.value - a.value)) {
    const item = document.createElement("li");
    item.className = "allocation-item";
    const label = document.createElement("span");
    label.className = "allocation-name";
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    dot.style.setProperty("--asset-color", holding.quote.color);
    const name = document.createElement("span");
    name.textContent = holding.symbol;
    label.append(dot, name);
    const percent = document.createElement("span");
    percent.className = "allocation-percent";
    percent.textContent = `${((holding.value / totalValue) * 100).toFixed(1)}%`;
    const track = document.createElement("span");
    track.className = "allocation-track";
    const bar = document.createElement("span");
    bar.style.width = `${(holding.value / totalValue) * 100}%`;
    bar.style.setProperty("--asset-color", holding.quote.color);
    track.append(bar);
    item.append(label, percent, track);
    allocationList.append(item);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  let quoteClosed = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        cell += character;
      }
    } else if (quoteClosed && character === ",") {
      row.push(cell);
      cell = "";
      quoteClosed = false;
    } else if (quoteClosed && (character === "\n" || character === "\r")) {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      quoteClosed = false;
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else if (quoteClosed && /\s/.test(character)) {
      continue;
    } else if (quoteClosed) {
      throw new Error("Unexpected text follows a quoted field.");
    } else if (character === '"') {
      if (cell.length) throw new Error("A quote appears in an unexpected place.");
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("A quoted field is not closed.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one position.");

  const headers = rows[0].map((header) => {
    const cleanHeader = header.replace(/^\uFEFF/, "").trim().toLowerCase();
    return cleanHeader;
  });
  if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column names.");
  const required = ["symbol", "shares", "average_cost"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
  if (rows.length - 1 > 500) throw new Error("Please import no more than 500 positions at a time.");

  const indices = Object.fromEntries(required.map((header) => [header, headers.indexOf(header)]));
  const seen = new Set();
  return rows.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) throw new Error(`Row ${rowIndex + 2} has a different number of columns.`);
    const symbol = cells[indices.symbol].trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(symbol)) {
      throw new Error(`Row ${rowIndex + 2} has an invalid symbol.`);
    }
    if (seen.has(symbol)) throw new Error(`The symbol ${symbol} appears more than once.`);
    seen.add(symbol);

    const sharesText = cells[indices.shares].trim();
    const costText = cells[indices.average_cost].trim();
    const shares = Number(sharesText);
    const averageCost = Number(costText);
    if (!sharesText || !Number.isFinite(shares) || shares <= 0 || shares > 1_000_000_000_000) {
      throw new Error(`Row ${rowIndex + 2} needs a share quantity greater than zero.`);
    }
    if (!costText || !Number.isFinite(averageCost) || averageCost < 0 || averageCost > 1_000_000_000_000) {
      throw new Error(`Row ${rowIndex + 2} needs an average cost of zero or more.`);
    }
    return { symbol, shares, averageCost };
  });
}

async function importFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
    statusMessage.textContent = "Choose a CSV file to import.";
    return;
  }
  if (file.size > 1_000_000) {
    statusMessage.textContent = "This file is larger than 1 MB. Choose a smaller CSV.";
    return;
  }
  try {
    const imported = parseCsv(await file.text());
    holdings = imported;
    renderHoldings();
    const unavailable = holdings.filter((holding) => !sampleQuotes[holding.symbol]).length;
    const privacyNote = "Your file was not uploaded or saved.";
    statusMessage.textContent = unavailable
      ? `Imported ${holdings.length} positions locally. ${unavailable} ${unavailable === 1 ? "has" : "have"} no sample quote; market value and return totals use quoted positions only. ${privacyNote}`
      : `Imported ${holdings.length} positions locally. ${privacyNote}`;
  } catch (error) {
    statusMessage.textContent = error instanceof Error ? error.message : "The CSV could not be read.";
  } finally {
    fileInput.value = "";
  }
}

fileInput.addEventListener("change", (event) => {
  importFile(event.currentTarget.files?.[0]);
});

renderHoldings();

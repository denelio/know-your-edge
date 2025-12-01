import type {
  SimulationConfig,
  EquityPoint,
  SimulationStats,
  PropFirmConfig,
  FeeConfig,
  ParsedTrade,
} from "../types";

// Helper to check if a trade is a win
const isWin = (winRate: number) => Math.random() * 100 < winRate;

// Box-Muller transform for Normal Distribution
// Used to simulate "Bad Months" vs "Good Months" (Win Rate Variance)
const randomNormal = (mean: number, stdDev: number): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
};

// Simple Poisson-like generator to simulate varying trade volume per day
const getDailyTradeVolume = (tradesPerWeek: number): number => {
  const lambda = tradesPerWeek / 5; // Avg trades per day
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
};

export const runMarketSimulations = (
  config: SimulationConfig
): { chartData: EquityPoint[]; stats: SimulationStats[] } => {
  const {
    initialCapital,
    riskPerTradePercent,
    winRatePercent,
    rewardToRiskRatio,
    numberOfTrades,
    simulationCount,
  } = config;

  const allStats: SimulationStats[] = [];
  const chartData: EquityPoint[] = Array.from(
    { length: numberOfTrades + 1 },
    (_, i) => {
      const point: EquityPoint = { tradeNumber: i, equity: 0 };
      for (let s = 0; s < simulationCount; s++) {
        point[`sim_${s}`] = initialCapital;
      }
      return point;
    }
  );

  for (let s = 0; s < simulationCount; s++) {
    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdown = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    chartData[0][`sim_${s}`] = initialCapital;

    // Apply slight variance to win rate per simulation for realism
    const simWinRate = Math.max(
      1,
      Math.min(99, randomNormal(winRatePercent, 2))
    );

    for (let t = 1; t <= numberOfTrades; t++) {
      const riskAmount = currentEquity * (riskPerTradePercent / 100);
      const win = isWin(simWinRate);

      if (win) {
        const profit = riskAmount * rewardToRiskRatio;
        currentEquity += profit;
        grossProfit += profit;

        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else {
        const loss = riskAmount;
        currentEquity -= loss;
        grossLoss += loss;

        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak)
          maxLossStreak = currentLossStreak;
      }

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;

      chartData[t][`sim_${s}`] = currentEquity;
    }

    allStats.push({
      finalBalance: currentEquity,
      returnPercent: ((currentEquity - initialCapital) / initialCapital) * 100,
      maxDrawdownPercent: maxDrawdown,
      profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
      maxWinStreak,
      maxLossStreak,
    });
  }

  return { chartData, stats: allStats };
};

export const runPropFirmSimulation = (
  config: PropFirmConfig,
  iterations: number = 2000
): {
  results: {
    pass: number;
    failMaxDD: number;
    failDailyDD: number;
  };
  avgDays: number;
} => {
  let pass = 0;
  let failMaxDD = 0;
  let failDailyDD = 0;
  let totalDaysForPass = 0;

  const MAX_SIM_DAYS = 1000; // Cap to prevent infinite loops

  for (let i = 0; i < iterations; i++) {
    let currentPhase = 0;
    let totalDays = 0;
    let failed = false;

    // REALISM FACTOR:
    const runWinRate = Math.max(
      5,
      Math.min(95, randomNormal(config.winRatePercent, 4.5))
    );

    // Loop through phases
    while (currentPhase < config.steps && !failed) {
      const phaseRules = config.phases[currentPhase];
      let equity = config.accountSize;
      let highWaterMark = config.accountSize;

      const profitTarget =
        config.accountSize * (phaseRules.profitTargetPercent / 100);
      const maxLossVal =
        config.accountSize * (phaseRules.maxTotalDrawdownPercent / 100);
      const staticMinEquity = config.accountSize - maxLossVal;

      let phaseDay = 0;
      let phaseOutcome: "PASS" | "FAIL" | null = null;

      while (phaseOutcome === null) {
        phaseDay++;
        totalDays++;

        if (totalDays > MAX_SIM_DAYS) {
          failed = true;
          failMaxDD++;
          phaseOutcome = "FAIL";
          break;
        }

        const startOfDayEquity = equity;
        const maxDailyLossVal =
          startOfDayEquity * (phaseRules.maxDailyDrawdownPercent / 100);
        const minEquityForDailyDD = startOfDayEquity - maxDailyLossVal;

        const tradesToday = getDailyTradeVolume(config.tradesPerWeek);

        for (let t = 0; t < tradesToday; t++) {
          const riskAmount = equity * (config.riskPerTradePercent / 100);
          const win = isWin(runWinRate);

          if (win) {
            equity += riskAmount * config.rewardToRiskRatio;
            if (equity > highWaterMark) highWaterMark = equity;
          } else {
            equity -= riskAmount;
          }

          if (equity <= minEquityForDailyDD) {
            failed = true;
            failDailyDD++;
            phaseOutcome = "FAIL";
            break;
          }

          let currentMinEquityForMaxDD = staticMinEquity;
          if (config.isTrailingDrawdown) {
            currentMinEquityForMaxDD = highWaterMark - maxLossVal;
          }

          if (equity <= currentMinEquityForMaxDD) {
            failed = true;
            failMaxDD++;
            phaseOutcome = "FAIL";
            break;
          }

          if (equity >= config.accountSize + profitTarget) {
            phaseOutcome = "PASS";
            break;
          }
        }

        if (phaseOutcome === "PASS") break;
        if (failed) break;
      }

      if (phaseOutcome === "PASS") {
        currentPhase++;
      } else {
        break;
      }
    }

    if (!failed) {
      pass++;
      totalDaysForPass += totalDays;
    }
  }

  return {
    results: { pass, failMaxDD, failDailyDD },
    avgDays: pass > 0 ? totalDaysForPass / pass : 0,
  };
};

export const calculateFeeImpact = (config: FeeConfig) => {
  const {
    winRate,
    rewardRisk,
    riskPerTrade,
    trades,
    commissionPerUnit,
    spread,
    pointValue,
    lotSize,
  } = config;

  // Cost calculation
  const spreadCostPerTrade = spread * pointValue * lotSize;
  const totalCostPerTrade = commissionPerUnit * lotSize + spreadCostPerTrade;

  // Expected Value (Gross)
  const winAmt = riskPerTrade * rewardRisk;
  const lossAmt = riskPerTrade;

  const evGross = (winRate / 100) * winAmt - (1 - winRate / 100) * lossAmt;

  // Expected Value (Net)
  const evNet =
    (winRate / 100) * (winAmt - totalCostPerTrade) -
    (1 - winRate / 100) * (lossAmt + totalCostPerTrade);

  // Generate data
  const data = Array.from({ length: trades + 1 }, (_, i) => ({
    trade: i,
    Gross: i * evGross,
    Net: i * evNet,
    Fees: i * (evGross - evNet),
  }));

  return { data, totalCostPerTrade };
};

export const calculateRiskOfRuinMonteCarlo = (
  winRate: number,
  rewardRisk: number,
  riskPerTrade: number
): number => {
  // Monte Carlo approximation
  const SIMS = 5000;
  const TRADES = 1000;
  let ruins = 0;
  const startCapital = 10000;
  const ruinThreshold = startCapital * 0.1;

  for (let i = 0; i < SIMS; i++) {
    let equity = startCapital;
    let ruined = false;
    // Apply variation here too
    const simWinRate = Math.max(1, Math.min(99, randomNormal(winRate, 3)));

    for (let t = 0; t < TRADES; t++) {
      const riskAmt = equity * (riskPerTrade / 100);
      const isWin = Math.random() * 100 < simWinRate;
      if (isWin) equity += riskAmt * rewardRisk;
      else equity -= riskAmt;

      if (equity <= ruinThreshold) {
        ruined = true;
        break;
      }
    }
    if (ruined) ruins++;
  }

  return (ruins / SIMS) * 100;
};

export const calculateRecovery = (drawdown: number) => {
  if (drawdown >= 100) return Infinity;
  return (100 / (100 - drawdown) - 1) * 100;
};

export const calculateStreakProb = (
  winRate: number,
  trades: number,
  streakLength: number
): number => {
  const lossRate = 1 - winRate / 100;
  const probStreak = Math.pow(lossRate, streakLength);
  const chance = 1 - Math.pow(1 - probStreak, trades);
  return Math.min(chance * 100, 99.99);
};

// --- DATA PARSERS ---

// Helper to parse DD/MM/YYYY or YYYY.MM.DD
const parseDateString = (dateStr: string): number | undefined => {
  if (!dateStr) return undefined;
  const cleanStr = dateStr.trim();

  // Try YYYY.MM.DD (MT4 standard)
  if (cleanStr.match(/^\d{4}\.\d{2}\.\d{2}/)) {
    const parts = cleanStr.split(/[. :]/); // Split by dot, space, or colon
    if (parts.length >= 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const d = parseInt(parts[2]);
      const h = parts.length > 3 ? parseInt(parts[3]) : 0;
      const min = parts.length > 4 ? parseInt(parts[4]) : 0;
      return new Date(y, m, d, h, min).getTime();
    }
  }

  // Try DD/MM/YYYY (Common cTrader/European)
  if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const parts = cleanStr.split(/[\/ :]/);
    if (parts.length >= 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      // Handle HH:MM:SS.ms
      const h = parts.length > 3 ? parseInt(parts[3]) : 0;
      const min = parts.length > 4 ? parseInt(parts[4]) : 0;
      const s = parts.length > 5 ? parseInt(parts[5]) : 0;
      return new Date(y, m, d, h, min, s).getTime();
    }
  }

  // Try standard Date.parse (Handles "Oct 1 2025", "Nov 10, 2025", etc)
  const ts = Date.parse(cleanStr);
  if (!isNaN(ts)) return ts;

  return undefined;
};

export const parseGenericCSV = (
  text: string,
  startBalance: number
): ParsedTrade[] | null => {
  // Remove blank lines
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Robust separator detection
  // Scan first 10 lines to determine the most likely separator
  const separators = [",", "\t", ";", "|"];
  const scores = separators.map((sep) => ({ sep, count: 0 }));

  const checkLines = lines.slice(0, 10);
  checkLines.forEach((line) => {
    scores.forEach((sepObj) => {
      const parts = line.split(sepObj.sep);
      // We give points if it splits into at least 2 columns
      if (parts.length > 1) sepObj.count++;
    });
  });

  // Sort by count descending
  scores.sort((a, b) => b.count - a.count);

  // Default to comma, but use detected winner if it has hits
  let separator = ",";
  if (scores[0].count > 0) {
    separator = scores[0].sep;
  }

  // Parse Header
  const firstLine = lines[0];
  const header = firstLine
    .toLowerCase()
    .split(separator)
    .map((h) => h.trim());

  const pnlIndex = header.findIndex(
    (h) => h.includes("pnl") || h.includes("profit") || h.includes("net")
  );
  const timeIndex = header.findIndex(
    (h) => h.includes("date") || h.includes("time")
  );

  if (pnlIndex === -1) return null;

  const trades: ParsedTrade[] = [];

  // Initial State
  // We construct the trade list relative to the startBalance passed in (usually 0 for raw parsing)
  // The UI component handles recalculating absolute equity when startBalance changes
  let runningEquity = startBalance;
  trades.push({ index: 0, pnl: 0, equity: startBalance, timestamp: undefined });

  let count = 0;
  // Start from line 1 (after header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const cols = line.split(separator);

    if (cols.length <= pnlIndex) continue;

    // Clean currency symbols, spaces, keeping negative signs
    const valStr = cols[pnlIndex].replace(/[^0-9.-]/g, "");
    const pnl = parseFloat(valStr);

    let timestamp: number | undefined = undefined;
    if (timeIndex !== -1 && cols.length > timeIndex) {
      timestamp = parseDateString(cols[timeIndex]);
    }

    if (!isNaN(pnl)) {
      count++;
      runningEquity += pnl;
      trades.push({ index: count, pnl, equity: runningEquity, timestamp });
    }
  }
  return trades;
};

export const parseMT4Report = (
  html: string,
  startBalance: number
): ParsedTrade[] | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    // MT4/MT5 usually have tables. We look for rows.
    const rows = Array.from(doc.querySelectorAll("tr"));

    const trades: ParsedTrade[] = [];
    let runningEquity = startBalance;
    trades.push({ index: 0, pnl: 0, equity: startBalance });
    let count = 0;

    // Standard MT4 HTML Report structure
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length < 5) continue;

      const textContent = row.textContent?.toLowerCase() || "";
      const isTrade =
        textContent.includes("buy") || textContent.includes("sell");
      if (
        !isTrade ||
        textContent.includes("balance") ||
        textContent.includes("credit")
      )
        continue;

      const profitText =
        cells[cells.length - 1].textContent?.trim().replace(/ /g, "") || "";
      const profit = parseFloat(profitText);

      // Try to extract time.
      let closeTime: number | undefined = undefined;
      // Iterate cells backwards from profit to find a date
      for (let i = cells.length - 2; i >= 0; i--) {
        const txt = cells[i].textContent?.trim() || "";
        if (txt.match(/\d{4}\.\d{2}\.\d{2}/)) {
          closeTime = parseDateString(txt);
          break;
        }
      }

      if (!isNaN(profit)) {
        count++;
        runningEquity += profit;
        trades.push({
          index: count,
          pnl: profit,
          equity: runningEquity,
          timestamp: closeTime,
        });
      }
    }

    if (count === 0) return null;
    return trades;
  } catch (e) {
    return null;
  }
};

export const parseCTrader = (
  text: string,
  startBalance: number
): ParsedTrade[] | null => {
  // 1. Try HTML Parsing
  if (text.includes("<html") || text.includes("<table")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const tables = Array.from(doc.querySelectorAll("table"));

      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll("tr"));

        let headerRowIndex = -1;
        let pnlColIndex = -1;
        let timeColIndex = -1;

        // Scan all rows to find the header row
        for (let i = 0; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll("td, th")).map(
            (c) => c.textContent?.trim().toLowerCase() || ""
          );

          // Look for PnL column (Net $, Net USD, Net Profit, etc.)
          const pIdx = cells.findIndex(
            (h) =>
              h === "net $" ||
              h.startsWith("net ") ||
              (h.includes("profit") && !h.includes("gross"))
          );

          if (pIdx !== -1) {
            headerRowIndex = i;
            pnlColIndex = pIdx;
            timeColIndex = cells.findIndex(
              (h) =>
                h.includes("closing time") || h.includes("time") || h === "date"
            );
            break;
          }
        }

        if (headerRowIndex !== -1 && pnlColIndex !== -1) {
          const trades: ParsedTrade[] = [];
          let runningEquity = startBalance;
          trades.push({ index: 0, pnl: 0, equity: startBalance });
          let count = 0;

          // Iterate rows AFTER header row
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll("td");

            // Check if it's a valid data row (skipping malformed rows)
            if (cells.length <= pnlColIndex) continue;

            const cellText = cells[pnlColIndex].textContent?.trim() || "";

            // Clean value (handles spaces like "9 755.09" or commas)
            const cleanVal = cellText.replace(/[^0-9.-]/g, "");
            if (!cleanVal) continue;

            const pnl = parseFloat(cleanVal);
            if (isNaN(pnl)) continue;

            let timestamp: number | undefined = undefined;
            // Extract timestamp if column exists
            if (timeColIndex !== -1 && cells.length > timeColIndex) {
              const timeStr = cells[timeColIndex].textContent?.trim() || "";
              if (timeStr) {
                timestamp = parseDateString(timeStr);
              }
            }

            // Filter out "Total" rows or rows without a date (if date column was identified)
            // Real trades in cTrader HTML always have a closing time.
            if (timeColIndex !== -1 && !timestamp) continue;

            count++;
            runningEquity += pnl;
            trades.push({
              index: count,
              pnl,
              equity: runningEquity,
              timestamp,
            });
          }

          if (count > 0) return trades;
        }
      }
    } catch (e) {
      console.error("HTML parse failed", e);
    }
  }

  // 2. Try CSV/Text Parsing
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const firstLine = lines[0];
  let separator = ",";
  if (firstLine.includes("\t")) separator = "\t";
  else if (firstLine.includes(";")) separator = ";";

  const header = firstLine
    .toLowerCase()
    .split(separator)
    .map((h) => h.trim());

  let pnlIndex = header.findIndex(
    (h) =>
      h === "net $" ||
      h === "net profit" ||
      h === "profit" ||
      h.startsWith("net ")
  );
  let timeIndex = header.findIndex(
    (h) => h.includes("closing time") || h.includes("time")
  );

  if (pnlIndex === -1) return null;

  const trades: ParsedTrade[] = [];
  let runningEquity = startBalance;
  trades.push({ index: 0, pnl: 0, equity: startBalance });

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const cols = line.split(separator);

    if (cols.length <= pnlIndex) continue;

    const valStr = cols[pnlIndex].replace(/[^0-9.-]/g, "");
    const pnl = parseFloat(valStr);

    let timestamp: number | undefined = undefined;
    if (timeIndex !== -1 && cols.length > timeIndex) {
      timestamp = parseDateString(cols[timeIndex]);
    }

    if (!isNaN(pnl)) {
      count++;
      runningEquity += pnl;
      trades.push({ index: count, pnl, equity: runningEquity, timestamp });
    }
  }

  return count > 0 ? trades : null;
};

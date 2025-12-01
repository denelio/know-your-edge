import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import type { DataFormat, ParsedTrade } from "../../types";
import {
  parseGenericCSV,
  parseMT4Report,
  parseCTrader,
} from "../../services/mathUtils";

const DataAnalyzer: React.FC = () => {
  // rawTrades stores just the parsed PnL and Timestamp data, decoupled from starting balance
  const [rawTrades, setRawTrades] = useState<ParsedTrade[] | null>(null);
  const [startBalance, setStartBalance] = useState(10000);
  const [dataFormat, setDataFormat] = useState<DataFormat>("GENERIC_CSV");
  const [error, setError] = useState<string | null>(null);

  // Derived state: Calculates equity curve whenever startBalance or rawTrades changes
  const chartData = useMemo(() => {
    if (!rawTrades) return null;

    let runningEquity = startBalance;
    // Remap the raw trades to calculate the new equity curve
    return rawTrades.map((t, i) => {
      if (i === 0) return { ...t, equity: startBalance };
      runningEquity += t.pnl;
      return { ...t, equity: runningEquity };
    });
  }, [rawTrades, startBalance]);

  // Derived state: Statistics
  const stats = useMemo(() => {
    if (!chartData) return null;

    let wins = 0;
    let losses = 0;
    let totalWinAmt = 0;
    let totalLossAmt = 0;
    let maxDrawdown = 0;
    let peakEquity = startBalance;
    const timestamps: number[] = [];

    chartData.forEach((t) => {
      if (t.index === 0) return; // skip start point
      if (t.timestamp) timestamps.push(t.timestamp);

      if (t.pnl > 0) {
        wins++;
        totalWinAmt += t.pnl;
      } else {
        losses++;
        totalLossAmt += Math.abs(t.pnl);
      }

      if (t.equity > peakEquity) peakEquity = t.equity;
      const dd = ((peakEquity - t.equity) / peakEquity) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const tradeCount = chartData.length - 1;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;
    const avgWin = wins > 0 ? totalWinAmt / wins : 0;
    const avgLoss = losses > 0 ? totalLossAmt / losses : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
    const netProfit = chartData[chartData.length - 1].equity - startBalance;

    // Calculate Trades Per Week
    let tradesPerWeek = 0;
    if (timestamps.length > 1) {
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const durationMs = maxTime - minTime;
      const weeks = Math.max(durationMs / (1000 * 60 * 60 * 24 * 7), 1 / 7); // Min duration 1 day
      tradesPerWeek = tradeCount / weeks;
    }

    return {
      totalTrades: tradeCount,
      winRate,
      avgRR: rr,
      maxDrawdown,
      netProfit,
      tradesPerWeek,
    };
  }, [chartData, startBalance]);

  const getAcceptAttribute = () => {
    switch (dataFormat) {
      case "MT4_MT5":
        return ".htm,.html";
      case "CTRADER":
        return ".csv,.xlsx,.htm,.html";
      default:
        return ".csv";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setError(
        "Binary Excel (.xlsx) files cannot be read directly. Please export as HTML or CSV from cTrader."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFile(text);
    };

    reader.readAsText(file);
    // Reset input to allow re-uploading same file
    e.target.value = "";
  };

  const processFile = (text: string) => {
    try {
      setError(null);
      let parsedTrades: ParsedTrade[] | null = null;

      // Note: We pass 0 as startBalance to parsers because we handle equity calculation
      // dynamically in the useMemo hook above. The parser just needs to return PnLs.
      if (dataFormat === "GENERIC_CSV") {
        parsedTrades = parseGenericCSV(text, 0);
        if (!parsedTrades)
          throw new Error(
            "Could not find a 'PnL', 'Profit' or 'Net Profit' column."
          );
      } else if (dataFormat === "MT4_MT5") {
        parsedTrades = parseMT4Report(text, 0);
        if (!parsedTrades)
          throw new Error(
            "Could not parse MT4/5 Report. Ensure it is the standard HTML Export."
          );
      } else if (dataFormat === "CTRADER") {
        parsedTrades = parseCTrader(text, 0);
        if (!parsedTrades)
          throw new Error(
            "Could not parse cTrader file. Ensure it contains a 'Net', 'Net $' or 'Net [Currency]' column."
          );
      }

      if (!parsedTrades || parsedTrades.length === 0) {
        throw new Error("No trades found in the file.");
      }

      setRawTrades(parsedTrades);
    } catch (err: any) {
      setError(err.message || "Error parsing file.");
      setRawTrades(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Analyze My Data">
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">
              Select File Format
            </label>
            <div className="grid grid-cols-3 gap-2 bg-dark-900 p-1 rounded-lg border border-dark-700">
              <button
                onClick={() => {
                  setDataFormat("GENERIC_CSV");
                  setRawTrades(null);
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  dataFormat === "GENERIC_CSV"
                    ? "bg-primary text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Generic CSV
              </button>
              <button
                onClick={() => {
                  setDataFormat("MT4_MT5");
                  setRawTrades(null);
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  dataFormat === "MT4_MT5"
                    ? "bg-primary text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                MetaTrader 4/5 (HTML)
              </button>
              <button
                onClick={() => {
                  setDataFormat("CTRADER");
                  setRawTrades(null);
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  dataFormat === "CTRADER"
                    ? "bg-primary text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                cTrader (Web/Desktop)
              </button>
            </div>
          </div>

          {/* Helper Text */}
          <div className="bg-dark-900/50 border border-dark-700 p-4 rounded-lg text-sm text-slate-400">
            {dataFormat === "GENERIC_CSV" && (
              <p>
                Upload a <span className="text-white font-mono">.csv</span>{" "}
                file. It must contain a column named
                <span className="text-primary font-bold"> PnL</span>,{" "}
                <span className="text-primary font-bold"> Profit</span>, or{" "}
                <span className="text-primary font-bold"> Net Profit</span>{" "}
                containing the monetary value (e.g., 50.25, -20.00).
              </p>
            )}
            {dataFormat === "MT4_MT5" && (
              <p>
                Upload the standard{" "}
                <span className="text-white font-mono">.htm</span> or{" "}
                <span className="text-white font-mono">.html</span> report
                generated by MetaTrader 4 or 5 history export. Right click
                history tab {">"} Report {">"} HTML.
              </p>
            )}
            {dataFormat === "CTRADER" && (
              <p>
                Supports cTrader{" "}
                <span className="text-white font-mono">HTML</span> reports or{" "}
                <span className="text-white font-mono">Excel/CSV</span> exports.
                <br />
                <span className="text-xs text-amber-500 mt-1 block">
                  Note: If you have a binary .xlsx file, please save it as CSV
                  or use the HTML export option.
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-end border-t border-dark-700 pt-6">
            <div className="flex-1 w-full">
              <Input
                label="Starting Balance ($)"
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(Number(e.target.value))}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                Upload File
              </label>
              <input
                type="file"
                accept={getAcceptAttribute()}
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-dark-700 file:text-white hover:file:bg-dark-600 cursor-pointer"
              />
            </div>
          </div>
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}
        </div>
      </Card>

      {stats && chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Your Equity Curve" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="index"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f8fafc",
                    }}
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Equity",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Performance Stats">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-dark-700 pb-2">
                  <span className="text-slate-400">Total Trades</span>
                  <span className="font-mono text-white">
                    {stats.totalTrades}
                  </span>
                </div>
                <div className="flex justify-between border-b border-dark-700 pb-2">
                  <span className="text-slate-400">Win Rate</span>
                  <span
                    className={`font-mono ${
                      stats.winRate > 50 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-dark-700 pb-2">
                  <span className="text-slate-400">Realized R:R</span>
                  <span className="font-mono text-white">
                    1:{stats.avgRR.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-dark-700 pb-2">
                  <span className="text-slate-400">Avg. Trades / Week</span>
                  <span className="font-mono text-slate-200">
                    {stats.tradesPerWeek > 0
                      ? stats.tradesPerWeek.toFixed(1)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-dark-700 pb-2">
                  <span className="text-slate-400">Max Drawdown</span>
                  <span className="font-mono text-rose-400">
                    {stats.maxDrawdown.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Net Profit</span>
                  <span
                    className={`font-mono font-bold ${
                      stats.netProfit >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    ${stats.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalyzer;

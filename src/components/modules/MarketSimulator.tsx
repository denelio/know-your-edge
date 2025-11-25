import React, { useState, useEffect } from "react";
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
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Slider } from "../ui/Slider";
import { runMarketSimulations } from "../../services/mathUtils";
import type {
  SimulationConfig,
  EquityPoint,
  SimulationStats,
} from "../../types";

const MarketSimulator: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    initialCapital: 100000,
    riskPerTradePercent: 1,
    winRatePercent: 50,
    rewardToRiskRatio: 2,
    numberOfTrades: 100,
    simulationCount: 10,
  });

  const [isNetStats, setIsNetStats] = useState(false);
  const [data, setData] = useState<EquityPoint[]>([]);
  const [stats, setStats] = useState<SimulationStats | null>(null);

  const runSim = () => {
    const { chartData, stats: allStats } = runMarketSimulations(config);
    setData(chartData);

    const avgStats: SimulationStats = {
      finalBalance:
        allStats.reduce((acc, s) => acc + s.finalBalance, 0) / allStats.length,
      returnPercent:
        allStats.reduce((acc, s) => acc + s.returnPercent, 0) / allStats.length,
      maxDrawdownPercent:
        allStats.reduce((acc, s) => acc + s.maxDrawdownPercent, 0) /
        allStats.length,
      profitFactor:
        allStats.reduce((acc, s) => acc + s.profitFactor, 0) / allStats.length,
      maxWinStreak: Math.max(...allStats.map((s) => s.maxWinStreak)),
      maxLossStreak: Math.max(...allStats.map((s) => s.maxLossStreak)),
    };
    setStats(avgStats);
  };

  useEffect(() => {
    const timer = setTimeout(() => runSim(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const randomize = () => {
    setConfig({
      ...config,
      winRatePercent: Math.floor(Math.random() * 60) + 30,
      rewardToRiskRatio: Number((Math.random() * 3 + 0.5).toFixed(1)),
      riskPerTradePercent: Number((Math.random() * 4 + 0.5).toFixed(1)),
    });
  };

  const handleInput = (key: keyof SimulationConfig, val: string) => {
    setConfig({ ...config, [key]: Number(val) });
  };

  const getExpectancyAnalysis = () => {
    const winRate = config.winRatePercent / 100;
    const lossRate = 1 - winRate;
    const rr = config.rewardToRiskRatio;

    // Base Expectancy Formula
    const expectancy = winRate * rr - lossRate * 1;

    // Thresholds change based on if stats are Net (Adjusted) or Gross
    // If Net: Lower the bar slightly because fees are already paid.
    // If Gross: Raise the bar because fees will eat ~0.05-0.10R.
    const limits = isNetStats
      ? { marginal: 0.12, solid: 0.5 }
      : { marginal: 0.2, solid: 0.6 };

    if (expectancy <= 0) {
      return {
        val: expectancy,
        title: "Systemic Negative Drift",
        color: "text-rose-500",
        borderColor: "border-rose-500/30",
        bg: "bg-rose-500/10",
        desc: "This system has a negative mathematical expectancy. Regardless of execution or psychology, the math ensures capital depletion over time. Do not trade this live.",
      };
    } else if (expectancy > 0 && expectancy < limits.marginal) {
      return {
        val: expectancy,
        title: isNetStats ? "Thin Edge" : "High-Friction Edge",
        color: "text-orange-400",
        borderColor: "border-orange-500/30",
        bg: "bg-orange-500/10",
        desc: isNetStats
          ? "You are profitable after fees, but the edge is thin. This strategy requires high volume and perfect discipline, as variance will cause long stagnant periods."
          : "You have a theoretical edge, but it is extremely thin. After paying commissions and slippage, you will likely be breakeven or losing. This leaves no room for error.",
      };
    } else if (expectancy >= limits.marginal && expectancy < limits.solid) {
      return {
        val: expectancy,
        title: "Institutional Standard",
        color: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        bg: "bg-emerald-500/10",
        desc: "This is a professional-grade expectancy. The edge is wide enough to absorb inevitable losses and execution errors while still compounding equity sustainably.",
      };
    } else {
      return {
        val: expectancy,
        title: "Statistical Outlier",
        color: "text-purple-400",
        borderColor: "border-purple-500/30",
        bg: "bg-purple-500/10",
        desc: "These metrics are in the top tier of performance. Ensure this is not due to a small sample size or curve-fitting. Verify the edge holds across different market regimes before scaling.",
      };
    }
  };

  const edgeAnalysis = getExpectancyAnalysis();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Settings */}
      <div className="lg:col-span-1 space-y-6">
        <Card title="Simulation Settings" className="h-fit">
          <div className="space-y-6">
            <Input
              label="Initial Capital ($)"
              type="number"
              value={config.initialCapital}
              onChange={(e) => handleInput("initialCapital", e.target.value)}
            />

            <Slider
              label="Win Rate (%)"
              min={1}
              max={99}
              value={config.winRatePercent}
              onChange={(e) => handleInput("winRatePercent", e.target.value)}
              valueDisplay={`${config.winRatePercent}%`}
            />

            <Slider
              label="Risk Per Trade (%)"
              min={0.1}
              max={20}
              step={0.1}
              value={config.riskPerTradePercent}
              onChange={(e) =>
                handleInput("riskPerTradePercent", e.target.value)
              }
              valueDisplay={`${config.riskPerTradePercent}%`}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Reward to Risk"
                type="number"
                step="0.1"
                value={config.rewardToRiskRatio}
                onChange={(e) =>
                  handleInput("rewardToRiskRatio", e.target.value)
                }
                suffix="R"
              />
              <Input
                label="Trades"
                type="number"
                value={config.numberOfTrades}
                onChange={(e) => handleInput("numberOfTrades", e.target.value)}
              />
            </div>

            {/* Checkbox for Fees Adjustment */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="netStats"
                checked={isNetStats}
                onChange={(e) => setIsNetStats(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-dark-900 text-blue-500 focus:ring-blue-500/20"
              />
              <label
                htmlFor="netStats"
                className="text-sm text-slate-400 cursor-pointer select-none"
              >
                Adjusted for Fees & Slippage
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={runSim} fullWidth>
                Run Simulation
              </Button>
              <Button variant="ghost" onClick={randomize} fullWidth>
                Randomize Scenario
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Visualization & Analysis */}
      <div className="lg:col-span-2 space-y-6">
        {/* 1. Chart */}
        <Card title="Equity Curve (Monte Carlo)" className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="tradeNumber"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val: number) => `$${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f8fafc",
                }}
                itemStyle={{ color: "#3b82f6" }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  "Equity",
                ]}
              />
              {Array.from({ length: config.simulationCount }).map((_, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`sim_${i}`}
                  stroke={i === 0 ? "#3b82f6" : "#475569"}
                  strokeWidth={i === 0 ? 2 : 1}
                  dot={false}
                  opacity={i === 0 ? 1 : 0.3}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Avg. Final Balance
              </div>
              <div className="text-xl font-bold text-slate-100">
                $
                {stats.finalBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
            </Card>
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Avg. Return
              </div>
              <div
                className={`text-xl font-bold ${
                  stats.returnPercent >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }`}
              >
                {stats.returnPercent > 0 ? "+" : ""}
                {stats.returnPercent.toFixed(1)}%
              </div>
            </Card>
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Avg. Max Drawdown
              </div>
              <div className="text-xl font-bold text-accent">
                {stats.maxDrawdownPercent.toFixed(2)}%
              </div>
            </Card>
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Avg. Profit Factor
              </div>
              <div className="text-xl font-bold text-secondary">
                {stats.profitFactor.toFixed(2)}
              </div>
            </Card>
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Max Win Streak
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {stats.maxWinStreak}
              </div>
            </Card>
            <Card className="bg-dark-800/50 border-dark-700">
              <div className="text-slate-400 text-xs uppercase">
                Max Loss Streak
              </div>
              <div className="text-xl font-bold text-rose-400">
                {stats.maxLossStreak}
              </div>
            </Card>
          </div>
        )}

        {/* 3. Strategy Analysis (Moved here) */}
        <Card
          title="Strategy Analysis"
          className={`${edgeAnalysis.borderColor} border`}
        >
          <div
            className={`p-4 rounded-lg ${edgeAnalysis.bg} border ${edgeAnalysis.borderColor} mb-4`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`font-bold text-lg ${edgeAnalysis.color}`}>
                {edgeAnalysis.title}
              </span>
              <span className="text-slate-400 text-sm">
                {isNetStats ? "Net Expectancy" : "Gross Expectancy"}:{" "}
                <span className="text-slate-200">
                  {edgeAnalysis.val.toFixed(2)}R
                </span>
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {edgeAnalysis.desc}
            </p>
          </div>

          <div className="text-xs text-slate-500 mt-2">
            * Expectancy = (Win% x Reward) - (Loss% x 1). Positive expectancy is
            required for long-term growth.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MarketSimulator;

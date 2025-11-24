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
      winRatePercent: Math.floor(Math.random() * 60) + 30, // 30-90%
      rewardToRiskRatio: Number((Math.random() * 3 + 0.5).toFixed(1)), // 0.5 - 3.5
      riskPerTradePercent: Number((Math.random() * 4 + 0.5).toFixed(1)), // 0.5 - 4.5
    });
  };

  const handleInput = (key: keyof SimulationConfig, val: string) => {
    setConfig({ ...config, [key]: Number(val) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls */}
      <Card
        title="Simulation Settings"
        className="lg:col-span-1 space-y-6 h-fit"
      >
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
          onChange={(e) => handleInput("riskPerTradePercent", e.target.value)}
          valueDisplay={`${config.riskPerTradePercent}%`}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Reward to Risk"
            type="number"
            step="0.1"
            value={config.rewardToRiskRatio}
            onChange={(e) => handleInput("rewardToRiskRatio", e.target.value)}
            suffix="R"
          />
          <Input
            label="Trades"
            type="number"
            value={config.numberOfTrades}
            onChange={(e) => handleInput("numberOfTrades", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={runSim} fullWidth>
            Run Simulation
          </Button>
          <Button variant="ghost" onClick={randomize} fullWidth>
            Randomize Scenario
          </Button>
        </div>
      </Card>

      {/* Visualization */}
      <div className="lg:col-span-2 space-y-6">
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
      </div>
    </div>
  );
};

export default MarketSimulator;

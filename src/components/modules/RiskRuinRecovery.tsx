import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "../ui/Card";
import { Slider } from "../ui/Slider";
import { Input } from "../ui/Input";
import {
  calculateRiskOfRuinMonteCarlo,
  calculateStreakProb,
} from "../../services/mathUtils";

const RiskRuinRecovery: React.FC = () => {
  const [ruinInputs, setRuinInputs] = useState({
    winRate: 40,
    rewardRisk: 2,
    riskPerTrade: 2,
  });
  const [streakInputs, setStreakInputs] = useState({
    winRate: 50,
    totalTrades: 100,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Using Monte Carlo for accuracy
  const riskOfRuin = calculateRiskOfRuinMonteCarlo(
    ruinInputs.winRate,
    ruinInputs.rewardRisk,
    ruinInputs.riskPerTrade
  );

  // Recovery Data
  const recoveryData = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((loss) => ({
    loss,
    gain: (100 / (100 - loss) - 1) * 100,
  }));

  // Streak Data
  const streakData = [3, 4, 5, 6, 7, 8, 10, 12].map((streak) => ({
    length: streak,
    prob: calculateStreakProb(
      streakInputs.winRate,
      streakInputs.totalTrades,
      streak
    ),
  }));

  const handleRuinInput = (key: string, val: string) => {
    setRuinInputs({ ...ruinInputs, [key]: Number(val) });
  };

  const handleStreakInput = (key: string, val: string) => {
    setStreakInputs({ ...streakInputs, [key]: Number(val) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk of Ruin */}
        <Card title="Risk of Ruin Calculator">
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-4 relative">
              <button
                className="absolute top-0 right-0 text-slate-500 hover:text-white"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </button>

              {showTooltip && (
                <div className="absolute top-8 right-0 w-64 p-3 bg-black border border-dark-600 rounded-lg text-xs text-slate-300 z-10 shadow-xl">
                  <strong>Risk of Ruin:</strong> The mathematical probability
                  that your account balance will fall to a point where you can
                  no longer trade (effectively 0 or near 0) before it grows.
                  Calculated using 5000 simulations.
                </div>
              )}

              <div
                className={`relative w-40 h-40 rounded-full flex items-center justify-center border-4 ${
                  riskOfRuin < 1
                    ? "border-emerald-500 bg-emerald-500/10"
                    : riskOfRuin < 10
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-rose-600 bg-rose-600/10"
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {riskOfRuin.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400">Chance of Ruin</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Slider
                label="Win Rate (%)"
                min={10}
                max={90}
                value={ruinInputs.winRate}
                valueDisplay={`${ruinInputs.winRate}%`}
                onChange={(e) => handleRuinInput("winRate", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Risk:Reward"
                  type="number"
                  value={ruinInputs.rewardRisk}
                  onChange={(e) =>
                    handleRuinInput("rewardRisk", e.target.value)
                  }
                />
                <Input
                  label="Risk Per Trade %"
                  type="number"
                  value={ruinInputs.riskPerTrade}
                  onChange={(e) =>
                    handleRuinInput("riskPerTrade", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Losing Streaks */}
        <Card title="Losing Streak Probability">
          <div className="h-[200px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={streakData}>
                <XAxis
                  dataKey="length"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: "Streak Length",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: "#334155", opacity: 0.2 }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                  }}
                  formatter={(val: number) => [
                    `${val.toFixed(1)}%`,
                    "Probability",
                  ]}
                />
                <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                  {streakData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.prob > 50 ? "#ef4444" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              In a sample of{" "}
              <span className="font-bold text-white">
                {streakInputs.totalTrades}
              </span>{" "}
              trades with{" "}
              <span className="font-bold text-white">
                {streakInputs.winRate}%
              </span>{" "}
              win rate:
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  label="Sample Size"
                  type="number"
                  value={streakInputs.totalTrades}
                  onChange={(e) =>
                    handleStreakInput("totalTrades", e.target.value)
                  }
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Win Rate %"
                  type="number"
                  value={streakInputs.winRate}
                  onChange={(e) => handleStreakInput("winRate", e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Drawdown Recovery */}
      <Card title="The Mathematics of Recovery">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recoveryData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  unit="%"
                />
                <YAxis
                  dataKey="loss"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  width={80}
                  tickFormatter={(val: number) => `-${val}% Loss`}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                  }}
                  formatter={(val: number) => [
                    `+${val.toFixed(0)}% Gain Needed`,
                    "",
                  ]}
                />
                <Bar dataKey="gain" radius={[0, 4, 4, 0]}>
                  {recoveryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.loss >= 50 ? "#ef4444" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              As losses deepen, the gain required to break even grows
              exponentially.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>
                At <span className="text-white">10%</span> drawdown, you need{" "}
                <span className="text-emerald-400">11%</span> gain.
              </li>
              <li>
                At <span className="text-white">50%</span> drawdown, you need{" "}
                <span className="text-amber-400">100%</span> gain.
              </li>
              <li>
                At <span className="text-white">90%</span> drawdown, you need{" "}
                <span className="text-rose-500">900%</span> gain.
              </li>
            </ul>
            <p className="pt-2 text-xs text-slate-500">
              Moral: Cut losses early.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RiskRuinRecovery;

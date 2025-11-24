import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Slider } from "../ui/Slider";
import { Button } from "../ui/Button";
import { runPropFirmSimulation } from "../../services/mathUtils";
import type { PropFirmConfig, PhaseConfig } from "../../types";

const PropFirmEstimator: React.FC = () => {
  const [steps, setSteps] = useState(1);
  const [config, setConfig] = useState<PropFirmConfig>({
    accountSize: 100000,
    steps: 1,
    phases: [
      {
        profitTargetPercent: 10,
        maxTotalDrawdownPercent: 10,
        maxDailyDrawdownPercent: 5,
      },
    ],
    timeLimitDays: null,
    winRatePercent: 45,
    rewardToRiskRatio: 2,
    riskPerTradePercent: 1,
    tradesPerWeek: 15,
  });

  const [results, setResults] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [passRate, setPassRate] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [showLogicInfo, setShowLogicInfo] = useState(false);

  // Sync phase array size with step count
  useEffect(() => {
    setConfig((prev) => {
      const newPhases = [...prev.phases];
      if (steps > newPhases.length) {
        // Add phases
        for (let i = newPhases.length; i < steps; i++) {
          newPhases.push({
            profitTargetPercent: 5,
            maxTotalDrawdownPercent: 10,
            maxDailyDrawdownPercent: 5,
          });
        }
      } else if (steps < newPhases.length) {
        // Remove phases
        newPhases.splice(steps);
      }
      return { ...prev, steps, phases: newPhases };
    });
  }, [steps]);

  const handleSimulate = () => {
    // Increased simulation count for better accuracy
    const iterations = 2000;
    const { results: res, avgDays } = runPropFirmSimulation(config, iterations);

    const data = [
      { name: "Pass", value: res.pass, color: "#10b981" },
      { name: "Fail (Max DD)", value: res.failMaxDD, color: "#ef4444" },
      { name: "Fail (Daily DD)", value: res.failDailyDD, color: "#f59e0b" },
      { name: "Fail (Time)", value: res.failTime, color: "#64748b" },
    ].filter((d) => d.value > 0);

    setResults(data);
    setPassRate((res.pass / iterations) * 100);

    // Convert Trading Days (5/week) to Calendar Days (7/week) for display
    // Formula: TradingDays * (7/5)
    setAvgTime(avgDays * 1.4);
  };

  const updatePhase = (
    index: number,
    field: keyof PhaseConfig,
    value: number
  ) => {
    const newPhases = [...config.phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setConfig({ ...config, phases: newPhases });
  };

  useEffect(() => {
    const t = setTimeout(handleSimulate, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Format Average Time
  const formatTime = (days: number) => {
    if (days < 30) return `${Math.round(days)} days`;
    const months = Math.floor(days / 30);
    const remainingDays = Math.round(days % 30);
    return `${months} month${months > 1 ? "s" : ""} ${
      remainingDays > 0 ? `& ${remainingDays} days` : ""
    }`;
  };

  // Generate verdict text
  const getVerdict = () => {
    if (passRate >= 90)
      return {
        title: "High Probability",
        color: "text-emerald-400",
        desc: "Your statistics suggest a very robust edge. Unless you deviate from your plan, passing is highly likely.",
      };
    if (passRate >= 70)
      return {
        title: "Solid Probability",
        color: "text-blue-400",
        desc: "You have a strong edge, but variance ('bad luck') could still cause failure. Stick to your risk parameters.",
      };
    if (passRate >= 50)
      return {
        title: "Coin Flip",
        color: "text-amber-400",
        desc: "Your strategy is essentially a coin flip for passing. A slight string of losses will breach drawdown limits.",
      };
    return {
      title: "High Risk",
      color: "text-rose-500",
      desc: "The odds are against you. Your risk per trade might be too high relative to your win rate/drawdown buffers.",
    };
  };
  const verdict = getVerdict();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card
        title="Challenge Rules"
        className="lg:col-span-1 space-y-5 h-fit overflow-y-auto max-h-[800px]"
      >
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400 uppercase">
            Challenge Type
          </label>
          <div className="flex bg-dark-900 p-1 rounded-lg">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSteps(s)}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                  steps === s
                    ? "bg-primary text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}-Step
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400 uppercase">
            Account Size
          </label>
          <select
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-slate-100"
            value={config.accountSize}
            onChange={(e) =>
              setConfig({ ...config, accountSize: Number(e.target.value) })
            }
          >
            <option value={10000}>$10,000</option>
            <option value={25000}>$25,000</option>
            <option value={50000}>$50,000</option>
            <option value={100000}>$100,000</option>
            <option value={200000}>$200,000</option>
          </select>
        </div>

        {config.phases.map((phase, idx) => (
          <div
            key={idx}
            className="border border-dark-700 p-3 rounded-lg bg-dark-800/50 space-y-3"
          >
            <div className="text-xs font-bold text-primary uppercase mb-2">
              Phase {idx + 1} Rules
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Target %"
                type="number"
                value={phase.profitTargetPercent}
                onChange={(e) =>
                  updatePhase(
                    idx,
                    "profitTargetPercent",
                    Number(e.target.value)
                  )
                }
              />
              <Input
                label="Max Total DD %"
                type="number"
                value={phase.maxTotalDrawdownPercent}
                onChange={(e) =>
                  updatePhase(
                    idx,
                    "maxTotalDrawdownPercent",
                    Number(e.target.value)
                  )
                }
              />
              <Input
                label="Max Daily DD %"
                type="number"
                value={phase.maxDailyDrawdownPercent}
                onChange={(e) =>
                  updatePhase(
                    idx,
                    "maxDailyDrawdownPercent",
                    Number(e.target.value)
                  )
                }
              />
            </div>
          </div>
        ))}

        <div className="border-t border-dark-700 pt-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">
            Trader Performance
          </h4>
          <Slider
            label="Win Rate %"
            min={10}
            max={90}
            value={config.winRatePercent}
            valueDisplay={`${config.winRatePercent}%`}
            onChange={(e) =>
              setConfig({ ...config, winRatePercent: Number(e.target.value) })
            }
          />
          <Slider
            label="Risk Per Trade %"
            min={0.2}
            max={5}
            step={0.1}
            value={config.riskPerTradePercent}
            valueDisplay={`${config.riskPerTradePercent}%`}
            onChange={(e) =>
              setConfig({
                ...config,
                riskPerTradePercent: Number(e.target.value),
              })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="R:R Ratio"
              type="number"
              step="0.1"
              value={config.rewardToRiskRatio}
              onChange={(e) =>
                setConfig({
                  ...config,
                  rewardToRiskRatio: Number(e.target.value),
                })
              }
            />
            <Input
              label="Trades Per Week"
              type="number"
              min={1}
              value={config.tradesPerWeek}
              onChange={(e) =>
                setConfig({ ...config, tradesPerWeek: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <Button onClick={handleSimulate} fullWidth>
          Run Simulation
        </Button>
      </Card>

      <Card
        title="Probability Breakdown"
        className="lg:col-span-2 min-h-[500px] flex flex-col relative"
      >
        <div className="absolute top-4 right-4 z-10">
          <button
            className="text-slate-500 hover:text-primary transition-colors"
            onMouseEnter={() => setShowLogicInfo(true)}
            onMouseLeave={() => setShowLogicInfo(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showLogicInfo && (
            <div className="absolute right-0 mt-2 w-80 bg-black border border-dark-600 rounded-lg p-4 shadow-2xl z-20 text-sm text-slate-300">
              <h5 className="font-bold text-white mb-2">
                Statistical Engine Logic
              </h5>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Monte Carlo:</strong> Runs 2,000 separate challenges.
                </li>
                <li>
                  <strong>Trade Clustering:</strong> Uses Poisson distribution
                  to simulate heavy trading days vs quiet days (Daily DD risk).
                </li>
                <li>
                  <strong>Performance Variance:</strong> Applies a Standard
                  Deviation to your Win Rate for each simulation. This simulates
                  "Bad Months" (e.g., performing at 48%) vs "Good Months" (58%),
                  ensuring the pass rate reflects realistic market fluctuations,
                  not just a static theoretical win rate.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={results}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {results.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f8fafc",
                }}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 text-center pointer-events-none">
            <div className="text-sm text-slate-400">Pass Rate</div>
            <div
              className={`text-4xl font-bold ${
                passRate > 50 ? "text-emerald-400" : "text-slate-100"
              }`}
            >
              {passRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Verdict Card */}
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                passRate > 50 ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></div>
            <h4
              className={`font-bold uppercase tracking-wider ${verdict.color}`}
            >
              {verdict.title}
            </h4>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {verdict.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
            <div className="text-xs text-slate-400 uppercase mb-1">
              Avg. Time to Pass (Calendar)
            </div>
            <div className="text-xl font-bold text-white">
              {passRate > 0 ? formatTime(avgTime) : "N/A"}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Based on {config.tradesPerWeek} trades/week
            </div>
          </div>
          <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
            <div className="text-xs text-slate-400 uppercase mb-1">
              Simulated Trades
            </div>
            <div className="text-xl font-bold text-white">
              {passRate > 0
                ? Math.round((avgTime / 7) * config.tradesPerWeek)
                : "N/A"}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total trades needed on avg
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PropFirmEstimator;

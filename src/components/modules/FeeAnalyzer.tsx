import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import type { FeeConfig } from "../../types";
import { calculateFeeImpact } from "../../services/mathUtils";

const ASSET_PRESETS: Record<string, Partial<FeeConfig> & { label: string }> = {
  EURUSD: {
    label: "EUR/USD (Forex)",
    assetType: "FOREX",
    pointValue: 10,
    commissionPerUnit: 3.5,
    spread: 0.8,
  },
  ES: {
    label: "E-Mini S&P 500 (Futures)",
    assetType: "FUTURES",
    pointValue: 50,
    commissionPerUnit: 2.25,
    spread: 0.25,
  },
  NQ: {
    label: "E-Mini Nasdaq (Futures)",
    assetType: "FUTURES",
    pointValue: 20,
    commissionPerUnit: 2.25,
    spread: 0.5,
  },
  US500: {
    label: "US 500 (CFD/Indices)",
    assetType: "INDICES_CFD",
    pointValue: 1,
    commissionPerUnit: 0,
    spread: 0.4,
  },
  GOLD: {
    label: "Gold (XAUUSD)",
    assetType: "FOREX",
    pointValue: 100,
    commissionPerUnit: 3.5,
    spread: 0.15,
  },
  BTCUSD: {
    label: "Bitcoin (CFD)",
    assetType: "CRYPTO",
    pointValue: 1,
    commissionPerUnit: 0,
    spread: 15,
  },
};

const FeeAnalyzer: React.FC = () => {
  const [config, setConfig] = useState<FeeConfig>({
    assetType: "FOREX",
    lotSize: 1,
    winRate: 50,
    rewardRisk: 2,
    riskPerTrade: 200,
    trades: 100,
    commissionPerUnit: 7, // Round turn
    spread: 1.0,
    pointValue: 10, // Standard Lot EURUSD
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("custom");

  const handlePresetChange = (key: string) => {
    setSelectedPreset(key);
    if (ASSET_PRESETS[key]) {
      const p = ASSET_PRESETS[key];
      setConfig((prev) => ({
        ...prev,
        assetType: p.assetType || "FOREX",
        pointValue: p.pointValue || 10,
        commissionPerUnit:
          p.commissionPerUnit !== undefined ? p.commissionPerUnit : 7,
        spread: p.spread || 0,
      }));
    }
  };

  const { data, totalCostPerTrade } = useMemo(
    () => calculateFeeImpact(config),
    [config]
  );
  const totalStats = data[data.length - 1];

  const handleInput = (key: keyof FeeConfig, val: string) => {
    setConfig({ ...config, [key]: Number(val) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Market Configuration" className="h-fit space-y-5">
        {/* Asset Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase">
            Load Preset
          </label>
          <select
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-slate-100"
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            <option value="custom">Custom Configuration</option>
            {Object.entries(ASSET_PRESETS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={config.assetType === "FOREX" ? "Lot Size" : "Contracts"}
            type="number"
            value={config.lotSize}
            onChange={(e) => handleInput("lotSize", e.target.value)}
          />
          <Input
            label="Point/Pip Value ($)"
            type="number"
            value={config.pointValue}
            onChange={(e) => handleInput("pointValue", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-dark-700 pt-4">
          <Input
            label="Comm. (Round Turn $)"
            type="number"
            value={config.commissionPerUnit}
            onChange={(e) => handleInput("commissionPerUnit", e.target.value)}
          />
          <Input
            label="Spread (Pips/Pts)"
            type="number"
            value={config.spread}
            onChange={(e) => handleInput("spread", e.target.value)}
          />
        </div>

        <div className="p-3 bg-dark-900 rounded-lg text-xs text-slate-400 border border-dark-700">
          Cost Per Trade:{" "}
          <span className="text-rose-400 font-bold">
            ${totalCostPerTrade.toFixed(2)}
          </span>
          <br />
          (Comm: ${(config.commissionPerUnit * config.lotSize).toFixed(2)} +
          Spread: $
          {(config.spread * config.pointValue * config.lotSize).toFixed(2)})
        </div>

        <div className="border-t border-dark-700 pt-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">
            Strategy Performance
          </h4>
          <Input
            label="Win Rate (%)"
            type="number"
            value={config.winRate}
            onChange={(e) => handleInput("winRate", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Risk ($)"
              type="number"
              value={config.riskPerTrade}
              onChange={(e) => handleInput("riskPerTrade", e.target.value)}
            />
            <Input
              label="Reward (R)"
              type="number"
              value={config.rewardRisk}
              onChange={(e) => handleInput("rewardRisk", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card title="The Real Cost of Trading">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="trade"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f8fafc",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="Gross"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorGross)"
                  strokeWidth={2}
                  name="Gross Profit"
                />
                <Area
                  type="monotone"
                  dataKey="Net"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorNet)"
                  strokeWidth={2}
                  name="Net Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-xs text-slate-400 uppercase">Gross Profit</div>
            <div className="text-xl font-bold text-blue-400">
              ${totalStats.Gross.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">Theoretical Edge</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-xs text-slate-400 uppercase">
              Total Fees Paid
            </div>
            <div className="text-xl font-bold text-rose-500">
              ${totalStats.Fees.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">Commissions + Spread</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-xs text-slate-400 uppercase">Net Profit</div>
            <div className="text-xl font-bold text-emerald-400">
              ${totalStats.Net.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">Actual Bank</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeAnalyzer;

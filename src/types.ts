export interface SimulationConfig {
  initialCapital: number;
  riskPerTradePercent: number;
  winRatePercent: number;
  rewardToRiskRatio: number;
  numberOfTrades: number;
  simulationCount: number;
}

export interface EquityPoint {
  tradeNumber: number;
  equity: number;
  [key: string]: number; // For multiple simulation lines
}

export interface SimulationStats {
  finalBalance: number;
  returnPercent: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface PhaseConfig {
  profitTargetPercent: number;
  maxTotalDrawdownPercent: number;
  maxDailyDrawdownPercent: number;
}

export interface PropFirmConfig {
  accountSize: number;
  steps: number; // 1, 2, or 3
  phases: PhaseConfig[];
  timeLimitDays: number | null;
  winRatePercent: number;
  rewardToRiskRatio: number;
  riskPerTradePercent: number;
  tradesPerWeek: number; // Changed from tradesPerDay
}

export interface PropFirmResult {
  outcome: "PASS" | "FAIL_MAX_DD" | "FAIL_DAILY_DD" | "FAIL_TIME";
  daysTaken: number;
}

export interface FeeConfig {
  assetType: "FOREX" | "FUTURES" | "INDICES_CFD" | "CRYPTO";
  lotSize: number; // Lots or Contracts
  winRate: number;
  rewardRisk: number;
  riskPerTrade: number; // $ Amount
  trades: number;
  // Asset Specifics
  commissionPerUnit: number; // $ per lot/contract round turn
  spread: number; // In Pips or Points
  pointValue: number; // $ value per 1.0 movement
}

// FIXED: Using const object instead of enum
export const TabId = {
  MARKET_SIM: "market-sim",
  PROP_FIRM: "prop-firm",
  FEE_ANALYZER: "fees",
  RISK_RUIN: "risk-ruin",
  ANALYZE_DATA: "analyze-data",
} as const;

export type TabId = (typeof TabId)[keyof typeof TabId];

export type DataFormat = "GENERIC_CSV" | "MT4_MT5" | "CTRADER";

export interface ParsedTrade {
  index: number;
  pnl: number;
  equity: number;
  timestamp?: number; // Unix timestamp in ms
}

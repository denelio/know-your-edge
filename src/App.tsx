import React, { useState } from "react";
import { TabId } from "./types";
import MarketSimulator from "./components/modules/MarketSimulator";
import PropFirmEstimator from "./components/modules/PropFirmEstimator";
import FeeAnalyzer from "./components/modules/FeeAnalyzer";
import RiskRuinRecovery from "./components/modules/RiskRuinRecovery";
import DataAnalyzer from "./components/modules/DataAnalyzer";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(TabId.MARKET_SIM);

  const tabs = [
    { id: TabId.MARKET_SIM, label: "Market Simulator" },
    { id: TabId.PROP_FIRM, label: "Prop Firm Check" },
    { id: TabId.FEE_ANALYZER, label: "Fee Analyzer" },
    { id: TabId.RISK_RUIN, label: "Risk & Ruin" },
    { id: TabId.ANALYZE_DATA, label: "Analyze Data" },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">
                KnowYour<span className="text-primary">Edge</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <nav className="flex space-x-1 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          style={{ display: activeTab === TabId.MARKET_SIM ? "block" : "none" }}
        >
          <MarketSimulator />
        </div>
        <div
          style={{ display: activeTab === TabId.PROP_FIRM ? "block" : "none" }}
        >
          <PropFirmEstimator />
        </div>
        <div
          style={{
            display: activeTab === TabId.FEE_ANALYZER ? "block" : "none",
          }}
        >
          <FeeAnalyzer />
        </div>
        <div
          style={{ display: activeTab === TabId.RISK_RUIN ? "block" : "none" }}
        >
          <RiskRuinRecovery />
        </div>
        <div
          style={{
            display: activeTab === TabId.ANALYZE_DATA ? "block" : "none",
          }}
        >
          <DataAnalyzer />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-8 mt-8 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>
            KnowYourEdge runs locally in your browser. No data is uploaded to
            any server.
          </p>
          <p className="mt-2">
            Trading involves risk. These simulations are for educational
            purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

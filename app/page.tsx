"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type {
  AccountData,
  Fill,
  EquitySnapshot,
  SystemData,
  BacktestData,
  DataStatusResponse,
} from "@/app/lib/types";

import MetaV2Tab from "@/app/components/MetaV2Tab";
import SingleSystemsTab from "@/app/components/SingleSystemsTab";
import SystemsTab from "@/app/components/SystemsTab";
import AccountOpsTab from "@/app/components/AccountOpsTab";

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [fills, setFills] = useState<Fill[]>([]);
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [metaV2, setMetaV2] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<"metav2" | "systems" | "forward" | "ops">("metav2");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, fillsRes, systemsRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/fills"),
        fetch("/api/systems"),
      ]);

      if (accRes.ok) setAccount(await accRes.json());
      if (fillsRes.ok) setFills(await fillsRes.json());
      if (systemsRes.ok) {
        const sysData = await systemsRes.json();
        if (Array.isArray(sysData)) setSystems(sysData);
      }

      // Fetch backtest (static, non-blocking)
      try {
        const btRes = await fetch("/api/backtest");
        if (btRes.ok) {
          const btData = await btRes.json();
          if (btData?.book) setBacktest(btData);
        }
      } catch { /* silently skip */ }

      // Fetch data status (static, non-blocking)
      try {
        const statusRes = await fetch("/api/data-status");
        if (statusRes.ok) {
          setDataStatus(await statusRes.json());
        }
      } catch { /* silently skip */ }

      try {
        const metaRes = await fetch("/api/meta-v2");
        if (metaRes.ok) setMetaV2(await metaRes.json());
      } catch { /* silently skip */ }

      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return (
    <main className="p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <i className="fas fa-chart-line text-indigo-400 text-2xl" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Trading Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Meta-sistema v2 (Donchian + StdDev) &amp; Monitoraggio Ricerca</p>
          </div>
        </div>

        {error && (
          <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
            <i className="fas fa-triangle-exclamation mr-1.5" />
            {error}
          </span>
        )}
      </div>

      {/* Main Tabs Control (4 Clean Tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-700/40 mb-6 text-sm font-semibold">
        <button
          onClick={() => setActiveMainTab("metav2")}
          className={`px-4 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "metav2"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-layer-group text-indigo-400" />
          <span>1. Meta-v2 Portafoglio</span>
        </button>

        <button
          onClick={() => setActiveMainTab("systems")}
          className={`px-4 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "systems"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-microscope text-amber-400" />
          <span>2. Analisi Singoli Sistemi</span>
        </button>

        <button
          onClick={() => setActiveMainTab("forward")}
          className={`px-4 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "forward"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-flask text-purple-400" />
          <span>3. Forward Test Paper</span>
        </button>

        <button
          onClick={() => setActiveMainTab("ops")}
          className={`px-4 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "ops"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-server text-emerald-400" />
          <span>4. Account &amp; Stato Dati</span>
        </button>
      </div>

      {/* Tab 1: Meta-v2 Portfolio (Combined Book, Heatmap, Metrics) */}
      {activeMainTab === "metav2" && (
        <MetaV2Tab data={metaV2} backtest={backtest} />
      )}

      {/* Tab 2: Single Systems Analysis (Unified summary grid + single deep dive) */}
      {activeMainTab === "systems" && (
        <SingleSystemsTab backtest={backtest} />
      )}

      {/* Tab 3: Paper Forward Testing tracking */}
      {activeMainTab === "forward" && (
        <SystemsTab systems={systems} />
      )}

      {/* Tab 4: Account Live status + Data coverage ops */}
      {activeMainTab === "ops" && (
        <AccountOpsTab account={account} fills={fills} dataStatus={dataStatus} />
      )}
    </main>
  );
}

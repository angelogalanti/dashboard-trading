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
import MegaTab from "@/app/components/MegaTab";
import SystemsTab from "@/app/components/SystemsTab";
import BacktestTab from "@/app/components/BacktestTab";
import DonchianTab from "@/app/components/DonchianTab";
import SummaryTab from "@/app/components/SummaryTab";
import DataStatusTab from "@/app/components/DataStatusTab";
import MetaV2Tab from "@/app/components/MetaV2Tab";

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [fills, setFills] = useState<Fill[]>([]);
  const [history, setHistory] = useState<EquitySnapshot[]>([]);
  const [transfers, setTransfers] = useState<{ time: number; amount: number }[]>([]);
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metaV2, setMetaV2] = useState<any | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"mega" | "systems" | "backtest" | "donchian" | "summary" | "datastatus" | "metav2">("mega");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, fillsRes, historyRes, systemsRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/fills"),
        fetch("/api/history"),
        fetch("/api/systems"),
      ]);
      if (!accRes.ok || !fillsRes.ok || !historyRes.ok) {
        throw new Error(`API error: account=${accRes.status} fills=${fillsRes.status} history=${historyRes.status}`);
      }
      setAccount(await accRes.json());
      setFills(await fillsRes.json());
      const histData = await historyRes.json();
      setHistory(histData.snapshots || []);
      setTransfers(histData.transfers || []);
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
      } catch { /* backtest non disponibile, silently skip */ }

      // Fetch data status (static, non-blocking)
      try {
        const statusRes = await fetch("/api/data-status");
        if (statusRes.ok) {
          setDataStatus(await statusRes.json());
        }
      } catch { /* silently skip */ }
      try { const metaRes = await fetch("/api/meta-v2"); if (metaRes.ok) setMetaV2(await metaRes.json()); } catch { /* generated research data optional */ }

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
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <i className="fas fa-chart-line text-indigo-400 text-2xl" />
        <h1 className="text-2xl font-bold text-slate-100">Trading Dashboard</h1>
        {error && (
          <span className="ml-auto text-xs text-red-400">
            <i className="fas fa-triangle-exclamation mr-1" />
            {error}
          </span>
        )}
      </div>

      {/* Main Tabs Control */}
      <div className="grid grid-cols-1 md:grid-cols-7 border-b border-slate-700/40 mb-6 text-sm font-semibold font-medium">
        <button
          onClick={() => setActiveMainTab("mega")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "mega"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-wallet" />
          <span>Mega-Sistema Live</span>
        </button>
        <button
          onClick={() => setActiveMainTab("systems")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "systems"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-network-wired" />
          <span>Scomposizione Sistemi (Forward Test)</span>
        </button>
        <button
          onClick={() => setActiveMainTab("backtest")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "backtest"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-history" />
          <span>Backtest Storico</span>
        </button>
        <button
          onClick={() => setActiveMainTab("donchian")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "donchian"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-chart-bar" />
          <span>Sistemi (Standalone)</span>
        </button>
        <button
          onClick={() => setActiveMainTab("summary")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "summary"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-table" />
          <span>Riepilogo Sistemi</span>
        </button>
        <button
          onClick={() => setActiveMainTab("metav2")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${activeMainTab === "metav2" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        ><i className="fas fa-flask" /><span>Meta v2 (Paper)</span></button>
        <button
          onClick={() => setActiveMainTab("datastatus")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === "datastatus"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-database" />
          <span>Stato Dati</span>
        </button>
      </div>

      {activeMainTab === "mega" && (
        <MegaTab
          account={account}
          fills={fills}
          history={history}
          transfers={transfers}
          systems={systems}
        />
      )}

      {activeMainTab === "systems" && (
        <SystemsTab systems={systems} />
      )}

      {activeMainTab === "backtest" && (
        <BacktestTab backtest={backtest} />
      )}

      {activeMainTab === "donchian" && backtest?.donchianRaw && (
        <DonchianTab
          rawSystems={{
            donchian: backtest.donchianRaw,
            ...(backtest.stddevRaw ? { stddev: backtest.stddevRaw } : {}),
            ...(backtest.volsqueezeRaw ? { volsqueeze: backtest.volsqueezeRaw } : {}),
          }}
          backtestSystems={{
            donchian: backtest.systems?.find((s) => s.id === "donchian"),
            ...(backtest.stddevRaw ? { stddev: backtest.systems?.find((s) => s.id === "stddev") } : {}),
            ...(backtest.volsqueezeRaw ? { volsqueeze: backtest.systems?.find((s) => s.id === "volsqueeze") } : {}),
          }}
        />
      )}

      {activeMainTab === "summary" && (
        <SummaryTab backtest={backtest} />
      )}
      {activeMainTab === "metav2" && <MetaV2Tab data={metaV2} />}

      {activeMainTab === "datastatus" && (
        <DataStatusTab dataStatus={dataStatus} />
      )}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { BacktestData, DonchianRawData, BacktestDailyPoint, BacktestSystem } from "@/app/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Card } from "@/app/components/ui";

interface Props {
  backtest: BacktestData | null;
}

const SYSTEM_SPECS: Record<
  string,
  {
    name: string;
    description: string;
    timeframe: string;
    assets: string;
    status: "LIVE" | "Bench" | "Forward";
    statusColor: string;
    audit: string;
  }
> = {
  donchian: {
    name: "Donchian",
    description: "Breakout canale 160/150 + regime EMA200 4h, no tilt",
    timeframe: "15m",
    assets: "BTC, ETH, SOL",
    status: "LIVE",
    statusColor: "text-emerald-400",
    audit: "✅ Promosso (Fase 13) - Kernel 15m, weight 37,08%",
  },
  stddev: {
    name: "StdDev",
    description: "Breakout sessione USA (11-19 UTC), long-only",
    timeframe: "5m",
    assets: "BTC, ETH, SOL, BNB, XRP, DOGE",
    status: "LIVE",
    statusColor: "text-emerald-400",
    audit: "✅ Promosso (Fase 14) - US session, weight 62,92%",
  },
  btc_mean_reversion: {
    name: "MR (BTC)",
    description: "Mean Reversion su BTC, 14 effetti statistici discovery v13",
    timeframe: "5m",
    assets: "BTC",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 18) - Null result OOS",
  },
  trend_multiasset: {
    name: "Trend (Multi)",
    description: "TSMOM multi-horizon + vol-target su 11 altcoin",
    timeframe: "1D",
    assets: "BTC, ETH, SOL, ZEC, DOGE, BNB, ADA, AVAX, NEAR, XRP, SUI",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 16/17) - CORE-3 diluisce convessità book",
  },
  volsqueeze: {
    name: "VolSqueeze",
    description: "Breakout ad alta sigma (BB86/2.5σ) con filtri qualità",
    timeframe: "1h",
    assets: "BTC",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 15) - Null result OOS",
  },
  nextbar_book: {
    name: "Nextbar Book",
    description: "Portafoglio 3 fattori (Low-Beta + Carry + Trend) su 40+ perp",
    timeframe: "2D",
    assets: "40+ perp",
    status: "Forward",
    statusColor: "text-purple-400",
    audit: "🔮 Forward Test - In fase di studio breadth",
  },
};

interface AnnualRow {
  year: string;
  retPct: number;
  maxDD: number;
  calmar: number;
}

function computeAnnual(daily: BacktestDailyPoint[]): AnnualRow[] {
  if (!daily || !daily.length) return [];
  const rows: AnnualRow[] = [];
  let currentYear = "";
  let yearStartEquity = daily[0].equity;

  for (const pt of daily) {
    const y = pt.date.slice(0, 4);
    if (y !== currentYear) {
      if (currentYear) {
        const ret = (pt.equity / yearStartEquity - 1) * 100;
        rows.push({ year: currentYear, retPct: ret, maxDD: 0, calmar: 0 });
      }
      currentYear = y;
      yearStartEquity = pt.equity;
    }
  }
  if (currentYear && daily.length > 0) {
    const last = daily[daily.length - 1];
    rows.push({ year: currentYear, retPct: (last.equity / yearStartEquity - 1) * 100, maxDD: 0, calmar: 0 });
  }

  let yPeak = daily[0].equity;
  for (const pt of daily) {
    yPeak = Math.max(yPeak, pt.equity);
    const y = pt.date.slice(0, 4);
    const row = rows.find((r) => r.year === y);
    if (row) {
      const dd = ((yPeak - pt.equity) / yPeak) * 100;
      row.maxDD = Math.max(row.maxDD, dd);
    }
  }
  for (const row of rows) {
    row.calmar = row.maxDD > 0 ? Math.abs(row.retPct) / row.maxDD : 0;
  }

  return rows;
}

export default function SingleSystemsTab({ backtest }: Props) {
  const rawSystems = backtest?.rawSystems || {};
  const systemIds = Object.keys(rawSystems).length > 0 ? Object.keys(rawSystems) : Object.keys(SYSTEM_SPECS);

  const [selectedId, setSelectedId] = useState<string>(systemIds[0] || "donchian");
  const [periodView, setPeriodView] = useState<"full" | "train" | "oos">("full");
  const [logScale, setLogScale] = useState(true);

  const systemRaw = rawSystems[selectedId];
  const backtestSystem = backtest?.systems?.find((s) => s.id === selectedId);

  const annual = useMemo(() => (systemRaw ? computeAnnual(systemRaw.daily) : []), [systemRaw]);

  // Compute period metrics
  const periodMetrics = useMemo(() => {
    if (!systemRaw || !systemRaw.daily || !systemRaw.daily.length) {
      return { cagr: 0, maxdd: 0, calmar: 0, sharpe: 0, label: "Tutto lo storico" };
    }
    let pts = systemRaw.daily;
    let label = "Tutto lo storico (2020-2026)";

    if (periodView === "train") {
      pts = systemRaw.daily.filter((p) => p.date < "2025-01-01");
      label = "Train (<2025)";
    } else if (periodView === "oos") {
      pts = systemRaw.daily.filter((p) => p.date >= "2025-01-01");
      label = "Out of Sample (2025+)";
    }

    if (pts.length < 5) return { cagr: 0, maxdd: 0, calmar: 0, sharpe: 0, label };

    const eqStart = pts[0].equity;
    const eqEnd = pts[pts.length - 1].equity;
    const nDays = pts.length;
    const cagr = ((eqEnd / eqStart) ** (365.0 / nDays) - 1) * 100;

    let peak = pts[0].equity;
    let maxdd = 0;
    const dailyReturns: number[] = [];

    for (let i = 0; i < pts.length; i++) {
      peak = Math.max(peak, pts[i].equity);
      const dd = ((peak - pts[i].equity) / peak) * 100;
      maxdd = Math.max(maxdd, dd);
      if (i > 0) {
        dailyReturns.push(pts[i].equity / pts[i - 1].equity - 1);
      }
    }

    const calmar = maxdd > 0 ? cagr / maxdd : 0;
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (dailyReturns.length || 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(365) : 0;

    return { cagr, maxdd, calmar, sharpe, label };
  }, [systemRaw, periodView]);

  const chartData = useMemo(() => {
    if (!systemRaw || !systemRaw.daily) return [];
    const step = Math.max(1, Math.floor(systemRaw.daily.length / 500));
    return systemRaw.daily
      .filter((_, i) => i % step === 0)
      .map((pt) => ({
        date: pt.date,
        equity: pt.equity,
        drawdown: pt.drawdown,
        btc: pt.btc_price,
      }));
  }, [systemRaw]);

  // Find exact sampled dates for Recharts ReferenceArea cutoff
  const { firstDate, isEndDate, oosStartDate, lastDate } = useMemo(() => {
    if (!chartData.length) return { firstDate: "", isEndDate: "", oosStartDate: "", lastDate: "" };
    const firstDate = chartData[0].date;
    const lastDate = chartData[chartData.length - 1].date;
    const oosPoint = chartData.find((p) => p.date >= "2025-01-01") || chartData[chartData.length - 1];
    const isPoint = chartData.filter((p) => p.date < "2025-01-01").slice(-1)[0] || chartData[0];
    return {
      firstDate,
      isEndDate: isPoint.date,
      oosStartDate: oosPoint.date,
      lastDate,
    };
  }, [chartData]);

  return (
    <div className="space-y-8">
      {/* ── TOP SECTION: Summary Grid of all 6 Systems ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 mb-1">Riepilogo e Stato dei Sistemi</h2>
          <p className="text-xs text-slate-400">
            Panoramica delle 6 strategie. Pesi e verdetti ufficiali dell&apos;architettura Live-v2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(SYSTEM_SPECS).map(([id, spec]) => {
            const sys = backtest?.systems?.find((s) => s.id === id);
            const m = sys?.metrics;

            return (
              <div
                key={id}
                onClick={() => setSelectedId(id)}
                className={`rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedId === id
                    ? "border-indigo-500 bg-slate-800/90 shadow-lg shadow-indigo-500/10"
                    : "border-slate-700/50 bg-slate-800/50 hover:bg-slate-800/70"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {spec.name}
                        {selectedId === id && <span className="text-[10px] text-indigo-400 font-normal">(Selezionato)</span>}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{spec.description}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        spec.status === "LIVE"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : spec.status === "Forward"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {spec.status === "LIVE" ? "LIVE" : spec.status === "Forward" ? "FORWARD" : "SCARTATO"}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 mb-3">{spec.audit}</div>
                </div>

                {sys?.metricsOos || sys?.metricsIs ? (
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-700/40 pt-3">
                    <div className="bg-slate-700/20 rounded p-1.5 text-center">
                      <div className="text-cyan-400 uppercase font-bold">IS (&lt;2024)</div>
                      <div className="text-slate-200 font-mono mt-0.5">
                        {sys.metricsIs ? `CAGR ${sys.metricsIs.cagr.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div className="bg-slate-700/20 rounded p-1.5 text-center">
                      <div className="text-fuchsia-400 uppercase font-bold">OOS (2025+)</div>
                      <div className="text-slate-200 font-mono mt-0.5">
                        {sys.metricsOos ? `CAGR ${sys.metricsOos.cagr.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic border-t border-slate-700/40 pt-2">
                    Metriche in fase di test
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Deep-Dive Analysis of the Selected System ── */}
      {systemRaw ? (
        <div className="pt-6 border-t border-slate-700/40 space-y-6">
          {/* Header & Controls for Deep Dive */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100">Analisi Dettagliata — {systemRaw.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-700/50 text-indigo-300">
                  {periodMetrics.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {systemRaw.startDate} → {systemRaw.endDate} · {systemRaw.nDays} giorni · <strong>Curve e metriche RAW</strong>
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex border border-slate-600/50 rounded-lg overflow-hidden text-[11px] font-semibold">
              <button
                onClick={() => setPeriodView("full")}
                className={`px-3 py-1.5 transition-all cursor-pointer ${
                  periodView === "full" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tutto lo Storico
              </button>
              <button
                onClick={() => setPeriodView("train")}
                className={`px-3 py-1.5 transition-all cursor-pointer ${
                  periodView === "train" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Train (&lt;2025)
              </button>
              <button
                onClick={() => setPeriodView("oos")}
                className={`px-3 py-1.5 transition-all cursor-pointer ${
                  periodView === "oos" ? "bg-fuchsia-500/20 text-fuchsia-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                OOS (2025+)
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <div className="text-xs text-slate-500 uppercase tracking-wide">CAGR ({periodView.toUpperCase()})</div>
              <div className="text-2xl font-bold text-amber-400">{periodMetrics.cagr.toFixed(1)}%</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-400">-{periodMetrics.maxdd.toFixed(2)}%</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Calmar</div>
              <div className="text-2xl font-bold text-indigo-400">{periodMetrics.calmar.toFixed(2)}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Sharpe</div>
              <div className="text-2xl font-bold text-emerald-400">{periodMetrics.sharpe.toFixed(2)}</div>
            </Card>
          </div>

          {/* Charts */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-700/30 pb-2">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-slate-200">Equity &amp; Drawdown (RAW)</h3>
                {/* IS / OOS visual badge legend */}
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Train IS (&lt;2025)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                    Out of Sample OOS (2025+)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setLogScale(!logScale)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  logScale ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400"
                }`}
              >
                Scale Log
              </button>
            </div>

            <div className="mb-4">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={chartData} syncId="single-sys-sync" margin={{ top: 15, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
                  <YAxis
                    yAxisId="eq"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    scale={logScale ? "log" : "auto"}
                    domain={logScale ? [0.8, "auto"] : ["auto", "auto"]}
                    tickFormatter={(v: number) => `${v.toFixed(2)}×`}
                  />
                  {/* IS Shading (<2025) */}
                  {firstDate && isEndDate && (
                    <ReferenceArea x1={firstDate} x2={isEndDate} yAxisId="eq" fill="#06b6d4" fillOpacity={0.07} />
                  )}
                  {/* OOS Shading (2025+) */}
                  {oosStartDate && lastDate && (
                    <ReferenceArea x1={oosStartDate} x2={lastDate} yAxisId="eq" fill="#d946ef" fillOpacity={0.12} />
                  )}
                  {/* Cutoff Line */}
                  {oosStartDate && (
                    <ReferenceLine x={oosStartDate} yAxisId="eq" stroke="#e879f9" strokeDasharray="4 4" label={{ value: "Cutoff OOS (2025)", fill: "#e879f9", fontSize: 10, position: "insideTopLeft" }} />
                  )}

                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0" }}
                    formatter={(val: any) => typeof val === "number" ? [`${val.toFixed(2)}× (${((val - 1) * 100).toFixed(1)}%)`, "Equity"] : [String(val), "Equity"]}
                  />
                  <Line yAxisId="eq" type="monotone" dataKey="equity" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">Drawdown (%)</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} syncId="single-sys-sync" margin={{ top: 0, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
                  <YAxis yAxisId="dd" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.abs(v).toFixed(0)}%`} />
                  {firstDate && isEndDate && (
                    <ReferenceArea x1={firstDate} x2={isEndDate} yAxisId="dd" fill="#06b6d4" fillOpacity={0.07} />
                  )}
                  {oosStartDate && lastDate && (
                    <ReferenceArea x1={oosStartDate} x2={lastDate} yAxisId="dd" fill="#d946ef" fillOpacity={0.12} />
                  )}
                  {oosStartDate && (
                    <ReferenceLine x={oosStartDate} yAxisId="dd" stroke="#e879f9" strokeDasharray="4 4" />
                  )}
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0" }}
                    formatter={(val: any) => typeof val === "number" ? [`${Math.abs(val).toFixed(2)}%`, "Drawdown"] : [String(val), "Drawdown"]}
                  />
                  <Line yAxisId="dd" type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Annual Breakdown */}
          {annual.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Performance Annuale (RAW)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-2 pr-4">Anno</th>
                      <th className="text-right py-2 px-3">Rendimento</th>
                      <th className="text-right py-2 px-3">Max DD</th>
                      <th className="text-right py-2 px-3">Calmar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annual.map((row) => (
                      <tr key={row.year} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-1.5 pr-4 text-slate-300 font-medium">{row.year}</td>
                        <td className={`py-1.5 px-3 text-right font-mono ${row.retPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {row.retPct >= 0 ? "+" : ""}{row.retPct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-red-400">-{row.maxDD.toFixed(1)}%</td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-300">{row.calmar.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Advanced Stats */}
          {backtestSystem?.advancedStats && (() => {
            const adv = backtestSystem.advancedStats;
            return (
              <Card>
                <div className="flex items-center gap-2 text-slate-300 text-base font-semibold border-b border-slate-700/40 pb-3 mb-4">
                  <i className="fas fa-microscope text-fuchsia-400" />
                  <span>Analisi Continua — {systemRaw.name}</span>
                </div>
                <div className="space-y-6 text-sm">
                  <div>
                    <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Metriche di Performance</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Daily Win Rate</div>
                        <div className="font-mono font-bold text-slate-200">{adv.dailyWinRate.toFixed(1)}%</div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Profit Factor</div>
                        <div className="font-mono font-bold text-slate-200">{adv.profitFactor.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Sortino Ratio</div>
                        <div className="font-mono font-bold text-indigo-400">{adv.sortino.toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Ulcer Index</div>
                        <div className="font-mono font-bold text-red-400/90">{adv.ulcerIndex.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-500 text-sm">
          Seleziona un sistema per vederne l&apos;analisi dettagliata.
        </div>
      )}
    </div>
  );
}

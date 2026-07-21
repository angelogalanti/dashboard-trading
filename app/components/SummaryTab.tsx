"use client";

import type { BacktestData } from "@/app/lib/types";

interface Props {
  backtest: BacktestData | null;
}

const SYSTEM_SPECS: Record<string, {
  name: string;
  description: string;
  timeframe: string;
  assets: string;
  status: "LIVE" | "Bench" | "Rimandato";
  statusColor: string;
  audit: string;
}> = {
  nextbar_book: {
    name: "NextBar Book",
    description: "Portafoglio 3 fattori (Low-Beta + Carry + Trend) su 40+ perp coin",
    timeframe: "2 giorni (rebal)",
    assets: "40+ perp",
    status: "Rimandato",
    statusColor: "text-slate-500",
    audit: "⚠️ Rimandato a Fase 3 (breadth 40+ perp)",
  },
  btc_mean_reversion: {
    name: "MR (BTC)",
    description: "Mean Reversion su BTC, 14 effetti statistici discovery v13",
    timeframe: "5 minuti",
    assets: "BTC",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 18) - Null result OOS, overfit",
  },
  trend_multiasset: {
    name: "Trend (Multi)",
    description: "TSMOM multi-horizon + vol-target su 11 altcoin, no stop",
    timeframe: "1 giorno",
    assets: "BTC, ETH, SOL, ZEC, DOGE, BNB, ADA, AVAX, NEAR, XRP, SUI",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 16/17) - CORE-3 diluisce convessità book",
  },
  donchian: {
    name: "Donchian",
    description: "Breakout canale 160/150 + regime EMA200 4h, no tilt",
    timeframe: "15 minuti",
    assets: "BTC, ETH, SOL",
    status: "LIVE",
    statusColor: "text-emerald-400",
    audit: "✅ Promosso (Fase 13) - Kernel canonico 15m, OOS robusto",
  },
  stddev: {
    name: "StdDev",
    description: "Breakout sessione USA (11-19 UTC), long-only",
    timeframe: "5 minuti",
    assets: "BTC, ETH, SOL, BNB, XRP, DOGE",
    status: "LIVE",
    statusColor: "text-emerald-400",
    audit: "✅ Promosso (Fase 14) - Long-only US session no-filter, OOT Calmar 2.35",
  },
  volsqueeze: {
    name: "VolSqueeze",
    description: "Breakout ad alta sigma (BB86/2.5σ) con filtri qualità, hold 10h/8h",
    timeframe: "1 ora",
    assets: "BTC, ETH",
    status: "Bench",
    statusColor: "text-rose-400",
    audit: "🔴 Scartato (Fase 15) - Null result OOS, coin flip",
  },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SummaryTab({ backtest }: Props) {
  const systems = backtest?.systems ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-1">Riepilogo Sistemi</h2>
        <p className="text-xs text-slate-400">
          Metriche da backtest storico normalizzate a 10% maxDD. Audit look-ahead del 2026-07-18.
        </p>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
          <span className="text-slate-500 mt-0.5 shrink-0">ℹ️</span>
          <span>
            <strong className="text-slate-300">Metriche daily.</strong> I sistemi operano su timeframe diversi (5m, 15m, 1h, daily); il
            denominatore comune più basso è il giorno. Il <strong className="text-slate-300">Max DD</strong> è calcolato su chiusure daily
            — perde i minimi intraday, quindi può sottostimare il drawdown reale e sopravvalutare il Calmar.
            <strong className="text-slate-300"> CAGR</strong> e <strong className="text-slate-300">Sharpe</strong> sono invece robusti
            alla frequenza. Per una valutazione definitiva usa le metriche sul timeframe nativo del sistema.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(SYSTEM_SPECS).map(([id, spec]) => {
          const sys = systems.find((s) => s.id === id);
          const m = sys?.metrics;
          const lev = sys?.levNorm ?? 1;
          const rawCagr = m ? ((1 + m.cagr / 100) ** (1 / lev) - 1) * 100 : null;
          const rawMaxDd = m ? m.maxdd / lev : null;

          return (
            <div
              key={id}
              className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-lg shadow-black/10 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{spec.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{spec.description}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${spec.statusColor === "text-emerald-400" ? "bg-emerald-500/15" : spec.statusColor === "text-amber-400" ? "bg-amber-500/15" : "bg-slate-700/50"} ${spec.statusColor}`}>
                  {spec.status}
                </span>
              </div>

              {/* Specs */}
              <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                <span className="bg-slate-700/40 px-1.5 py-0.5 rounded">{spec.timeframe}</span>
                <span className="bg-slate-700/40 px-1.5 py-0.5 rounded">{spec.assets.split(",").length} asset</span>
                <span className="bg-slate-700/40 px-1.5 py-0.5 rounded">{spec.audit}</span>
              </div>

              {/* Metrics */}
              {m ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-700/30 rounded-md p-2 text-center">
                    <div className="text-slate-500 text-[10px] uppercase">CAGR</div>
                    <div className="font-mono font-bold text-amber-400">{m.cagr.toFixed(1)}% <span className="text-[10px] text-slate-500 font-normal">norm</span></div>
                    <div className="text-[10px] text-slate-600">~{rawCagr?.toFixed(0)}% raw</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-md p-2 text-center">
                    <div className="text-slate-500 text-[10px] uppercase">Max DD</div>
                    <div className="font-mono font-bold text-red-400">-{m.maxdd.toFixed(1)}% <span className="text-[10px] text-slate-500 font-normal">norm</span></div>
                    <div className="text-[10px] text-slate-600">-{rawMaxDd?.toFixed(1)}% raw</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-md p-2 text-center">
                    <div className="text-slate-500 text-[10px] uppercase">Calmar</div>
                    <div className="font-mono font-bold text-indigo-400">{m.calmar.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-600">norm ≈ raw</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-md p-2 text-center">
                    <div className="text-slate-500 text-[10px] uppercase">Sharpe</div>
                    <div className="font-mono font-bold text-slate-200">{m.sharpe.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-600">norm ≈ raw</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 italic py-3 text-center">Metriche non disponibili</div>
              )}

              {/* IS vs OOS */}
              {(sys?.metricsIs || sys?.metricsOos) && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { label: "IS (pre-2024)", metrics: sys?.metricsIs, color: "text-cyan-400" },
                    { label: "OOS (2025+)", metrics: sys?.metricsOos, color: "text-fuchsia-400" },
                  ].map(({ label, metrics, color }) =>
                    metrics ? (
                      <div key={label} className="bg-slate-700/20 rounded-md p-2 text-center border border-slate-700/30">
                        <div className={`${color} text-[9px] uppercase font-bold mb-1`}>{label}</div>
                        <div className="flex justify-center gap-2">
                          <span className="text-slate-300">
                            CAGR <strong className={color === "text-cyan-400" ? "text-cyan-300" : "text-fuchsia-300"}>{metrics.cagr.toFixed(1)}%</strong>
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-300">
                            DD <strong className="text-red-400">{metrics.maxdd.toFixed(1)}%</strong>
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-300">
                            Calmar <strong className="text-indigo-400">{metrics.calmar.toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Leverage */}
              {m && (
                <div className="text-[10px] text-slate-500 text-center">
                  Leva normalizzazione: <span className="text-slate-400 font-mono">{lev.toFixed(3)}×</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

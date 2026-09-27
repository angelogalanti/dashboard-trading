"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, MetricCard, ChartTooltip } from "@/app/components/ui";
import type { BacktestData } from "@/app/lib/types";

type Point = {
  time: number;
  label: string;
  donchian: number;
  stddev: number;
  combined: number;
  donchianDd: number;
  stddevDd: number;
  combinedDd: number;
};

type MetaV2Data = {
  generated: string;
  status: string;
  weights: { donchian: number; stddev: number };
  metrics: Record<string, { maxdd: number; calmar: number; cagr: number }>;
  daily: Point[];
};

interface Props {
  data: MetaV2Data | null;
  backtest: BacktestData | null;
}

export default function MetaV2Tab({ data, backtest }: Props) {
  const [showCombined, setShowCombined] = useState(true);
  const [showBtc, setShowBtc] = useState(true);
  const [globalScale, setGlobalScale] = useState<"linear" | "log">("linear");

  const points = useMemo(() => {
    if (!data) return [];
    const step = Math.max(1, Math.floor(data.daily.length / 700));
    return data.daily.filter((_, i) => i % step === 0 || i === data.daily.length - 1);
  }, [data]);

  // Compute monthly heatmap for the portfolio book
  const heatmap = useMemo(() => {
    if (!backtest || !backtest.book || !backtest.book.daily.length) return [];
    const daily = backtest.book.daily;
    const endOfMonthEq: Record<string, number> = {};
    const years = new Set<number>();

    let baseEq = daily[0].equity;
    daily.forEach((d) => {
      const date = new Date(d.time);
      const y = date.getFullYear();
      const m = date.getMonth();
      years.add(y);
      endOfMonthEq[`${y}-${m}`] = d.equity;
    });

    const yearsArr = Array.from(years).sort();
    let prevEq = baseEq;
    const result = [];

    for (const y of yearsArr) {
      let yearStartEq = prevEq;
      const months: (number | null)[] = [];
      for (let m = 0; m < 12; m++) {
        const key = `${y}-${m}`;
        if (endOfMonthEq[key] !== undefined) {
          const eq = endOfMonthEq[key];
          months.push(((eq / prevEq) - 1) * 100);
          prevEq = eq;
        } else {
          months.push(null);
        }
      }
      const yearEndEq = prevEq;
      const ytd = yearStartEq > 0 ? ((yearEndEq / yearStartEq) - 1) * 100 : 0;
      result.push({ year: y, months, ytd });
    }

    return result;
  }, [backtest]);

  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

  if (!data && !backtest) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        <i className="fas fa-spinner fa-spin mr-2" />
        Caricamento dati del Portafoglio Meta-v2...
      </div>
    );
  }

  const bookMetrics = backtest?.book?.metrics || {
    cagr: data?.metrics?.combined?.cagr || 0,
    maxdd: data?.metrics?.combined?.maxdd || 0,
    calmar: data?.metrics?.combined?.calmar || 0,
    sharpe: 1.95,
  };

  const wDonchian = data?.weights?.donchian ?? 0.3708;
  const wStdDev = data?.weights?.stddev ?? 0.6292;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-sm text-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <i className="fas fa-layer-group text-indigo-400" />
            Meta-sistema v2 — Portafoglio Donchian + StdDev
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Composizione definitiva live-v2: Donchian (37,08% risk-weight) + StdDev (62,92% risk-weight). Replay 5m netting unificato (`aggregate_with_netting`).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Donchian {(wDonchian * 100).toFixed(2)}%
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            StdDev {(wStdDev * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Metric Cards (Coherent OOS 2025+ metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon="chart-line"
          label="CAGR OOS (2025+)"
          value="28.27%"
          valueColor="text-emerald-400"
          sub="Rendimento mensile comp.: +2.09%/m"
        />
        <MetricCard
          icon="arrow-trend-down"
          label="Max Drawdown OOS"
          value="-13.34%"
          valueColor="text-red-400"
          sub="Peak-to-trough unificato"
        />
        <MetricCard
          icon="scale-balanced"
          label="Calmar Ratio OOS"
          value="2.12"
          valueColor="text-indigo-400"
          sub="CAGR / MaxDD OOS"
        />
        <MetricCard
          icon="bolt"
          label="Sharpe Ratio OOS"
          value="1.48"
          valueColor="text-amber-400"
          sub="IS: 2.12 | Full (2020-26): 1.95"
        />
      </div>

      {/* Option bar */}
      <div className="flex justify-between items-center bg-slate-800/30 border border-slate-700/30 rounded-xl px-5 py-3.5 shadow-sm">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Opzioni Grafici</span>
        <div className="flex items-center gap-6">
          <div className="flex border border-slate-600/50 rounded-lg overflow-hidden text-[11px] font-semibold">
            <button
              onClick={() => setGlobalScale("linear")}
              className={`px-3 py-1.5 transition-all cursor-pointer ${
                globalScale === "linear"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Lineare
            </button>
            <button
              onClick={() => setGlobalScale("log")}
              className={`px-3 py-1.5 transition-all cursor-pointer ${
                globalScale === "log"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Logaritmica
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-400 hover:text-white transition-colors select-none">
            <input
              type="checkbox"
              checked={showCombined}
              onChange={(e) => setShowCombined(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-1 cursor-pointer"
            />
            <span>Mostra Curve Componenti (Donchian &amp; StdDev)</span>
          </label>
        </div>
      </div>

      {/* Equity & Drawdown of the Portfolio */}
      {backtest?.book?.daily && backtest.book.daily.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-slate-700/40 pb-3 mb-6">
            <div className="flex items-center gap-2 text-slate-300 text-base font-semibold">
              <i className="fas fa-clock-rotate-left text-violet-400" />
              <span>Equity Curve del Portafoglio (Unified Replay 2020-2026)</span>
            </div>
            <div className="flex gap-4 text-xs font-mono text-slate-400">
              <span>{backtest.book.startDate} → {backtest.book.endDate}</span>
              <span className="text-slate-500">({backtest.book.nDays} gg)</span>
            </div>
          </div>

          <div className="h-72 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtest.book.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="btEqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t: number) =>
                    new Date(t).toLocaleDateString("it-IT", { month: "short", year: "2-digit" })
                  }
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  scale={globalScale}
                  domain={globalScale === "log" ? ["auto", "auto"] : ["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v: number) => `${v.toFixed(2)}×`}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                {showBtc && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "#fbbf24" }}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                )}
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const eqPayload = payload.find((p: any) => p.dataKey === "equity");
                    const btcPayload = showBtc ? payload.find((p: any) => p.dataKey === "btc_price") : null;
                    return (
                      <div className="rounded-lg border border-slate-600/50 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-sm">
                        <p className="text-[11px] text-slate-400 mb-1.5">{d.date}</p>
                        {eqPayload && (
                          <p className="text-xs font-mono text-violet-300">
                            Equity: {eqPayload.value.toFixed(4)}× <span className="text-slate-500 text-[10px]">({((eqPayload.value - 1) * 100).toFixed(1)}%)</span>
                          </p>
                        )}
                        {btcPayload && btcPayload.value !== undefined && (
                          <p className="text-xs font-mono text-amber-400 mt-1">
                            Prezzo BTC: ${btcPayload.value.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    );
                  }}
                  cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
                />
                <Area
                  yAxisId="left"
                  name="Equity Portafoglio (Scala SX)"
                  type="monotone"
                  dataKey="equity"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#btEqGrad)"
                  dot={false}
                  connectNulls
                  animationDuration={800}
                />
                {showBtc && (
                  <Line
                    yAxisId="right"
                    name="Prezzo BTC (Scala DX)"
                    type="monotone"
                    dataKey="btc_price"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                    animationDuration={800}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown chart */}
          <div>
            <div className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1">
              <i className="fas fa-arrow-trend-down text-red-400/80 text-[10px]" />
              <span>Drawdown (%) — Portafoglio Meta-v2</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backtest.book.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="btDdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(t: number) =>
                      new Date(t).toLocaleDateString("it-IT", { month: "short", year: "2-digit" })
                    }
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={50}
                  />
                  <YAxis
                    domain={["auto", 0]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Tooltip
                    content={<ChartTooltip valueKey="drawdown" prefix="" suffix="%" />}
                    cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#btDdGrad)"
                    dot={false}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      {/* Weighted Component Curves */}
      {data && data.daily && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-slate-300 text-base font-semibold border-b border-slate-700/40 pb-3 mb-4">
            <i className="fas fa-code-branch text-amber-400" />
            <span>Confronto Curve Pesate (Base 100) — Donchian vs StdDev</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeOpacity={0.45} vertical={false} />
                <XAxis dataKey="label" minTickGap={48} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={(v) => v.toFixed(0)} />
                <ReferenceLine y={100} stroke="#475569" strokeDasharray="3 3" />
                <Tooltip content={<ChartTooltip valueKey={showCombined ? "combined" : "donchian"} prefix="" suffix="" />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Line type="monotone" dataKey="donchian" name="Donchian (37,08%)" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="stddev" name="StdDev (62,92%)" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
                {showCombined && (
                  <Line type="monotone" dataKey="combined" name="Portafoglio Combinato" stroke="#818cf8" strokeWidth={2.5} dot={false} connectNulls />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Monthly Heatmap */}
      {heatmap.length > 0 && (
        <Card className="p-6">
          <div className="text-slate-200 text-sm font-semibold mb-3 flex items-center gap-2 border-b border-slate-700/40 pb-3">
            <i className="fas fa-calendar-days text-indigo-400" />
            <span>Mappa di Calore Rendimenti Mensili del Portafoglio</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-center border-collapse">
              <thead>
                <tr>
                  <th className="py-1 px-2 text-slate-500 font-semibold border-b border-slate-700/50">Anno</th>
                  {monthNames.map((m) => (
                    <th key={m} className="py-1 px-2 text-slate-500 font-semibold border-b border-slate-700/50">{m}</th>
                  ))}
                  <th className="py-1 px-2 text-slate-400 font-bold border-b border-slate-700/50 border-l border-slate-700/50">YTD</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row) => (
                  <tr key={row.year} className="border-b border-slate-700/20">
                    <td className="py-2 px-2 text-slate-400 font-semibold">{row.year}</td>
                    {row.months.map((val, idx) => {
                      if (val === null) return <td key={idx} className="py-2 px-2 text-slate-600">—</td>;
                      const isPos = val > 0;
                      const isNeg = val < 0;
                      const intensity = Math.min(Math.abs(val) / 15, 1);
                      const bg = isPos
                        ? `rgba(16, 185, 129, ${intensity * 0.4})`
                        : isNeg
                        ? `rgba(239, 68, 68, ${intensity * 0.4})`
                        : "transparent";
                      const color = isPos ? "#34d399" : isNeg ? "#f87171" : "#94a3b8";
                      return (
                        <td key={idx} className="py-2 px-2 rounded-sm" style={{ backgroundColor: bg, color }}>
                          {val > 0 ? "+" : ""}{val.toFixed(1)}%
                        </td>
                      );
                    })}
                    <td className={`py-2 px-2 font-bold border-l border-slate-700/50 ${row.ytd > 0 ? "text-emerald-400" : row.ytd < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {row.ytd > 0 ? "+" : ""}{row.ytd.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

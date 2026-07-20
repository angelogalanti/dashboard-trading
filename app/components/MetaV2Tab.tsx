"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { Card, ChartTooltip, MetricCard } from "@/app/components/ui";

type Point = { time: number; label: string; donchian: number; stddev: number; combined: number; donchianDd: number; stddevDd: number; combinedDd: number };
type MetaV2 = { generated: string; status: string; weights: { donchian: number; stddev: number }; metrics: Record<string, { maxdd: number; calmar: number; cagr: number }>; daily: Point[] };

export default function MetaV2Tab({ data }: { data: MetaV2 | null }) {
  const [showCombined, setShowCombined] = useState(true);
  const points = useMemo(() => {
    if (!data) return [];
    const step = Math.max(1, Math.floor(data.daily.length / 700));
    return data.daily.filter((_, i) => i % step === 0 || i === data.daily.length - 1);
  }, [data]);
  if (!data) return <div className="py-12 text-center text-slate-500 text-sm"><i className="fas fa-spinner fa-spin mr-2" />Caricamento Meta-sistema v2…</div>;
  const m = data.metrics.combined;
  return <div className="space-y-6">
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
      <i className="fas fa-flask mr-2" />
      <strong>Ricerca / paper.</strong> Il portfolio combina le curve pesate; il netting è misurato ma non è ancora dentro un unico kernel di accounting.
    </div>
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div><h2 className="text-xl font-bold text-slate-100">Meta-sistema v2 — Donchian + StdDev</h2></div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
        <input type="checkbox" checked={showCombined} onChange={e => setShowCombined(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-1 cursor-pointer" />
        Mostra portfolio combinato
      </label>
    </div>
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        Donchian {(data.weights.donchian * 100).toFixed(2)}%
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        StdDev {(data.weights.stddev * 100).toFixed(2)}%
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard icon="arrow-trend-down" label="Max DD combinato" value={`-${m.maxdd.toFixed(2)}%`} valueColor="text-red-400" />
      <MetricCard icon="scale-balanced" label="Calmar combinato" value={m.calmar.toFixed(2)} valueColor="text-indigo-400" />
      <MetricCard icon="chart-line" label="CAGR combinato" value={`${m.cagr.toFixed(2)}%`} valueColor="text-emerald-400" />
    </div>
    <Card className="p-5">
      {/* Equity chart */}
      <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-4"><i className="fas fa-chart-line text-indigo-400" />Equity delle curve pesate (base 100)</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#334155" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="label" minTickGap={48} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={["auto", "auto"]} tickFormatter={v => v.toFixed(0)} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Tooltip content={<ChartTooltip valueKey={showCombined ? "combined" : "donchian"} prefix="" suffix="" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="donchian" name="Donchian pesato" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="stddev" name="StdDev pesato" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
            {showCombined && <Line type="monotone" dataKey="combined" name="Portfolio combinato" stroke="#818cf8" strokeWidth={2.5} dot={false} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Drawdown chart */}
      <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mt-6 mb-4"><i className="fas fa-arrow-trend-down text-red-400" />Drawdown delle curve pesate</div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#334155" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="label" minTickGap={48} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={["auto", 0]} tickFormatter={v => `${v.toFixed(0)}%`} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Tooltip content={<ChartTooltip valueKey="combinedDd" prefix="" suffix="%" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="donchianDd" name="Donchian pesato" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="stddevDd" name="StdDev pesato" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />
            {showCombined && <Line type="monotone" dataKey="combinedDd" name="Portfolio combinato" stroke="#ef4444" strokeWidth={2.5} dot={false} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  </div>;
}

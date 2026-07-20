"use client";

import { useMemo, useState } from "react";
import type { DonchianRawData, BacktestDailyPoint, BacktestSystem } from "@/app/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/app/components/ui";

interface Props {
  rawSystems: Record<string, DonchianRawData>;
  backtestSystems: Record<string, BacktestSystem | undefined>;
}

/* ------------------------------------------------------------------ */
/*  Annual breakdown helper                                           */
/* ------------------------------------------------------------------ */

interface AnnualRow {
  year: string;
  retPct: number;
  maxDD: number;
  calmar: number;
}

function computeAnnual(daily: BacktestDailyPoint[]): AnnualRow[] {
  if (!daily.length) return [];
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
  // Last year
  if (currentYear && daily.length > 0) {
    const last = daily[daily.length - 1];
    rows.push({ year: currentYear, retPct: (last.equity / yearStartEquity - 1) * 100, maxDD: 0, calmar: 0 });
  }

  // Compute per-year maxDD
  for (const row of rows) {
    let yPeak = 1;
    let yMaxDD = 0;
    for (const pt of daily) {
      if (!pt.date.startsWith(row.year)) continue;
      yPeak = Math.max(yPeak, pt.equity);
      const dd = (yPeak - pt.equity) / yPeak * 100;
      yMaxDD = Math.max(yMaxDD, dd);
    }
    row.maxDD = yMaxDD;
    row.calmar = yMaxDD > 0 ? Math.abs(row.retPct) / yMaxDD : 0;
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DonchianTab({ rawSystems, backtestSystems }: Props) {
  const systemIds = Object.keys(rawSystems);
  const [selectedId, setSelectedId] = useState<string>(systemIds[0] || "");
  const [logScale, setLogScale] = useState(true);

  const systemRaw = rawSystems[selectedId];
  const backtestSystem = backtestSystems[selectedId];

  const annual = useMemo(() => systemRaw ? computeAnnual(systemRaw.daily) : [], [systemRaw]);

  const chartData = useMemo(() => {
    if (!systemRaw) return [];
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

  if (!systemRaw) return <div className="text-slate-400 text-sm">Nessun sistema disponibile.</div>;

  return (
    <div className="space-y-6">
      {/* System selector */}
      <div className="flex flex-wrap gap-2">
        {systemIds.map(id => (
          <button key={id} onClick={() => setSelectedId(id)}
            className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all cursor-pointer ${
              selectedId === id
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:text-slate-200"
            }`}>
            {rawSystems[id]?.name || id}
          </button>
        ))}
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">{systemRaw.name}</h2>
        <p className="text-xs text-slate-400 mt-1">
          {systemRaw.startDate} → {systemRaw.endDate} · {systemRaw.nDays} giorni · <strong>Non normalizzato</strong>
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(systemRaw.params).map(([k, v]) => (
            <span key={k} className="px-2 py-0.5 text-xs rounded bg-slate-700/50 text-slate-300">
              {k}={String(v)}
            </span>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="text-xs text-slate-500 uppercase tracking-wide">CAGR</div>
          <div className="text-2xl font-bold text-amber-400">{systemRaw.metrics.cagr.toFixed(1)}%</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Max Drawdown</div>
          <div className="text-2xl font-bold text-red-400">-{systemRaw.metrics.maxdd.toFixed(2)}%</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Calmar</div>
          <div className="text-2xl font-bold text-indigo-400">{systemRaw.metrics.calmar.toFixed(2)}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Sharpe</div>
          <div className="text-2xl font-bold text-emerald-400">{systemRaw.metrics.sharpe.toFixed(2)}</div>
        </Card>
      </div>

      {/* Equity + Drawdown : two synced charts */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-200">Equity &amp; Drawdown</h3>
          <button onClick={() => setLogScale(!logScale)}
            className={`px-3 py-1 text-xs rounded transition-colors ${logScale ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>Log</button>
        </div>
        {/* Equity */}
        <div className="mb-1">
          <div className="text-xs text-slate-500 ml-1">Equity <span className="text-amber-400">—</span> · BTC <span className="text-orange-400/50">- -</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} syncId="donchian-sync" margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
              <YAxis yAxisId="eq" stroke="#64748b" tick={{ fontSize: 10 }}
                scale={logScale ? "log" : "auto"} domain={logScale ? [0.8, "auto"] : [0, "auto"]}
                tickFormatter={(v: number) => logScale ? `${v.toFixed(1)}×` : `${(v * 100).toFixed(0)}%`} />
              <YAxis yAxisId="btc" orientation="right" stroke="#64748b" tick={{ fontSize: 9 }}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0" }}
                formatter={(val: any, _name: any) => {
                  if (typeof val !== "number") return [String(val), String(_name ?? "")];
                  if (_name === "btc") return [`$${val.toLocaleString()}`, "BTC"];
                  if (logScale) return [`${val.toFixed(2)}×`, "Equity"];
                  return [`${(val * 100).toFixed(1)}%`, "Equity"];
                }} />
              <Line yAxisId="eq" type="monotone" dataKey="equity" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line yAxisId="btc" type="monotone" dataKey="btc" stroke="#f97316" strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Drawdown */}
        <div>
          <div className="text-xs text-slate-500 ml-1">Drawdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} syncId="donchian-sync" margin={{ top: 0, right: 10, bottom: 5, left: 5 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(0, 7)} interval="preserveStartEnd" />
              <YAxis yAxisId="l" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.abs(v).toFixed(0)}%`} />
              <YAxis yAxisId="r" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.abs(v).toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#e2e8f0" }}
                formatter={(val: any) => typeof val === "number" ? [`${Math.abs(val).toFixed(2)}%`, "Drawdown"] : [String(val), "Drawdown"]} />
              <Line yAxisId="l" type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Annual table */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Performance Annuale</h3>
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
                  <td className="py-1.5 px-3 text-right font-mono text-red-400">
                    -{row.maxDD.toFixed(1)}%
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-300">
                    {row.calmar.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly heatmap */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          <i className="fas fa-calendar-days text-indigo-400 mr-1" /> Mappa di Calore Rendimenti Mensili
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead>
              <tr>
                <th className="py-1 px-2 text-slate-500 font-semibold border-b border-slate-700/50">Anno</th>
                {["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"].map(m => (
                  <th key={m} className="py-1 px-2 text-slate-500 font-semibold border-b border-slate-700/50">{m}</th>
                ))}
                <th className="py-1 px-2 text-slate-400 font-bold border-b border-slate-700/50 border-l border-slate-700/50">YTD</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!systemRaw.daily.length) return null;
                const endOfMonth: Record<string, number> = {};
                const years = new Set<number>();
                let baseEq = systemRaw.daily[0].equity;
                systemRaw.daily.forEach(pt => {
                  const d = new Date(pt.time);
                  const y = d.getFullYear();
                  const m = d.getMonth();
                  years.add(y);
                  endOfMonth[`${y}-${m}`] = pt.equity;
                });
                const sortedYears = Array.from(years).sort();
                let prevEq = baseEq;
                return sortedYears.map(y => {
                  let yearStartEq = prevEq;
                  const months: (number | null)[] = [];
                  for (let m = 0; m < 12; m++) {
                    const key = `${y}-${m}`;
                    if (endOfMonth[key] !== undefined) {
                      const eq = endOfMonth[key];
                      months.push(((eq / prevEq) - 1) * 100);
                      prevEq = eq;
                    } else {
                      months.push(null);
                    }
                  }
                  const ytd = yearStartEq > 0 ? ((prevEq / yearStartEq) - 1) * 100 : 0;
                  return (
                    <tr key={y} className="border-b border-slate-700/20">
                      <td className="py-2 px-2 text-slate-400 font-semibold">{y}</td>
                      {months.map((val, idx) => {
                        if (val === null) return <td key={idx} className="py-2 px-2 text-slate-600">—</td>;
                        const intensity = Math.min(Math.abs(val) / 15, 1);
                        const bg = val > 0 ? `rgba(16, 185, 129, ${intensity * 0.4})` : `rgba(239, 68, 68, ${intensity * 0.4})`;
                        const color = val > 0 ? '#34d399' : '#f87171';
                        return (
                          <td key={idx} className="py-2 px-2 rounded-sm" style={{ backgroundColor: bg, color }}>
                            {val > 0 ? '+' : ''}{val.toFixed(1)}%
                          </td>
                        );
                      })}
                      <td className={`py-2 px-2 font-bold border-l border-slate-700/50 ${ytd > 0 ? 'text-emerald-400' : ytd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {ytd > 0 ? '+' : ''}{ytd.toFixed(1)}%
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Advanced stats — same style as Analisi Continua in Backtest */}
      {backtestSystem?.advancedStats && (() => {
        const adv = backtestSystem.advancedStats;
        return (
          <Card>
            <div className="flex items-center gap-2 text-slate-300 text-base font-semibold border-b border-slate-700/40 pb-3 mb-4">
              <i className="fas fa-microscope text-fuchsia-400" />
              <span>Analisi Continua — Donchian</span>
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
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Distribuzione Giornaliera</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Average Win</div>
                    <div className="font-mono font-bold text-emerald-400">+{adv.avgWin.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Average Loss</div>
                    <div className="font-mono font-bold text-red-400">{adv.avgLoss.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Best Day</div>
                    <div className="font-mono font-bold text-emerald-400">+{adv.bestDay.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Worst Day</div>
                    <div className="font-mono font-bold text-red-400">{adv.worstDay.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Esposizione e Costi</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Time in Market</div>
                    <div className="font-mono font-bold text-slate-200">{adv.timeInMarket.toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Leva (Avg/Max)</div>
                    <div className="font-mono font-bold text-amber-400/90">{adv.avgLeverage.toFixed(2)} / {adv.maxLeverage.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Turnover Totale</div>
                    <div className="font-mono font-bold text-slate-300">{adv.totalTurnover.toFixed(1)}x</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Costo Stimato</div>
                    <div className="font-mono font-bold text-red-400/80">-{adv.totalCost.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Drawdown e Rischio (Coda)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Current DD</div>
                    <div className="font-mono font-bold text-red-400">{adv.currentDrawdown.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Max DD Duration</div>
                    <div className="font-mono font-bold text-amber-400/90">{adv.maxDrawdownDays} gg</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">VaR (95%)</div>
                    <div className="font-mono font-bold text-red-400">{adv.var95.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Kelly Fraction</div>
                    <div className="font-mono font-bold text-indigo-400">{adv.kellyFraction.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">P/L Direzionale</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                      <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Long P/L</div>
                      <div className={`font-mono font-bold ${adv.longPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {adv.longPnL >= 0 ? "+" : ""}{adv.longPnL.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                      <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Short P/L</div>
                      <div className={`font-mono font-bold ${adv.shortPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {adv.shortPnL >= 0 ? "+" : ""}{adv.shortPnL.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Forma Distribuzione</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                      <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Skewness</div>
                      <div className="font-mono font-bold text-slate-300">{adv.skewness.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-md border border-slate-700/50">
                      <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Kurtosis</div>
                      <div className="font-mono font-bold text-slate-300">{adv.kurtosis.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Stagionalità (Mediana P/L per Giorno)</div>
                <div className="flex flex-wrap gap-2">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => {
                    const pnl = (adv.dayOfWeekPnl as Record<string,number> | undefined)?.[day];
                    if (pnl === undefined) return null;
                    return (
                      <div key={day} className="flex-1 min-w-[50px] bg-slate-800/50 p-2 rounded-md border border-slate-700/50 text-center">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-0.5">{day}</div>
                        <div className={`font-mono text-[10px] font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">P/L per Asset (Coin)</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(adv.coins).sort((a,b) => b[1] - a[1]).map(([coin, pnl]) => (
                    <div key={coin} className="flex items-center gap-1.5 bg-slate-700/30 px-2.5 py-1 rounded border border-slate-700/50">
                      <span className="text-slate-300 text-xs font-semibold">{coin}</span>
                      <span className={`font-mono text-xs ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{(pnl).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { AccountData, Fill, DataStatusResponse } from "@/app/lib/types";
import { Card } from "@/app/components/ui";
import DataStatusTab from "@/app/components/DataStatusTab";

interface Props {
  account: AccountData | null;
  fills: Fill[];
  dataStatus: DataStatusResponse | null;
}

export default function AccountOpsTab({ account, fills, dataStatus }: Props) {
  const [subTab, setSubTab] = useState<"account" | "datastatus">("account");
  const equity = account ? parseFloat(account.accountValue) : 0;
  const positions = account?.assetPositions ?? [];
  const isLiveActive = equity > 0 || positions.length > 0;

  return (
    <div className="space-y-6">
      {/* Subtabs header */}
      <div className="flex border-b border-slate-700/40 text-sm font-semibold">
        <button
          onClick={() => setSubTab("account")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            subTab === "account"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-wallet" />
          <span>Conto Live (Hyperliquid)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              isLiveActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-700/60 text-amber-400 border border-slate-600"
            }`}
          >
            {isLiveActive ? "Attivo" : "In Pausa / Inattivo"}
          </span>
        </button>

        <button
          onClick={() => setSubTab("datastatus")}
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            subTab === "datastatus"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <i className="fas fa-database" />
          <span>Copertura Dati &amp; Parquet</span>
        </button>
      </div>

      {subTab === "account" ? (
        <div className="space-y-6">
          {!isLiveActive && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-200 flex items-center gap-3">
              <i className="fas fa-pause-circle text-amber-400 text-xl shrink-0" />
              <div>
                <strong>Stato Operativo: Esecuzione Live Inattiva / Pausa.</strong>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Il conto Hyperliquid non presenta posizioni aperte o saldo attivo al momento. I sistemi proseguono in modalità Paper Forward Test.
                </p>
              </div>
            </div>
          )}

          {/* Account status card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <i className="fas fa-wallet text-indigo-400" />
                <span>Saldo Account (Equity)</span>
              </div>
              <p className="text-3xl font-mono font-semibold text-slate-100">${equity.toFixed(2)}</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <i className="fas fa-layer-group text-emerald-400" />
                <span>Posizioni Aperte</span>
              </div>
              <p className="text-3xl font-mono font-semibold text-slate-100">{positions.length}</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <i className="fas fa-receipt text-purple-400" />
                <span>Esecuzioni Registrate</span>
              </div>
              <p className="text-3xl font-mono font-semibold text-slate-100">{fills.length}</p>
            </Card>
          </div>

          {/* Open positions */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                <i className="fas fa-list text-indigo-400" />
                <span>Posizioni Aperte in Tempo Reale</span>
              </div>
              <span className="text-xs text-slate-400">{positions.length} posizioni</span>
            </div>

            {positions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <i className="fas fa-ban mr-2" />
                Nessuna posizione aperta sul conto Hyperliquid.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/40 text-slate-400 text-xs uppercase">
                      <th className="text-left px-5 py-3">Coin</th>
                      <th className="text-right px-5 py-3">Size</th>
                      <th className="text-right px-5 py-3">Valore Notionale</th>
                      <th className="text-right px-5 py-3">Entry Px</th>
                      <th className="text-right px-5 py-3">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.coin} className="border-b border-slate-700/20">
                        <td className="px-5 py-3 text-slate-200 font-semibold">{p.coin}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-300">{p.szi}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-300">${p.positionValue}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-300">${p.entryPx}</td>
                        <td className={`px-5 py-3 text-right font-mono ${parseFloat(p.unrealizedPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          ${p.unrealizedPnl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <DataStatusTab dataStatus={dataStatus} />
      )}
    </div>
  );
}

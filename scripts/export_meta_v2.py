"""Export the paper Donchian + StdDev v2 curves for the local dashboard."""
import contextlib
import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RESEARCH = Path("/srv/repos/auto-researchtrading/main")
sys.path.insert(0, str(RESEARCH))
from scripts.donchian import taker_honest_tp_measurement as donchian
from scripts.stddev import forward as stddev

OUT = Path(__file__).resolve().parents[1] / "data" / "meta-v2.json"

def daily(r): return (1 + r).groupby(r.index.normalize()).prod() - 1
def curve(r):
    e = (1 + r).cumprod() * 100
    return e, (e / e.cummax() - 1) * 100
def metrics(r):
    e, dd = curve(r); years = len(r) / 365.25; cagr = (e.iloc[-1] / 100) ** (1 / years) - 1
    return {"cagr": cagr * 100, "maxdd": -dd.min(), "calmar": cagr / (-dd.min() / 100)}

with contextlib.redirect_stdout(io.StringIO()):
    results = {s: donchian.run_symbol(s) for s in donchian.SYMBOLS}
don = daily(donchian.portfolio_returns({s: results[s]["T_5m"]["native"]["net_simple_return"] for s in donchian.SYMBOLS}))
std = daily(stddev.portfolio_net_returns())
idx = don.index.intersection(std.index); don, std = don.reindex(idx), std.reindex(idx)
train = slice(None, "2024-12-31")
dd_d, dd_s = metrics(don.loc[train])["maxdd"], metrics(std.loc[train])["maxdd"]
wd = (1 / dd_d) / (1 / dd_d + 1 / dd_s); ws = 1 - wd
# Curves are risk-scaled returns, all rebased to 100, so they are visually comparable.
weighted_d, weighted_s, combined = wd * don, ws * std, wd * don + ws * std
ed, ddd = curve(weighted_d); es, dds = curve(weighted_s); ec, ddc = curve(combined)
rows = [{"time": int(t.timestamp() * 1000), "label": t.strftime("%d %b %Y"), "donchian": round(float(ed.loc[t]), 6), "stddev": round(float(es.loc[t]), 6), "combined": round(float(ec.loc[t]), 6), "donchianDd": round(float(ddd.loc[t]), 6), "stddevDd": round(float(dds.loc[t]), 6), "combinedDd": round(float(ddc.loc[t]), 6)} for t in idx]
OUT.write_text(json.dumps({"generated": pd.Timestamp.now(tz="UTC").isoformat(), "status": "paper: TP Donchian touch 5m; netting measured separately", "weights": {"donchian": wd, "stddev": ws}, "metrics": {"donchian": metrics(weighted_d), "stddev": metrics(weighted_s), "combined": metrics(combined)}, "daily": rows}))
print(f"wrote {OUT} ({len(rows)} daily points)")

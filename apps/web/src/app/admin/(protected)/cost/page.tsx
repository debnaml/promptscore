import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Claude pricing (per million tokens, as of 2025)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5":         { input: 3.0,  output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8,  output: 4.0  },
  default:                     { input: 3.0,  output: 15.0 },
};

function estimateCost(model: string, tokens: number): number {
  // We only have total tokens, not split — assume ~85% input / 15% output
  const p = PRICING[model] ?? PRICING["default"];
  const inputTokens  = tokens * 0.85;
  const outputTokens = tokens * 0.15;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export default async function CostPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: aiLogs }, { data: recentScans }] = await Promise.all([
    supabaseAdmin
      .from("scan_ai_log")
      .select("model, tokens_used, created_at")
      .gte("created_at", thirtyDaysAgo),
    supabaseAdmin
      .from("scans")
      .select("id, created_at, overall_score")
      .gte("created_at", thirtyDaysAgo)
      .eq("status", "done"),
  ]);

  const logs = aiLogs ?? [];
  const scans = recentScans ?? [];

  // Month-to-date cost
  const mtdLogs = logs.filter((l) => l.created_at >= monthStart);
  const mtdCost = mtdLogs.reduce((sum, l) => sum + estimateCost(l.model, l.tokens_used), 0);
  const mtdTokens = mtdLogs.reduce((sum, l) => sum + l.tokens_used, 0);

  // 30-day cost
  const thirtyDayCost = logs.reduce((sum, l) => sum + estimateCost(l.model, l.tokens_used), 0);

  // Per-scan average (last 30 days)
  const perScanCost = scans.length > 0 ? thirtyDayCost / scans.length : 0;

  // Daily scan volume — last 30 days
  const dailyCounts: Record<string, number> = {};
  for (const s of scans) {
    const day = s.created_at.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }

  // Daily cost — last 30 days
  const dailyCost: Record<string, number> = {};
  for (const l of logs) {
    const day = l.created_at.slice(0, 10);
    dailyCost[day] = (dailyCost[day] ?? 0) + estimateCost(l.model, l.tokens_used);
  }

  // Build last 30 days array
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }

  const maxCount = Math.max(1, ...days.map((d) => dailyCounts[d] ?? 0));

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Cost dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Month-to-date cost" value={`$${mtdCost.toFixed(4)}`} />
        <StatCard label="MTD tokens" value={mtdTokens.toLocaleString()} />
        <StatCard label="30-day cost" value={`$${thirtyDayCost.toFixed(4)}`} />
        <StatCard label="Avg cost / scan" value={`$${perScanCost.toFixed(5)}`} sub="last 30 days" />
      </div>

      {/* Daily scan volume */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-slate-700 mb-3">Daily scan volume — last 30 days</h2>
        <div className="bg-white rounded-md border border-slate-200 p-4">
          <div className="flex items-end gap-1 h-24">
            {days.map((d) => {
              const count = dailyCounts[d] ?? 0;
              const pct = (count / maxCount) * 100;
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1" title={`${d}: ${count} scans`}>
                  <div
                    className="w-full bg-blue-500 rounded-sm"
                    style={{ height: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </div>
      </section>

      {/* Daily cost trend */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-slate-700 mb-3">Daily AI cost — last 30 days</h2>
        <div className="bg-white rounded-md border border-slate-200 p-4">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No AI cost data yet. Cost tracking activates automatically once scans run AI checks.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const maxCost = Math.max(1e-9, ...days.map((d) => dailyCost[d] ?? 0));
                  return days.map((d) => {
                    const cost = dailyCost[d] ?? 0;
                    const pct = (cost / maxCost) * 100;
                    return (
                      <div key={d} className="flex-1 flex flex-col items-center" title={`${d}: $${cost.toFixed(5)}`}>
                        <div
                          className="w-full bg-emerald-500 rounded-sm"
                          style={{ height: `${Math.max(pct, cost > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{days[0]}</span>
                <span>{days[days.length - 1]}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Model breakdown */}
      <section>
        <h2 className="text-sm font-medium text-slate-700 mb-3">Cost by model — last 30 days</h2>
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left">Model</th>
                <th className="px-4 py-2 text-right">Calls</th>
                <th className="px-4 py-2 text-right">Tokens</th>
                <th className="px-4 py-2 text-right">Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                logs.reduce<Record<string, { calls: number; tokens: number; cost: number }>>((acc, l) => {
                  const m = l.model;
                  acc[m] ??= { calls: 0, tokens: 0, cost: 0 };
                  acc[m].calls += 1;
                  acc[m].tokens += l.tokens_used;
                  acc[m].cost += estimateCost(m, l.tokens_used);
                  return acc;
                }, {})
              ).map(([model, stats]) => (
                <tr key={model} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{model}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">{stats.calls.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">{stats.tokens.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold">${stats.cost.toFixed(5)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-500 text-sm">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Pricing: Sonnet $3/$15 per M tokens (in/out), Haiku $0.80/$4. Assumes 85/15 in/out split.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

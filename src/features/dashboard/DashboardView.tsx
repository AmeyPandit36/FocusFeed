import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { client } from '../../messaging/client';
import type { CreditLedgerRecord, DailyCreditState, EnforcementConfig } from '../../core/types';

export function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [creditState, setCreditState] = useState<DailyCreditState | null>(null);
  const [config, setConfig] = useState<EnforcementConfig | null>(null);
  const [allRecords, setAllRecords] = useState<CreditLedgerRecord[]>([]);
  const [stats, setStats] = useState({
    allowedCount: 0,
    blockedCount: 0,
    uncertainCount: 0,
    creditsUsedToday: 0
  });
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const stateData = await client.getCurrentState();
      setCreditState(stateData.creditState);
      setConfig(stateData.config);

      const statsData = await client.getStats();
      setAllRecords(statsData.allRecords);
      setStats(statsData.stats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !creditState || !config) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Loading statistics and activity...</p>
      </div>
    );
  }

  const isRestricted = creditState.isRestricted && creditState.blockedUntil !== null;
  const filteredRecords = allRecords.filter((r) =>
    r.videoTitle.toLowerCase().includes(filterText.toLowerCase()) ||
    r.surface.toLowerCase().includes(filterText.toLowerCase()) ||
    (r.channelName && r.channelName.toLowerCase().includes(filterText.toLowerCase()))
  );

  const totalEvaluations = stats.allowedCount + stats.blockedCount + stats.uncertainCount;
  const allowedPercent = totalEvaluations > 0 ? Math.round((stats.allowedCount / totalEvaluations) * 100) : 100;
  const blockedPercent = totalEvaluations > 0 ? Math.round((stats.blockedCount / totalEvaluations) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Out of Interest Credits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Credits Remaining</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{creditState.remaining}</span>
            <span className="text-xs text-slate-500">/ {creditState.allowance} today</span>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: creditState.allowance }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < creditState.consumed ? 'bg-slate-200' : 'bg-indigo-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card 2: Videos Hidden */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Filtered / Hidden</span>
            <EyeOff className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.blockedCount}</span>
            <span className="text-xs text-slate-500">total videos</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Distractions removed from your feeds</p>
        </div>

        {/* Card 3: In-Interest Consumption */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Interest Content</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.allowedCount}</span>
            <span className="text-xs text-slate-500">({allowedPercent}% match rate)</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Aligned with your selected topics</p>
        </div>

        {/* Card 4: Restriction Status */}
        <div className={`p-5 rounded-2xl border shadow-xs ${
          isRestricted ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Restriction State</span>
            <ShieldAlert className={`w-4 h-4 ${isRestricted ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div>
            {isRestricted ? (
              <>
                <span className="text-xl font-bold text-rose-700">Restricted (10h)</span>
                <p className="text-xs text-rose-600 mt-1">Allowance used up</p>
              </>
            ) : (
              <>
                <span className="text-xl font-bold text-emerald-600">Healthy Focus</span>
                <p className="text-xs text-slate-500 mt-1">Ready for in-interest viewing</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Usage Distribution Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Viewing Content Distribution</h3>
        <p className="text-xs text-slate-500 mb-4">
          Ratio of relevant in-interest videos to filtered distractions on your YouTube feeds.
        </p>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${allowedPercent}%` }}
            title={`In-Interest: ${allowedPercent}%`}
          />
          <div
            className="bg-indigo-500 h-full transition-all duration-500"
            style={{ width: `${blockedPercent}%` }}
            title={`Filtered: ${blockedPercent}%`}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 mt-3 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>In-Interest Content ({allowedPercent}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
            <span>Filtered Distractions ({blockedPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Recent Policy Decisions Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Policy Decisions</h3>
            <p className="text-xs text-slate-500">Live ledger of evaluated video cards and viewing attempts</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search history..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64"
              />
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No viewing attempts recorded yet. Browse YouTube to see decisions here!
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Video Title</th>
                  <th className="py-3 px-4 font-semibold">Channel</th>
                  <th className="py-3 px-4 font-semibold">Surface</th>
                  <th className="py-3 px-4 font-semibold">Decision</th>
                  <th className="py-3 px-4 font-semibold">Credit Consumed</th>
                  <th className="py-3 px-4 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate" title={r.videoTitle}>
                      {r.videoTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate">
                      {r.channelName || 'YouTube'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-semibold tracking-wider text-slate-500">
                        {r.surface}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.decision === 'allowed' ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Allowed
                        </Badge>
                      ) : r.decision === 'blocked' ? (
                        <Badge variant="danger" size="sm">
                          <XCircle className="w-3 h-3 mr-1" />
                          Blocked
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <HelpCircle className="w-3 h-3 mr-1" />
                          Uncertain
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.creditConsumed ? (
                        <span className="font-semibold text-rose-600">1 Credit Used</span>
                      ) : (
                        <span className="text-slate-400">0 Credits</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

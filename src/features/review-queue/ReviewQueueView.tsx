import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { client } from '../../messaging/client';
import { db } from '../../storage/database';
import type { CreditLedgerRecord, UserCorrection } from '../../core/types';

export function ReviewQueueView() {
  const [loading, setLoading] = useState(true);
  const [queueItems, setQueueItems] = useState<CreditLedgerRecord[]>([]);
  const [corrections, setCorrections] = useState<UserCorrection[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  useEffect(() => {
    loadReviewData();
  }, []);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      const stats = await client.getStats();
      // Items that are uncertain or recently blocked
      const pending = stats.allRecords.filter(
        (r) => r.decision === 'uncertain' || r.decision === 'blocked'
      );
      setQueueItems(pending);

      const storedCorrections = await db.userCorrections.orderBy('timestamp').reverse().toArray();
      setCorrections(storedCorrections);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyCorrection = async (
    item: CreditLedgerRecord,
    correctedDecision: 'allowed' | 'blocked'
  ) => {
    try {
      const correction: UserCorrection = {
        id: `corr_${Date.now()}_${item.videoId}`,
        videoId: item.videoId,
        videoTitle: item.videoTitle,
        channelName: item.channelName,
        originalDecision: item.decision,
        correctedDecision,
        timestamp: Date.now()
      };

      await client.recordCorrection(correction);
      // Remove from current local queue display
      setQueueItems((prev) => prev.filter((q) => q.videoId !== item.videoId));
      setCorrections((prev) => [correction, ...prev]);
    } catch (err) {
      console.error('Failed to apply correction:', err);
    }
  };

  const removeCorrection = async (videoId: string) => {
    try {
      const matches = await db.userCorrections.where('videoId').equals(videoId).toArray();
      for (const m of matches) {
        await db.userCorrections.delete(m.id);
      }
      setCorrections((prev) => prev.filter((c) => c.videoId !== videoId));
    } catch (err) {
      console.error('Failed to remove correction:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Loading review queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Review Queue & Manual Corrections</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Train FocusFeed by overriding decisions on ambiguous or misclassified videos.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'queue'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Review ({queueItems.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Corrections ({corrections.length})
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {queueItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">All clear!</h3>
              <p className="text-xs text-slate-500 mt-1">
                No videos currently pending review. As you browse YouTube, uncertain items will appear here.
              </p>
            </div>
          ) : (
            queueItems.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.decision === 'uncertain' ? 'warning' : 'danger'} size="sm">
                      {item.decision.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">Surface: {item.surface}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {item.videoTitle}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Channel: <span className="font-medium text-slate-700">{item.channelName || 'YouTube'}</span> ·
                    Reason: <span className="text-slate-600">{item.reason}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => applyCorrection(item, 'allowed')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Allow Always
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-700 border-rose-300 hover:bg-rose-50"
                    onClick={() => applyCorrection(item, 'blocked')}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    Block Always
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* History of user manual corrections */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {corrections.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No manual corrections recorded yet.
            </div>
          ) : (
            corrections.map((corr) => (
              <div
                key={corr.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={corr.correctedDecision === 'allowed' ? 'success' : 'danger'} size="sm">
                      Manual Override: {corr.correctedDecision.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      (Originally {corr.originalDecision})
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-1 max-w-lg truncate">
                    {corr.videoTitle}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCorrection(corr.videoId)}
                  title="Undo correction"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Undo
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

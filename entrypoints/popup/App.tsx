import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldOff,
  Clock,
  Sparkles,
  ExternalLink,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../../src/components/Badge';
import { client } from '../../src/messaging/client';
import type { DailyCreditState, EnforcementConfig, InterestProfile } from '../../src/core/types';

export default function PopupApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditState, setCreditState] = useState<DailyCreditState | null>(null);
  const [config, setConfig] = useState<EnforcementConfig | null>(null);
  const [profile, setProfile] = useState<InterestProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.getCurrentState();
      setCreditState(data.creditState);
      setConfig(data.config);
      setProfile(data.profile);
    } catch (err: unknown) {
      console.error('[FocusFeed Popup] Error loading state:', err);
      setError('Unable to connect to extension background service');
    } finally {
      setLoading(false);
    }
  };

  const toggleProtection = async () => {
    if (!config || isUpdating) return;
    try {
      setIsUpdating(true);
      const newEnabled = !config.enabled;
      const res = await client.updateConfig({ enabled: newEnabled });
      if (res.success) {
        setConfig(res.config);
      }
    } catch (err) {
      console.error('Failed to toggle protection:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const openOptionsPage = (tab?: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/options.html' + (tab ? `?tab=${tab}` : ''), '_blank');
    }
  };

  if (loading) {
    return (
      <div className="w-84 p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[360px] text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium">Loading FocusFeed...</p>
      </div>
    );
  }

  if (error || !creditState || !config || !profile) {
    return (
      <div className="w-84 p-6 bg-slate-50 min-h-[320px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Connection Issue</h2>
        <p className="text-xs text-slate-500 mb-4">{error || 'Failed to load configuration'}</p>
        <button
          onClick={loadData}
          className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md font-medium text-slate-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const isRestricted = creditState.isRestricted && creditState.blockedUntil !== null;
  const remainingHours = creditState.blockedUntil
    ? Math.max(0, Math.ceil((creditState.blockedUntil - Date.now()) / (60 * 60 * 1000)))
    : 0;

  return (
    <div className="w-84 bg-white text-slate-900 border border-slate-200 shadow-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
            F
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">FocusFeed</h1>
            <p className="text-[10px] text-slate-400">YouTube Feed Controller</p>
          </div>
        </div>

        <button
          onClick={toggleProtection}
          disabled={isUpdating}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
            config.enabled
              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title="Toggle YouTube Feed Filtering"
        >
          {config.enabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Active
            </>
          ) : (
            <>
              <ShieldOff className="w-3 h-3 text-slate-400" />
              Paused
            </>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Active 10-Hour Restriction Alert */}
        {isRestricted ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-rose-900">10-Hour Restriction Active</h3>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  Daily allowance exhausted. YouTube video playback is temporarily restricted for focus.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unlocks in ~{remainingHours} hours</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Daily Out-of-Interest Credit Meter */
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Out-of-Interest Credits</span>
              <span className="text-xs font-bold text-indigo-600">
                {creditState.remaining} of {creditState.allowance} left
              </span>
            </div>

            {/* Credit Blocks */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {Array.from({ length: creditState.allowance }).map((_, idx) => {
                const isConsumed = idx < creditState.consumed;
                return (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-colors ${
                      isConsumed ? 'bg-slate-200' : 'bg-indigo-600'
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              In-interest videos never use credits. 6th out-of-interest attempt triggers 10h restriction.
            </p>
          </div>
        )}

        {/* Selected Interests Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Your Active Topics</span>
            <span className="text-slate-400 font-normal">
              {profile.categories.length} categories
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {profile.categories.map((cat) => (
              <Badge key={cat.id} variant="info" size="sm">
                {cat.name.split('&')[0].trim()}
              </Badge>
            ))}
            {profile.allowedTopics.slice(0, 3).map((topic, idx) => (
              <Badge key={idx} variant="success" size="sm">
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          <button
            onClick={() => openOptionsPage('dashboard')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Main Dashboard & Statistics
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={() => openOptionsPage('interests')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Manage Interests & Channels
            </span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

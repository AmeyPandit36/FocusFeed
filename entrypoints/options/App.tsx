import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Inbox,
  Settings,
  ShieldCheck,
  ShieldOff,
  HelpCircle,
  Trash2,
  Lock,
  Flame,
  Check
} from 'lucide-react';
import { DashboardView } from '../../src/features/dashboard/DashboardView';
import { InterestEditorView } from '../../src/features/interests/InterestEditorView';
import { ReviewQueueView } from '../../src/features/review-queue/ReviewQueueView';
import { OnboardingFlow } from '../../src/features/onboarding/OnboardingFlow';
import { Button } from '../../src/components/Button';
import { client } from '../../src/messaging/client';
import type { EnforcementConfig } from '../../src/core/types';

export default function OptionsApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'interests' | 'review' | 'settings'>('dashboard');
  const [config, setConfig] = useState<EnforcementConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Form states for settings
  const [allowanceInput, setAllowanceInput] = useState(5);
  const [durationHoursInput, setDurationHoursInput] = useState(10);

  useEffect(() => {
    // Check URL params for initial tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'interests' || tabParam === 'review' || tabParam === 'settings') {
      setActiveTab(tabParam);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const stateData = await client.getCurrentState();
      setConfig(stateData.config);
      setAllowanceInput(stateData.config.dailyAllowance);
      setDurationHoursInput(Math.round(stateData.config.restrictionDurationMs / (3600 * 1000)));

      if (!stateData.profile.onboardingCompleted) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProtection = async () => {
    if (!config) return;
    try {
      const res = await client.updateConfig({ enabled: !config.enabled });
      if (res.success) {
        setConfig(res.config);
      }
    } catch (err) {
      console.error('Failed to toggle protection:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!config) return;
    try {
      const res = await client.updateConfig({
        dailyAllowance: Number(allowanceInput),
        restrictionDurationMs: Number(durationHoursInput) * 3600 * 1000
      });
      if (res.success) {
        setConfig(res.config);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all viewing history and reset restrictions? Your interest profile will be kept.')) {
      try {
        await client.clearAllData();
        window.location.reload();
      } catch (err) {
        console.error('Failed to clear data:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Opening FocusFeed Dashboard...</p>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              F
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">FocusFeed</h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">YouTube Interest & Feed Controller</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config && (
              <button
                onClick={toggleProtection}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  config.enabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {config.enabled ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Feed Protection Active
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-4 h-4 text-slate-400" />
                    Protection Paused
                  </>
                )}
              </button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnboarding(true)}
              title="Re-run Setup Wizard"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Setup Guide
            </Button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex gap-8 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard & Activity
          </button>

          <button
            onClick={() => setActiveTab('interests')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'interests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Interest Profile
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'review'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Review Queue
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Policy & Data Settings
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'interests' && <InterestEditorView />}
        {activeTab === 'review' && <ReviewQueueView />}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-3xl">
            {/* Credit Allowance & Restriction Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enforcement & Credit Policy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize your daily out-of-interest allowance and restriction lock duration.
                  </p>
                </div>
                {settingsSaved && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Daily Out-of-Interest Allowance
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={allowanceInput}
                    onChange={(e) => setAllowanceInput(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Number of out-of-interest videos permitted before restriction triggers. Default: 5.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                    Restriction Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={durationHoursInput}
                    onChange={(e) => setDurationHoursInput(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hours YouTube playback remains locked once allowance is exhausted. Default: 10.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button size="sm" onClick={handleSaveSettings}>
                  Save Policy Configuration
                </Button>
              </div>
            </div>

            {/* Privacy & Storage Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Privacy & Data Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  FocusFeed stores everything locally in your browser's IndexedDB database.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <p>• <strong>No Analytics:</strong> No tracking scripts, telemetries, or remote endpoints are contacted.</p>
                <p>• <strong>Browser Scope:</strong> FocusFeed only has permission to inspect YouTube URLs to filter video cards.</p>
                <p>• <strong>Instant Erasure:</strong> You can completely clear your viewing ledger and restrictions at any time.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Clear Local Viewing History</h4>
                  <p className="text-[11px] text-slate-500">
                    Resets credit usage history and lifts active restrictions immediately.
                  </p>
                </div>

                <Button variant="danger" size="sm" onClick={handleClearData}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear Data
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

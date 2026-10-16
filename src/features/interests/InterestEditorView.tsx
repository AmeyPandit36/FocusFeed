import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  AlertCircle,
  Hash,
  Tv,
  FolderTree
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { client } from '../../messaging/client';
import {
  CURATED_INTEREST_TEMPLATES,
  exportProfileToJson,
  importProfileFromJson
} from '../../core/interest-profile';
import type { InterestProfile, InterestCategory } from '../../core/types';

export function InterestEditorView() {
  const [profile, setProfile] = useState<InterestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Form input states
  const [newTopicAllowed, setNewTopicAllowed] = useState('');
  const [newTopicBlocked, setNewTopicBlocked] = useState('');
  const [newChannelAllowed, setNewChannelAllowed] = useState('');
  const [newChannelBlocked, setNewChannelBlocked] = useState('');
  const [newKeywordAllowed, setNewKeywordAllowed] = useState('');
  const [newKeywordBlocked, setNewKeywordBlocked] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await client.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (updated: InterestProfile) => {
    setProfile(updated);
    try {
      await client.saveProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const toggleCategory = (cat: InterestCategory) => {
    if (!profile) return;
    const exists = profile.categories.some((c: InterestCategory) => c.id === cat.id);
    let newCats: InterestCategory[];
    if (exists) {
      newCats = profile.categories.filter((c: InterestCategory) => c.id !== cat.id);
    } else {
      newCats = [...profile.categories, cat];
    }

    saveProfile({
      ...profile,
      categories: newCats,
      version: profile.version + 1
    });
  };

  const addTag = (
    field: 'allowedTopics' | 'blockedTopics' | 'allowedChannels' | 'blockedChannels',
    value: string,
    setter: (s: string) => void
  ) => {
    if (!profile || !value.trim()) return;
    const trimmed = value.trim();
    if (profile[field].includes(trimmed)) return;

    saveProfile({
      ...profile,
      [field]: [...profile[field], trimmed],
      version: profile.version + 1
    });
    setter('');
  };

  const removeTag = (
    field: 'allowedTopics' | 'blockedTopics' | 'allowedChannels' | 'blockedChannels',
    item: string
  ) => {
    if (!profile) return;
    saveProfile({
      ...profile,
      [field]: profile[field].filter((x: string) => x !== item),
      version: profile.version + 1
    });
  };

  const addKeyword = (type: 'allowed' | 'blocked', value: string, setter: (s: string) => void) => {
    if (!profile || !value.trim()) return;
    const trimmed = value.trim();
    const current = profile.customKeywords?.[type] || [];
    if (current.includes(trimmed)) return;

    saveProfile({
      ...profile,
      customKeywords: {
        ...profile.customKeywords,
        [type]: [...current, trimmed]
      },
      version: profile.version + 1
    });
    setter('');
  };

  const removeKeyword = (type: 'allowed' | 'blocked', item: string) => {
    if (!profile) return;
    saveProfile({
      ...profile,
      customKeywords: {
        ...profile.customKeywords,
        [type]: (profile.customKeywords?.[type] || []).filter((x: string) => x !== item)
      },
      version: profile.version + 1
    });
  };

  const handleExport = () => {
    if (!profile) return;
    const jsonStr = exportProfileToJson(profile);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusfeed-profile-v${profile.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = importProfileFromJson(content);
      if (res.success && res.profile) {
        setImportError(null);
        await saveProfile(res.profile);
      } else {
        setImportError(res.error || 'Failed to import profile.');
      }
    };
    reader.readAsText(file);
  };

  if (loading || !profile) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Loading Interest Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header and Import/Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Interest Profile & Content Rules</h2>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-fade-in">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            FocusFeed filters video recommendations and searches according to these preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Profile
          </Button>

          <label className="cursor-pointer inline-flex items-center justify-center font-medium rounded-lg text-xs px-2.5 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {importError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{importError}</span>
        </div>
      )}

      {/* 1. Curated Categories and Subcategories */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-indigo-600" />
              Category & Subcategory Hierarchy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select predefined knowledge areas and topics you want visible on YouTube.
            </p>
          </div>
          <Badge variant="info">
            {profile.categories.length} Selected
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {CURATED_INTEREST_TEMPLATES.map((cat: InterestCategory) => {
            const isSelected = profile.categories.some((c: InterestCategory) => c.id === cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-xs text-slate-900">{cat.name}</div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{cat.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {cat.subcategories.map((sub) => (
                    <span
                      key={sub.id}
                      className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md"
                    >
                      {sub.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Explicit Channels: Allowed vs Blocked */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allowed Channels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tv className="w-4 h-4 text-emerald-600" />
              Explicitly Allowed Channels
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Always allow videos from these trusted YouTube creators.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newChannelAllowed}
              onChange={(e) => setNewChannelAllowed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('allowedChannels', newChannelAllowed, setNewChannelAllowed)}
              placeholder="e.g. 3Blue1Brown or @veritasium"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addTag('allowedChannels', newChannelAllowed, setNewChannelAllowed)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[48px]">
            {profile.allowedChannels.map((ch: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full"
              >
                {ch}
                <button
                  onClick={() => removeTag('allowedChannels', ch)}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-emerald-600" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Blocked Channels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tv className="w-4 h-4 text-rose-600" />
              Explicitly Blocked Channels
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Always block videos from these channels (highest priority).
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newChannelBlocked}
              onChange={(e) => setNewChannelBlocked(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('blockedChannels', newChannelBlocked, setNewChannelBlocked)}
              placeholder="e.g. GossipCentral or @drama"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addTag('blockedChannels', newChannelBlocked, setNewChannelBlocked)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[48px]">
            {profile.blockedChannels.map((ch: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full"
              >
                {ch}
                <button
                  onClick={() => removeTag('blockedChannels', ch)}
                  className="hover:text-rose-900 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Explicit Topics & Custom Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allowed Topics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-600" />
              Allowed Topics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific topics that will allow matching videos.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicAllowed}
              onChange={(e) => setNewTopicAllowed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('allowedTopics', newTopicAllowed, setNewTopicAllowed)}
              placeholder="e.g. Quantum Physics, Rust, Docker"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addTag('allowedTopics', newTopicAllowed, setNewTopicAllowed)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[48px]">
            {profile.allowedTopics.map((t: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-full"
              >
                {t}
                <button
                  onClick={() => removeTag('allowedTopics', t)}
                  className="hover:text-indigo-900 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-indigo-500" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Blocked Topics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Hash className="w-4 h-4 text-rose-600" />
              Blocked Topics & Phrases
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phrases that will immediately hide any matching video.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicBlocked}
              onChange={(e) => setNewTopicBlocked(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('blockedTopics', newTopicBlocked, setNewTopicBlocked)}
              placeholder="e.g. Pranks, Clickbait, Reality TV"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addTag('blockedTopics', newTopicBlocked, setNewTopicBlocked)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[48px]">
            {profile.blockedTopics.map((t: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full"
              >
                {t}
                <button
                  onClick={() => removeTag('blockedTopics', t)}
                  className="hover:text-rose-900 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Custom Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Custom Allowed Keywords</h3>
            <p className="text-xs text-slate-500 mt-0.5">Keywords like "tutorial", "explained", "course".</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeywordAllowed}
              onChange={(e) => setNewKeywordAllowed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('allowed', newKeywordAllowed, setNewKeywordAllowed)}
              placeholder="e.g. tutorial, deep dive"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button size="sm" variant="outline" onClick={() => addKeyword('allowed', newKeywordAllowed, setNewKeywordAllowed)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[40px]">
            {(profile.customKeywords?.allowed || []).map((kw: string, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full">
                {kw}
                <button onClick={() => removeKeyword('allowed', kw)} className="hover:text-slate-900 cursor-pointer">
                  <Trash2 className="w-3 h-3 text-slate-500" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Custom Blocked Keywords</h3>
            <p className="text-xs text-slate-500 mt-0.5">Keywords like "prank", "drama", "shocking".</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeywordBlocked}
              onChange={(e) => setNewKeywordBlocked(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword('blocked', newKeywordBlocked, setNewKeywordBlocked)}
              placeholder="e.g. drama, reacting to"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <Button size="sm" variant="outline" onClick={() => addKeyword('blocked', newKeywordBlocked, setNewKeywordBlocked)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[40px]">
            {(profile.customKeywords?.blocked || []).map((kw: string, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full">
                {kw}
                <button onClick={() => removeKeyword('blocked', kw)} className="hover:text-rose-900 cursor-pointer">
                  <Trash2 className="w-3 h-3 text-rose-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Classification Threshold and Uncertainty Policy */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Classification Preferences</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Fine-tune semantic matching thresholds and behavior for ambiguous videos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Minimum Confidence Threshold</span>
              <span className="font-bold text-indigo-600">
                {Math.round(profile.minConfidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={profile.minConfidenceThreshold}
              onChange={(e) =>
                saveProfile({
                  ...profile,
                  minConfidenceThreshold: parseFloat(e.target.value),
                  version: profile.version + 1
                })
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Lenient (40%)</span>
              <span>Balanced (65%)</span>
              <span>Strict (90%)</span>
            </div>
          </div>

          {/* Uncertain Policy */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 block">
              Ambiguous / Uncertain Content Policy
            </label>
            <select
              value={profile.uncertainPolicy}
              onChange={(e) =>
                saveProfile({
                  ...profile,
                  uncertainPolicy: e.target.value as 'review' | 'block' | 'allow',
                  version: profile.version + 1
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="review">Hide & add to Review Queue (Recommended)</option>
              <option value="block">Strictly Block</option>
              <option value="allow">Allow uncertain content</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Default is to hide uncertain content and allow manual review without consuming credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Flame,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { Button } from '../../components/Button';
import { CURATED_INTEREST_TEMPLATES } from '../../core/interest-profile';
import type { InterestCategory, InterestProfile } from '../../core/types';
import { client } from '../../messaging/client';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedCats, setSelectedCats] = useState<InterestCategory[]>([
    CURATED_INTEREST_TEMPLATES[0], // Programming
    CURATED_INTEREST_TEMPLATES[1]  // AI & Data Science
  ]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: InterestCategory) => {
    if (selectedCats.some((c) => c.id === cat.id)) {
      setSelectedCats(selectedCats.filter((c) => c.id !== cat.id));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      const profile = await client.getProfile();
      const updated: InterestProfile = {
        ...profile,
        categories: selectedCats,
        onboardingCompleted: true,
        version: profile.version + 1,
        updatedAt: Date.now()
      };
      await client.saveProfile(updated);
      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans">
      {/* Step Progress Bar */}
      <div className="bg-slate-100 h-1.5 flex">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="p-8 sm:p-12">
        {/* Step 1: Welcome Screen */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome to FocusFeed
              </h1>
              <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto leading-relaxed">
                Take back control of your YouTube experience. Replace algorithmic rabbit holes with the topics that actually matter to you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-xs text-slate-900 mb-1">🎯 Interest-First</div>
                <div className="text-[11px] text-slate-500">Only see videos matching your topics of study or work.</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-xs text-slate-900 mb-1">⚡ Daily Credits</div>
                <div className="text-[11px] text-slate-500">5 daily passes for out-of-interest videos when needed.</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-xs text-slate-900 mb-1">🔒 100% Private</div>
                <div className="text-[11px] text-slate-500">All data and rules stay local in your browser.</div>
              </div>
            </div>

            <div className="pt-6">
              <Button size="lg" onClick={() => setStep(2)}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Interest Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900">Choose Your Initial Interests</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select the areas of knowledge you want YouTube to show you. You can customize them anytime later.
              </p>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {CURATED_INTEREST_TEMPLATES.map((cat) => {
                const isSelected = selectedCats.some((c) => c.id === cat.id);
                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat)}
                    className={`p-4 rounded-xl border cursor-pointer transition select-none flex items-start justify-between gap-4 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{cat.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
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

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selectedCats.length === 0}>
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Daily Credit Policy Explanation */}
        {step === 3 && (
          <div className="space-y-6 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto sm:mx-0">
              <Flame className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">The 5 Daily Viewing Credits</h2>
              <p className="text-xs text-slate-500 mt-1">
                A conscious balance between deep focus and intentional flexibility.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  ✓
                </span>
                <div>
                  <strong className="text-slate-800">In-interest videos never consume credits.</strong> Watch as many videos related to your selected interests as you need.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  5
                </span>
                <div>
                  <strong className="text-slate-800">5 out-of-interest credits per day.</strong> When you deliberately choose to watch content outside your topics, 1 credit is used.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  ↻
                </span>
                <div>
                  <strong className="text-slate-800">Resets every midnight.</strong> Your daily allowance automatically resets at local midnight.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Next: Restriction Policy
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Restriction Duration Explanation */}
        {step === 4 && (
          <div className="space-y-6 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto sm:mx-0">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">The 10-Hour Focus Lock</h2>
              <p className="text-xs text-slate-500 mt-1">
                Protection when daily limits are exceeded.
              </p>
            </div>

            <div className="p-5 bg-rose-50/60 border border-rose-100 rounded-2xl text-xs text-rose-900 space-y-2.5 leading-relaxed">
              <p>
                <strong>What happens on the 6th out-of-interest attempt?</strong>
              </p>
              <p>
                Once your 5 daily credits are exhausted, attempting to open a 6th out-of-interest video triggers an active <strong>10-hour restriction</strong>.
              </p>
              <p>
                During this 10-hour period, video playback is locked to break compulsive scrolling loops and protect your rest or work.
              </p>
              <p className="text-[11px] text-rose-700">
                Note: A 10-hour restriction continues across calendar days until its full duration expires.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => setStep(5)}>
                Next: Privacy & Setup
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Privacy Explanation & Finish */}
        {step === 5 && (
          <div className="space-y-6 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto sm:mx-0">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Privacy First, By Design</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your viewing habits and data belong to you alone.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-600">
              <p>• <strong>Zero External Tracking:</strong> FocusFeed does not transmit your search queries or history to any third-party server.</p>
              <p>• <strong>Local IndexedDB Storage:</strong> All interest profiles, credit records, and rules stay strictly within your browser.</p>
              <p>• <strong>Control & Export:</strong> Export or wipe all stored records anytime from the settings page.</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button size="lg" isLoading={saving} onClick={handleFinish}>
                Finish Setup & Start Browsing
                <Check className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

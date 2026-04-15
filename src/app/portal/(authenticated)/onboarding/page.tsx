'use client';

import { useState, useEffect } from 'react';

interface OnboardingStep {
  step: number;
  category: string;
  label: string;
  completed: boolean;
}

const stepDescriptions: Record<string, string> = {
  company_profile: 'Tell us about your company — name, website, industry, and size.',
  icp_definition: 'Define your ideal customer — target industries, company sizes, job titles, geographies, and who to exclude.',
  offer_value_prop: 'What do you sell? Key differentiators, pricing context, and main value proposition.',
  brand_voice: 'How should emails sound? Formal, casual, provocative? Share example emails you like and words to avoid.',
  objection_handling: 'List the top 5-10 objections prospects raise, and how you want them handled.',
  faq: 'Common questions prospects ask about your product or service.',
  competitors: 'Who do you compete with? How do you differentiate? Who do you lose deals to?',
  social_proof: 'Case studies, stats, customer logos, and testimonials we can reference.',
  booking_link: 'Your Calendly or Cal.com URL for scheduling meetings.',
  sending_setup: 'Which email domains will you use, or confirm that ColdCraft handles setup.',
};

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/onboarding')
      .then((r) => r.json())
      .then((data) => {
        setSteps(data.steps);
        const firstIncomplete = data.steps.find((s: OnboardingStep) => !s.completed);
        if (firstIncomplete) setActiveStep(firstIncomplete.category);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveStep() {
    if (!activeStep || !content.trim()) return;
    setSaving(true);

    const res = await fetch('/api/portal/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: activeStep, content }),
    });

    const data = await res.json();

    if (data.success) {
      setContent('');

      if (data.all_complete) {
        setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
        setActiveStep(null);
      } else {
        setSteps((prev) => {
          const updated = prev.map((s) => (s.category === activeStep ? { ...s, completed: true } : s));
          const next = updated.find((s) => !s.completed);
          if (next) setActiveStep(next.category);
          return updated;
        });
      }
    }

    setSaving(false);
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  const completed = steps.filter((s) => s.completed).length;
  const allDone = completed === steps.length;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-xl text-text-primary mb-2">Welcome! Let&apos;s get you set up.</h1>
      <p className="text-sm text-text-secondary mb-6">
        {allDone
          ? 'Onboarding complete! Your campaigns are ready to launch.'
          : `Complete each step so our AI can craft perfect emails for your audience. (${completed}/${steps.length})`}
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-bg-surface rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-accent-primary rounded-full transition-all duration-500"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-2 mb-8">
        {steps.map((step) => (
          <button
            key={step.category}
            onClick={() => { setActiveStep(step.category); setContent(''); }}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ${
              activeStep === step.category
                ? 'border-accent-primary bg-accent-glow'
                : step.completed
                ? 'border-border-subtle bg-bg-surface opacity-60'
                : 'border-border-subtle bg-bg-surface hover:bg-bg-surface-hover'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
              step.completed ? 'bg-accent-success text-white' : 'bg-bg-surface-hover text-text-tertiary'
            }`}>
              {step.completed ? '\u2713' : step.step}
            </span>
            <span className={`text-sm ${step.completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
              {step.label}
            </span>
          </button>
        ))}
      </div>

      {/* Active step editor */}
      {activeStep && !allDone && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-6">
          <h3 className="font-display text-lg text-text-primary mb-1">
            {steps.find((s) => s.category === activeStep)?.label}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {stepDescriptions[activeStep]}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Type your response here..."
            className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors resize-y"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={saveStep}
              disabled={saving || !content.trim()}
              className="px-6 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

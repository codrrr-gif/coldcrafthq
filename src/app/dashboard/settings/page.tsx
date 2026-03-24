'use client';

import { useState } from 'react';

interface SettingsField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'password' | 'toggle' | 'textarea';
  placeholder?: string;
}

const settingsFields: SettingsField[] = [
  {
    key: 'INSTANTLY_API_KEY',
    label: 'Instantly API Key',
    description: 'Your Instantly.ai API key for sending/receiving emails',
    type: 'password',
    placeholder: 'inst_...',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    description: 'Claude API key for AI categorization and reply drafting',
    type: 'password',
    placeholder: 'sk-ant-...',
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'For generating embeddings (knowledge base vector search)',
    type: 'password',
    placeholder: 'sk-...',
  },
  {
    key: 'PERPLEXITY_API_KEY',
    label: 'Perplexity API Key',
    description: 'For real-time lead research (optional but recommended)',
    type: 'password',
    placeholder: 'pplx-...',
  },
];

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/instantly`
    : '/api/webhooks/instantly';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl text-text-primary font-medium">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure your API keys and webhook. All keys are stored as environment variables.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-sm text-text-primary font-medium">Instantly Webhook URL</h2>
          <p className="text-xs text-text-secondary mt-1">
            Set this as your webhook URL in Instantly.ai to catch all replies automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-bg-primary border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-accent-primary font-mono overflow-x-auto">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhookUrl}
            className="shrink-0 bg-bg-surface-hover border border-border-subtle hover:border-border-hover text-text-secondary hover:text-text-primary rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
        <h2 className="text-sm text-text-primary font-medium">Setup Guide</h2>

        <div className="space-y-3 text-xs text-text-secondary">
          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-mono text-[10px]">1</span>
            <div>
              <strong className="text-text-primary">Add API keys</strong> to your{' '}
              <code className="font-mono bg-bg-primary px-1 py-0.5 rounded text-accent-primary">.env.local</code>{' '}
              file (see fields below for all required keys).
            </div>
          </div>

          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-mono text-[10px]">2</span>
            <div>
              <strong className="text-text-primary">Set up Supabase</strong> — create a new project and run the
              schema SQL from <code className="font-mono bg-bg-primary px-1 py-0.5 rounded text-accent-primary">src/lib/supabase/schema.sql</code>.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-mono text-[10px]">3</span>
            <div>
              <strong className="text-text-primary">Configure Instantly webhook</strong> — in Instantly.ai,
              go to Settings → Integrations → Webhooks, and add the webhook URL above for reply events.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-mono text-[10px]">4</span>
            <div>
              <strong className="text-text-primary">Add knowledge base entries</strong> — go to the Knowledge Base
              tab and add your offer details, FAQs, and brand voice. This trains the AI.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-mono text-[10px]">5</span>
            <div>
              <strong className="text-text-primary">Deploy</strong> — push to Vercel. The system starts working
              immediately once a prospect replies to any campaign.
            </div>
          </div>
        </div>
      </div>

      {/* API Key Reference */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
        <h2 className="text-sm text-text-primary font-medium">Required Environment Variables</h2>
        <p className="text-xs text-text-secondary">
          Add these to your <code className="font-mono bg-bg-primary px-1 py-0.5 rounded text-accent-primary">.env.local</code> file:
        </p>
        <div className="space-y-3">
          {settingsFields.map((field) => (
            <div key={field.key} className="flex items-start gap-3">
              <code className="shrink-0 font-mono text-xs text-accent-primary bg-bg-primary px-2 py-1 rounded mt-0.5">
                {field.key}
              </code>
              <div className="text-xs text-text-secondary">{field.description}</div>
            </div>
          ))}
          <div className="flex items-start gap-3">
            <code className="shrink-0 font-mono text-xs text-accent-primary bg-bg-primary px-2 py-1 rounded mt-0.5">
              SUPABASE_URL
            </code>
            <div className="text-xs text-text-secondary">Your Supabase project URL</div>
          </div>
          <div className="flex items-start gap-3">
            <code className="shrink-0 font-mono text-xs text-accent-primary bg-bg-primary px-2 py-1 rounded mt-0.5">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            <div className="text-xs text-text-secondary">Supabase service role key (server-side only)</div>
          </div>
          <div className="flex items-start gap-3">
            <code className="shrink-0 font-mono text-xs text-accent-primary bg-bg-primary px-2 py-1 rounded mt-0.5">
              WEBHOOK_SECRET
            </code>
            <div className="text-xs text-text-secondary">Optional secret to validate incoming webhooks</div>
          </div>
        </div>
      </div>

      {/* .env template */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-3">
        <h2 className="text-sm text-text-primary font-medium">.env.local Template</h2>
        <pre className="bg-bg-primary border border-border-subtle rounded-lg p-4 text-xs font-mono text-text-secondary overflow-x-auto">
{`# ColdCraft Reply Engine
INSTANTLY_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Webhook Security (optional)
WEBHOOK_SECRET=`}
        </pre>
      </div>
    </div>
  );
}

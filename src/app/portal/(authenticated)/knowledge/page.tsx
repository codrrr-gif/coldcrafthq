'use client';

import { useState, useEffect } from 'react';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const categories = [
  { value: 'offer', label: 'Offer & Value Prop' },
  { value: 'voice', label: 'Brand Voice' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'faq', label: 'FAQs' },
  { value: 'company_info', label: 'Company Info' },
  { value: 'general', label: 'General' },
];

export default function PortalKnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/portal/knowledge')
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(entry: KnowledgeEntry) {
    setEditing(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
  }

  function startNew() {
    setEditing('new');
    setTitle('');
    setContent('');
    setCategory('general');
  }

  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const method = editing === 'new' ? 'POST' : 'PUT';
    const body = editing === 'new'
      ? { title, content, category }
      : { id: editing, title, content, category };

    const res = await fetch('/api/portal/knowledge', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to save entry');
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this knowledge entry? This cannot be undone.')) return;
    setError('');
    const res = await fetch('/api/portal/knowledge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete entry');
      return;
    }
    load();
  }

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-text-primary">Knowledge Base</h1>
        <button onClick={startNew} className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded-md">
          Add Entry
        </button>
      </div>

      {error && <p className="text-sm text-red-400 font-mono mb-4">{error}</p>}

      {editing && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 mb-6 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Content..." className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary resize-y" />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-accent-primary text-white text-sm rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-bg-surface-hover text-text-secondary text-sm rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-primary">{entry.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => startEdit(entry)} className="text-xs text-accent-primary hover:underline">Edit</button>
                <button onClick={() => remove(entry.id)} className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            </div>
            <span className="text-xs text-text-tertiary font-mono">{entry.category}</span>
            <p className="text-sm text-text-secondary mt-1 line-clamp-3">{entry.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { KnowledgeEntry } from '@/lib/types';

const categories = [
  { value: 'offer', label: 'Offer Details' },
  { value: 'faq', label: 'FAQ' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'company_info', label: 'Company Info' },
  { value: 'voice', label: 'Brand Voice' },
  { value: 'general', label: 'General' },
];

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    const res = await fetch('/api/knowledge');
    const data = await res.json();
    setEntries(data.entries || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    if (editing) {
      await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
    } else {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }

    setForm({ title: '', content: '', category: 'general' });
    setShowForm(false);
    setEditing(null);
    setSaving(false);
    await fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return;
    await fetch('/api/knowledge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchEntries();
  };

  const startEdit = (entry: KnowledgeEntry) => {
    setEditing(entry);
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-text-primary font-medium">Knowledge Base</h1>
          <p className="text-sm text-text-secondary mt-1">
            Train the AI with your offer details, FAQs, objection handling, and brand voice.
            The more you add, the better your AI replies get.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ title: '', content: '', category: 'general' });
            setShowForm(true);
          }}
          className="bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Entry
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-text-primary font-medium">
              {editing ? 'Edit Entry' : 'New Knowledge Entry'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="text-text-tertiary hover:text-text-primary text-sm"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title (e.g., 'Pricing Overview')"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-bg-primary border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-bg-primary border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="Content — describe your offer, common objections and responses, company details, tone guidelines, etc."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={8}
            className="w-full bg-bg-primary border border-border-subtle rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary resize-y focus:outline-none focus:border-accent-primary"
          />

          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.content.trim()}
            className="bg-accent-primary hover:bg-accent-primary-hover text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="text-center py-20 text-text-tertiary">Loading knowledge base...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 bg-bg-surface border border-border-subtle rounded-xl">
          <div className="text-text-tertiary mb-2">No knowledge entries yet</div>
          <div className="text-xs text-text-tertiary max-w-md mx-auto">
            Add your offer details, FAQs, and brand voice so the AI can draft better replies.
            Start with your core offer — what you sell, who it&apos;s for, and key benefits.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 hover:border-border-hover transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-text-primary font-medium">{entry.title}</span>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-text-tertiary bg-bg-surface-hover px-2 py-0.5 rounded">
                      {categories.find((c) => c.value === entry.category)?.label || entry.category}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary line-clamp-2">{entry.content}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-xs text-text-tertiary hover:text-accent-primary transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

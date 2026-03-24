'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---

interface VerificationResult {
  email: string;
  verdict: string;
  risk_level: string;
  score: number;
  reason: string | null;
  recommendation: string | null;
  suggested_correction: string | null;
  verification_time_ms: number | null;
}

interface VerificationJob {
  id: string;
  status: string;
  total_emails: number;
  processed: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
  source_filename: string | null;
  progress: number;
  created_at: string;
  completed_at: string | null;
}

// --- Config ---

const verdictConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  valid:   { label: 'Valid',   color: 'text-green-400',      bg: 'bg-green-400/10',        dot: 'bg-green-400' },
  invalid: { label: 'Invalid', color: 'text-red-400',        bg: 'bg-red-400/10',          dot: 'bg-red-400' },
  risky:   { label: 'Risky',   color: 'text-amber-400',      bg: 'bg-amber-400/10',        dot: 'bg-amber-400' },
  unknown: { label: 'Unknown', color: 'text-text-tertiary',  bg: 'bg-bg-surface-hover',    dot: 'bg-text-tertiary' },
};

const riskColor: Record<string, string> = {
  low:      'text-green-400',
  medium:   'text-amber-400',
  high:     'text-orange-400',
  critical: 'text-red-400',
};

const recommendationLabel: Record<string, string> = {
  safe_to_send:      'Safe to send',
  send_with_caution: 'Send with caution',
  do_not_send:       'Do not send',
  manual_review:     'Manual review',
};

// --- Components ---

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-amber-400' : score >= 40 ? 'bg-orange-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-[10px] text-text-tertiary">{score}</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const cfg = verdictConfig[verdict] || verdictConfig.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
      <div className={`text-2xl font-display ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-text-tertiary mt-1">{label}</div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Main Page ---

export default function VerifyPage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single
  const [singleEmail, setSingleEmail] = useState('');
  const [singleResult, setSingleResult] = useState<VerificationResult | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  // Bulk
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<VerificationJob | null>(null);
  const [jobResults, setJobResults] = useState<VerificationResult[]>([]);
  const [resultsFilter, setResultsFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Push to Instantly
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [includeRisky, setIncludeRisky] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResult, setPushResult] = useState<{ pushed: number; added: number; skipped: number } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // --- Single verification ---
  const verifySingle = useCallback(async () => {
    if (!singleEmail.trim()) return;
    setSingleLoading(true);
    setSingleResult(null);
    setError(null);
    try {
      const res = await fetch('/api/verify/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: singleEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setSingleResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSingleLoading(false);
    }
  }, [singleEmail]);

  // --- Load jobs list ---
  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch('/api/verify/jobs?limit=20');
      const data = await res.json();
      if (res.ok) setJobs(data);
    } catch {
      // silent
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // --- Load Instantly campaigns ---
  const loadCampaigns = useCallback(async () => {
    if (campaigns.length > 0) return;
    setCampaignsLoading(true);
    try {
      const res = await fetch('/api/verify/campaigns');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setCampaigns(data);
    } catch {
      // silent
    } finally {
      setCampaignsLoading(false);
    }
  }, [campaigns.length]);

  useEffect(() => {
    if (mode === 'bulk') { loadJobs(); loadCampaigns(); }
  }, [mode, loadJobs, loadCampaigns]);

  // --- CSV upload ---
  const uploadCsv = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/verify/bulk', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [loadJobs]);

  // --- Load results ---
  const loadJobResults = useCallback(async (jobId: string, verdict?: string) => {
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (verdict) params.set('verdict', verdict);
      const res = await fetch(`/api/verify/results/${jobId}?${params}`);
      const data = await res.json();
      if (res.ok) setJobResults(data.results || []);
    } catch {
      // silent
    }
  }, []);

  // --- Select + poll a job ---
  const selectJob = useCallback(async (job: VerificationJob | null) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setSelectedJob(job);
    setJobResults([]);
    setResultsFilter('');
    setPushResult(null);
    setPushError(null);
    if (!job) return;

    if (job.status === 'completed') {
      loadJobResults(job.id);
      return;
    }

    // Client-driven processing: poll status + trigger chunk every 4s
    pollRef.current = setInterval(async () => {
      try {
        // Trigger next chunk
        fetch('/api/verify/process', { method: 'POST' });

        // Poll status
        const res = await fetch(`/api/verify/status/${job.id}`);
        const updated = await res.json();
        if (!res.ok) return;

        setSelectedJob(updated);
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));

        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          if (updated.status === 'completed') loadJobResults(updated.id);
        }
      } catch {
        // silent
      }
    }, 4000);

    // Kick off immediately
    fetch('/api/verify/process', { method: 'POST' });
  }, [loadJobResults]);

  // Cleanup
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // --- Push to Instantly ---
  const pushToInstantly = useCallback(async () => {
    if (!selectedJob || !selectedCampaignId) return;
    setPushLoading(true);
    setPushResult(null);
    setPushError(null);
    try {
      const res = await fetch('/api/verify/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJob.id, campaign_id: selectedCampaignId, include_risky: includeRisky }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed');
      setPushResult({ pushed: data.pushed, added: data.added, skipped: data.skipped });
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setPushLoading(false);
    }
  }, [selectedJob, selectedCampaignId, includeRisky]);

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display text-text-primary">Email Verification</h1>
        <p className="text-sm text-text-tertiary mt-1">
          6-layer pipeline — syntax, DNS, SMTP, catch-all, risk scoring.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 bg-bg-surface border border-border-subtle rounded-lg p-1 w-fit">
        {(['single', 'bulk'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${
              mode === m
                ? 'bg-bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ====== SINGLE MODE ====== */}
      {mode === 'single' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="email"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifySingle()}
              placeholder="Enter email address to verify..."
              className="flex-1 bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
            />
            <button
              onClick={verifySingle}
              disabled={singleLoading || !singleEmail.trim()}
              className="px-6 py-2.5 bg-accent-primary text-bg-primary font-medium text-sm rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {singleLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {singleLoading && (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-6">
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                Running 6-layer verification pipeline...
              </div>
            </div>
          )}

          {singleResult && !singleLoading && (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 space-y-5">
              {/* Verdict row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <VerdictBadge verdict={singleResult.verdict} />
                  <span className="font-mono text-sm text-text-primary">{singleResult.email}</span>
                </div>
                <ScoreBar score={singleResult.score} />
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-subtle">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Risk Level</div>
                  <div className={`text-sm font-medium ${riskColor[singleResult.risk_level] || 'text-text-secondary'}`}>
                    {singleResult.risk_level}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Reason</div>
                  <div className="text-sm text-text-secondary">
                    {singleResult.reason?.replace(/_/g, ' ') || 'none'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Recommendation</div>
                  <div className="text-sm text-text-secondary">
                    {recommendationLabel[singleResult.recommendation || ''] || singleResult.recommendation || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Time</div>
                  <div className="text-sm text-text-secondary font-mono">
                    {singleResult.verification_time_ms ? `${singleResult.verification_time_ms}ms` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Typo correction */}
              {singleResult.suggested_correction && (
                <div className="flex items-center gap-3 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3">
                  <span className="text-amber-400 text-sm">Did you mean:</span>
                  <button
                    onClick={() => { setSingleEmail(singleResult.suggested_correction!); setSingleResult(null); }}
                    className="text-amber-300 text-sm font-mono hover:underline"
                  >
                    {singleResult.suggested_correction}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== BULK MODE ====== */}
      {mode === 'bulk' && (
        <div className="space-y-5">
          {/* Upload */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center cursor-pointer hover:border-accent-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && uploadCsv(e.target.files[0])}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-accent-primary">
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  <span className="text-text-primary font-medium">Drop a CSV</span> or click to upload
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Needs an &ldquo;email&rdquo; column — up to 50,000 addresses per job
                </p>
              </>
            )}
          </div>

          {/* Jobs list */}
          {jobs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-text-tertiary">Recent Jobs</div>
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => selectJob(job)}
                  className={`w-full text-left bg-bg-surface border rounded-lg px-4 py-3 hover:bg-bg-surface-hover transition-colors ${
                    selectedJob?.id === job.id ? 'border-accent-primary/40' : 'border-border-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-text-primary">
                        {job.source_filename || 'Uploaded list'}
                      </span>
                      <span className="ml-2 text-xs text-text-tertiary font-mono">
                        {job.total_emails.toLocaleString()} emails
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-tertiary">{timeAgo(job.created_at)}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          job.status === 'completed' ? 'bg-green-400' :
                          job.status === 'processing' ? 'bg-amber-400 animate-pulse' :
                          job.status === 'failed' ? 'bg-red-400' : 'bg-text-tertiary'
                        }`} />
                        <span className="text-xs text-text-secondary capitalize">{job.status}</span>
                      </div>
                    </div>
                  </div>
                  {job.status !== 'pending' && job.total_emails > 0 && (
                    <div className="mt-2 h-1 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full transition-all duration-500"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {jobsLoading && (
            <div className="text-sm text-text-tertiary text-center py-4">Loading jobs...</div>
          )}

          {/* Selected job detail */}
          {selectedJob && (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {selectedJob.source_filename || 'Verification Job'}
                  </div>
                  <div className="text-xs text-text-tertiary font-mono mt-0.5">{selectedJob.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedJob.status === 'completed' ? 'bg-green-400' :
                    selectedJob.status === 'processing' || selectedJob.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                  <span className="text-xs text-text-secondary capitalize">{selectedJob.status}</span>
                </div>
              </div>

              {/* Progress */}
              {selectedJob.status !== 'completed' && (
                <div>
                  <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
                    <span>{selectedJob.processed.toLocaleString()} / {selectedJob.total_emails.toLocaleString()} verified</span>
                    <span>{selectedJob.progress}%</span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-1000"
                      style={{ width: `${selectedJob.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              {selectedJob.processed > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Valid"    value={selectedJob.valid}    color="text-green-400" />
                  <StatCard label="Invalid"  value={selectedJob.invalid}  color="text-red-400" />
                  <StatCard label="Risky"    value={selectedJob.risky}    color="text-amber-400" />
                  <StatCard label="Unknown"  value={selectedJob.unknown}  color="text-text-tertiary" />
                </div>
              )}

              {/* Push to Instantly */}
              {selectedJob.status === 'completed' && (
                <div className="border border-border-subtle rounded-lg p-4 space-y-3">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">Push to Instantly</div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => { setSelectedCampaignId(e.target.value); setPushResult(null); setPushError(null); }}
                      className="flex-1 bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
                    >
                      <option value="">
                        {campaignsLoading ? 'Loading campaigns...' : 'Select a campaign...'}
                      </option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={includeRisky}
                        onChange={(e) => setIncludeRisky(e.target.checked)}
                        className="accent-accent-primary"
                      />
                      Include risky
                    </label>
                    <button
                      onClick={pushToInstantly}
                      disabled={pushLoading || !selectedCampaignId}
                      className="px-5 py-2 bg-accent-primary text-bg-primary font-medium text-sm rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {pushLoading ? 'Pushing...' : 'Push leads'}
                    </button>
                  </div>
                  {pushResult && (
                    <div className="bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-2.5 text-sm text-green-400">
                      Pushed {pushResult.pushed.toLocaleString()} leads — {pushResult.added.toLocaleString()} added, {pushResult.skipped.toLocaleString()} skipped (already in campaign)
                    </div>
                  )}
                  {pushError && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
                      {pushError}
                    </div>
                  )}
                </div>
              )}

              {/* Results table */}
              {selectedJob.status === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1">
                      {['', 'valid', 'invalid', 'risky', 'unknown'].map((v) => (
                        <button
                          key={v}
                          onClick={() => {
                            setResultsFilter(v);
                            loadJobResults(selectedJob.id, v || undefined);
                          }}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            resultsFilter === v
                              ? 'bg-bg-surface-hover text-text-primary'
                              : 'text-text-tertiary hover:text-text-secondary'
                          }`}
                        >
                          {v ? verdictConfig[v]?.label : 'All'}
                        </button>
                      ))}
                    </div>
                    {/* Download */}
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({ format: 'csv' });
                        if (resultsFilter) params.set('verdict', resultsFilter);
                        window.open(`/api/verify/results/${selectedJob.id}?${params}`, '_blank');
                      }}
                      className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                    >
                      Download CSV
                    </button>
                  </div>

                  <div className="border border-border-subtle rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_90px_70px_80px_160px] gap-2 px-4 py-2 bg-bg-surface-hover text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-subtle">
                      <span>Email</span>
                      <span>Verdict</span>
                      <span>Score</span>
                      <span>Risk</span>
                      <span>Recommendation</span>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto divide-y divide-border-subtle">
                      {jobResults.length === 0 && (
                        <div className="px-4 py-6 text-sm text-text-tertiary text-center">No results</div>
                      )}
                      {jobResults.map((r, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_90px_70px_80px_160px] gap-2 px-4 py-2.5 text-sm hover:bg-bg-surface-hover/50 transition-colors"
                        >
                          <span className="font-mono text-text-primary truncate text-xs">{r.email}</span>
                          <VerdictBadge verdict={r.verdict} />
                          <ScoreBar score={r.score} />
                          <span className={`text-xs ${riskColor[r.risk_level] || 'text-text-tertiary'}`}>
                            {r.risk_level}
                          </span>
                          <span className="text-xs text-text-secondary truncate">
                            {recommendationLabel[r.recommendation || ''] || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Slack Notification System
// ============================================

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: { type: string; text: string }[];
  fields?: { type: string; text: string }[];
}

function getWebhookUrl(): string | null {
  return process.env.SLACK_WEBHOOK_URL || null;
}

async function sendSlack(message: SlackMessage): Promise<void> {
  const url = getWebhookUrl();
  if (!url) return; // Slack not configured — silently skip

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}

// Hot lead alert — someone said YES
export async function notifyHotLead(
  leadEmail: string,
  leadName: string | null,
  company: string | null,
  summary: string,
  confidence: number,
  autoSent: boolean
): Promise<void> {
  await sendSlack({
    text: `🔥 Hot lead: ${leadName || leadEmail}${company ? ` (${company})` : ''}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔥 Hot Lead — Interested Reply', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Lead:*\n${leadName || leadEmail}` },
          { type: 'mrkdwn', text: `*Company:*\n${company || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Confidence:*\n${Math.round(confidence * 100)}%` },
          { type: 'mrkdwn', text: `*Status:*\n${autoSent ? '✅ Auto-sent' : '⏳ Awaiting review'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*What they said:*\n> ${summary}` },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: autoSent
              ? '✅ Reply was auto-sent (high confidence). Review in dashboard if needed.'
              : '👉 Review and approve in the dashboard.',
          },
        ],
      },
    ],
  });
}

// Auto-send notification
export async function notifyAutoSend(
  leadEmail: string,
  leadName: string | null,
  category: string,
  confidence: number,
  reason: 'high_confidence' | 'timeout'
): Promise<void> {
  const reasonText = reason === 'high_confidence'
    ? `High confidence (${Math.round(confidence * 100)}%)`
    : `Timeout — not reviewed within 15 minutes`;

  await sendSlack({
    text: `⚡ Auto-sent reply to ${leadName || leadEmail} (${reasonText})`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚡ *Auto-sent reply* to *${leadName || leadEmail}*\n_${reasonText}_\nCategory: \`${category}\``,
        },
      },
    ],
  });
}

// Review needed — low confidence or complex reply
export async function notifyReviewNeeded(
  leadEmail: string,
  leadName: string | null,
  company: string | null,
  category: string,
  subCategory: string,
  confidence: number,
  summary: string
): Promise<void> {
  await sendSlack({
    text: `👀 Review needed: ${leadName || leadEmail} — ${category}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👀 *Review needed*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Lead:*\n${leadName || leadEmail}` },
          { type: 'mrkdwn', text: `*Company:*\n${company || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Category:*\n\`${subCategory}\`` },
          { type: 'mrkdwn', text: `*Confidence:*\n${Math.round(confidence * 100)}%` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `> ${summary}` },
      },
    ],
  });
}

// Failed send alert
export async function notifyFailedSend(
  leadEmail: string,
  error: string
): Promise<void> {
  await sendSlack({
    text: `❌ Failed to send reply to ${leadEmail}: ${error}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Send failed* for *${leadEmail}*\n\`\`\`${error}\`\`\``,
        },
      },
    ],
  });
}

// Daily digest
export async function notifyDailyDigest(stats: {
  total_today: number;
  interested: number;
  soft_no: number;
  hard_no: number;
  auto_sent: number;
  pending_review: number;
  sent: number;
  failed: number;
}): Promise<void> {
  await sendSlack({
    text: `📊 Daily Digest: ${stats.total_today} replies today`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Daily Reply Engine Digest', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total Replies:*\n${stats.total_today}` },
          { type: 'mrkdwn', text: `*Interested:*\n${stats.interested}` },
          { type: 'mrkdwn', text: `*Soft No:*\n${stats.soft_no}` },
          { type: 'mrkdwn', text: `*Hard No:*\n${stats.hard_no}` },
          { type: 'mrkdwn', text: `*Auto-Sent:*\n${stats.auto_sent}` },
          { type: 'mrkdwn', text: `*Pending Review:*\n${stats.pending_review}` },
          { type: 'mrkdwn', text: `*Sent:*\n${stats.sent}` },
          { type: 'mrkdwn', text: `*Failed:*\n${stats.failed}` },
        ],
      },
    ],
  });
}

// Meeting booked — the ultimate win
export async function notifyMeetingBooked(
  leadEmail: string,
  leadName: string | null,
  company: string | null
): Promise<void> {
  await sendSlack({
    text: `🎯 Meeting booked: ${leadName || leadEmail}${company ? ` (${company})` : ''}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎯 Meeting Booked from AI Reply', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Lead:*\n${leadName || leadEmail}` },
          { type: 'mrkdwn', text: `*Company:*\n${company || 'Unknown'}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'This reply has been logged as a winning example. The AI will learn from it.' },
        ],
      },
    ],
  });
}

// Legal threat alert — urgent
export async function notifyLegalThreat(
  leadEmail: string,
  messagePreview: string
): Promise<void> {
  await sendSlack({
    text: `⚠️ LEGAL THREAT from ${leadEmail} — review immediately`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚠️ Legal Threat Detected', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*From:* ${leadEmail}\n*Message:*\n> ${messagePreview.slice(0, 200)}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Lead has been auto-blocklisted and removed. No reply was sent. Review if any further action needed.',
        },
      },
    ],
  });
}

// Generic Slack notification — used by health monitor and other system alerts
export async function notifySlack(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
  const emoji = level === 'error' ? '🔴' : level === 'warning' ? '🟡' : 'ℹ️';
  await sendSlack({
    text: `${emoji} ${message}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `${emoji} ${message}` },
      },
    ],
  });
}

// ============================================
// Production Error Alerting
// ============================================

// Cron job failure — top-level crash of a scheduled job
export async function notifyCronFailure(
  cronName: string,
  error: unknown
): Promise<void> {
  const errMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : '';
  await sendSlack({
    text: `🔴 CRON FAILURE: ${cronName}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔴 Cron Job Failed', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Job:*\n\`${cronName}\`` },
          { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Error:*\n\`\`\`${errMsg}\`\`\`` },
      },
      ...(stack ? [{
        type: 'context' as const,
        elements: [{ type: 'mrkdwn' as const, text: `\`\`\`${stack}\`\`\`` }],
      }] : []),
    ],
  });
}

// Apify actor failure — actor timed out, failed, or aborted
export async function notifyActorFailure(
  sourceName: string,
  runId: string,
  status: string
): Promise<void> {
  await sendSlack({
    text: `🟡 Apify actor failed: ${sourceName} (${status})`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🟡 *Apify actor failed*\n*Source:* \`${sourceName}\`\n*Run ID:* \`${runId}\`\n*Status:* \`${status}\``,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'Check Apify console for details. The run ID has been cleared so the next cron will retry.' },
        ],
      },
    ],
  });
}

// Service failure alert — consecutive failures from external APIs (Vapi, Claude, Instantly, Perplexity)
// Uses in-memory counter (resets per serverless instance) — good enough to catch sustained outages
const failureCounts: Record<string, { count: number; lastAt: number }> = {};
const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function trackServiceFailure(
  service: string,
  error: unknown
): Promise<void> {
  const now = Date.now();
  const entry = failureCounts[service];

  if (entry && now - entry.lastAt < FAILURE_WINDOW_MS) {
    entry.count++;
    entry.lastAt = now;
  } else {
    failureCounts[service] = { count: 1, lastAt: now };
  }

  if (failureCounts[service].count === FAILURE_THRESHOLD) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await sendSlack({
      text: `🔴 ${service} has failed ${FAILURE_THRESHOLD} times in 10 minutes`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🔴 Service Degraded: ${service}`, emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Service:*\n\`${service}\`` },
            { type: 'mrkdwn', text: `*Failures:*\n${FAILURE_THRESHOLD} in 10 min` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Latest error:*\n\`\`\`${errMsg.slice(0, 300)}\`\`\`` },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: 'Check API keys, rate limits, and service status. Subsequent failures are suppressed until the window resets.' },
          ],
        },
      ],
    });
  }
}

export function resetServiceFailure(service: string): void {
  delete failureCounts[service];
}

// Enrichment batch alert — too many leads failed in one run
export async function notifyEnrichmentAlert(
  failed: number,
  total: number,
  recentErrors: string[]
): Promise<void> {
  const errorSample = recentErrors.slice(0, 3).map(e => `• ${e}`).join('\n');
  await sendSlack({
    text: `🟡 Enrichment alert: ${failed}/${total} leads failed`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🟡 Enrichment Failure Spike', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Failed:*\n${failed} of ${total}` },
          { type: 'mrkdwn', text: `*Failure Rate:*\n${Math.round((failed / total) * 100)}%` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Recent errors:*\n${errorSample || 'No details captured'}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: 'Check pipeline leads with status=failed for details. May indicate an API key issue or rate limit.' },
        ],
      },
    ],
  });
}

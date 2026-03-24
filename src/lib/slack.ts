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

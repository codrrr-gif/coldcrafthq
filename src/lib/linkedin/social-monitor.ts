// src/lib/linkedin/social-monitor.ts
// Monitors prospect LinkedIn posts. When a target posts about a relevant topic,
// Claude drafts a thoughtful comment to engage before cold outreach.
// Warm up: 2-3 comments over 1-2 weeks → then connection request → then email.

import Anthropic from '@anthropic-ai/sdk';
import { runActor, getRunStatus, getDatasetItems } from '@/lib/apify';

const client = new Anthropic();

export interface ProspectPost {
  profileUrl: string;
  post: string;
  draftComment: string;
  postUrl?: string;
}

export async function monitorProspectPosts(
  linkedinUrls: string[],
): Promise<ProspectPost[]> {
  if (!linkedinUrls.length) return [];

  try {
    const { runId, datasetId } = await runActor('apify/linkedin-post-search-scraper', {
      profileUrls: linkedinUrls,
      maxPostsPerProfile: 3,
    });

    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const posts = await getDatasetItems(datasetId, linkedinUrls.length * 3);
        const results: ProspectPost[] = [];

        for (const post of posts) {
          const text = String(post.text || post.content || '').trim();
          if (!text || text.length < 50) continue;

          const draftComment = await draftEngagementComment(text.slice(0, 600));
          if (!draftComment) continue;

          results.push({
            profileUrl: String(post.profileUrl || post.authorUrl || ''),
            post: text.slice(0, 400),
            draftComment,
            postUrl: String(post.postUrl || post.url || ''),
          });
        }

        return results;
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[social-monitor] Failed:', err);
  }
  return [];
}

async function draftEngagementComment(postText: string): Promise<string | null> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `You are a thoughtful B2B professional. Draft a 1-2 sentence LinkedIn comment that adds genuine value to this post. Be insightful and specific. Do NOT pitch anything. Do NOT be generic. Max 120 characters.\n\nPost: "${postText}"\n\nComment:`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text?.trim();
    return text && text.length > 10 ? text : null;
  } catch (err) {
    console.error('[social-monitor] Comment draft failed:', err);
    return null;
  }
}

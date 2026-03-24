// src/lib/linkedin/heyreach-client.ts
// HeyReach API wrapper for LinkedIn automation.
// HeyReach manages LinkedIn accounts and sends connection requests + DMs.

const HEYREACH_BASE = 'https://api.heyreach.io/api/public';

function getApiKey(): string {
  const key = process.env.HEYREACH_API_KEY;
  if (!key) throw new Error('HEYREACH_API_KEY not set');
  return key;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-API-KEY': getApiKey(),
  };
}

export async function sendConnectionRequest(
  linkedinUrl: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${HEYREACH_BASE}/linkedin/connect`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        linkedinAccountId: process.env.HEYREACH_LINKEDIN_ACCOUNT_ID,
        profileUrl: linkedinUrl,
        message: note.slice(0, 300),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HeyReach connect ${res.status}: ${text}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function sendLinkedInDM(
  linkedinUrl: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${HEYREACH_BASE}/linkedin/message`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        linkedinAccountId: process.env.HEYREACH_LINKEDIN_ACCOUNT_ID,
        profileUrl: linkedinUrl,
        message,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HeyReach DM ${res.status}: ${text}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// src/lib/voice/vapi-client.ts
// Vapi REST API wrapper. Vapi places AI voice calls using a configured assistant.
// Docs: https://docs.vapi.ai/api-reference

const VAPI_BASE = 'https://api.vapi.ai';

function getApiKey(): string {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error('VAPI_API_KEY not set');
  return key;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

export interface VapiCallResult {
  callId: string;
  status: string;
}

export async function initiateCall(params: {
  phoneNumber: string;
  firstName: string;
  companyName: string;
  personalizedContext: string;
}): Promise<VapiCallResult> {
  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      assistantId: process.env.VAPI_ASSISTANT_ID,
      customer: {
        number: params.phoneNumber,
        name: params.firstName,
      },
      assistantOverrides: {
        variableValues: {
          firstName: params.firstName,
          companyName: params.companyName,
          personalizedContext: params.personalizedContext.slice(0, 500),
          calendlyLink: process.env.CALENDLY_LINK || '',
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi call failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { id: string; status: string };
  return { callId: data.id, status: data.status };
}

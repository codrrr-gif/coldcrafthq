#!/usr/bin/env node
// ============================================
// Instantly AI MCP Server — Full API Coverage (v2)
// All endpoints verified against the live API.
// Run: npx tsx mcp-servers/instantly.ts
// ============================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = 'https://api.instantly.ai/api/v2';

let _keyIndex = 0;
function getApiKey(): string {
  const keys = [
    process.env.INSTANTLY_API_KEY,
    process.env.INSTANTLY_API_KEY_2,
  ].filter(Boolean) as string[];
  if (!keys.length) throw new Error('INSTANTLY_API_KEY not set');
  const key = keys[_keyIndex % keys.length];
  _keyIndex++;
  return key;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API ${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function unwrap(data: unknown): unknown {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    return d.items ?? d.data ?? d;
  }
  return data;
}

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOLS: Tool[] = [

  // ── CAMPAIGNS ──────────────────────────────────────────────────────────────

  {
    name: 'list_campaigns',
    description: 'List all campaigns in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max campaigns (default 100).' },
        starting_after: { type: 'string', description: 'Pagination cursor.' },
      },
    },
  },
  {
    name: 'get_campaign',
    description: 'Get full details of a campaign including settings and schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID (UUID).' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Create a new email campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name.' },
        sequences: {
          type: 'array',
          description: 'Email sequence steps.',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              body: { type: 'string' },
              delay_days: { type: 'number', description: 'Days to wait before this step.' },
            },
          },
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_campaign',
    description: 'Update campaign settings or name. Uses PATCH.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID to update.' },
        name: { type: 'string' },
        daily_limit: { type: 'number' },
        email_gap: { type: 'number' },
        timezone: { type: 'string' },
        track_opens: { type: 'boolean' },
        track_clicks: { type: 'boolean' },
        stop_on_reply: { type: 'boolean' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'delete_campaign',
    description: 'Delete a campaign and all its leads.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID to delete.' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'pause_campaign',
    description: 'Pause an active campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'resume_campaign',
    description: 'Resume (activate) a paused campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
      },
      required: ['campaign_id'],
    },
  },

  // ── LEADS ───────────────────────────────────────────────────────────────────

  {
    name: 'list_campaign_leads',
    description: 'List leads in a campaign. Uses POST /leads/list.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
        limit: { type: 'number', description: 'Max leads (default 100).' },
        starting_after: { type: 'string', description: 'Pagination cursor.' },
        email_type: { type: 'string', description: 'Filter: "all", "bounced", "unsubscribed", "interested".' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'get_lead',
    description: 'Get a specific lead by email and campaign. Uses POST /leads/list with limit 1.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
        email: { type: 'string', description: 'Lead email address.' },
      },
      required: ['campaign_id', 'email'],
    },
  },
  {
    name: 'add_leads_to_campaign',
    description: 'Add leads to a campaign. Extra fields become custom variables usable in templates as {{variable_name}}.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign to add leads to.' },
        leads: {
          type: 'array',
          description: 'Array of lead objects.',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Lead email (required).' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              company_name: { type: 'string' },
              personalized_opener: { type: 'string', description: 'AI-personalized opening line.' },
              title: { type: 'string' },
              linkedin_url: { type: 'string' },
              website: { type: 'string' },
              phone: { type: 'string' },
            },
            required: ['email'],
            additionalProperties: { type: 'string' },
          },
        },
        skip_if_in_workspace: { type: 'boolean', description: 'Skip leads already in any campaign (default false).' },
        skip_if_in_campaign: { type: 'boolean', description: 'Skip leads already in THIS campaign (default true).' },
      },
      required: ['campaign_id', 'leads'],
    },
  },
  {
    name: 'move_leads',
    description: 'Move leads from one campaign to another.',
    inputSchema: {
      type: 'object',
      properties: {
        from_campaign_id: { type: 'string', description: 'Source campaign UUID.' },
        to_campaign_id: { type: 'string', description: 'Destination campaign UUID.' },
        emails: { type: 'array', items: { type: 'string' }, description: 'Lead emails to move.' },
      },
      required: ['from_campaign_id', 'to_campaign_id', 'emails'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Remove a lead from a campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
        email: { type: 'string', description: 'Lead email.' },
      },
      required: ['campaign_id', 'email'],
    },
  },
  {
    name: 'tag_lead',
    description: 'Assign a label to a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Lead email.' },
        label: { type: 'string', description: 'Label name to assign.' },
      },
      required: ['email', 'label'],
    },
  },
  {
    name: 'list_lead_labels',
    description: 'List all lead labels in the workspace.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_lead_label',
    description: 'Create a new lead label.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Label name.' },
        color: { type: 'string', description: 'Hex color code (e.g. "#FF5733").' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_lead_label',
    description: 'Delete a lead label by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        label_id: { type: 'string', description: 'Label UUID to delete.' },
      },
      required: ['label_id'],
    },
  },
  {
    name: 'list_custom_tags',
    description: 'List all custom tags in the workspace.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── EMAILS ──────────────────────────────────────────────────────────────────

  {
    name: 'get_email_thread',
    description: 'Get the full email thread for a lead in a campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID.' },
        email: { type: 'string', description: 'Lead email address.' },
        limit: { type: 'number', description: 'Max emails (default 50).' },
      },
      required: ['campaign_id', 'email'],
    },
  },
  {
    name: 'send_reply',
    description: 'Send a reply email to a lead through Instantly.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign the lead is in.' },
        email: { type: 'string', description: 'Lead email to reply to.' },
        body: { type: 'string', description: 'Reply body text.' },
        subject: { type: 'string', description: 'Reply subject (optional).' },
        cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients.' },
        bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients.' },
      },
      required: ['campaign_id', 'email', 'body'],
    },
  },

  // ── SENDING ACCOUNTS ────────────────────────────────────────────────────────

  {
    name: 'list_sending_accounts',
    description: 'List all email sending accounts. Accounts are identified by email address, not UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max accounts (default 100).' },
      },
    },
  },
  {
    name: 'get_sending_account',
    description: 'Get details for a sending account. Uses the email address as identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Sending account email address (e.g. "matt@example.com").' },
      },
      required: ['email'],
    },
  },
  {
    name: 'update_sending_account',
    description: 'Update sending account settings.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Account email address.' },
        daily_limit: { type: 'number', description: 'Max emails to send per day.' },
        email_gap: { type: 'number', description: 'Minutes between sends.' },
      },
      required: ['email'],
    },
  },
  {
    name: 'delete_sending_account',
    description: 'Remove a sending account from the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Account email address to delete.' },
      },
      required: ['email'],
    },
  },

  // ── BLOCKLIST ───────────────────────────────────────────────────────────────

  {
    name: 'block_email',
    description: 'Add an email or domain to the workspace blocklist.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email or domain to block (e.g. "user@example.com" or "example.com").' },
      },
      required: ['email'],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {

    // ── CAMPAIGNS ──────────────────────────────────────────────────────────────

    case 'list_campaigns': {
      const limit = Number(args.limit || 100);
      let path = `/campaigns?limit=${limit}`;
      if (args.starting_after) path += `&starting_after=${args.starting_after}`;
      return JSON.stringify(unwrap(await req(path)), null, 2);
    }

    case 'get_campaign': {
      return JSON.stringify(await req(`/campaigns/${args.campaign_id}`), null, 2);
    }

    case 'create_campaign': {
      const body: Record<string, unknown> = { name: args.name };
      if (args.sequences) body.sequences = args.sequences;
      return JSON.stringify(await req('/campaigns', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'update_campaign': {
      const { campaign_id, ...rest } = args;
      return JSON.stringify(await req(`/campaigns/${campaign_id}`, {
        method: 'PATCH',
        body: JSON.stringify(rest),
      }), null, 2);
    }

    case 'delete_campaign': {
      await req(`/campaigns/${args.campaign_id}`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.campaign_id });
    }

    case 'pause_campaign': {
      return JSON.stringify(await req(`/campaigns/${args.campaign_id}/pause`, {
        method: 'POST',
        body: JSON.stringify({}),
      }), null, 2);
    }

    case 'resume_campaign': {
      return JSON.stringify(await req(`/campaigns/${args.campaign_id}/activate`, {
        method: 'POST',
        body: JSON.stringify({}),
      }), null, 2);
    }

    // ── LEADS ─────────────────────────────────────────────────────────────────

    case 'list_campaign_leads': {
      const body: Record<string, unknown> = {
        campaign_id: args.campaign_id,
        limit: Number(args.limit || 100),
      };
      if (args.starting_after) body.starting_after = args.starting_after;
      if (args.email_type) body.email_type = args.email_type;
      return JSON.stringify(unwrap(await req('/leads/list', {
        method: 'POST',
        body: JSON.stringify(body),
      })), null, 2);
    }

    case 'get_lead': {
      const body = {
        campaign_id: args.campaign_id,
        email: args.email,
        limit: 1,
      };
      const data = unwrap(await req('/leads/list', {
        method: 'POST',
        body: JSON.stringify(body),
      }));
      const items = Array.isArray(data) ? data : [];
      return JSON.stringify(items[0] || null, null, 2);
    }

    case 'add_leads_to_campaign': {
      const leads = args.leads as Array<Record<string, string>>;
      const BATCH = 1000;
      const results: unknown[] = [];
      for (let i = 0; i < leads.length; i += BATCH) {
        const batch = leads.slice(i, i + BATCH);
        const data = await req('/leads', {
          method: 'POST',
          body: JSON.stringify({
            campaign_id: args.campaign_id,
            leads: batch,
            skip_if_in_workspace: args.skip_if_in_workspace ?? false,
            skip_if_in_campaign: args.skip_if_in_campaign ?? true,
          }),
        });
        results.push(data);
      }
      return JSON.stringify(results.length === 1 ? results[0] : results, null, 2);
    }

    case 'move_leads': {
      return JSON.stringify(await req('/leads/move', {
        method: 'POST',
        body: JSON.stringify({
          from_campaign_id: args.from_campaign_id,
          to_campaign_id: args.to_campaign_id,
          emails: args.emails,
        }),
      }), null, 2);
    }

    case 'delete_lead': {
      await req('/leads', {
        method: 'DELETE',
        body: JSON.stringify({ campaign_id: args.campaign_id, email: args.email }),
      });
      return JSON.stringify({ success: true, email: args.email });
    }

    case 'tag_lead': {
      // v2: look up or create the label, then assign via interest-status
      const labelsData = unwrap(await req('/lead-labels'));
      const labels = Array.isArray(labelsData) ? labelsData : [];
      let labelId = labels.find(
        (l: Record<string, string>) => l.label?.toLowerCase() === String(args.label).toLowerCase()
      )?.id;

      if (!labelId) {
        const created = await req<Record<string, string>>('/lead-labels', {
          method: 'POST',
          body: JSON.stringify({ label: args.label }),
        });
        labelId = created.id;
      }

      await req('/leads/update-interest-status', {
        method: 'POST',
        body: JSON.stringify({ lead_email: args.email, interest_status: labelId }),
      });
      return JSON.stringify({ success: true, email: args.email, label: args.label, label_id: labelId });
    }

    case 'list_lead_labels': {
      return JSON.stringify(unwrap(await req('/lead-labels')), null, 2);
    }

    case 'create_lead_label': {
      return JSON.stringify(await req('/lead-labels', {
        method: 'POST',
        body: JSON.stringify({ name: args.name, ...(args.color ? { color: args.color } : {}) }),
      }), null, 2);
    }

    case 'delete_lead_label': {
      await req(`/lead-labels/${args.label_id}`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.label_id });
    }

    case 'list_custom_tags': {
      return JSON.stringify(unwrap(await req('/custom-tags')), null, 2);
    }

    // ── EMAILS ────────────────────────────────────────────────────────────────

    case 'get_email_thread': {
      const limit = Number(args.limit || 50);
      return JSON.stringify(unwrap(
        await req(`/emails?campaign_id=${args.campaign_id}&lead=${encodeURIComponent(String(args.email))}&limit=${limit}`)
      ), null, 2);
    }

    case 'send_reply': {
      const body: Record<string, unknown> = {
        campaign_id: args.campaign_id,
        reply_to_email: args.email,
        body: args.body,
        ...(args.subject ? { subject: args.subject } : {}),
        ...(args.cc ? { cc: args.cc } : {}),
        ...(args.bcc ? { bcc: args.bcc } : {}),
      };
      return JSON.stringify(await req('/emails/reply', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    // ── SENDING ACCOUNTS ──────────────────────────────────────────────────────

    case 'list_sending_accounts': {
      const limit = Number(args.limit || 100);
      return JSON.stringify(unwrap(await req(`/accounts?limit=${limit}`)), null, 2);
    }

    case 'get_sending_account': {
      return JSON.stringify(await req(`/accounts/${encodeURIComponent(String(args.email))}`), null, 2);
    }

    case 'update_sending_account': {
      const { email, ...rest } = args;
      return JSON.stringify(await req(`/accounts/${encodeURIComponent(String(email))}`, {
        method: 'PATCH',
        body: JSON.stringify(rest),
      }), null, 2);
    }

    case 'delete_sending_account': {
      await req(`/accounts/${encodeURIComponent(String(args.email))}`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.email });
    }

    // ── BLOCKLIST ─────────────────────────────────────────────────────────────

    case 'block_email': {
      return JSON.stringify(await req('/block-lists-entries', {
        method: 'POST',
        body: JSON.stringify({ bl_value: args.email }),
      }), null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'instantly', version: '2.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, (args || {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((err) => { console.error(err); process.exit(1); });

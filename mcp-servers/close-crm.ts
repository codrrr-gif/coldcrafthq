#!/usr/bin/env node
// ============================================
// Close CRM MCP Server — Full API Coverage
// Run: npx tsx mcp-servers/close-crm.ts
// ============================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = 'https://api.close.com/api/v1';

function getHeaders(): HeadersInit {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

async function closeReq<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close API ${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// Helper: resolve status label → ID for leads
async function resolveLeadStatusId(label: string): Promise<string> {
  const data = await closeReq<{ data: Array<{ id: string; label: string }> }>('/status/lead/');
  const found = data.data?.find((s) => s.label.toLowerCase() === label.toLowerCase());
  if (!found) throw new Error(`Lead status not found: "${label}". Available: ${data.data?.map((s) => s.label).join(', ')}`);
  return found.id;
}

// Helper: resolve opportunity status label → ID
async function resolveOppStatusId(label: string): Promise<string> {
  const data = await closeReq<{ data: Array<{ id: string; label: string }> }>('/status/opportunity/');
  const found = data.data?.find((s) => s.label.toLowerCase() === label.toLowerCase());
  if (!found) throw new Error(`Opportunity status not found: "${label}". Available: ${data.data?.map((s) => s.label).join(', ')}`);
  return found.id;
}

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOLS: Tool[] = [

  // ── LEADS ──────────────────────────────────────────────────────────────────

  {
    name: 'search_leads',
    description: 'Search leads by email, company name, or any Close query string. Examples: email:"foo@bar.com", "Acme Corp", name:"John".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Close search query (supports email:"...", name:"...", etc.).' },
        limit: { type: 'number', description: 'Max results (default 25, max 100).' },
        skip: { type: 'number', description: 'Pagination offset.' },
        fields: { type: 'string', description: 'Comma-separated fields to return (default: id,name,contacts,status_label,date_created,date_updated).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_lead',
    description: 'Get a lead by ID with all its contacts, activities, opportunities, and custom fields.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID (e.g. lead_abc123).' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'list_leads',
    description: 'List leads with optional status filter, tag filter, and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional Close query to filter leads.' },
        status_label: { type: 'string', description: 'Filter by status (e.g. "Interested").' },
        tag: { type: 'string', description: 'Filter by tag.' },
        limit: { type: 'number', description: 'Max results (default 25, max 100).' },
        skip: { type: 'number', description: 'Pagination offset.' },
        sort: { type: 'string', description: 'Sort field with optional - prefix for descending (e.g. "-date_updated").' },
      },
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new lead with a contact. Custom fields can be passed directly.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', description: 'Company / lead name.' },
        contact_name: { type: 'string', description: 'Contact full name.' },
        contact_email: { type: 'string', description: 'Contact email address.' },
        contact_title: { type: 'string', description: 'Contact job title.' },
        contact_phone: { type: 'string', description: 'Contact phone number.' },
        url: { type: 'string', description: 'Company website URL.' },
        description: { type: 'string', description: 'Lead description / notes.' },
        status_label: { type: 'string', description: 'Initial lead status (e.g. "Cold Outreach").' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to apply.' },
        addresses: {
          type: 'array',
          description: 'Company addresses.',
          items: {
            type: 'object',
            properties: {
              address_1: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
            },
          },
        },
        custom_fields: {
          type: 'object',
          description: 'Custom field values as { "custom.cf_xxx": "value" } pairs.',
          additionalProperties: true,
        },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update a lead. Change status, name, tags, description, custom fields, or any other field.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        company_name: { type: 'string', description: 'New company name.' },
        description: { type: 'string', description: 'Updated description.' },
        url: { type: 'string', description: 'Company website URL.' },
        status_label: { type: 'string', description: 'New status label.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Replace all tags.' },
        custom_fields: {
          type: 'object',
          description: 'Custom field key-value pairs.',
          additionalProperties: true,
        },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'delete_lead',
    description: 'Permanently delete a lead and all its associated data.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID to delete.' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'merge_leads',
    description: 'Merge two leads together. The source lead is merged into the destination and deleted.',
    inputSchema: {
      type: 'object',
      properties: {
        source_lead_id: { type: 'string', description: 'Lead to merge FROM (will be deleted).' },
        destination_lead_id: { type: 'string', description: 'Lead to merge INTO (will be kept).' },
      },
      required: ['source_lead_id', 'destination_lead_id'],
    },
  },

  // ── CONTACTS ────────────────────────────────────────────────────────────────

  {
    name: 'get_contact',
    description: 'Get a contact by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'Close contact ID (e.g. cont_abc123).' },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a contact and attach it to an existing lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Lead to attach the contact to.' },
        name: { type: 'string', description: 'Contact full name.' },
        title: { type: 'string', description: 'Job title.' },
        emails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              type: { type: 'string', enum: ['office', 'personal', 'other'] },
            },
            required: ['email'],
          },
        },
        phones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              type: { type: 'string', enum: ['office', 'mobile', 'home', 'direct', 'other'] },
            },
            required: ['phone'],
          },
        },
        urls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              type: { type: 'string', enum: ['linkedin', 'twitter', 'url', 'other'] },
            },
          },
        },
      },
      required: ['lead_id', 'name'],
    },
  },
  {
    name: 'update_contact',
    description: 'Update a contact name, title, emails, phones, or social URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'Close contact ID.' },
        name: { type: 'string' },
        title: { type: 'string' },
        emails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        phones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'delete_contact',
    description: 'Delete a contact from Close CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'Close contact ID.' },
      },
      required: ['contact_id'],
    },
  },

  // ── ACTIVITIES ──────────────────────────────────────────────────────────────

  {
    name: 'get_lead_activities',
    description: 'Get all activity history for a lead (emails, calls, notes, meetings, tasks).',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        type: { type: 'string', description: 'Filter by type: "note", "email", "call", "meeting", "sms", "task".' },
        limit: { type: 'number', description: 'Max activities (default 50).' },
        skip: { type: 'number', description: 'Pagination offset.' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'add_note',
    description: 'Add a text note to a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        note: { type: 'string', description: 'Note text.' },
      },
      required: ['lead_id', 'note'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note.',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string', description: 'Note activity ID (acti_xxx).' },
        note: { type: 'string', description: 'New note text.' },
      },
      required: ['activity_id', 'note'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note activity.',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string', description: 'Note activity ID.' },
      },
      required: ['activity_id'],
    },
  },
  {
    name: 'log_call',
    description: 'Log a phone call activity on a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        note: { type: 'string', description: 'Call notes / outcome.' },
        duration: { type: 'number', description: 'Call duration in seconds.' },
        direction: { type: 'string', enum: ['outbound', 'inbound'], description: 'Call direction.' },
        phone: { type: 'string', description: 'Phone number called.' },
        status: { type: 'string', enum: ['answered', 'voicemail', 'no-answer', 'busy', 'failed'], description: 'Call outcome.' },
        disposition: { type: 'string', description: 'Custom call disposition.' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'log_email',
    description: 'Log a sent or received email activity on a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        subject: { type: 'string', description: 'Email subject.' },
        body: { type: 'string', description: 'Email body (plain text).' },
        body_html: { type: 'string', description: 'Email body (HTML).' },
        direction: { type: 'string', enum: ['outbound', 'inbound'], description: 'Sent or received.' },
        sender: { type: 'string', description: 'Sender email address.' },
        to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses.' },
        status: { type: 'string', enum: ['inbox', 'draft', 'scheduled', 'outbox', 'sent'], description: 'Email status (default: sent).' },
      },
      required: ['lead_id', 'direction'],
    },
  },
  {
    name: 'log_meeting',
    description: 'Log a meeting activity on a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        title: { type: 'string', description: 'Meeting title.' },
        note: { type: 'string', description: 'Meeting notes / outcome.' },
        starts_at: { type: 'string', description: 'Meeting start time (ISO 8601).' },
        ends_at: { type: 'string', description: 'Meeting end time (ISO 8601).' },
      },
      required: ['lead_id', 'title'],
    },
  },

  // ── TASKS ───────────────────────────────────────────────────────────────────

  {
    name: 'create_task',
    description: 'Create a to-do task linked to a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID to attach task to.' },
        text: { type: 'string', description: 'Task description.' },
        due_date: { type: 'string', description: 'Due date (ISO 8601 or YYYY-MM-DD).' },
        assigned_to: { type: 'string', description: 'User ID to assign task to.' },
        is_complete: { type: 'boolean', description: 'Mark as already complete (default false).' },
      },
      required: ['lead_id', 'text'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by lead, completion status, or assignee.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Filter to tasks for a specific lead.' },
        assigned_to: { type: 'string', description: 'Filter by assigned user ID.' },
        is_complete: { type: 'boolean', description: 'Filter by completion status.' },
        due_before: { type: 'string', description: 'Filter tasks due before this date (YYYY-MM-DD).' },
        limit: { type: 'number', description: 'Max tasks (default 50).' },
        skip: { type: 'number', description: 'Pagination offset.' },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Update a task text, due date, assignee, or completion status.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (task_xxx).' },
        text: { type: 'string', description: 'Updated task text.' },
        due_date: { type: 'string', description: 'Updated due date.' },
        assigned_to: { type: 'string', description: 'User ID to reassign to.' },
        is_complete: { type: 'boolean', description: 'Mark as complete/incomplete.' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to delete.' },
      },
      required: ['task_id'],
    },
  },

  // ── OPPORTUNITIES ───────────────────────────────────────────────────────────

  {
    name: 'list_opportunities',
    description: 'List opportunities with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Filter to a specific lead.' },
        status_label: { type: 'string', description: 'Filter by status label.' },
        status_type: { type: 'string', enum: ['active', 'won', 'lost'], description: 'Filter by status type.' },
        limit: { type: 'number', description: 'Max results (default 25).' },
        skip: { type: 'number', description: 'Pagination offset.' },
      },
    },
  },
  {
    name: 'get_opportunity',
    description: 'Get a specific opportunity by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity_id: { type: 'string', description: 'Opportunity ID (oppo_xxx).' },
      },
      required: ['opportunity_id'],
    },
  },
  {
    name: 'create_opportunity',
    description: 'Create a sales opportunity for a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'Close lead ID.' },
        status_label: { type: 'string', description: 'Pipeline stage (e.g. "Discovery Call Scheduled").' },
        value: { type: 'number', description: 'Deal value in cents (e.g. 500000 = $5,000).' },
        value_currency: { type: 'string', description: 'Currency code (default: USD).' },
        note: { type: 'string', description: 'Opportunity notes.' },
        confidence: { type: 'number', description: 'Win probability 0-100.' },
        expected_close_date: { type: 'string', description: 'Expected close date (YYYY-MM-DD).' },
        assigned_to: { type: 'string', description: 'User ID to assign opportunity to.' },
      },
      required: ['lead_id', 'status_label'],
    },
  },
  {
    name: 'update_opportunity',
    description: 'Update opportunity status, value, notes, confidence, or close date.',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity_id: { type: 'string', description: 'Opportunity ID.' },
        status_label: { type: 'string', description: 'New pipeline stage.' },
        value: { type: 'number', description: 'Updated deal value in cents.' },
        note: { type: 'string', description: 'Updated notes.' },
        confidence: { type: 'number', description: 'Win probability 0-100.' },
        expected_close_date: { type: 'string', description: 'Updated close date.' },
        assigned_to: { type: 'string', description: 'User ID to reassign to.' },
      },
      required: ['opportunity_id'],
    },
  },
  {
    name: 'delete_opportunity',
    description: 'Delete an opportunity.',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity_id: { type: 'string', description: 'Opportunity ID to delete.' },
      },
      required: ['opportunity_id'],
    },
  },

  // ── STATUSES & PIPELINES ────────────────────────────────────────────────────

  {
    name: 'list_lead_statuses',
    description: 'List all lead statuses (active and inactive) configured in Close.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_lead_status',
    description: 'Create a new lead status.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Status label.' },
        type: { type: 'string', enum: ['active', 'inactive'], description: 'Active keeps the lead in play; inactive closes it out.' },
      },
      required: ['label', 'type'],
    },
  },
  {
    name: 'update_lead_status',
    description: 'Rename a lead status or change its type.',
    inputSchema: {
      type: 'object',
      properties: {
        status_id: { type: 'string', description: 'Status ID (stat_xxx).' },
        label: { type: 'string', description: 'New label.' },
        type: { type: 'string', enum: ['active', 'inactive'] },
      },
      required: ['status_id'],
    },
  },
  {
    name: 'delete_lead_status',
    description: 'Delete a lead status. Only works if no leads use this status.',
    inputSchema: {
      type: 'object',
      properties: {
        status_id: { type: 'string', description: 'Status ID to delete.' },
      },
      required: ['status_id'],
    },
  },
  {
    name: 'list_opportunity_statuses',
    description: 'List all opportunity pipeline statuses.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_opportunity_status',
    description: 'Add a stage to the opportunity pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Stage label.' },
        type: { type: 'string', enum: ['active', 'won', 'lost'], description: 'Stage type.' },
        pipeline_id: { type: 'string', description: 'Pipeline ID to add this stage to (optional).' },
      },
      required: ['label', 'type'],
    },
  },
  {
    name: 'list_pipelines',
    description: 'List all opportunity pipelines.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_pipeline',
    description: 'Create a new opportunity pipeline with stages.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pipeline name.' },
        statuses: {
          type: 'array',
          description: 'Pipeline stages to create.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              type: { type: 'string', enum: ['active', 'won', 'lost'] },
            },
            required: ['label', 'type'],
          },
        },
      },
      required: ['name'],
    },
  },

  // ── CUSTOM FIELDS ───────────────────────────────────────────────────────────

  {
    name: 'list_custom_fields',
    description: 'List all custom fields for leads, contacts, or opportunities.',
    inputSchema: {
      type: 'object',
      properties: {
        object_type: {
          type: 'string',
          enum: ['lead', 'contact', 'opportunity'],
          description: 'Which object type to list custom fields for (default: lead).',
        },
      },
    },
  },
  {
    name: 'create_custom_field',
    description: 'Create a custom field on leads, contacts, or opportunities.',
    inputSchema: {
      type: 'object',
      properties: {
        object_type: { type: 'string', enum: ['lead', 'contact', 'opportunity'], description: 'Object to add field to.' },
        name: { type: 'string', description: 'Field name.' },
        type: { type: 'string', enum: ['text', 'number', 'date', 'choices', 'hidden', 'checkbox'], description: 'Field type.' },
        choices: { type: 'array', items: { type: 'string' }, description: 'Options for "choices" type fields.' },
        required: { type: 'boolean', description: 'Whether the field is required (default false).' },
      },
      required: ['object_type', 'name', 'type'],
    },
  },
  {
    name: 'delete_custom_field',
    description: 'Delete a custom field.',
    inputSchema: {
      type: 'object',
      properties: {
        object_type: { type: 'string', enum: ['lead', 'contact', 'opportunity'] },
        field_id: { type: 'string', description: 'Custom field ID (cf_xxx).' },
      },
      required: ['object_type', 'field_id'],
    },
  },

  // ── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

  {
    name: 'list_email_templates',
    description: 'List all email templates in Close.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 100).' },
      },
    },
  },
  {
    name: 'get_email_template',
    description: 'Get a specific email template by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string', description: 'Template ID (tmpl_xxx).' },
      },
      required: ['template_id'],
    },
  },
  {
    name: 'create_email_template',
    description: 'Create a new email template in Close.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Template name.' },
        subject: { type: 'string', description: 'Email subject (supports {{lead.name}} etc.).' },
        body: { type: 'string', description: 'Email body text (supports template variables).' },
        body_html: { type: 'string', description: 'HTML body (optional).' },
        is_shared: { type: 'boolean', description: 'Share with all team members (default true).' },
        attachments: { type: 'array', items: { type: 'object' }, description: 'File attachments.' },
      },
      required: ['name', 'subject', 'body'],
    },
  },
  {
    name: 'update_email_template',
    description: 'Update an existing email template.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string', description: 'Template ID.' },
        name: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        body_html: { type: 'string' },
      },
      required: ['template_id'],
    },
  },
  {
    name: 'delete_email_template',
    description: 'Delete an email template.',
    inputSchema: {
      type: 'object',
      properties: {
        template_id: { type: 'string', description: 'Template ID to delete.' },
      },
      required: ['template_id'],
    },
  },

  // ── SEQUENCES ───────────────────────────────────────────────────────────────

  {
    name: 'list_sequences',
    description: 'List all email sequences.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
  {
    name: 'get_sequence',
    description: 'Get a sequence and its steps.',
    inputSchema: {
      type: 'object',
      properties: {
        sequence_id: { type: 'string', description: 'Sequence ID.' },
      },
      required: ['sequence_id'],
    },
  },
  {
    name: 'subscribe_contact_to_sequence',
    description: 'Enroll a contact in an email sequence.',
    inputSchema: {
      type: 'object',
      properties: {
        sequence_id: { type: 'string', description: 'Sequence to subscribe to.' },
        contact_id: { type: 'string', description: 'Contact to enroll.' },
        sender_account_id: { type: 'string', description: 'Sending email account ID.' },
      },
      required: ['sequence_id', 'contact_id'],
    },
  },
  {
    name: 'unsubscribe_contact_from_sequence',
    description: 'Remove a contact from a sequence.',
    inputSchema: {
      type: 'object',
      properties: {
        subscription_id: { type: 'string', description: 'Sequence subscription ID.' },
      },
      required: ['subscription_id'],
    },
  },

  // ── BULK ACTIONS ────────────────────────────────────────────────────────────

  {
    name: 'bulk_update_leads',
    description: 'Update status, tags, or custom fields on multiple leads at once.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_ids: { type: 'array', items: { type: 'string' }, description: 'List of lead IDs to update.' },
        query: { type: 'string', description: 'Alternative: a search query selecting which leads to update.' },
        status_label: { type: 'string', description: 'New status to apply to all.' },
        add_tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add.' },
        remove_tags: { type: 'array', items: { type: 'string' }, description: 'Tags to remove.' },
        custom_fields: { type: 'object', additionalProperties: true, description: 'Custom fields to set on all.' },
      },
    },
  },
  {
    name: 'bulk_delete_leads',
    description: 'Delete multiple leads at once.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_ids: { type: 'array', items: { type: 'string' }, description: 'Lead IDs to delete.' },
        query: { type: 'string', description: 'Alternative: search query selecting leads to delete.' },
      },
    },
  },

  // ── SMART VIEWS ─────────────────────────────────────────────────────────────

  {
    name: 'list_smart_views',
    description: 'List all saved Smart Views (saved searches).',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── USERS & ORGANIZATION ────────────────────────────────────────────────────

  {
    name: 'get_current_user',
    description: 'Get the currently authenticated Close user and their permissions.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_users',
    description: 'List all users in the Close organization.',
    inputSchema: {
      type: 'object',
      properties: {
        include_inactive: { type: 'boolean', description: 'Include deactivated users (default false).' },
      },
    },
  },
  {
    name: 'get_organization',
    description: 'Get organization details including settings and metadata.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── REPORTING & EXPORT ──────────────────────────────────────────────────────

  {
    name: 'get_activity_report',
    description: 'Get aggregate activity metrics (calls, emails, notes) for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Start date (YYYY-MM-DD).' },
        date_end: { type: 'string', description: 'End date (YYYY-MM-DD).' },
        user_id: { type: 'string', description: 'Filter to specific user.' },
        type: { type: 'string', description: 'Activity type: "call", "email", "note".' },
      },
      required: ['date_start', 'date_end'],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {

    // ── LEADS ────────────────────────────────────────────────────────────────

    case 'search_leads': {
      const q = String(args.query);
      const limit = Number(args.limit || 25);
      const skip = Number(args.skip || 0);
      const fields = String(args.fields || 'id,name,contacts,status_label,tags,date_created,date_updated');
      const data = await closeReq<{ data: unknown[]; has_more: boolean }>(
        `/lead/?query=${encodeURIComponent(q)}&_limit=${limit}&_skip=${skip}&_fields=${fields}`
      );
      return JSON.stringify(data, null, 2);
    }

    case 'get_lead': {
      return JSON.stringify(await closeReq<unknown>(`/lead/${args.lead_id}/`), null, 2);
    }

    case 'list_leads': {
      const limit = Number(args.limit || 25);
      const skip = Number(args.skip || 0);
      const sort = args.sort ? `&_order_by=${args.sort}` : '';
      let q = args.query ? String(args.query) : '';
      if (args.status_label) q += (q ? ' ' : '') + `status:"${args.status_label}"`;
      if (args.tag) q += (q ? ' ' : '') + `tag:"${args.tag}"`;
      const queryPart = q ? `&query=${encodeURIComponent(q)}` : '';
      const data = await closeReq<{ data: unknown[]; has_more: boolean }>(
        `/lead/?_limit=${limit}&_skip=${skip}${sort}${queryPart}&_fields=id,name,contacts,status_label,tags,date_created,date_updated`
      );
      return JSON.stringify(data, null, 2);
    }

    case 'create_lead': {
      let statusId: string | undefined;
      if (args.status_label) statusId = await resolveLeadStatusId(String(args.status_label));

      const body: Record<string, unknown> = {
        name: args.company_name,
        ...(args.description ? { description: args.description } : {}),
        ...(args.url ? { url: args.url } : {}),
        ...(statusId ? { status_id: statusId } : {}),
        ...(args.tags ? { tags: args.tags } : {}),
        ...(args.addresses ? { addresses: args.addresses } : {}),
        ...(args.custom_fields && typeof args.custom_fields === 'object' ? args.custom_fields : {}),
      };

      if (args.contact_name || args.contact_email) {
        const contact: Record<string, unknown> = {
          name: args.contact_name || args.contact_email,
          ...(args.contact_title ? { title: args.contact_title } : {}),
          emails: args.contact_email ? [{ email: args.contact_email, type: 'office' }] : [],
          phones: args.contact_phone ? [{ phone: args.contact_phone, type: 'office' }] : [],
        };
        body.contacts = [contact];
      }

      return JSON.stringify(await closeReq<unknown>('/lead/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'update_lead': {
      const updates: Record<string, unknown> = {};
      if (args.company_name) updates.name = args.company_name;
      if (args.description !== undefined) updates.description = args.description;
      if (args.url !== undefined) updates.url = args.url;
      if (args.tags) updates.tags = args.tags;
      if (args.status_label) updates.status_id = await resolveLeadStatusId(String(args.status_label));
      if (args.custom_fields && typeof args.custom_fields === 'object') Object.assign(updates, args.custom_fields);
      return JSON.stringify(await closeReq<unknown>(`/lead/${args.lead_id}/`, { method: 'PUT', body: JSON.stringify(updates) }), null, 2);
    }

    case 'delete_lead': {
      await closeReq<unknown>(`/lead/${args.lead_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.lead_id });
    }

    case 'merge_leads': {
      const result = await closeReq<unknown>('/lead/merge/', {
        method: 'POST',
        body: JSON.stringify({ source: args.source_lead_id, destination: args.destination_lead_id }),
      });
      return JSON.stringify(result, null, 2);
    }

    // ── CONTACTS ──────────────────────────────────────────────────────────────

    case 'get_contact': {
      return JSON.stringify(await closeReq<unknown>(`/contact/${args.contact_id}/`), null, 2);
    }

    case 'create_contact': {
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        name: args.name,
        ...(args.title ? { title: args.title } : {}),
        ...(args.emails ? { emails: args.emails } : {}),
        ...(args.phones ? { phones: args.phones } : {}),
        ...(args.urls ? { urls: args.urls } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/contact/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'update_contact': {
      const { contact_id, ...rest } = args;
      return JSON.stringify(await closeReq<unknown>(`/contact/${contact_id}/`, { method: 'PUT', body: JSON.stringify(rest) }), null, 2);
    }

    case 'delete_contact': {
      await closeReq<unknown>(`/contact/${args.contact_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.contact_id });
    }

    // ── ACTIVITIES ────────────────────────────────────────────────────────────

    case 'get_lead_activities': {
      const limit = Number(args.limit || 50);
      const skip = Number(args.skip || 0);
      const typePart = args.type ? `&type=${args.type}` : '';
      const data = await closeReq<{ data: unknown[] }>(
        `/activity/?lead_id=${args.lead_id}&_limit=${limit}&_skip=${skip}${typePart}`
      );
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'add_note': {
      return JSON.stringify(await closeReq<unknown>('/activity/note/', {
        method: 'POST',
        body: JSON.stringify({ lead_id: args.lead_id, note: args.note }),
      }), null, 2);
    }

    case 'update_note': {
      return JSON.stringify(await closeReq<unknown>(`/activity/note/${args.activity_id}/`, {
        method: 'PUT',
        body: JSON.stringify({ note: args.note }),
      }), null, 2);
    }

    case 'delete_note': {
      await closeReq<unknown>(`/activity/note/${args.activity_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.activity_id });
    }

    case 'log_call': {
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        ...(args.note ? { note: args.note } : {}),
        ...(args.duration !== undefined ? { duration: args.duration } : {}),
        ...(args.direction ? { direction: args.direction } : {}),
        ...(args.phone ? { phone: args.phone } : {}),
        ...(args.status ? { status: args.status } : {}),
        ...(args.disposition ? { disposition: args.disposition } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/activity/call/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'log_email': {
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        direction: args.direction,
        status: args.status || 'sent',
        ...(args.subject ? { subject: args.subject } : {}),
        ...(args.body ? { body_text: args.body } : {}),
        ...(args.body_html ? { body_html: args.body_html } : {}),
        ...(args.sender ? { sender: args.sender } : {}),
        ...(args.to ? { to: args.to } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/activity/email/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'log_meeting': {
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        title: args.title,
        ...(args.note ? { note: args.note } : {}),
        ...(args.starts_at ? { starts_at: args.starts_at } : {}),
        ...(args.ends_at ? { ends_at: args.ends_at } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/activity/meeting/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    // ── TASKS ─────────────────────────────────────────────────────────────────

    case 'create_task': {
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        text: args.text,
        ...(args.due_date ? { due_date: args.due_date } : {}),
        ...(args.assigned_to ? { assigned_to: args.assigned_to } : {}),
        ...(args.is_complete !== undefined ? { is_complete: args.is_complete } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/task/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'list_tasks': {
      const limit = Number(args.limit || 50);
      const skip = Number(args.skip || 0);
      let path = `/task/?_limit=${limit}&_skip=${skip}`;
      if (args.lead_id) path += `&lead_id=${args.lead_id}`;
      if (args.assigned_to) path += `&assigned_to=${args.assigned_to}`;
      if (args.is_complete !== undefined) path += `&is_complete=${args.is_complete}`;
      if (args.due_before) path += `&due_before=${args.due_before}`;
      const data = await closeReq<{ data: unknown[] }>(path);
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'update_task': {
      const { task_id, ...rest } = args;
      return JSON.stringify(await closeReq<unknown>(`/task/${task_id}/`, { method: 'PUT', body: JSON.stringify(rest) }), null, 2);
    }

    case 'delete_task': {
      await closeReq<unknown>(`/task/${args.task_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.task_id });
    }

    // ── OPPORTUNITIES ─────────────────────────────────────────────────────────

    case 'list_opportunities': {
      const limit = Number(args.limit || 25);
      const skip = Number(args.skip || 0);
      let path = `/opportunity/?_limit=${limit}&_skip=${skip}`;
      if (args.lead_id) path += `&lead_id=${args.lead_id}`;
      if (args.status_type) path += `&status_type=${args.status_type}`;
      if (args.status_label) {
        const id = await resolveOppStatusId(String(args.status_label));
        path += `&status_id=${id}`;
      }
      const data = await closeReq<{ data: unknown[] }>(path);
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'get_opportunity': {
      return JSON.stringify(await closeReq<unknown>(`/opportunity/${args.opportunity_id}/`), null, 2);
    }

    case 'create_opportunity': {
      const statusId = await resolveOppStatusId(String(args.status_label));
      const body: Record<string, unknown> = {
        lead_id: args.lead_id,
        status_id: statusId,
        ...(args.value !== undefined ? { value: args.value, value_currency: args.value_currency || 'USD' } : {}),
        ...(args.note ? { note: args.note } : {}),
        ...(args.confidence !== undefined ? { confidence: args.confidence } : {}),
        ...(args.expected_close_date ? { expected_close_date: args.expected_close_date } : {}),
        ...(args.assigned_to ? { assigned_to: args.assigned_to } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/opportunity/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'update_opportunity': {
      const updates: Record<string, unknown> = {};
      if (args.status_label) updates.status_id = await resolveOppStatusId(String(args.status_label));
      if (args.value !== undefined) updates.value = args.value;
      if (args.note !== undefined) updates.note = args.note;
      if (args.confidence !== undefined) updates.confidence = args.confidence;
      if (args.expected_close_date) updates.expected_close_date = args.expected_close_date;
      if (args.assigned_to) updates.assigned_to = args.assigned_to;
      return JSON.stringify(await closeReq<unknown>(`/opportunity/${args.opportunity_id}/`, { method: 'PUT', body: JSON.stringify(updates) }), null, 2);
    }

    case 'delete_opportunity': {
      await closeReq<unknown>(`/opportunity/${args.opportunity_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.opportunity_id });
    }

    // ── STATUSES & PIPELINES ──────────────────────────────────────────────────

    case 'list_lead_statuses': {
      const data = await closeReq<{ data: unknown[] }>('/status/lead/');
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'create_lead_status': {
      return JSON.stringify(await closeReq<unknown>('/status/lead/', {
        method: 'POST',
        body: JSON.stringify({ label: args.label, type: args.type }),
      }), null, 2);
    }

    case 'update_lead_status': {
      const { status_id, ...rest } = args;
      return JSON.stringify(await closeReq<unknown>(`/status/lead/${status_id}/`, { method: 'PUT', body: JSON.stringify(rest) }), null, 2);
    }

    case 'delete_lead_status': {
      await closeReq<unknown>(`/status/lead/${args.status_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.status_id });
    }

    case 'list_opportunity_statuses': {
      const data = await closeReq<{ data: unknown[] }>('/status/opportunity/');
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'create_opportunity_status': {
      const body: Record<string, unknown> = { label: args.label, type: args.type };
      if (args.pipeline_id) body.pipeline_id = args.pipeline_id;
      return JSON.stringify(await closeReq<unknown>('/status/opportunity/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'list_pipelines': {
      const data = await closeReq<{ data: unknown[] }>('/pipeline/');
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'create_pipeline': {
      return JSON.stringify(await closeReq<unknown>('/pipeline/', {
        method: 'POST',
        body: JSON.stringify({ name: args.name, statuses: args.statuses || [] }),
      }), null, 2);
    }

    // ── CUSTOM FIELDS ─────────────────────────────────────────────────────────

    case 'list_custom_fields': {
      const obj = String(args.object_type || 'lead');
      const data = await closeReq<{ data: unknown[] }>(`/custom_field/${obj}/`);
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'create_custom_field': {
      const obj = String(args.object_type || 'lead');
      const body: Record<string, unknown> = {
        name: args.name,
        type: args.type,
        required: args.required || false,
        ...(args.choices ? { choices: args.choices } : {}),
      };
      return JSON.stringify(await closeReq<unknown>(`/custom_field/${obj}/`, { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'delete_custom_field': {
      const obj = String(args.object_type || 'lead');
      await closeReq<unknown>(`/custom_field/${obj}/${args.field_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.field_id });
    }

    // ── EMAIL TEMPLATES ───────────────────────────────────────────────────────

    case 'list_email_templates': {
      const limit = Number(args.limit || 100);
      const data = await closeReq<{ data: unknown[] }>(`/email_template/?_limit=${limit}`);
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'get_email_template': {
      return JSON.stringify(await closeReq<unknown>(`/email_template/${args.template_id}/`), null, 2);
    }

    case 'create_email_template': {
      return JSON.stringify(await closeReq<unknown>('/email_template/', {
        method: 'POST',
        body: JSON.stringify({
          name: args.name,
          subject: args.subject,
          body: args.body,
          ...(args.body_html ? { body_html: args.body_html } : {}),
          is_shared: args.is_shared !== false,
        }),
      }), null, 2);
    }

    case 'update_email_template': {
      const { template_id, ...rest } = args;
      return JSON.stringify(await closeReq<unknown>(`/email_template/${template_id}/`, { method: 'PUT', body: JSON.stringify(rest) }), null, 2);
    }

    case 'delete_email_template': {
      await closeReq<unknown>(`/email_template/${args.template_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, deleted: args.template_id });
    }

    // ── SEQUENCES ─────────────────────────────────────────────────────────────

    case 'list_sequences': {
      const data = await closeReq<{ data: unknown[] }>(`/sequence/?_limit=${Number(args.limit || 100)}`);
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'get_sequence': {
      return JSON.stringify(await closeReq<unknown>(`/sequence/${args.sequence_id}/`), null, 2);
    }

    case 'subscribe_contact_to_sequence': {
      const body: Record<string, unknown> = {
        sequence_id: args.sequence_id,
        contact_id: args.contact_id,
        ...(args.sender_account_id ? { sender_account_id: args.sender_account_id } : {}),
      };
      return JSON.stringify(await closeReq<unknown>('/sequence_subscription/', { method: 'POST', body: JSON.stringify(body) }), null, 2);
    }

    case 'unsubscribe_contact_from_sequence': {
      await closeReq<unknown>(`/sequence_subscription/${args.subscription_id}/`, { method: 'DELETE' });
      return JSON.stringify({ success: true, unsubscribed: args.subscription_id });
    }

    // ── BULK ACTIONS ──────────────────────────────────────────────────────────

    case 'bulk_update_leads': {
      const updates: Record<string, unknown> = {};
      if (args.status_label) updates.status_id = await resolveLeadStatusId(String(args.status_label));
      if (args.add_tags) updates['custom.add_tags'] = args.add_tags;
      if (args.remove_tags) updates['custom.remove_tags'] = args.remove_tags;
      if (args.custom_fields && typeof args.custom_fields === 'object') Object.assign(updates, args.custom_fields);

      const payload: Record<string, unknown> = { updates };
      if (args.lead_ids) payload.lead_ids = args.lead_ids;
      if (args.query) payload.query = args.query;

      return JSON.stringify(await closeReq<unknown>('/bulk_action/lead/', {
        method: 'POST',
        body: JSON.stringify({ action: 'update', ...payload }),
      }), null, 2);
    }

    case 'bulk_delete_leads': {
      const payload: Record<string, unknown> = { action: 'delete' };
      if (args.lead_ids) payload.lead_ids = args.lead_ids;
      if (args.query) payload.query = args.query;

      return JSON.stringify(await closeReq<unknown>('/bulk_action/lead/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }), null, 2);
    }

    // ── SMART VIEWS ───────────────────────────────────────────────────────────

    case 'list_smart_views': {
      const data = await closeReq<{ data: unknown[] }>('/saved_search/');
      return JSON.stringify(data.data || [], null, 2);
    }

    // ── USERS & ORG ───────────────────────────────────────────────────────────

    case 'get_current_user': {
      return JSON.stringify(await closeReq<unknown>('/me/'), null, 2);
    }

    case 'list_users': {
      const data = await closeReq<{ data: unknown[] }>('/user/');
      return JSON.stringify(data.data || [], null, 2);
    }

    case 'get_organization': {
      const me = await closeReq<{ organization_id: string }>('/me/');
      return JSON.stringify(await closeReq<unknown>(`/organization/${me.organization_id}/`), null, 2);
    }

    // ── REPORTING ─────────────────────────────────────────────────────────────

    case 'get_activity_report': {
      let path = `/report/activity/?date_start=${args.date_start}&date_end=${args.date_end}`;
      if (args.user_id) path += `&user_id=${args.user_id}`;
      if (args.type) path += `&type=${args.type}`;
      return JSON.stringify(await closeReq<unknown>(path), null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'close-crm', version: '2.0.0' },
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

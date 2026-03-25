// src/lib/enrichment/research-agents/persona-agent.ts
// Agent 3: Contact/persona deep research.
// Builds a profile of the decision maker for precise personalization.

import { searchPerplexity } from './perplexity';

export interface PersonaIntel {
  profile: string;
  previousCompanies: string[];
  likelyPriorities: string[];
  communicationStyle: 'formal' | 'casual' | 'unknown';
}

const SYSTEM = 'You are a B2B sales intelligence analyst specializing in executive profiling. Return ONLY factual information you can verify. Do NOT speculate or fabricate details. If information is unavailable, say so.';

export async function runPersonaAgent(
  firstName: string,
  lastName: string,
  title: string,
  companyName: string,
  domain: string,
): Promise<PersonaIntel> {
  const [profileData, activityData] = await Promise.all([
    // Query 1: Background and career history
    searchPerplexity(
      `${firstName} ${lastName}, ${title} at ${companyName} (${domain}).

Research their professional background:
1. Current role and responsibilities at ${companyName}
2. How long have they been at ${companyName}?
3. Previous companies and roles (chronological)
4. Notable achievements, awards, or press mentions
5. Education background
6. Any public talks, podcasts, or articles they've written
7. LinkedIn activity themes (what topics do they post about?)

Only verified information. If not found, say "No data found".`,
      { maxTokens: 500, systemPrompt: SYSTEM },
    ),

    // Query 2: Professional interests and communication patterns
    searchPerplexity(
      `${firstName} ${lastName} ${title} professional activity:
1. Recent LinkedIn posts or articles by ${firstName} ${lastName}
2. Conference talks or podcast appearances
3. Topics they engage with publicly (AI, sales tech, growth, leadership, etc.)
4. Professional groups or communities they're part of
5. Any recent career milestones or company announcements they shared

Focus on insights that reveal what they care about professionally.`,
      { maxTokens: 400, systemPrompt: SYSTEM },
    ),
  ]);

  const combined = `${profileData}\n${activityData}`.toLowerCase();

  // Extract previous companies
  const previousCompanies = extractCompanies(profileData, companyName);

  // Infer likely priorities from their role
  const likelyPriorities = inferPriorities(title, combined);

  // Guess communication style from activity
  const communicationStyle = inferStyle(combined);

  return {
    profile: `${profileData}\n\n${activityData}`,
    previousCompanies,
    likelyPriorities,
    communicationStyle,
  };
}

function extractCompanies(text: string, currentCompany: string): string[] {
  const companies: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Match "at CompanyName" or "CompanyName (year)" patterns
    const matches = line.match(/(?:at\s+|@\s+)([A-Z][\w\s&.]+?)(?:\s*[,()|–-]|$)/g);
    if (matches) {
      for (const m of matches) {
        const name = m.replace(/^(?:at\s+|@\s+)/, '').replace(/[,()|–-]$/, '').trim();
        if (name && name.toLowerCase() !== currentCompany.toLowerCase()) {
          companies.push(name);
        }
      }
    }
  }
  return [...new Set(companies)].slice(0, 5);
}

function inferPriorities(title: string, context: string): string[] {
  const priorities: string[] = [];
  const t = title.toLowerCase();

  if (t.includes('sales') || t.includes('revenue') || t.includes('cro')) {
    priorities.push('pipeline generation', 'quota attainment', 'sales efficiency');
  }
  if (t.includes('marketing') || t.includes('cmo') || t.includes('growth')) {
    priorities.push('demand generation', 'brand awareness', 'lead quality');
  }
  if (t.includes('ceo') || t.includes('founder')) {
    priorities.push('revenue growth', 'operational efficiency', 'market positioning');
  }
  if (context.includes('hiring') || context.includes('growing team')) {
    priorities.push('scaling the team');
  }
  if (context.includes('ai') || context.includes('automation')) {
    priorities.push('operational automation');
  }

  return priorities.length ? priorities : ['growth', 'efficiency'];
}

function inferStyle(context: string): 'formal' | 'casual' | 'unknown' {
  const casualSignals = ['lol', 'haha', 'emoji', 'excited', '!', 'love', 'awesome'];
  const formalSignals = ['pleased to announce', 'delighted', 'strategic', 'partnership', 'pleased'];

  const casualCount = casualSignals.filter((s) => context.includes(s)).length;
  const formalCount = formalSignals.filter((s) => context.includes(s)).length;

  if (casualCount > formalCount) return 'casual';
  if (formalCount > casualCount) return 'formal';
  return 'unknown';
}

// ============================================
// Reply Playbooks — The Frameworks That Convert
// ============================================
// Each sub-category has a specific framework, strategy,
// few-shot examples, and rules. This is NOT generic prompting.
// These are battle-tested cold email reply patterns.

export type SubCategory =
  | 'interested.ready_to_book'
  | 'interested.wants_info'
  | 'interested.asking_questions'
  | 'interested.referral'
  | 'interested.conditional'
  | 'soft_no.timing'
  | 'soft_no.not_interested'
  | 'soft_no.has_solution'
  | 'soft_no.budget'
  | 'soft_no.authority'
  | 'hard_no.unsubscribe'
  | 'hard_no.hostile'
  | 'hard_no.legal_threat'
  | 'custom.ooo'
  | 'custom.forwarded'
  | 'custom.question'
  | 'custom.other';

export interface Playbook {
  sub_category: SubCategory;
  parent_category: 'interested' | 'soft_no' | 'hard_no' | 'custom';
  framework_name: string;
  strategy: string;
  rules: string[];
  structure: string;
  few_shot_examples: { prospect_reply: string; our_reply: string }[];
  auto_send_eligible: boolean;
  max_confidence_threshold: number; // max confidence for auto-send
  follow_up_action: string | null;
}

export const PLAYBOOKS: Record<SubCategory, Playbook> = {
  // ================================================
  // INTERESTED — These are your money replies
  // ================================================

  'interested.ready_to_book': {
    sub_category: 'interested.ready_to_book',
    parent_category: 'interested',
    framework_name: 'BRIDGE',
    strategy: `The prospect said yes. Do NOT oversell. Do NOT add more information. Do NOT give them a reason to reconsider. Your ONLY job is to make booking the call as frictionless as possible. Speed is everything — every minute you delay, conversion drops 10%.`,
    rules: [
      'Maximum 3 sentences. Period.',
      'First sentence: acknowledge their interest naturally (no "Great to hear!" cringe)',
      'Second sentence: one specific reference from research about their company — proves you did homework',
      'Third sentence: calendar link OR two specific time slots',
      'NEVER re-pitch the offer — they already said yes',
      'NEVER add attachments, case studies, or "more info" — that creates friction',
      'NEVER use exclamation marks more than once',
      'Match their energy level — if they wrote one line, you write three max',
      'If they proposed a time, CONFIRM IT, dont redirect to a calendar link',
    ],
    structure: `[Brief acknowledgment, 1 sentence, reference their specific words]
[Research-informed personal touch, 1 sentence connecting to their company]
[Calendar link or confirm their proposed time, 1 sentence with clear next step]`,
    few_shot_examples: [
      {
        prospect_reply: 'Yes, I would be interested. On Fri, Jun 20, 2025 at 10:19 AM...',
        our_reply: `Hey [Name], appreciate the reply. Saw [Company] just expanded the [specific team], sounds like timing lines up. Here's my calendar to grab 15 minutes: [link]`,
      },
      {
        prospect_reply: 'Sounds good, I\'d love to see the sequence. Tell me more.',
        our_reply: `[Name], happy to walk you through it. Easier to show than tell since it depends on your ICP and volume. Got 15 min this week? [link]`,
      },
      {
        prospect_reply: 'Sure! On Tue, 17 Jun 2025 at 10:23 AM...',
        our_reply: `Perfect. Here's my calendar — grab whatever slot works: [link]. Looking forward to it.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.80,
    follow_up_action: null,
  },

  'interested.wants_info': {
    sub_category: 'interested.wants_info',
    parent_category: 'interested',
    framework_name: 'GIVE-THEN-ASK',
    strategy: `They're interested but want to know more before committing to a call. Don't dump information — give ONE compelling insight that creates curiosity, then bridge to a call. The goal is NOT to sell via email. The goal is to make the call the obvious next step.`,
    rules: [
      'Maximum 4-5 sentences',
      'Give ONE specific insight, not a feature dump',
      'The insight should connect your offer to THEIR specific situation (use research)',
      'Ask ONE qualifying question that makes them think',
      'End with calendar link as a soft CTA ("happy to walk through it" not "book now")',
      'NEVER send a deck, PDF, or long-form content — that kills the call',
      'If they asked for specific info, give a TASTE, not the full meal',
    ],
    structure: `[Acknowledge their interest — 1 sentence]
[ONE specific insight connecting your offer to their company/situation — 1-2 sentences]
[Qualifying question OR bridge to call — 1 sentence]
[Soft calendar CTA — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'Tell me more about what you do.',
        our_reply: `Happy to. We build and run the entire cold outreach engine so you don't have to. Companies in [their industry] typically see 3-4x the reply rate on dedicated infrastructure vs shared sending pools. Are you running outbound in-house or through an agency right now? Either way, happy to walk through how it'd work for [Company]: [link]`,
      },
      {
        prospect_reply: 'What does this cost?',
        our_reply: `Flat monthly retainer, no per-lead fees, no hidden costs. Typically comes in well under what an in-house SDR would cost, and you own all the infrastructure we build. Worth a 15-min call to scope it out for [Company]? [link]`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: null,
  },

  'interested.asking_questions': {
    sub_category: 'interested.asking_questions',
    parent_category: 'interested',
    framework_name: 'ANSWER-BRIDGE-BOOK',
    strategy: `They asked a specific question. Answer it DIRECTLY — don't dodge or redirect. But answer concisely, then leave the door open for more. They're curious, not sold yet. A soft CTA works better than a hard "book now" push. Let the quality of your answer do the selling.`,
    rules: [
      'ANSWER THE ACTUAL QUESTION FIRST — don\'t dodge it',
      'Use knowledge base to give an accurate, specific answer',
      'Keep the answer to 2-3 sentences max',
      'CTA should be SOFT — "happy to go deeper" or "can walk you through it" NOT "book a call here"',
      'Do NOT push a calendar link on question-askers. They asked a question, not for a meeting.',
      'If the question reveals a specific pain point, acknowledge it',
      'If you genuinely don\'t know the answer, say so honestly',
      'NEVER give a vague non-answer like "it depends" without specifics',
      'The reply should feel like answering a colleague, not pitching a prospect',
    ],
    structure: `[Direct answer to their question — 2-3 sentences, specific and honest]
[Bridge connecting answer to their situation — 1 sentence]
[Soft open door — "happy to go deeper" or similar, NO calendar link unless they asked for a meeting]`,
    few_shot_examples: [
      {
        prospect_reply: 'What industries do you typically work with?',
        our_reply: `Mostly B2B SaaS, agencies, professional services, and consulting firms. Anyone selling $3K+ offers to other businesses. [Company] lines up well with what we do. Happy to share more if you're curious.`,
      },
      {
        prospect_reply: 'How is this different from Apollo or Instantly?',
        our_reply: `We use Instantly (and other tools) but we're not a software. We're the team that builds and runs the entire system for you. Infrastructure, data sourcing, custom copy, reply management. Think of it as hiring an outbound team without the hiring. Happy to walk through specifics if helpful.`,
      },
      {
        prospect_reply: 'Can you tell me more about how your infrastructure setup works?',
        our_reply: `We build dedicated sending infrastructure in your name. That means your own domains, mailboxes, and warm-up, all managed by us. You own everything we build. Happy to go deeper on any of this.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.75,
    follow_up_action: null,
  },

  'interested.referral': {
    sub_category: 'interested.referral',
    parent_category: 'interested',
    framework_name: 'THANK-PIVOT-FOLLOW',
    strategy: `They referred you to someone else. This is GOLD — a warm introduction is 10x more valuable than a cold email. Thank them genuinely, get the referral's contact info, and ask if they can make an intro.`,
    rules: [
      'Thank them specifically for the referral',
      'Ask for the referral\'s email or if they can make an intro',
      'A direct intro from them is way better than you cold-emailing the referral',
      'Keep it to 2-3 sentences',
      'Don\'t be overly grateful — be professional',
    ],
    structure: `[Thank them for pointing you to the right person — 1 sentence]
[Ask if they can make a quick intro — 1 sentence]
[Offer alternative if intro isn't possible — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'You should talk to our VP of Sales, Mike Johnson. He handles this.',
        our_reply: `Appreciate you pointing me to Mike. Would you be open to making a quick intro? If not, happy to reach out directly. Just want to make sure I reference your name so it doesn't land cold.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: 'create_referral_follow_up',
  },

  'interested.conditional': {
    sub_category: 'interested.conditional',
    parent_category: 'interested',
    framework_name: 'MEET-THE-CONDITION',
    strategy: `They're interested IF something is true. "If you work with [industry]..." or "If the price is under X..." Meet the condition head-on. If you can, great. If you can't, be honest.`,
    rules: [
      'Address the condition directly — yes or no',
      'If yes: confirm briefly and move to call',
      'If no: be honest, explain what you DO offer, let them decide',
      'Don\'t over-explain or get defensive',
      'Maximum 3-4 sentences',
    ],
    structure: `[Address the condition directly — 1-2 sentences]
[Connect to their situation — 1 sentence]
[Call CTA — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'We would be interested if it is a commission based model.',
        our_reply: `Appreciate the reply. We run on a flat retainer model, not commission-based. Keeps incentives aligned around quality leads, not volume. If that's a dealbreaker, no worries. But if you're open to hearing how the economics work, happy to walk through it: [link]`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.75,
    follow_up_action: null,
  },

  // ================================================
  // SOFT NO — Nurture, don't push
  // ================================================

  'soft_no.timing': {
    sub_category: 'soft_no.timing',
    parent_category: 'soft_no',
    framework_name: 'SEED-AND-SAVE',
    strategy: `Bad timing doesn't mean bad fit. Acknowledge it, plant ONE seed of value, and set a specific follow-up date. The goal is to stay top of mind without being annoying. This lead goes into a nurture sequence.`,
    rules: [
      'Maximum 2-3 sentences',
      'Acknowledge the timing issue genuinely',
      'Plant ONE seed — a relevant insight or offer to reconnect at a specific time',
      'Ask when would be a better time OR suggest checking back in [X weeks]',
      'NEVER push back or try to overcome the timing objection',
      'NEVER say "I understand" — it sounds robotic',
    ],
    structure: `[Acknowledge their timing — 1 sentence, reference their words]
[Plant seed + suggest future follow-up — 1-2 sentences]`,
    few_shot_examples: [
      {
        prospect_reply: 'Not right now — thanks. On Thu, Jun 19, 2025...',
        our_reply: `No worries at all. I'll check back in a few weeks in case timing shifts. Appreciate the reply.`,
      },
      {
        prospect_reply: 'Hello, Thanks for your interest but I have too much going on right now.',
        our_reply: `Totally get it. I'll circle back in a month or so — no pressure. If anything changes before then, my calendar's always open: [link]`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.80,
    follow_up_action: 'schedule_follow_up_30_days',
  },

  'soft_no.not_interested': {
    sub_category: 'soft_no.not_interested',
    parent_category: 'soft_no',
    framework_name: 'GRACEFUL-EXIT',
    strategy: `They said no. Respect it. A graceful exit preserves the relationship and occasionally gets them to reconsider. The worst thing you can do is push back or ask "why not?"`,
    rules: [
      'Maximum 2 sentences',
      'Thank them for their reply',
      'Do NOT ask why they\'re not interested',
      'Do NOT try to overcome the objection',
      'Do NOT pitch again',
      'Leave one soft door open without pressure',
      'Be human, be brief, be gone',
    ],
    structure: `[Thank them + respect their decision — 1 sentence]
[Soft door open — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'Not interested. Thanks.',
        our_reply: `Appreciate the reply. If anything changes down the road, feel free to reach out.`,
      },
      {
        prospect_reply: 'We are not interested. Thanks for reaching out.',
        our_reply: `No worries — thanks for letting me know. Door\'s always open if things shift.`,
      },
      {
        prospect_reply: 'No thank you. We are all set.',
        our_reply: `All good — appreciate the response. Best of luck.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.82,
    follow_up_action: null,
  },

  'soft_no.has_solution': {
    sub_category: 'soft_no.has_solution',
    parent_category: 'soft_no',
    framework_name: 'ACKNOWLEDGE-DIFFERENTIATE',
    strategy: `They already have a solution. Don't trash their current provider. Instead, acknowledge it and share ONE specific differentiator that might make them curious. Plant a seed for when their contract is up or when they're dissatisfied.`,
    rules: [
      'Maximum 3-4 sentences',
      'Acknowledge their current solution positively',
      'Share ONE differentiator (not a feature dump)',
      'The differentiator should be something they likely DON\'T have',
      'Offer to compare notes — no pressure',
      'NEVER badmouth their current provider',
    ],
    structure: `[Acknowledge their current solution — 1 sentence]
[ONE specific differentiator — 1-2 sentences]
[Soft offer to compare notes or revisit later — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'We already work with an agency for outbound.',
        our_reply: `Makes sense. One thing worth knowing: most agencies use shared sending infrastructure, which tanks deliverability over time. We build dedicated infrastructure in your name that you own permanently. Might be worth comparing notes if you ever evaluate alternatives.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: 'schedule_follow_up_60_days',
  },

  'soft_no.budget': {
    sub_category: 'soft_no.budget',
    parent_category: 'soft_no',
    framework_name: 'REFRAME-VALUE',
    strategy: `Budget objection. Don't discount. Reframe in terms of ROI or cost comparison. If they genuinely can't afford it, respect that and move on.`,
    rules: [
      'Maximum 3-4 sentences',
      'Acknowledge budget constraints without being condescending',
      'Reframe: compare cost to the alternative (SDR hire, lost pipeline)',
      'NEVER offer a discount in the first reply',
      'If the deal size is too small for outbound, be honest about that',
      'Offer a call to discuss ROI, not to hard-sell',
    ],
    structure: `[Acknowledge budget concern — 1 sentence]
[Reframe with ROI context — 1-2 sentences]
[Soft CTA or graceful exit — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'Looks interesting but out of our budget right now.',
        our_reply: `Totally fair. For context, most of our clients are spending less than what a junior SDR would cost, and they own all the infrastructure permanently. If budget opens up later, happy to revisit. Appreciate the reply either way.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: 'schedule_follow_up_45_days',
  },

  'soft_no.authority': {
    sub_category: 'soft_no.authority',
    parent_category: 'soft_no',
    framework_name: 'HELP-THEM-CHAMPION',
    strategy: `They don't have the authority to decide. Help them become your internal champion. Give them something to forward to the decision maker.`,
    rules: [
      'Maximum 3 sentences',
      'Don\'t make them feel small for not being the decision maker',
      'Ask who the right person is',
      'Offer to send something they can forward',
      'Make it EASY for them to connect you',
    ],
    structure: `[Acknowledge + ask who makes this call — 1-2 sentences]
[Offer to help them connect you — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'I\'m not the right person for this. You\'d need to talk to our CMO.',
        our_reply: `Appreciate you letting me know. Would you be open to connecting me with your CMO? Happy to keep it brief. Or feel free to forward this thread and I can take it from there.`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: null,
  },

  // ================================================
  // HARD NO — Handle and move on
  // ================================================

  'hard_no.unsubscribe': {
    sub_category: 'hard_no.unsubscribe',
    parent_category: 'hard_no',
    framework_name: 'IMMEDIATE-REMOVE',
    strategy: `They want off the list. Remove them immediately. No reply needed — just tag, delete, blocklist. This is handled automatically.`,
    rules: ['No reply sent', 'Auto-tag HARD NO', 'Auto-delete from campaign', 'Auto-blocklist'],
    structure: 'NO REPLY — auto-handled',
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: 'blocklist_and_delete',
  },

  'hard_no.hostile': {
    sub_category: 'hard_no.hostile',
    parent_category: 'hard_no',
    framework_name: 'IMMEDIATE-REMOVE',
    strategy: `Hostile/angry reply. Do NOT engage. Remove immediately. Any reply risks escalation.`,
    rules: ['No reply sent', 'Auto-tag HARD NO', 'Auto-delete from campaign', 'Auto-blocklist'],
    structure: 'NO REPLY — auto-handled',
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: 'blocklist_and_delete',
  },

  'hard_no.legal_threat': {
    sub_category: 'hard_no.legal_threat',
    parent_category: 'hard_no',
    framework_name: 'IMMEDIATE-REMOVE-FLAG',
    strategy: `Legal threat. Remove immediately and flag for human review. Do NOT reply.`,
    rules: [
      'No reply sent',
      'Auto-tag HARD NO',
      'Auto-delete from campaign',
      'Auto-blocklist',
      'Flag for human review — Slack alert',
    ],
    structure: 'NO REPLY — auto-handled + human alert',
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: 'blocklist_delete_and_alert',
  },

  // ================================================
  // CUSTOM — Needs human judgment
  // ================================================

  'custom.ooo': {
    sub_category: 'custom.ooo',
    parent_category: 'custom',
    framework_name: 'WAIT-AND-RETRY',
    strategy: `Out of office. Parse the return date if available. Schedule a follow-up for when they're back. No reply needed now.`,
    rules: ['No reply sent now', 'Parse return date from OOO message', 'Schedule follow-up for return date + 1 day'],
    structure: 'NO REPLY — schedule follow-up',
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: 'schedule_follow_up_from_ooo',
  },

  'custom.forwarded': {
    sub_category: 'custom.forwarded',
    parent_category: 'custom',
    framework_name: 'THANK-AND-FOLLOW-UP',
    strategy: `They forwarded your email to someone else or mentioned a colleague. Similar to referral but less explicit.`,
    rules: [
      'If they gave a name/email: thank them and follow up with that person',
      'If vague ("I\'ll forward this"): thank them and follow up in a few days',
      'Maximum 2 sentences',
    ],
    structure: `[Thank them — 1 sentence]
[Follow-up plan — 1 sentence]`,
    few_shot_examples: [
      {
        prospect_reply: 'Forwarding to our head of growth.',
        our_reply: `Appreciate that. I'll keep an eye out for their reply — feel free to share my calendar if it's easier: [link]`,
      },
    ],
    auto_send_eligible: true,
    max_confidence_threshold: 0.78,
    follow_up_action: 'schedule_follow_up_3_days',
  },

  'custom.question': {
    sub_category: 'custom.question',
    parent_category: 'custom',
    framework_name: 'ANSWER-AND-REDIRECT',
    strategy: `They asked something unrelated to buying. Answer it helpfully, then gently redirect to a conversation about fit.`,
    rules: [
      'Answer their question honestly using knowledge base',
      'Be helpful — this builds trust',
      'Gently bridge back to relevance if possible',
      'If completely unrelated, just answer and move on',
      'Maximum 4 sentences',
    ],
    structure: `[Direct answer — 1-2 sentences]
[Bridge back to relevance if natural — 1-2 sentences]`,
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: null,
  },

  'custom.other': {
    sub_category: 'custom.other',
    parent_category: 'custom',
    framework_name: 'HUMAN-REVIEW',
    strategy: `Doesn't fit any pattern. Send to human for review.`,
    rules: ['Always send to human review', 'AI may draft a response but confidence should be low'],
    structure: 'HUMAN REVIEW REQUIRED',
    few_shot_examples: [],
    auto_send_eligible: false,
    max_confidence_threshold: 0,
    follow_up_action: null,
  },
};

// Get playbook by sub-category
export function getPlaybook(subCategory: SubCategory): Playbook {
  return PLAYBOOKS[subCategory];
}

// Get all playbooks for a parent category
export function getPlaybooksForCategory(
  category: 'interested' | 'soft_no' | 'hard_no' | 'custom'
): Playbook[] {
  return Object.values(PLAYBOOKS).filter((p) => p.parent_category === category);
}

// Format few-shot examples for prompt injection
export function formatFewShotExamples(playbook: Playbook): string {
  if (!playbook.few_shot_examples.length) return '';

  return playbook.few_shot_examples
    .map(
      (ex, i) =>
        `Example ${i + 1}:
Prospect: "${ex.prospect_reply}"
Reply: "${ex.our_reply}"`
    )
    .join('\n\n');
}

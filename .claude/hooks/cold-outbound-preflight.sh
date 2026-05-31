#!/usr/bin/env bash
# UserPromptSubmit hook: when a prompt looks like cold-outbound work, inject a
# reminder to invoke the `cold-outbound` skill FIRST (per CLAUDE.md read-order).
# Always exits 0 so it never blocks a prompt.

prompt="$(jq -r '.prompt // empty')"

# Suppress when the prompt is ABOUT the machinery (meta / analysis / config),
# not actually doing outbound work. Keyed on tooling vocabulary, not generic
# verbs like "analyze" (which appear in real segment work).
meta='\bskills?\b|\bhooks?\b|claude[ .]?md|settings\.json|\.claude|read[- ]?order|routing table|\bconstitution\b'
if printf '%s' "$prompt" | grep -qiE "$meta"; then
  exit 0
fi

pattern='cold[- ]?email|cold[- ]?outreach|\boutbound\b|\bicp\b|ideal customer|list[- ]?build|lead list|\bniche\b|segment|subvertical|enrich|buying signal|intent (data|signal)|signal[- ]based|trigger[- ]based|\bprospect|deliverabilit|\bwarmup\b|spintax|instantly|smartlead|\bsequence|who (should|do) (we|i) target|pre[- ]?flight|message[- ]market fit|offer design'

if printf '%s' "$prompt" | grep -qiE "$pattern"; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"This prompt looks like cold-outbound work. Per CLAUDE.md, invoke the cold-outbound skill FIRST (Skill tool: cold-outbound) and follow its read-order (Constitution -> Pre-Flight -> List/Segmentation or Fit-Timing-Join) BEFORE using coldiq-gtm, elite-copywriting, email-marketing, or other execution skills."}}'
fi

exit 0

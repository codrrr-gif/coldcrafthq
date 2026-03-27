import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';
import { insertActivity } from '@/lib/portal/activity';

// The 10 onboarding steps map to knowledge_base categories
const ONBOARDING_CATEGORIES = [
  'company_profile',
  'icp_definition',
  'offer_value_prop',
  'brand_voice',
  'objection_handling',
  'faq',
  'competitors',
  'social_proof',
  'booking_link',
  'sending_setup',
] as const;

// GET: Return onboarding progress
export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data: entries } = await supabase
    .from('knowledge_base')
    .select('category')
    .eq('client_id', session.clientId);

  const completedCategories = new Set((entries || []).map((e) => e.category));
  const steps = ONBOARDING_CATEGORIES.map((cat, i) => ({
    step: i + 1,
    category: cat,
    label: cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    completed: completedCategories.has(cat),
  }));

  const completedCount = steps.filter((s) => s.completed).length;

  return NextResponse.json({ steps, completed: completedCount, total: steps.length });
}

// POST: Save an onboarding step
export async function POST(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { category, title, content } = await req.json();

  if (!category || !content?.trim()) {
    return NextResponse.json({ error: 'category and content are required' }, { status: 400 });
  }

  if (!ONBOARDING_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  // Upsert: replace existing entry for this category + client
  const { data: existing } = await supabase
    .from('knowledge_base')
    .select('id')
    .eq('client_id', session.clientId)
    .eq('category', category)
    .single();

  if (existing) {
    await supabase
      .from('knowledge_base')
      .update({
        title: title || category,
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('knowledge_base').insert({
      client_id: session.clientId,
      title: title || category,
      content: content.trim(),
      category,
    });
  }

  // Activity feed
  await insertActivity(
    session.clientId,
    'onboarding_step',
    `Completed onboarding step: ${category.replace(/_/g, ' ')}`
  );

  // Check if all steps are now complete
  const { data: allEntries } = await supabase
    .from('knowledge_base')
    .select('category')
    .eq('client_id', session.clientId);

  const completedSet = new Set((allEntries || []).map((e) => e.category));
  const allDone = ONBOARDING_CATEGORIES.every((c) => completedSet.has(c));

  if (allDone) {
    await supabase
      .from('clients')
      .update({
        status: 'active',
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.clientId);

    await insertActivity(session.clientId, 'system', 'Onboarding completed!');

    // Slack notification (fire-and-forget)
    const { notifySlack } = await import('@/lib/slack');
    notifySlack(`New client "${session.clientName}" completed onboarding`, 'info').catch(() => {});
  }

  return NextResponse.json({ success: true, all_complete: allDone });
}

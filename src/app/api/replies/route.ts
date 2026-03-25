// ============================================
// Replies API — CRUD + Analytics
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { DashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const subCategory = searchParams.get('sub_category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const stats = searchParams.get('stats');

  // Return stats
  if (stats === 'true') {
    try {
      // Use same select pattern as the working replies query
      const { data: allReplies, error: statsError } = await supabase
        .from('replies')
        .select('status, category, sub_category, confidence, auto_sent, response_time_ms, outcome')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (statsError) {
        return NextResponse.json({
          total: 0, pending: 0, approved: 0, sent: 0, skipped: 0, failed: 0,
          auto_sent: 0, avg_confidence: 0, avg_response_time_ms: 0,
          by_category: { interested: 0, soft_no: 0, hard_no: 0, custom: 0 },
          by_sub_category: {},
          _error: statsError.message,
        });
      }

      const replies = allReplies || [];

      const confidences = replies.filter((r) => r.confidence > 0).map((r) => r.confidence);
      const responseTimes = replies.filter((r) => r.response_time_ms).map((r) => r.response_time_ms);

      const subCategoryCounts: Record<string, number> = {};
      replies.forEach((r) => {
        if (r.sub_category) {
          subCategoryCounts[r.sub_category] = (subCategoryCounts[r.sub_category] || 0) + 1;
        }
      });

      // Outcome stats
      const sentWithOutcome = replies.filter((r) => r.status === 'sent' && r.outcome);
      const positiveOutcomes = sentWithOutcome.filter((r) => r.outcome === 'reply_positive' || r.outcome === 'meeting_booked').length;
      const totalScored = sentWithOutcome.length;

      const dashboardStats: DashboardStats = {
        total: replies.length,
        pending: replies.filter((r) => r.status === 'pending').length,
        approved: replies.filter((r) => r.status === 'approved').length,
        sent: replies.filter((r) => r.status === 'sent').length,
        skipped: replies.filter((r) => r.status === 'skipped').length,
        failed: replies.filter((r) => r.status === 'failed').length,
        auto_sent: replies.filter((r) => r.auto_sent).length,
        avg_confidence: confidences.length
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0,
        avg_response_time_ms: responseTimes.length
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
        by_category: {
          interested: replies.filter((r) => r.category === 'interested').length,
          soft_no: replies.filter((r) => r.category === 'soft_no').length,
          hard_no: replies.filter((r) => r.category === 'hard_no').length,
          custom: replies.filter((r) => r.category === 'custom').length,
        },
        by_sub_category: subCategoryCounts,
        outcomes: {
          reply_positive: sentWithOutcome.filter((r) => r.outcome === 'reply_positive').length,
          reply_negative: sentWithOutcome.filter((r) => r.outcome === 'reply_negative').length,
          silence: sentWithOutcome.filter((r) => r.outcome === 'silence').length,
          meeting_booked: sentWithOutcome.filter((r) => r.outcome === 'meeting_booked').length,
          pending_evaluation: replies.filter((r) => r.status === 'sent' && !r.outcome).length,
          win_rate: totalScored > 0 ? positiveOutcomes / totalScored : 0,
        },
      };

      const resp = NextResponse.json(dashboardStats);
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return resp;
    } catch (e) {
      return NextResponse.json({
        total: 0, pending: 0, approved: 0, sent: 0, skipped: 0, failed: 0,
        auto_sent: 0, avg_confidence: 0, avg_response_time_ms: 0,
        by_category: { interested: 0, soft_no: 0, hard_no: 0, custom: 0 },
        by_sub_category: {},
        _error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  // Build query
  let query = supabase
    .from('replies')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  if (subCategory) query = query.eq('sub_category', subCategory);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resp = NextResponse.json({ replies: data || [], page, limit });
  resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return resp;
}

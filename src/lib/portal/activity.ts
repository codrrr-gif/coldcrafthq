// ============================================
// Activity Feed — Insert Helper
// ============================================

import { supabase } from '@/lib/supabase/client';
import type { ActivityType } from './types';

export async function insertActivity(
  clientId: string,
  type: ActivityType,
  title: string,
  detail?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('activity_feed').insert({
    client_id: clientId,
    type,
    title,
    detail: detail || null,
    metadata: metadata || null,
  });

  if (error) {
    console.error('[activity] Failed to insert:', error.message);
  }
}

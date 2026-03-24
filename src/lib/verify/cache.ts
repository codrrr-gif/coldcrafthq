// ============================================
// Domain Cache — Supabase-backed
// ============================================
// Caches DNS + SMTP results per domain to avoid redundant lookups.
// A bulk list of 10K emails might only have 2K unique domains.
// Cache TTL: 24h for MX/DNS, 6h for catch-all status.

import { supabase } from '@/lib/supabase/client';
import type { DomainCacheEntry } from './types';

const DNS_TTL_HOURS = 24;
const CATCH_ALL_TTL_HOURS = 6;

export async function getCachedDomain(domain: string): Promise<DomainCacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('domain_cache')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .limit(1)
      .single();

    if (error || !data) return null;

    // Check if cache is expired
    const checkedAt = new Date(data.checked_at).getTime();
    const ttlMs = (data.ttl_hours || DNS_TTL_HOURS) * 60 * 60 * 1000;
    if (Date.now() - checkedAt > ttlMs) return null;

    return data as DomainCacheEntry;
  } catch {
    return null;
  }
}

export async function cacheDomain(entry: Omit<DomainCacheEntry, 'checked_at'>): Promise<void> {
  try {
    await supabase
      .from('domain_cache')
      .upsert({
        domain: entry.domain.toLowerCase(),
        has_mx: entry.has_mx,
        mx_records: entry.mx_records,
        is_catch_all: entry.is_catch_all,
        is_disposable: entry.is_disposable,
        provider: entry.provider,
        checked_at: new Date().toISOString(),
        ttl_hours: entry.ttl_hours || DNS_TTL_HOURS,
      }, { onConflict: 'domain' });
  } catch (err) {
    console.error('Failed to cache domain:', err);
  }
}

export async function updateCatchAllStatus(
  domain: string,
  isCatchAll: boolean
): Promise<void> {
  try {
    await supabase
      .from('domain_cache')
      .update({
        is_catch_all: isCatchAll,
        ttl_hours: CATCH_ALL_TTL_HOURS,
        checked_at: new Date().toISOString(),
      })
      .eq('domain', domain.toLowerCase());
  } catch (err) {
    console.error('Failed to update catch-all status:', err);
  }
}

// In-memory cache for the current request lifecycle (bulk processing)
const memoryCache = new Map<string, DomainCacheEntry>();

export function getMemoryCached(domain: string): DomainCacheEntry | undefined {
  return memoryCache.get(domain.toLowerCase());
}

export function setMemoryCached(entry: DomainCacheEntry): void {
  memoryCache.set(entry.domain.toLowerCase(), entry);
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}

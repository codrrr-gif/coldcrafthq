// src/lib/signals/intent/g2-scraper.ts
// Scrapes G2/Capterra for negative reviews of competitor products.
// A company leaving a 2-3 star competitor review is actively dissatisfied = hot signal.

import { runActor, getRunStatus, getDatasetItems } from '@/lib/apify';
import type { ParsedSignal } from '@/lib/gtm/types';

export async function scrapeCompetitorReviews(): Promise<ParsedSignal[]> {
  const urls = (process.env.COMPETITOR_G2_URLS || '').split(',').filter(Boolean).map((u) => u.trim());
  if (!urls.length) {
    console.log('[g2-scraper] No COMPETITOR_G2_URLS configured, skipping');
    return [];
  }

  try {
    const { runId, datasetId } = await runActor('apify/cheerio-scraper', {
      startUrls: urls.map((url) => ({ url })),
      pageFunction: `async function pageFunction({ $, request }) {
        const reviews = [];
        // G2 review cards
        $('.review-card, [itemprop="review"], .paper.paper--white.paper--shadow, [data-test="review-card"]').each((_, el) => {
          const starsAttr = $(el).find('[data-rating], [class*="star"], .rating').first().attr('data-rating') || '5';
          const stars = parseInt(starsAttr, 10);
          const reviewerTitle = $(el).find('[data-test="reviewer-title"], .reviewer-title, [class*="reviewer"]').first().text().trim();
          const company = $(el).find('[data-test="reviewer-company"], .reviewer-company, [class*="company"]').first().text().trim();
          const text = $(el).find('[data-test="review-body"], .review-text, [class*="review"]').first().text().trim().slice(0, 400);
          if (stars <= 3 && company && company.length > 1) {
            reviews.push({ stars, reviewerTitle, company, text, sourceUrl: request.url });
          }
        });
        return reviews;
      }`,
      maxRequestsPerCrawl: Math.max(urls.length, 1),
    });

    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const items = await getDatasetItems(datasetId, 100);
        return items
          .filter((item) => item.company && String(item.company).length > 1)
          .map((item) => ({
            signal_type: 'competitor_review' as const,
            company_name: String(item.company),
            company_domain: null,
            headline: `${item.company} left a ${item.stars}★ review — "${String(item.text || '').slice(0, 80)}..."`,
            signal_url: String(item.sourceUrl || ''),
            signal_date: new Date().toISOString().split('T')[0],
            raw_data: item as Record<string, unknown>,
          }));
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[g2-scraper] Scrape failed:', err);
  }
  return [];
}

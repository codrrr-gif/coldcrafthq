import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCredits,
  searchPeople,
  exportPeopleWithEmail,
  getExportStatistics,
  getExportInquiries,
  type AIArkPeopleSearchParams,
} from '../ai-ark';

describe('ai-ark client', () => {
  beforeEach(() => {
    process.env.AI_ARK_API = 'test-key-123';
    global.fetch = vi.fn();
  });

  it('throws when API key is missing', async () => {
    delete process.env.AI_ARK_API;
    await expect(getCredits()).rejects.toThrow('AI_ARK_API not set');
  });

  it('uses X-TOKEN auth header with raw key (no Bearer prefix)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true, json: async () => ({ total: 5099.4 }),
    });
    await getCredits();
    const [, opts] = (global.fetch as any).mock.calls[0];
    expect(opts.headers['X-TOKEN']).toBe('test-key-123');
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('searchPeople sends documented body shape and paginates', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ id: 'p1', profile: { first_name: 'A' } }],
          totalElements: 2, totalPages: 2, last: false, number: 0,
          trackId: 'track-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ id: 'p2', profile: { first_name: 'B' } }],
          totalElements: 2, totalPages: 2, last: true, number: 1,
          trackId: 'track-1',
        }),
      });

    const params: AIArkPeopleSearchParams = {
      account: {
        industry: ['staffing and recruiting'],
        employeeSize: { type: 'RANGE', range: [{ start: 5, end: 75 }] },
        location: { country: ['United States', 'Canada'] },
      },
      contact: { current_position: { titles: ['Founder', 'Managing Partner'] } },
      size: 1,
      maxResults: 10,
    };
    const result = await searchPeople(params);

    expect(result.records).toHaveLength(2);
    expect(result.trackId).toBe('track-1');
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('api.ai-ark.com/api/developer-portal/v1/people');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.account.industry).toEqual(['staffing and recruiting']);
    expect(body.contact.current_position.titles).toContain('Founder');
    expect(body.page).toBe(0);
    expect(body.size).toBe(1);
  });

  it('exportPeopleWithEmail returns trackId from async POST', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ trackId: 'export-123', state: 'PENDING' }),
    });
    const trackId = await exportPeopleWithEmail({
      account: { industry: ['x'] }, contact: { current_position: { titles: ['CEO'] } }, size: 100,
    }, 'https://noop.example.com/webhook');
    expect(trackId).toBe('export-123');

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/people/export');
    const body = JSON.parse(opts.body);
    expect(body.webhook).toBe('https://noop.example.com/webhook');
    expect(body.size).toBe(100);
  });

  it('getExportStatistics returns parsed state object', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ state: 'IN_PROGRESS', statistics: { total: 100, found: 42 } }),
    });
    const stats = await getExportStatistics('track-abc');
    expect(stats.state).toBe('IN_PROGRESS');
    expect(stats.statistics.found).toBe(42);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/people\/export\/track-abc\/statistics$/);
  });

  it('getExportInquiries pages through DONE results', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ refId: 'r1', state: 'DONE', input: { firstname: 'A' },
                    output: [{ address: 'a@x.com', status: 'VALID' }] }],
        totalElements: 1, totalPages: 1,
      }),
    });
    const page = await getExportInquiries('track-abc', 0, 100);
    expect(page.content).toHaveLength(1);
    expect(page.totalPages).toBe(1);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/people\/export\/track-abc\/inquiries\?page=0&size=100$/);
  });

  it('throws on non-OK status with response body in message (non-retried 4xx)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false, status: 400, text: async () => 'bad request',
    });
    // 400 is NOT transient, so no retries — error surfaces immediately.
    await expect(getCredits()).rejects.toThrow(/400.*bad request/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx and surfaces last status if exhausted', async () => {
    // All 4 attempts (initial + 3 retries) return 500. Final throw carries the 500.
    (global.fetch as any).mockResolvedValue({
      ok: false, status: 500, text: async () => 'server error',
    });
    await expect(getCredits()).rejects.toThrow(/500.*server error/);
    // 1 initial + 3 retries = 4 calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
  }, 15_000);
});

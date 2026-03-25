// Simple in-memory rate limiter for external API calls.
// Resets per serverless invocation (which is fine — limits concurrent burst within a single request).

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens <= 0) {
      // Wait for a token to become available
      const waitMs = (1 / this.refillRate) * 1000;
      await new Promise(r => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens--;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Shared limiters — 1 per external service
export const perplexityLimiter = new RateLimiter(5, 0.8); // 5 burst, ~48/min sustained
export const closeCrmLimiter = new RateLimiter(3, 1.5);    // 3 burst, ~90/min sustained

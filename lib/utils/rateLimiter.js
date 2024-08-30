class RateLimiter {
  constructor(config) {
    this.config = config;
    this.clients = new Map();
  }

  parseRateString(rateString) {
    const [limit, period] = rateString.split("/");
    const numericLimit = parseInt(limit, 10);
    const numericPeriod = period === "s" ? 1 : period === "m" ? 60 : 3600; // s for second, m for minute, h for hour
    return { limit: numericLimit, period: numericPeriod };
  }

  getClientKey(req) {
    return req.ip || req.connection.remoteAddress;
  }

  middleware() {
    return (req, res, next) => {
      const clientKey = this.getClientKey(req);
      let rateString;

      if (this.config.scopeBasedLimiter && req.ScopeRateLimit) {
        rateString = req.ScopeRateLimit;
      } else {
        rateString = this.config.defaultRate;
      }

      if (!rateString) {
        throw new Error("No rate limit defined");
      }

      const { limit, period } = this.parseRateString(rateString);
      const now = Date.now();

      if (!this.clients.has(clientKey)) {
        this.clients.set(clientKey, {
          tokens: limit - 1,
          lastRefill: now,
        });
        return next();
      }

      const client = this.clients.get(clientKey);
      const elapsedSeconds = (now - client.lastRefill) / 1000;
      const refillAmount = Math.floor(elapsedSeconds * (limit / period));

      client.tokens = Math.min(client.tokens + refillAmount, limit);
      client.lastRefill = now;

      if (client.tokens > 0) {
        client.tokens--;
        next();
      } else {
        res.status(429).json({ error: "Too Many Requests" });
      }
    };
  }
}

module.exports = RateLimiter;

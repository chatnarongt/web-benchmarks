import { RedisClient } from 'bun';

const maxAcceptableRetries = 4294967295; // take about ~272 years 🙃

const getRedisMaxRetries = (
  timeRange: number,
  timeUnit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
): number => {
  const unitToSeconds: Record<typeof timeUnit, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000, // 30 days
    year: 31536000, // 365 days
  };

  const totalSeconds = timeRange * unitToSeconds[timeUnit];

  // Exponential backoff phase: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, 2000ms
  // 7 retries taking ceil(~3.15s) ≈ 4 seconds to reach the 2s cap
  const backoffRetries = 7;
  const backoffSeconds = 4;

  if (totalSeconds <= 0) return 0;
  if (totalSeconds <= backoffSeconds) return backoffRetries;

  // Remaining time filled with steady 2-second retries
  const remainingSeconds = totalSeconds - backoffSeconds;
  const steadyRetries = Math.ceil(remainingSeconds / 2);

  return Math.min(backoffRetries + steadyRetries, maxAcceptableRetries);
};

export const redis = new RedisClient(Bun.env.REDIS_URL, {
  connectionTimeout: 10000,
  idleTimeout: 0,
  autoReconnect: true,
  maxRetries: getRedisMaxRetries(1, 'day'),
});

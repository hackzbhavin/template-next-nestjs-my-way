/**
 * k6 Load Test — template
 *
 * Replace the ENDPOINT and payload with your actual API.
 *
 * Usage (streams metrics live into Grafana via Prometheus remote write):
 *   k6 run -o experimental-prometheus-rw k6/load-test.js           # ramp
 *   k6 run -o experimental-prometheus-rw --env SCENARIO=spike k6/load-test.js
 *   k6 run -o experimental-prometheus-rw --env SCENARIO=soak  k6/load-test.js
 *
 * Override target:
 *   k6 run --env BASE_URL=http://prod-server:9002 k6/load-test.js
 *
 * Prometheus remote write (default): http://localhost:9090/api/v1/write
 * Override: K6_PROMETHEUS_RW_SERVER_URL=http://your-host:9090/api/v1/write
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config — change BASE_URL and ENDPOINT per project
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:9002';
const ENDPOINT  = `${BASE_URL}/api/v1/users`;          // ← change this
const SCENARIO  = __ENV.SCENARIO || 'ramp';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate  = new Rate('error_rate');
const p99Latency = new Trend('p99_latency', true);

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------
const SCENARIOS = {
  ramp: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50  },
      { duration: '1m',  target: 200 },
      { duration: '30s', target: 500 },
      { duration: '1m',  target: 500 },
      { duration: '30s', target: 0   },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10   },
      { duration: '10s', target: 1000 },
      { duration: '30s', target: 1000 },
      { duration: '10s', target: 10   },
      { duration: '10s', target: 0    },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 100,
    duration: '30m',
  },
};

export const options = {
  scenarios: {
    load: SCENARIOS[SCENARIO] || SCENARIOS.ramp,
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    error_rate:        ['rate<0.01'],
    http_req_failed:   ['rate<0.01'],
  },
};

// ---------------------------------------------------------------------------
// Main VU function — replace with your request
// ---------------------------------------------------------------------------
export default function () {
  const res = http.get(ENDPOINT, {             // ← replace with your request
    headers: { 'Content-Type': 'application/json' },
  });

  p99Latency.add(res.timings.duration);
  errorRate.add(res.status >= 500);

  check(res, {
    'status is 200':   (r) => r.status === 200,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.1);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const reqs    = data.metrics.http_reqs?.values?.count ?? 0;
  const p95     = data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) ?? '-';
  const p99     = data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) ?? '-';
  const errRate = ((data.metrics.error_rate?.values?.rate ?? 0) * 100).toFixed(2);

  console.log('\n========== Load Test Summary ==========');
  console.log(`Total requests : ${reqs}`);
  console.log(`p95 latency    : ${p95}ms`);
  console.log(`p99 latency    : ${p99}ms`);
  console.log(`Error rate     : ${errRate}%`);
  console.log('=======================================\n');

  return {
    stdout: '',
    'k6/results.json': JSON.stringify(data, null, 2),
  };
}

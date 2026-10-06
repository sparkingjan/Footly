import http from 'k6/http';
import { check } from 'k6';
// Run only against an environment you own and have provisioned for this test.
// Defaults deliberately stay small; the million-request run is explicit.
const base = __ENV.BASE_URL || 'http://127.0.0.1:5173';
const rate = Number(__ENV.RATE || 10);
if (rate > 100 && __ENV.CONFIRM_LOAD_TEST !== 'yes') throw new Error('Set CONFIRM_LOAD_TEST=yes for a provisioned load-test environment.');
export const options = {
  scenarios: { spike: { executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration: __ENV.DURATION || '60s', preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 50), maxVUs: Number(__ENV.MAX_VUS || 200) } },
  thresholds: { http_req_failed: ['rate<0.001'], http_req_duration: ['p(95)<500','p(99)<1500'], dropped_iterations: ['count==0'] }
};
const routes=['/','/app.html','/style.css','/live-scorekeeper.html','/match-data.js'];
export default function(){
  const response=http.get(base+routes[__ITER%routes.length],{tags:{traffic:'static'},timeout:'10s'});
  check(response,{'HTTP 200':result=>result.status===200});
}

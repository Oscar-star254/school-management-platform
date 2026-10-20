# Performance

The production web build is code-split; PDF tooling loads only when a report is downloaded. Static assets receive immutable caching and nginx compression. The current initial JavaScript is below the 150 KB gzipped login target.

Run the included results-day test against a deployed API:

```bash
k6 run -e BASE_URL=https://school.example.ke/api infra/k6/results-day.js
```

Acceptance thresholds are under 1% request failures and p95 below 300 ms. The script models 500 concurrent parents reading released report summaries. Record dated environment, CPU, RAM, database size, p95, error rate, and fixes here after testing against production-equivalent infrastructure; local mock numbers are not representative and are intentionally not fabricated.

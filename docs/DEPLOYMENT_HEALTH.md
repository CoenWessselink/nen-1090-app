# Deployment health

2026-04-27: retriggered app CI after API health recovered.

- API health endpoint checked: `/api/v1/health`
- Expected result: app smoke should pass once GitHub Actions reruns against the recovered API.

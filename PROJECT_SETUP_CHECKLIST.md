# PROJECT_SETUP_CHECKLIST.md

## Git
Branches: `main`, `develop`, `feature/*`, `fix/*`, `hotfix/*`.

## Local quality gate

```text
npm run lint
npm run typecheck
npm run test
npm run build
supabase db reset
```

## Never commit
`.env`, service-role keys, DB passwords, API secrets, production dumps, private certificates.

## First milestone
Supabase Local starts → migrations replay → security hardening applies → local app authenticates → membership resolves → cross-tenant access denied.

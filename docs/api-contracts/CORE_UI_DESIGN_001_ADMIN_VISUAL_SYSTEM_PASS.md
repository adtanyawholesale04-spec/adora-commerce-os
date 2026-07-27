# CORE-UI-DESIGN-001 Admin Visual System Pass

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-DESIGN-001  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## Objective

Create a shared Admin visual foundation before expanding more A3 screens.

This task adds light/dark mode and Thai/English UI preference support without changing database schema, RLS policies, permissions, or business actions.

---

## Implemented Surface

| Surface | Path | Notes |
|---|---|---|
| Theme tokens | `src/app/globals.css`, `tailwind.config.ts` | CSS variable color system for light and dark modes |
| Admin preferences | `src/lib/admin/preferences.ts` | Cookie-backed `theme` and `locale` preferences |
| Admin copy dictionary | `src/lib/admin/i18n.ts` | Thai and English strings for implemented Admin screens |
| Preference switcher | `src/app/admin/_components/admin-preference-switcher.tsx` | Server-action buttons for theme and language switching |
| Preference action | `src/app/admin/actions.ts` | Safe `/admin` return-path validation and cookie updates |
| Admin pages | `src/app/admin/page.tsx`, `src/app/admin/products/page.tsx` | Updated to use theme surfaces and bilingual copy |

## Visual Runtime Repair

- Tailwind CSS v4 is now loaded through `@import "tailwindcss"` with the existing legacy configuration registered through `@config`.
- The Admin shell and Products read-only screen use the shared panel, semantic color, focus, light/dark, and responsive layout treatment.
- This repair is presentation-only. It does not change any data read, action, authorization, or database behavior.

## Palette Direction

The Admin interface uses the approved reference palette as semantic UI tokens:

| Role | Palette direction |
|---|---|
| Navigation / dark base | Maastricht Blue `#022C4A` |
| Primary actions and active emphasis | Freedom Blue direction |
| Informational / secondary emphasis | Picton Blue `#50C3FF` |
| Warning / attention | Energising Yellow `#FFD143` |
| Error / destructive state | Desire `#E0464E` |

Text-safe token values are used where the display color would not meet contrast requirements on a light surface.

## Typography

- `Noto Sans Thai` is loaded once in the Root Layout through `next/font/google`.
- Next.js self-hosts the font assets at build time; browsers do not request the font directly from Google at runtime.

---

## Guardrails

- No database migration was added.
- No sensitive write action was exposed.
- No new role, permission, status, or business rule was created.
- Preferences are UI-only cookies and do not affect authorization.
- Existing server-side auth, tenant, permission, and RLS boundaries remain authoritative.

---

## Modes

| Mode | Behavior |
|---|---|
| Light | Default admin theme |
| Dark | Admin UI renders with dark surface, panel, line, text, and semantic tokens |
| Thai | Default UI language |
| English | Alternate UI language |

---

## Next Task

Proceed to `CORE-UI-003`:

```text
Implement Inventory read-only screen using the shared visual system.
```

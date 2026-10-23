# FieldOps: Mobile Asset Inspection and Dispatch

Read the portfolio-root `CLAUDE.md` first for global rules. This file is the brief for this project.

## What it is
A mobile tool for field technicians. View dispatched jobs by priority, run asset inspection checklists offline, capture geo-tagged timestamped photos, collect a signature and export a PDF summary.

## Stack
React Native with Expo (expo-sqlite, expo-camera, expo-location, expo-print) exported to web for Netlify, TypeScript strict. If time is tight, ship as a React + Vite PWA (Dexie, getUserMedia, Geolocation, jsPDF) and tell the user. Job queue sync via Netlify Functions + Neon Postgres. No Supabase, no Vercel, no Gemini/OpenAI.

## MVP (build first)
1. Job dispatch queue: list sorted by priority/status, job detail, status updates stored locally.
2. Inspection checklist per asset (pass/fail/NA, notes), photo capture stamped with time and GPS.
3. Signature pad and one-tap PDF summary export.

## Phase 2
Sync queue to Neon when online, Asset QR lookup, Offline map of job sites (Leaflet), Manager view of submitted reports.

## Data model (put in `types/`)
```ts
export interface Job { id: string; title: string; siteAddress: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; status: 'QUEUED' | 'IN_PROGRESS' | 'DONE'; assetId: string; dueAt: string }
export interface Asset { id: string; name: string; type: string; location: string }
export interface ChecklistItem { id: string; jobId: string; label: string; result: 'PASS' | 'FAIL' | 'NA' | null; notes: string }
export interface Photo { id: string; jobId: string; uri: string; takenAt: string; lat: number | null; lng: number | null }
export interface Report { id: string; jobId: string; signaturePng: string; completedAt: string; synced: boolean }
```

## Rules specific to this project
- Decide Expo vs PWA at step 1 and state the choice in the README.
- Offline first: every write goes to local storage and is marked `synced: false` until the sync function confirms.
- Location permission can be denied: allow capture without coordinates and flag it.
- Seed 8 jobs with assets and checklists so the queue looks alive.
- Seed realistic demo data so the app looks alive on first load without sign-up.

## Start here
1. Confirm Expo-web export works on Netlify (otherwise fall back to PWA and tell me).
2. Scaffold the app and commit.
3. Work through `PLAN.md` from step 3.

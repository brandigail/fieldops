# FieldOps

Field inspection app: geo-tagged photo reports, checklists with signatures, PDF export and a dispatch queue.

## Planned features
- Job dispatch queue: list sorted by priority/status, job detail, status updates stored locally.
- Inspection checklist per asset (pass/fail/NA, notes), photo capture stamped with time and GPS.
- Signature pad and one-tap PDF summary export.

### Phase 2
- Sync queue to Neon when online
- Asset QR lookup
- Offline map of job sites (Leaflet)
- Manager view of submitted reports

## Stack
React Native with Expo (expo-sqlite, expo-camera, expo-location, expo-print) exported to web for Netlify, TypeScript strict. If time is tight, ship as a React + Vite PWA (Dexie, getUserMedia, Geolocation, jsPDF) and tell the user. Job queue sync via Netlify Functions + Neon Postgres, Netlify

## Live demo
Live demo: TBD

## Run locally
Run locally: TBD

## Status
Not started

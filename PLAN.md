# FieldOps: Build Plan

- [x] 1. Decide Expo vs PWA fallback and document it
- [x] 2. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [x] 3. `types/` and local database schema
- [x] 4. Navigation shell and theme
- [x] 5. Seed jobs, assets, checklists
- [x] 6. Dispatch queue and job detail
- [x] 7. Checklist screen
- [x] 8. Camera capture with timestamp and geolocation
- [x] 9. Signature pad
- [x] 10. PDF summary export
- [ ] 11. Sync queue: Netlify Function + Neon (Phase 2 if time is short)
- [x] 12. Offline behaviour tests (airplane mode)
- [x] 13. Netlify web export config
- [x] 14. Layout checks at 375px and desktop
- [x] 15. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop
- [x] 16. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 17. Deploy to Netlify, set env vars, verify the public URL end to end
- [ ] 18. Push to GitHub and update the live URL in `README.md` and the root `LINKS.md`

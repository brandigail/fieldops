# FieldOps: Build Plan

- [ ] 1. Decide Expo vs PWA fallback and document it
- [ ] 2. Scaffold the project (stack in `CLAUDE.md`), strict `tsconfig`, lint, `netlify.toml`, `.env.example`; first working commit
- [ ] 3. `types/` and local database schema
- [ ] 4. Navigation shell and theme
- [ ] 5. Seed jobs, assets, checklists
- [ ] 6. Dispatch queue and job detail
- [ ] 7. Checklist screen
- [ ] 8. Camera capture with timestamp and geolocation
- [ ] 9. Signature pad
- [ ] 10. PDF summary export
- [ ] 11. Sync queue: Netlify Function + Neon (Phase 2 if time is short)
- [ ] 12. Offline behaviour tests (airplane mode)
- [ ] 13. Netlify web export config
- [ ] 14. Layout checks at 375px and desktop
- [ ] 15. Quality gate: `npm run build`, lint and `tsc --noEmit` all pass; no console errors; core flow tested at 375px and desktop
- [ ] 16. README: pitch, features, stack, architecture notes, screenshot placeholders, run steps, 3-bullet "what to demo to a recruiter", Phase 2 list
- [ ] 17. Deploy to Netlify, set env vars, verify the public URL end to end
- [ ] 18. Push to GitHub and update the live URL in `README.md` and the root `LINKS.md`

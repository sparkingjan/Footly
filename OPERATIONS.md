# Verification and release

This is a static Firebase application. The repository changes are local; they have not been deployed to the live project.

## Results from this review

- Build and local asset-link/JavaScript checks passed.
- Six local tests passed, including score/undo correctness, HTML escaping, event bounds, and same-name players on opposing teams.
- Three authorization suites passed against the Firestore emulator, covering cross-account access, event injection, immutable ownership, roster limits, score revisions, and community constraints.
- Headless Microsoft Edge passed the authenticated Auth/Firestore emulator workflow: signup, both team editors, substitution and reload, match creation, home/away scoring, cards, undo, persistence, community post/delete, and logout. Ten application pages were checked at a 390px viewport for overflow and browser/CSP errors.
- Final `npm audit` reported zero known vulnerabilities in the installed dependency tree.
- No production deployment, live-account testing, production latency measurement, or million-request load run was performed. Screenshots from the browser checks are in ignored `test-results/`.

## Reproduce the checks

Requires Node 22+ and Java 21+ for the Firebase emulators. The local `.tools/java21` runtime used during this review is ignored by Git. Install the Firebase CLI separately if unavailable.

```sh
npm ci
npm run build
npm test
npm run test:rules
node scripts/browser-check.mjs
```

The last command uses installed Microsoft Edge on Windows by default; set `BROWSER_PATH` for another Chromium installation. It exercises local browser behavior with Firebase mocked. For authenticated integration, set `EMULATOR_TEST=1` and run:

```sh
firebase emulators:exec --project demo-footly --only auth,firestore "node scripts/browser-check.mjs"
```

All test accounts and writes are confined to the demo emulators. No production load test has been run. `npm test` skips authorization tests when no emulator is running; `npm run test:rules` must pass separately.

## Release order

1. Back up the database and verify in a staging Firebase project.
2. Deploy `firestore.indexes.json` and wait for the organizer/createdAt index to become ready.
3. Publish the new rules and static app in the same maintenance window. The old scorekeeper writes legacy event subcollections, which the new rules intentionally reject.
4. Verify signup/signin, both team editors, new matches, score/undo, live views, community post/delete, and logout in staging before promoting.

`firebase.json` builds and serves only `public/`. Do not deploy the repository root or the old `dist/` directory. Old, unused editors/sync scripts are excluded from the generated site. The source SDK is pinned to Firebase 12.19.0. The test-only gRPC dependency is overridden to a patched compatible version; keep the lockfile and rerun audit on updates.

## Behavior changes

- Teams, matches, and private player stats can only be read by their owners. Community discussion remains shared among signed-in users. There is no public spectator sharing flow in this application.
- New scorekeepers write the score and a bounded event list in one revision-checked transaction. Simultaneous edits from a stale tab are rejected with a reload message. A failed save leaves the form available to retry; it does not falsely report cloud success.
- Legacy event subcollections are read for compatibility. Legacy matches above 500 events require migration and are rejected rather than silently truncated. New schema-version-2 records use the event list on the match; obsolete subcollection events no longer reappear after undo. Legacy goals without a recorded team cannot be safely undone automatically.
- Event history is limited to 500 events per match. The minute is entered explicitly. Possession, shots, and corners display “Not recorded” because those inputs do not exist; previously these values were fabricated from scores.
- Dashboard and statistics show the current match, not lifetime totals. Both team and player names are escaped when rendered as HTML.
- Team editors support touch dragging, keyboard movement, and bench substitutions by selecting a substitute then a starter. Starting lineups require the chosen team size, a starting captain, goalkeeper, midfielder, and attacker.

## One million requests in one minute

The agreed target is approximately **16,667 requests/second for 60 seconds**. This is not verified capacity. A million static asset requests differs materially from a million authenticated reads, writes, or match listeners. Establish the expected mix, regions, cache state, response size, and user arrival profile before sizing infrastructure.

The supplied `load/spike.js` tests static delivery only, defaults to 10 requests/second, and requires explicit opt-in above 100. One request per iteration means 16,667/s for 60s attempts 1,000,020 requests. Acceptance thresholds are proposed: under 0.1% failed requests, p95 under 500ms, p99 under 1.5s, and zero dropped iterations. These are test targets, not measured results.

```sh
# First run a small test against staging, then provision distributed generators.
k6 run -e BASE_URL=https://YOUR-STAGING-SITE -e RATE=10 load/spike.js
# Run only after verifying generator capacity, quotas, budget and the target:
k6 run -e BASE_URL=https://YOUR-STAGING-SITE -e RATE=16667 -e CONFIRM_LOAD_TEST=yes -e PREALLOCATED_VUS=10000 -e MAX_VUS=20000 load/spike.js
```

Static tests do not execute JavaScript and cannot certify Firebase capacity. Add authenticated scenario tests with separate test users for signup, team reads, match listeners, community queries, and organizer transactions. Test cold and warm caches, hotspot matches, contention, reconnect storms, retries, and recovery. Collect regional latency, failures, Firestore reads/writes, rejected requests, bandwidth, costs, and generator saturation. Stop on sustained failures or unacceptable costs.

For this target, infrastructure work remains: quota and billing review, pre-warmed Firestore traffic distribution, App Check rollout, abuse controls, monitoring/alerts, and a server-mediated rate-limited write path if internet-scale community writes are expected. Public match viewing would need a separate explicit public-data model with CDN-cached score snapshots or managed fan-out; do not expose organizer records to create that feature.

Firestore recommends starting new collections at 500 operations/second and increasing by 50% every five minutes. A cold, sudden 16,667/s database spike cannot be inferred safe from static hosting or these local fixes. See [Firestore scaling guidance](https://firebase.google.com/docs/firestore/best-practices) and [field access rules](https://firebase.google.com/docs/firestore/security/rules-fields).

Security tests and a clean dependency audit reduce known risks; they do not establish that no vulnerabilities remain. Production provider configuration, credentials, deployed rules, App Check, quotas, and paid capacity were not changed during this review.

## Registered-player match creation

New matches use schema 3. The Create Match page selects registered account IDs for both sides; neither side must match the other's size. Emails remain private. The directory contains display names only, keyed by account ID. Existing active accounts were migrated with the owner's explicit approval; registration and sign-in keep each account's entry current.

Roster membership is stored under users/{organizer}/matchRosters/{matchId}/players/{playerId}, with a server-checked registered-player name and side. Membership cannot be changed after the parent match is created. Rules require a valid member on each side and zero initial events/scores. Scoring uses roster IDs, and registered-player checks also apply to newly appended events. Existing schema-2 matches remain readable and editable. Old team-setup URLs redirect to Create Match.

Run npm test for build/unit checks and npm run test:browser for Auth/Firestore emulator journeys. The Windows test launcher uses the existing local Java runtime when available. The browser suite covers 3 vs 5 creation, scoring/undo, photo display, account cleanup, and mobile layout.

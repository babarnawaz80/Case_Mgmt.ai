# Deploying to production (read this first)

We have a **major demo on Tuesday**. We've had repeated production crashes from
uncoordinated, ungated deploys. These rules keep production stable while we ship
fast all week. **Everyone deploys to production — one place. No second environment
to think about until the demo.**

## The only command you run

```bash
npm run deploy
```

That's it. This runs, automatically, before anything goes live:
1. `npm run build` — builds the app
2. `npm run crash-gate` — serves the built app and crawls every route as a real
   user. **If any page crashes, the deploy is ABORTED** and it tells you which
   route. A broken build cannot reach production.

It takes ~5–10 minutes (the crawl is thorough). That wait is the price of "the
demo doesn't crash." Let it run.

## Hard rules

1. **Never set `SKIP_CRASH_GATE=1`.** It bypasses the safety crawl. This is how
   every production crash this week happened. No exceptions — not even "just this
   once for a quick fix."
2. **Before you deploy, sync git:**
   ```bash
   git add -A && git commit -m "…"      # commit your work — nothing half-saved
   git pull --rebase origin main         # get everyone else's changes
   git push origin main
   npm run deploy
   ```
   `npm run deploy` builds from your *local files*, so commit + pull first or you
   may ship someone's half-finished work or overwrite changes.
3. **One person deploys at a time.** Two simultaneous deploys race and the last
   one wins. Say "deploying" in your team channel; deploy; say "done."
4. **No destructive data ops before the demo** — no bulk deletes, re-imports, or
   migrations on the shared database.

## If production breaks anyway

- The crash gate makes this very unlikely, but if a *non-crash* bug slips in:
  re-run `npm run deploy` from the last good commit, or revert the bad commit and
  deploy.
- Tell the deploy owner immediately.

## The demo (Tuesday)

You do NOT present from the live URL. On **Monday night** we freeze the final good
build to a stable demo link that no later deploy can touch:

```bash
npm run build
npm run crash-gate            # verify it's crash-free
npx firebase hosting:channel:deploy demo --expires 30d
```

Demo link (stable, frozen): `https://casemanagement-ai--demo-yb0v6xic.web.app`

Present from that link in a **fresh/incognito browser window** (avoids stale
service-worker cache). Even if someone breaks `live` an hour before you present,
your demo link keeps working.

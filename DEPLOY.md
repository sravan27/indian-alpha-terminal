# Deploy India Alpha for the Pitch

Two deliverables. Lead with the URL, follow up with the .app.

---

## Option A · Vercel (the URL you send them)

The whole project is a static export — no server, no env vars, no database. Vercel free tier hosts this in 30 seconds.

### Path 1 · CLI (fastest, ~2 minutes)

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Sign in (one-time, opens browser)
vercel login

# From the project root
cd /Users/sravansridhar/indian-alpha
vercel deploy --prod
```

When it asks "Set up and deploy?" → **Y**. Project name → `india-alpha`. Framework auto-detects as Next.js. Done.

The CLI prints two URLs:
```
✅ Production: https://india-alpha.vercel.app
✅ Inspect: https://vercel.com/<your-username>/india-alpha
```

### Path 2 · Vercel web UI (no CLI install)

1. Push the project to a GitHub repo.
2. Visit **vercel.com/new** → "Import Git Repository" → pick `indian-alpha`.
3. Framework preset auto-fills as Next.js. Build command `npm run build`, output `out/`. Click **Deploy**.

### Path 3 · Drag-and-drop the `out/` folder (no git, no CLI)

1. Run `npm run build` (already done — `out/` is 3.5 MB).
2. Open **vercel.com/new/project**.
3. Choose "Other" or scroll to "Drop a zip here".
4. Zip the `out/` folder and drop it.

### After it deploys

1. **Custom domain** (optional, free if you own one): Vercel project → Settings → Domains → Add `<yourdomain>.com`.
2. **Disable analytics tracking** if you don't want Vercel sending pings: Settings → Analytics → Off.

---

## Option B · Native macOS app (the follow-up)

`India Alpha.dmg` (7.5 MB) and `India Alpha.app` (18 MB) are sitting at project root. Send the `.dmg` over WhatsApp / iMessage / Drive.

**They will hit the macOS "unidentified developer" warning** because the bundle is unsigned. Walk them through it once:

> "Right-click the app once → Open → confirm. After that it opens normally."

Or sign it for them — costs $99/year for an Apple Developer account, then `xcrun codesign --sign "Developer ID Application: <name>" "India Alpha.app"`. **Skip this for the pitch.** The warning isn't a deal-breaker for two people who ship products.

---

## Option C · Self-host on your own machine (zero-cost demo backup)

If Vercel times out the day of the pitch:

```bash
cd /Users/sravansridhar/indian-alpha
npx serve out/ -p 8080
```

Then expose with one of:

```bash
# ngrok (free tier)
ngrok http 8080
# → https://<random>.ngrok-free.app

# Cloudflare Tunnel (free, no signup)
cloudflared tunnel --url http://localhost:8080
# → https://<random>.trycloudflare.com
```

Same UX as Vercel. Useful if you want the link to point at *your* machine (so you control when it goes down).

---

## Recommended sequence

1. **Today** — `vercel deploy --prod`. Save the URL. Test on your phone.
2. **Tomorrow** — Disable Wi-Fi on your laptop, open `India Alpha.app`, walk through the demo offline. Make sure the .app launches clean cold.
3. **Pitch day** — Open the URL in a browser tab on the demo screen. If they ask "is this hosted somewhere?" you say yes. If they ask "can we run it offline?" you AirDrop them the .dmg and watch their face.

---

## Free-tier limits (you'll never hit them)

| Service | Free quota | We use |
|---|---|---|
| Vercel · Hobby | 100 GB bandwidth/month | ~3.5 MB per pageload × you'll have <1000 pageloads |
| Vercel · Hobby | 100 deployments/day | 1 |
| Vercel · Hobby | Custom domains | Yes (1 free) |

---

## What gets sent in each case

| | Web URL | .dmg | .app |
|---|---|---|---|
| Loads in any browser | ✓ | ✗ | ✗ |
| Works offline | ✗ | ✓ | ✓ |
| One-click install | ✓ | drag-drop | drag-drop |
| Reinforces the "100% offline" pitch | ✗ | ✓ | ✓ |
| Mac-only | ✗ | ✓ | ✓ |
| Triggers "unidentified developer" warning | ✗ | ✓ (right-click → Open) | ✓ |
| 18 / 7.5 / ~3.5 MB | ~3.5 MB | 7.5 MB | 18 MB |

**Send all three. Lead with the URL.**

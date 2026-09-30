# SKR Burner — website

Landing page for **SKR Burner** (`com.duckerforge.skrburn`), the non-custodial SKR token burner for the Solana Mobile Seeker.

Live site: **https://duckerforge.github.io/skr-burner-site/**

## What's here
- `index.html` — single-page site (hero, features, Flag Wars, Fire Chests, screens, how-it-works, download CTA)
- `styles.css` — dark theme, orange `#ff6600` accent, fire motif, fully responsive
- `i18n.js` — 7 languages
- `script.js` — scroll-reveal, embers, nav, referral, Seeker deep link
- `live.js` — live stats: reads the app's public RTDB nodes + Jupiter price + Solana RPC, no keys, no build
- `assets/` — logo, app icon, favicon, flagbearer, fire-chests art, nft-high, feature icons
- `screenshots/` — real Seeker phone captures (Home, Play hub, Daily Fire Chests)

## Screens & visuals (v2.6.5)
- **Hero + Screens** use real Seeker captures (not CSS mockups).
- **Feature icons** for Burn / Flag Wars / Fire Chests / Fire Points / NFT use crops of shipped app art.
- Flag Bearer + NFT phone frames use `assets/flagbearer.png` and `assets/nft-high.png`.

## Run locally
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (GitHub Pages)
Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`.
The `.nojekyll` file is included so all assets are served as-is.

---
Built for the Solana Seeker · © 2026 DuckerForge

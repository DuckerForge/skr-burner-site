# SKR Burner — website

Landing page for **SKR Burner** (`com.duckerforge.skrburn`), the non-custodial SKR token burner for the Solana Mobile Seeker.

Live site: **https://duckerforge.github.io/skr-burner-site/** (after Pages is enabled)

## What's here
- `index.html` — single-page site (hero, features, screens, how-it-works, download CTA)
- `styles.css` — dark theme, orange `#ff6600` accent, fire motif, fully responsive
- `script.js` — tiny scroll-reveal (no dependencies, no build step)
- `assets/` — logo, app icon, favicon
- `screenshots/` — drop real app captures here (see below)

## Use real screenshots (optional)
The Screens section currently uses CSS-built mockups so the site looks complete with zero captures.
To swap in real ones:

1. Save PNGs into `screenshots/` (e.g. `burn.png`, `mining.png`, `leaderboard.png`).
2. In `index.html`, replace a `<figure class="phone">…</figure>` block's inner markup with:
   ```html
   <img src="screenshots/burn.png" alt="Burn screen" class="shot" />
   ```
3. Done — commit and push, GitHub Pages updates automatically.

## Run locally
Just open `index.html` in a browser, or:
```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (GitHub Pages)
Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`.
The `.nojekyll` file is included so all assets are served as-is.

---
Built for the Solana Seeker · © 2026 DuckerForge

# Deploying to Vercel

## Good news
This app is a client-side Vite app and should deploy cleanly to Vercel as a static site.

## Quick deploy

### Option 1: Vercel web UI
1. Push this project to GitHub
2. Go to https://vercel.com/new
3. Import the GitHub repo
4. Vercel should detect **Vite** automatically
5. Deploy

### Option 2: Vercel CLI
```bash
npm i -g vercel
cd /Users/drew/.openclaw/workspace/projects/weather-dashboard
vercel
```
Then for production:
```bash
vercel --prod
```

## Build settings
These should auto-detect, but if needed:
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

## Notes
- Weather and marine data are fetched client-side from public APIs
- No server secrets are currently required
- Browser geolocation for the `Current` tab should still work on the deployed site as long as it is served over HTTPS, which Vercel provides by default

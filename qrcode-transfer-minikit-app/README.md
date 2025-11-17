## C-Draw Lottery Mini App

This project demonstrates a Coinbase/Base–inspired mini app flow:

- **Desktop QR onboarding (`/`)** – A branded hero section explains the experience and renders a QR code that deep-links to the mini app route.
- **Mini app play surface (`/play`)** – Users draw the letter **C** with their finger. The stroke is validated, hashed into a seed, mixed with `crypto.getRandomValues`, and run through a 50% lottery. Win/lose states show branded animations and copy.
- **Drawing canvas** – Touch-friendly canvas with simple “C” heuristics, visual feedback, and normalized seed generation you can later send to a backend or smart contract.

> The current build is a UX/lottery prototype only—no onchain token mint happens yet.

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
# Visit http://localhost:3000 for the QR landing page
# Visit http://localhost:3000/play directly to test the mini app view
```

## How the flow works

1. **Desktop** – Open `/` during demos. The QR code is generated client-side from `window.location.origin` so it automatically points to your environment. There’s also a CTA button to open `/play` in a new tab for quick testing.
2. **Mini app (`/play`)**
   - The page notifies MiniKit when it’s ready via `useMiniKit`.
   - `DrawingCanvas` captures pointer strokes, validates a “C” based on bounding-box heuristics, and hashes the normalized points (plus a session UUID + timestamps) into a 32-byte seed via `crypto.subtle.digest`.
   - `decideWin` concatenates that seed with fresh randomness, hashes again, then checks the lowest bit for a 50% outcome.
   - Processing + result views emulate Coinbase/Base styling, including subtle pulse indicators and confetti-like win states.

You can reset and replay immediately to stress-test the gesture recognizer.

## Deploying & manifest

Follow the Base Mini App quickstart to host this on Vercel, configure `minikit.config.ts`, and generate your Farcaster account association: https://docs.base.org/mini-apps/quickstart/create-new-miniapp

Once deployed, update the manifest screenshots/icon URLs and push to `main` so Vercel serves the latest QR + mini-app surface.

## Resources

- [OnchainKit docs](https://docs.base.org/onchainkit)
- [Base Mini App quickstart](https://docs.base.org/mini-apps/quickstart/create-new-miniapp)
- [Next.js docs](https://nextjs.org/docs)

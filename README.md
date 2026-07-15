# Signal Run: Eos-7

A compact third-person recovery game built with Three.js, TypeScript, and Vite. Recover three physical signal cells across Eos-7, return each to the rocket, survive turret zones and the final dust countdown, then launch. A normal first play is designed for roughly 3–5 minutes.

## Run

```bash
npm install
npm run dev
```

Controls: WASD or arrow keys to move, Shift to boost, E to pick up/install/launch, Esc to pause, and R to restart after any state.

## Verification

```bash
npm test
npm run build
npx playwright install chromium
npm run smoke
```

The browser smoke loads every gameplay model, drives pickup/install/launch using real keyboard events, verifies restart, checks console/network failures and viewport overflow, and captures `evidence/completed.png`.

## Assets and license

The visible player, rover, cells, terrain, roads, station, landmarks, hazards, and modular rocket use **Kenney Space Kit 2.0** GLB files loaded directly with `GLTFLoader`.

- Official pack: https://kenney.nl/assets/space-kit
- License: Creative Commons Zero (CC0)
- Original archive SHA-256: `d5d7cdf2635ed5a43a9187deaf409b6f47484e402321128341d3c3698e9ef4d9`
- Preserved license: `public/assets/kenney-space-kit/License.txt`

## Known limits

- The astronaut is static, so movement feedback uses whole-model lean instead of skeletal animation.
- Sound cues are synthesized with WebAudio because the visual pack does not include audio.
- The deterministic smoke uses a test hook to position the player at interaction points, but every state change still goes through keyboard `E`/`R`. Independent verification should also traverse routes with held movement keys.

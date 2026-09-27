# clipStyle — Muse clip-art motion graphics

Flat, illustrated motion-graphics films for Muse, drawn entirely in code (HTML canvas) and rendered frame by frame. No editing software or stock assets.

## Films (`videos/`)

| File | Length | What it is |
|---|---|---|
| `muse-motion.mp4` | 20 s · 1080p60 | Hook → problem faces → "Meet Muse." → phone scan/measure/match → face-shape morphs → SCAN · MEASURE · MATCH → end card |
| `muse-sam.mp4` | 60 s · 1080p30 | "Sam's Search" story, original orange/teal look |
| `muse-sam-brand.mp4` | 60 s · 1080p30 | "Sam's Search" in the Muse brand (cobalt, Hanken Grotesk, diamond full stop) with a Qoves-inspired analysis layer |

## Source

| Film | Page | Code | Cue sheet | Soundtrack script |
|---|---|---|---|---|
| Motion (20 s) | `index6.html` | `main6.js` | `cues.json` | `audio2.py` → `soundtrack2.wav` |
| Sam (original) | `index7.html` | `main7.js` | `cues7.json` | `audio3.py` (+ `alib3.py`) → `soundtrack3.wav` |
| Sam (brand) | `index8.html` | `main8.js` | `cues8.json` | `audio4.py` (+ `alib3.py`) → `soundtrack4.wav` |

Each `main*.js` exposes `window.renderAt(t)`, which draws the frame at time `t`. Open the page in a browser to preview it looping in real time. Every animation event is also logged to a cue sheet (`window.INFO.cues`), and the Python scripts synthesise the soundtrack from those timestamps, so the sound stays in sync with the picture.

Fonts are self-hosted in `fonts4/` (Archivo, Bodoni Moda, IBM Plex Mono) and `fonts9/` (Hanken Grotesk, Instrument Serif, IBM Plex Mono), all from Google Fonts under the SIL Open Font License.

## Rendering

```bash
npm install
npm run render:sam-brand          # writes out-sam-brand.mp4 (frames only, no audio)
pip install numpy scipy
python3 audio4.py                 # writes soundtrack4.wav from cues8.json
npx ffmpeg -i out-sam-brand.mp4 -i soundtrack4.wav -c:v libx264 -c:a aac -shortest final.mp4
```

`render.js` serves this folder locally, drives headless Chromium through the timeline, and pipes frames to ffmpeg. The films use four-sample motion blur (`window.MB = 4`). Environment variables: `PAGE`, `FPS`, `OUT`, `CRF`, and `START` (the first frame to render, for resuming a render).

## Notes

- Measurements, fit scores and frame names in the films are illustrative placeholders.
- The brand version uses the licensable stand-in fonts from the Muse Frame Finder site. Swap in PP Neue Montreal, Denton and F37 Zagma once they're licensed.

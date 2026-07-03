# Rishi Vagadiya — 3D Game Developer Portfolio

An interactive 3D portfolio. The background is a **scroll-driven driving world**:
a cyclist rides down an endless dusk road, and **scrolling the page makes them
pedal** — wheels, crank, rider legs, scenery and the ride sound all speed up with
your scroll. The hero keeps the "Ori Lazar"-style liquid-metal animated name.

## Features
- **Scroll = ride.** Scroll (or mouse-wheel / touch-drag) to make the cyclist
  drive; stop scrolling and they coast to a halt. (`js/world.js`, Three.js)
- **3D driving world** — endless road with dashed lanes, dusk sky + fog, grass
  verges, recycled low-poly trees, street lamps and a city skyline, real-time
  shadows and PBR reflections.
- **Procedural bicycle + rider** with spinning spoked wheels, rotating crank and
  2-bone IK legs that pedal in sync with speed.
- **Liquid-metal animated name** — move the mouse over "Rishi Vagadiya"; the pixel
  letters melt and re-form along the cursor trail (`js/liquidText.js`).
- **Always-on sound** — a looping ride ambience whose intensity follows the bike
  speed, plus button/hover/click blips. All synthesized with WebAudio, no files
  (`js/sound.js`). There is **no on/off toggle**; audio unlocks automatically on
  your first interaction (browsers block audio before any user gesture — this is a
  platform rule that cannot be bypassed).
- **Unity.com-style dark UI** — nav, hero, Projects (with detail modals), Career,
  Skills, Research. Panels are translucent so the world stays visible behind them.
- **Gaming favicon** — inline SVG game controller.

## Run it
The portfolio is 100% client-side and runs completely in the browser. It calls the Groq AI API directly from the client.

Because it uses ES modules, it must be served over a local HTTP server (it cannot be run by opening `index.html` directly via `file://`).

You can use any simple static HTTP server, for example:

```bash
# Using Python
python -m http.server 8137

# Or using Node (npx)
npx serve -l 8137
```

Once running, open [http://127.0.0.1:8137/](http://127.0.0.1:8137/) in your browser.

Requires internet at runtime (Three.js, fonts, and the AI assistant load from CDNs/APIs).

## Use a real Sketchfab model (optional drop-in)
The built-in bike is procedural. To swap in a downloaded model:

1. On Sketchfab, open a **Downloadable** bike/rider model → **Download** →
   choose **glTF (.glb)**. (Sketchfab requires a logged-in account; automated
   downloads aren't allowed, which is why the default is procedural.)
2. Put the file in the project, e.g. `game-dev-portfolio/assets/bicycle.glb`.
3. In `js/world.js`, set:
   ```js
   const MODEL_URL = "assets/bicycle.glb";   // was ""
   const MODEL_SCALE = 1;   // adjust to fit
   const MODEL_Y = 0;       // raise/lower onto the road
   ```
   If the model loads it replaces the procedural bike (and any built-in
   animation is played, sped up with your scroll); if it fails to load, the
   procedural bike is kept automatically.

## Customize
- Name: `initLiquidName(..., "Rishi Vagadiya")` in `js/app.js`.
- Content: `PROJECTS`, `CAREER`, `SKILLS`, `RESEARCH` arrays in `js/app.js`.
- Colours: CSS variables at the top of `css/style.css`.
- Vehicle look/speed: material colours and `MAXV` in `js/world.js`.

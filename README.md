<p align="center">
  <a href="https://aaronc1992.github.io/capy-and-co/">
    <img src="docs/play-now.svg" alt="Play now!" width="360" />
  </a>
</p>

<p align="center">
  <a href="https://aaronc1992.github.io/capy-and-co/"><strong>https://aaronc1992.github.io/capy-and-co/</strong></a><br />
  Free in any modern browser on desktop, phone, or tablet. Nothing to install.
</p>

# Capy & Co.

A happy little capybara hair studio for desktop, phone, and tablet browsers.

Choose Mochi, Biscuit, or Cocoa, then brush, snip, regrow, curl, soap, wash, blow-dry, and color their hair. Play with 65 fine, independently editable strands, add an accessory, and save a makeover picture. There are no scores, timers, advertisements, accounts, purchases, or analytics.

This is an original 2D game inspired by the open-ended animal-salon genre. It does not use Pony Style Box artwork, code, characters, or branding. The earlier fantasy RPG/VR direction has been replaced.

## Run locally

Use Node.js 22.12+ (or a current supported LTS) and npm.

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite, normally **http://localhost:5173**.

If an older npm version fails with an `edgesOut` dependency resolver error, use `npx --yes npm@11 ci`. Development here used Node 22.14 and the npm 11 resolver.

### Play on a phone or tablet

1. Keep the development server running on your PC.
2. Connect the device to the same trusted Wi-Fi network.
3. Open the **Network** URL printed by Vite in Chrome, Edge, or Safari, e.g. `http://192.168.1.100:5173`. Use your PC's actual address, not this example.
4. If necessary, allow Node through the PC firewall on **private networks only**. Guest-network isolation can prevent the connection.

`localhost` on a tablet refers to the tablet, not your PC. The development server is not a public hosting service; do not expose it to the internet.

### Production

```powershell
npm run build
npm run preview
```

The build produces a static `dist` directory with relative asset URLs (`base: './'` in `vite.config.ts`), so it can be hosted at a site root or under a subpath. No backend is required.

### Hosting on GitHub Pages

The game is published at **https://aaronc1992.github.io/capy-and-co/**. `.github/workflows/deploy.yml` runs on every push to `main`: it installs with `npm ci`, runs `npm test` and `npm run build`, then publishes `dist` with the official GitHub Pages actions. A failing test stops the deployment, so the live game only updates from a passing build. You can also start it manually from the repository's **Actions** tab (**Run workflow**).

Pages must be set to **Settings → Pages → Source: GitHub Actions**. Saved pictures and hairstyles live in each visitor's own browser storage, so nothing is shared between people or devices.

## How to play

- Choose a capybara. Each friend keeps a separate hairstyle.
- Select a tool, then drag the hair using a finger, mouse, or pen.
- **Brush:** straighten curls and bend the hair right where your finger touches. Only the strands under the brush move; nearby strands follow a little and the rest stay put. Each strand bends in a smooth arc along its length with its root fixed, trails the finger, and swings softly into place, so you can sweep, part, and flick sections of hair. Pushing hair toward the scalp folds it over sideways instead of squashing it. A strand follows the finger until it has been carried a fair distance, then slips free so hair is never plowed into a pile. The bent shape stays when you let go, including after reloading or saving a picture. Further strokes start from that saved shape. The hair grows from a hairline that follows the curve of the head, over a scalp cover in the same color, so brushing hair aside never leaves a bald patch.
- **Snip:** keep your finger down and draw the cut line across specific locks. Pass lower to shorten the same area again without lifting. Holding still does not automatically shave the hair away.
- **Grow:** touch and hold a patch of hair to steadily lengthen it. Drag to move growth to another patch; locks left behind stop growing. Release to stop. Hair remains capped at the maximum length.
- **Curl:** make individual locks wavy.
- **Soap:** rub across the hair to add thick lather and bubbles. Foam stays on those locks through other styling, tool changes, and saved pictures; it does not fade away.
- **Wash:** rinse foam from the touched strands, restore the friend's original hair color, and remove curls. Keeps the brushed arrangement and haircut, and leaves hair visibly damp. Use "Do all the hair" to rinse everything.
- **Blow-dry:** hold the dryer near the hair and swipe the way you want the air to go. A visible stream of air blows every strand inside it: the hair streams out in that direction from the root, flaps along its length while the air is on it, and dries as it goes. Hair behind or beside the stream is left alone, and hair the air hits head-on folds outward. Swing the dryer around to blow different patches in different directions. The blown shape stays when you let go, including after reloading. It does not remove soap. "Do all the hair" dries and fluffs the whole head.
- **Color:** choose one of eight colors, then paint the locks.
- **Dress up:** choose a bow, daisy, crown, cherries, or star.
- **Do all the hair:** apply the selected hair tool to every lock.
- **Undo:** revert an entire stroke or an accessory/reset change. Reset is also undoable.
- **Picture perfect!:** snapshot the current look in My gallery.
- **Download:** export an 800 x 1000 PNG. Use a full browser; embedded IDE previews can block downloads.
- **Sound:** optional gentle synthesized styling sounds, initially off.

Keyboard support: Tab through controls, Enter/Space to activate. On the character, Enter/Space applies the current tool to all hair. Arrow keys/Home/End navigate the tool tabs. Escape closes a dialog.

On narrow screens, scroll between the studio and the tools. Scroll outside the character to move the page; dragging the character is reserved for styling. How to play is also available in the mobile footer.

## Saving and privacy

The current looks, selected friend, sound preference, and the 12 newest snapshots are saved in this browser's local storage. Undo history is session-only and resets when changing friends or reloading. Data does not leave the device.

Older 13-lock saves and gallery pictures are automatically expanded into 65 finer strands, retaining their colors, lengths, styling, accessories, and soap. Dryness and blown shapes are saved too.

- Clearing browser data removes these saves.
- Private browsing may not retain them.
- A different browser, device, URL origin, or port has its own gallery.
- Storage errors are shown visibly; gameplay remains available in memory.
- Download favorite pictures to keep them independently of browser storage.
- There are no remote fonts, image downloads, or game API calls.

## Project map

```text
src/
  main.tsx                 Bootstrap and render error boundary
  App.tsx                  Salon orchestration and persistence lifecycle
  styles.css               Responsive interface and reduced-motion support
  components/
    Capybara.tsx            Original scalable character and accessories
    SalonRoom.tsx          Original illustrated salon background
    Studio.tsx             Mouse/touch/pen strokes and keyboard interaction
    useHairMotion.ts       Frame-scheduled animation and reduced-motion handling
    AirStream.tsx          The visible stream of air that follows the dryer
    Toolbox.tsx            Tool, color, and accessory menus
    Gallery.tsx            Local snapshots, deletion, and picture downloads
    Modal.tsx              Focus-contained native dialogs
    Icon.tsx               Original local SVG icons
  game/
    model.ts               Pure gameplay state, actions, and bounded undo
    hair.ts                Shared drawing geometry and stroke hit testing
    hairLayout.ts          Strand/point constants and saved-shape helpers
    hairline.ts            Head-curve roots and the color-matched scalp cover
    hairBrush.ts           Local brush contact and per-point strand bending
    hairMotion.ts          Per-point drag targets and root-anchored spring motion
    hairEditing.ts         Position-based cutting and timed, localized growth
    hairBlower.ts          Aimed dryer: swipe-direction wind, flapping, drying, and the swept pose
    hairWind.ts            Pure wind geometry: stream cone, strength, and per-segment hair bending
    storage.ts             Versioned save validation and local persistence
    exportPhoto.ts         Self-contained SVG to PNG export
    audio.ts               Lazy Web Audio lifecycle
docs/
  ARCHITECTURE.md
  DEVELOPMENT_STATUS.md
```

## Tests

```powershell
npm run typecheck
npm test
npm run build
```

126 automated tests in 9 files cover initialization, rendering, fine-strand editing, the head-curve hairline and scalp cover, the local per-point brush (locality, fixed roots, no stretching, sideways folding, tip lag and swing, bounded slip, frame-rate independence, saved poses), the directional blow-dryer (swipe aiming, the wind cone and its edges, per-segment bending that keeps strand lengths, head-on folding, flapping, linear drying, frame-rate independence, stall handling, saved poses), efficient strand painting, soap/rinsing, wetness, position-based cutting (including brushed and bent hair), hold-to-grow, gesture undo, character isolation, deformed-hair picking, older-save migration, shape validation, storage failure handling, and gallery snapshots.

Browser verification and the real-device checklist are recorded in [Development status](docs/DEVELOPMENT_STATUS.md). See [Architecture](docs/ARCHITECTURE.md) for the interaction and persistence design.

## Current boundaries

This is a playable 2D prototype, not a native app. Hair is a set of bendable strands driven by a simple spring model, not a full physical simulation, so strands do not collide or tangle with each other. Accessories have fixed placements. There is no offline installation/service worker, cloud gallery, or multiplayer. Actual iPad/Android hardware testing is still needed before calling it device-certified.

Suggested next milestone: try it with the intended player on a real tablet, adjust tool sizing/feedback from that playtest, and then deploy the static build to a family-accessible HTTPS URL.

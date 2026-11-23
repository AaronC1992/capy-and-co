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

Choose Mochi, Biscuit, or Cocoa, then brush, comb, snip, regrow, curl, soap, spray, blow-dry, and color their hair. Play with 65 fine, independently editable strands, dress them in one of 28 outfits with 12 hats, 9 pairs of glasses, 9 headbands, and 12 kinds of clips, poke and tickle them to see how they react, and pose them in the photo booth for a makeover picture. There are no scores, timers, advertisements, accounts, purchases, or analytics.

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
- **Comb:** a gel comb with much more control than the brush. Touch the hair and drag: the strands under the comb are held, and everything from where you touched out to the tip is laid along the exact line your finger draws, side by side with its neighbors. The hair between the scalp and where you touched stays put. The hair stays held until you lift your finger, and the style stays after that. A tap or a wobble moves nothing, and combing smooths curls out.
- **Snip:** keep your finger down and draw the cut line across specific locks. Pass lower to shorten the same area again without lifting. Holding still does not automatically shave the hair away. Cut right down to the scalp and the lock is gone, leaving a bare head (its color is remembered); Grow brings it back.
- **Grow:** touch and hold a patch of hair to steadily lengthen it; under two seconds is enough to take a lock from short to full length, or from a bare scalp all the way back. Keep holding and it keeps growing: the hair tips over at full height, falls past the shoulders, and about four seconds later reaches the floor and lies along it. Drag to move growth to another patch; locks left behind stop growing. Release to stop. Hair stops growing once it reaches the floor, and Snip cuts it back wherever the scissors cross it.
- **Curl:** hold your finger on a lock and it gets curlier the longer you hold: a gentle wave first, then loops, then tight ringlets after about two seconds. Drag to curl more locks; locks you leave behind stop curling. Brush, comb, and wash straighten curls again.
- **Soap:** rub across the hair to add thick lather and bubbles. Foam stays on those locks through other styling, tool changes, and saved pictures; it does not fade away.
- **Wash:** a water sprayer. A spray bottle follows your finger and mists the hair around it. You watch the water soak in (a darker sheen and droplets) and the heavy wet hair slides down and hangs straight, lying over the head instead of sinking into the face. Soap, dye, and curls rinse out of whatever the mist reaches, and the friend's original hair color returns. Wet hair stays hanging until you brush, comb, or blow-dry it, and the haircut is kept. Use "Do all the hair" to soak everything.
- **Blow-dry:** hold the dryer near the hair and swipe the way you want the air to go. A visible stream of air blows every strand inside it: the hair streams out in that direction from the root, flaps along its length while the air is on it, and dries as it goes. Hair behind or beside the stream is left alone, and hair the air hits head-on folds outward. Swing the dryer around to blow different patches in different directions. The blown shape stays when you let go, including after reloading. It does not remove soap. "Do all the hair" dries and fluffs the whole head.
- **Color:** choose one of eight colors, rainbow, or glitter, then paint the locks. Plain colors can go **All over**, on **Dipped tips** with a crisp line, or in a **Fade** that blends from the roots to the tips. Rainbow runs through every color from root to tip, and glitter dusts the lock with sparkles and makes stars twinkle along it over whatever color is already there. Wash rinses all of it out.
- **Dress up:** pick one of 28 outfits (Cozy cape, Super capy, Snuggly sweater, Overalls, Princess gown, Twirly tutu, Comfy hoodie, Rainy day coat, Party dress, Star tee, Flower lei, Wizard robe, Sailor top, Chef apron, Sleepy PJs, Rainbow poncho, Fancy suit, Fairy wings, Sunny sundress, Mermaid shimmer, Blossom kimono, Strawberry dress, Unicorn dress, Snow queen cape, Butterfly dress, Cupcake dress, Sweetheart dress, or Daisy dress), then top it off with a hat (Royal crown, Party hat, Cozy beanie, Sun hat, Top hat, Cowboy hat, Chef hat, Witch hat, Pirate hat, Ball cap, Sparkly tiara, or Berry beanie), glasses (Round specs, Heart eyes, Star power, Cool shades, Cat-eye glam, Swim goggles, Fancy monocle, Silly disguise, or Rainbow specs), and a headband (Pink ribbon, Bunny ears, Kitty ears, Flower crown, Unicorn horn, Bee antennae, Teddy ears, Reindeer antlers, or Angel halo, which floats just above the hair or the hat). Tap a worn item in the picker again to take it off. Drag a worn hat, glasses, or headband (the halo too) to move it anywhere on the capybara; it stays where you put it, even when you try on a different hat, until you take it off. Drag it to the trash can in the corner of the studio, or anywhere off the capybara, to take it off. Then add **Fake eyelashes** (Natural, Long, Curly, Doll, Sparkle, or Rainbow lashes) and **Makeup**: eyeshadow (Pink, Lilac, Sky, or Peach shadow, Gold shimmer, or Rainbow shadow), blush (Rosy, Peach, or Berry blush, Heart cheeks, Star cheeks, or Freckles), and lipstick (Pink, Cherry, Coral, or Berry lips, Lip gloss, or Glitter lips). Makeup follows every face the capybara makes, and the lashes blink along with the eyes. Pick a clip (bow, daisy, star, cherries, heart, butterfly, moon, rainbow, strawberry, seashell, snowflake, or ladybug) to put one on, then tap anywhere on the capybara to add more, up to 12. A clip put on the hair holds that lock and moves with it; drag a clip to move it, drop it in the trash can (or anywhere off the capybara) to take it off, or use **Take it all off** to remove every clip, hat, glasses and headband at once. Each friend keeps their own outfit, accessories, and makeup, and they show up in saved pictures.
- **Do all the hair:** apply the selected hair tool to every lock.
- **Undo:** revert an entire stroke, an outfit, accessory, or makeup change, a worn item being moved, a clip being added, moved, or taken off, or a reset. Reset is also undoable and puts the friend back in the cozy cape with nothing else on.
- **Picture perfect!:** opens the **Say capy!** photo booth. Choose a background (Studio, Beach day, Starry night, Garden, Rainbow, or Party), a frame (No frame, Snapshot, Hearts, Flowers, or Fancy gold), and a face (Smile, Happy, Giggle, or Wow!). Pick a sticker to add it, tap the picture to add more (up to 10), drag one to move it, or drag it off the picture to peel it off. **Snap!** flashes and saves the picture to My gallery. The booth keeps your choices for the next picture until you reload.
- **Download:** export an 800 x 1000 PNG of the picture with its caption. Use a full browser; embedded IDE previews can block downloads.
- **Reactions:** the capybara reacts to what you do: a happy smile for brushing, combing, growing, curling, coloring, and clipping on clips, a surprised look at a snip, giggles from soap, a squint under the sprayer and a shake to dry off after, and a breezy look in the blow-dryer. It also reacts to being touched anywhere the hair isn't: tap an eye and it flinches and squeezes that eye shut ("Hey!"), tap the nose and it sneezes ("Achoo!"), tap the belly and it jiggles ("Boing!"), and rub back and forth on an armpit or the belly to tickle it into a squirmy giggle ("Hee hee!"). Touching the hair always styles it instead. In Dress up, tapping an eye or the nose gets a reaction rather than a clip.
- **Sound:** optional, initially off. Every tool has its own gentle synthesized sound (growing climbs a little scale), plus a pop for dressing up and stickers, a chime for choosing a friend or a booth background, frame, or face, and a camera shutter for **Snap!**, and a squeak, an achoo, a boing, and giggles for the reactions. Held tools are spaced out so they hum along instead of buzzing.

Keyboard support: Tab through controls, Enter/Space to activate. On the character, Enter/Space applies the current tool to all hair. Arrow keys/Home/End navigate the tool tabs. Escape closes a dialog.

On narrow screens, scroll between the studio and the tools. Scroll outside the character to move the page; dragging the character is reserved for styling. How to play is the **?** button at the top of every screen.

## Saving and privacy

The current looks (hair, outfit, hat, glasses, headband and wherever they were moved to, lashes, makeup, and clips), selected friend, sound preference, and the 12 newest pictures (with their photo booth backgrounds, frames, faces, and stickers) are saved in this browser's local storage. Undo history is session-only and resets when changing friends or reloading. Data does not leave the device.

Older 13-lock saves and gallery pictures are automatically expanded into 65 finer strands, retaining their colors, lengths, styling, accessories, and soap. Dryness and blown shapes are saved too. Saves from before outfits existed open in the cozy cape, and saves from when curls were simply on or off open with moderately curly hair that you can curl tighter. Saves from when each friend wore a single accessory keep it: the crown becomes a hat, and the bow, flower, cherries, or star becomes a clip in the same spot. Pictures taken before the photo booth show the plain studio background. Saves from before makeup open with a bare face.

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
    Capybara.tsx           Original scalable character, its faces and reactions, outfits, and accessories
    Accessories.tsx        Hats, glasses, headbands, and clips, and their picker icons
    Makeup.tsx             Fake eyelashes, eyeshadow, blush, and lipstick for every face, and their picker icons
    Outfit.tsx             Original flat-pastel art for the 28 outfits, drawn around the paws
    SalonRoom.tsx          Original illustrated salon background
    Studio.tsx             Mouse/touch/pen strokes and keyboard interaction
    useHairMotion.ts       Frame-scheduled animation and reduced-motion handling
    AirStream.tsx          The visible stream of air that follows the dryer
    SprayStream.tsx        The spray bottle and mist that follow the sprayer
    Toolbox.tsx            Tool, color, dye style, and dress-up menus
    DressUpPanel.tsx       The clip, hat, glasses, headband, lash, makeup, and outfit pickers
    PhotoBooth.tsx         The Say capy! booth: scene pickers, sticker dragging, and Snap!
    PhotoScene.tsx         Booth backgrounds, frames, and stickers drawn around the capybara
    Gallery.tsx            Local pictures, deletion, and picture downloads
    Modal.tsx              Focus-contained native dialogs
    Icon.tsx               Original local SVG icons
  game/
    model.ts               Pure gameplay state, actions, and bounded undo
    hair.ts                Shared drawing geometry, curls, hair lying on the floor, and stroke hit testing
    hairLayout.ts          Strand/point constants, bald length, how far each length reaches, and saved-shape helpers
    hairline.ts            Head-curve roots and the color-matched scalp cover
    headShape.ts           The drawn head outline, used to keep wet hair out of the face
    hairBrush.ts           Local brush contact and per-point strand bending
    hairComb.ts            Gel comb: holds the touched hair and lays it along the traced line
    hairCurl.ts            Hold-to-curl timing
    hairMotion.ts          Per-point drag targets and root-anchored spring motion
    hairEditing.ts         Position-based cutting (down to bald) and timed, localized growth
    hairBlower.ts          Aimed dryer: swipe-direction wind, flapping, drying, and the swept pose
    hairWind.ts            Pure wind geometry: stream cone, strength, and per-segment hair bending
    hairSprayer.ts         Water sprayer: where the mist lands, how wet each point gets, rinsing
    hairDroop.ts           How soaked hair hangs: a segment-by-segment fall that lies over the head
    color.ts               Hex color blending for the wet tint
    dye.ts                 Dipped tips, fades, and rainbow colors along a lock
    accessories.ts         Where clips go, clips riding on the hair, and where worn things sit and can be moved to
    reactions.ts           Ticklish spots and telling a poke or a tickle apart from styling
    photoBooth.ts          Booth scenes: backgrounds, frames, faces, and sticker placement
    storage.ts             Versioned save validation and local persistence
    exportPhoto.ts         Self-contained SVG to PNG export of a booth picture and its caption
    audio.ts               Lazy Web Audio lifecycle and each tool's synthesized sound
docs/
  ARCHITECTURE.md
  DEVELOPMENT_STATUS.md
  play-now.svg             The Play now! button at the top of this page
.github/workflows/
  deploy.yml               Runs the tests and build, then publishes to GitHub Pages
```

## Tests

```powershell
npm run typecheck
npm test
npm run build
```

304 automated tests in 19 files cover initialization, rendering, fine-strand editing, the head-curve hairline and scalp cover, the local per-point brush (locality, fixed roots, no stretching, sideways folding, tip lag and swing, bounded slip, frame-rate independence, saved poses), the gel comb (holding, laying hair along the traced line, the untouched hair before the touch, curls and bald scalp), the directional blow-dryer (swipe aiming, the wind cone and its edges, per-segment bending that keeps strand lengths, head-on folding, flapping, linear drying, frame-rate independence, stall handling, saved poses), the water sprayer and hanging wet hair (where the mist lands, soaking, rinsing, shaved scalp, hanging with fixed roots and unchanged lengths, staying out of the face, throttled pose updates that still settle exactly), hold-to-curl timing (including frame-rate independence), efficient strand painting, soap/rinsing, wetness, position-based cutting (including brushed and bent hair and cutting to bald), hold-to-grow and regrowing a bare scalp, floor-length hair (falling to the floor without leaving the picture, growing only at the tip, smooth drawing, cutting it where the scissors cross, and soaked hair lying along the floor), the 28 outfits (art, selection, per-friend looks, undo/reset), dye modes, rainbow, and glitter (painting, placing the sparkles along the lock, rinsing, shaving, and the scalp color), hats, glasses, headbands, and clips (placing anywhere, riding on the hair, dragging off, the 12-clip limit, the hat on short and long hair, moving a worn item and where it may stay), fake eyelashes and makeup (every style on every face, blinking along, saving, and undo), per-tool sounds and their spacing, the capybara's reactions (including pokes and tickles: the touch spots, a poke versus a press or a slide, rubbing versus dragging through, and each reaction's face), the floating halo, the photo booth (scenes, sticker placing, dragging, and peeling, drawing order, picture validation), gesture undo, character isolation, deformed-hair picking, older-save migration (including single accessories becoming hats and clips), shape, outfit, accessory, and scene validation, storage failure handling, and gallery snapshots.

Browser verification and the real-device checklist are recorded in [Development status](docs/DEVELOPMENT_STATUS.md). See [Architecture](docs/ARCHITECTURE.md) for the interaction and persistence design.

## Current boundaries

This is a playable 2D prototype, not a native app. Hair is a set of bendable strands driven by a simple spring model, not a full physical simulation, so strands do not collide or tangle with each other. Outfits, hats, glasses, and headbands have fixed placements; only clips and stickers can be put anywhere. A head where every strand is curly and the blow-dryer is sweeping across it is the heaviest thing the game draws; it animates noticeably slower than straight hair in a desktop browser, and brushing, combing, or spraying the curls out brings the speed back. There is no offline installation/service worker, cloud gallery, or multiplayer. Actual iPad/Android hardware testing is still needed before calling it device-certified.

Suggested next milestone: try the live game with the intended player on a real tablet, then adjust tool sizing and feedback from that playtest.

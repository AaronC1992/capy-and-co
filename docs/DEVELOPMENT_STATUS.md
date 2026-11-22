# Development status

## Scope

The fantasy RPG/VR project was cancelled before implementation. The current deliverable is **Capy & Co.**, an original, playable browser-based capybara hair salon.

## Implemented

- Three original capybaras and an illustrated salon.
- Mouse, pen, and touch interaction using shared gameplay actions.
- Local per-strand brushing: only hair under the finger bends, each strand flexes along its length from a fixed root, swings and trails like loose hair, and the full brushed shape is saved.
- 65 fine, independent strands with nine tools: brush, gel comb, snip, grow, curl, soap, wash (a water sprayer), blow-dry, and color (eight colors, rainbow, and glitter, painted all over, on dipped tips, or as a fade).
- A hairline that follows the head curve, with a color-matched scalp cover so brushing hair aside never shows a bald top.
- A directional, flapping blow-dryer: it blows every strand in its stream the way the finger swipes, streams the hair out from the root, flaps it while the air is on it, dries it gradually, and keeps the swept shape.
- A gel comb: the hair before the point the comb touches stays put, and everything from there to the tip is laid along the line the finger traces, side by side with its neighbors. The combed shape is saved.
- A water sprayer: a spray bottle follows the finger, and the mist soaks the hair in its radius (darker sheen and droplets). Wet hair slides down and hangs straight, lying over the head instead of through the face. Soap, dye, and curls rinse out, and the hanging pose is saved.
- Hold-to-curl: the longer a finger stays on a lock, the curlier it gets, from a wave to tight ringlets in about two seconds.
- Faster hold-to-grow (0.65 length per second, about 1.8 seconds from bare scalp to full length) and cutting to a bare scalp, which Grow can bring back.
- Thick persistent lather that follows styled hair, rinses locally, and appears in saved/exported pictures.
- Continuous position-based scissors and localized hold-to-grow, including repeated edits within one undoable touch.
- 28 outfits in the Dress up tab (saved per friend, shown in saved pictures, and undoable), plus 12 hats, 9 pairs of glasses, 9 headbands, and up to 12 clips in 12 kinds that can be tapped on anywhere, ride along on the hair, and are dragged off to remove them.
- A capybara that reacts to each tool (happy, surprised, giggling, squinting, breezy, and a shake after a soaking), and to being poked in the eye, booped on the nose or belly, or tickled under the arms, each with its own face, sound, and speech bubble.
- A “Say capy!” photo booth: six backgrounds, five frames, four faces, and eight draggable stickers, saved with the picture.
- Whole-head styling, gesture-level undo, undoable reset.
- Responsive desktop, tablet, and phone layouts that show just the game: a slim header over the friends, studio, and tools, with no banner or footer.
- Keyboard controls, visible focus, modal focus containment, reduced motion.
- Optional synthesized sound, with its own sound for every tool, dressing up, and the camera, spaced out so held tools do not buzz.
- Local autosave and a 12-picture gallery with removal confirmation.
- 800 x 1000 PNG picture generation, including the photo booth scene and a caption.
- Visible corrupt-save, storage-quota, audio, render, and export error handling.
- Git initialization, lockfile, strict TypeScript, unit tests, and static production build.
- Public hosting on GitHub Pages, deployed automatically from `main` by a workflow that runs the tests first, with a Play now button at the top of the README.
- No ads, accounts, purchases, analytics, remote fonts, or external artwork.

## Automated checks

Executed during implementation:

| Check | Result |
| --- | --- |
| TypeScript strict checking | Passed |
| Vitest | 287 tests passed across 19 files; exit code 0 |
| Vite production build | Passed |
| Local server HTTP response | 200 |

Tests cover real model transitions rather than just UI labels: single-lock editing, length bounds, curl/brush behavior, color/wash behavior, multi-lock stroke undo, friend isolation, accessory/reset undo, bounded history, whole-head edits, geometry picking, fast strokes, malformed saves, inaccessible storage, snapshots, and gallery eviction. Later milestones added tests for the local brush, the blow-dryer, the gel comb, the water sprayer, hold-to-curl, cutting to bald and regrowing, the 28 outfits, dye effects, hats, glasses, headbands, and clips, sounds and reactions, the photo booth, and pokes and tickles; each milestone section below lists what it covers.

### Continuous-touch refinement

The original once-per-lock styling guard made repeated drags feel unresponsive. Visual dragging now continues for every movement. The later continuous-length update below also removes this restriction from cutting and growing.

Added regression tests for repeated dragging and reversals, vertical movement, fixed roots, picking deformed locks, gradual frame updates, release continuity, spring settling, bounded long drags, consistent simulation at 30/60/120 Hz, reduced motion, and one-step comb undo.

Verified through Chromium touch events at phone/tablet viewport sizes:

- One held finger moved the same lock right, farther right, left, and down without lifting. Measured rendered tip positions changed in each direction.
- Hair settled on release; one Undo restored all original paths with no extra gesture-history entries. The later persistent-brush update below replaces spring-back with retained two-axis placement.
- Moving a second finger did not move the primary finger's hair.
- Touch cancellation released the locks, and the next drag worked.
- Release outside the character, Undo, and keyboard whole-head styling continued working. The original once-per-drag trim behavior has since been replaced by the position-based scissors below.
- No runtime page errors during the cancellation/multi-touch check.

Actual finger feel on physical mobile hardware still needs user feedback.

### Continuous cutting and hold-to-grow

- Scissors cut at the finger's path, not by a fixed amount once per touch. The same lock can be trimmed again lower down during that touch. A stationary finger does not continually shave it away.
- Grow operates while held still and follows a dragged finger to new areas. It stops affecting abandoned locks, stops on release/cancel/tool changes, and stays within the saved length bounds.
- These two tools keep hair in place for precise contact; Brush retains the springy drag behavior.
- All actual changes during one touch share one Undo, including hundreds of potential growth frames.
- Help text and tool hints explain the new interactions.

Validation used the existing Vitest runner and a separate localhost production origin, leaving the normal game saves untouched:

- Baseline: 32 passing tests. Final: 43 passing tests; `npm test` exit code 0. Strict TypeScript and `npm run build` passed, exit code 0. Production HTTP readiness returned 200.
- New tests cover localized cuts and revisiting locks, side-lock direction, stationary cut stability, timed stationary growth at 30/60/120 Hz, moving growth targets, swept contact, release/stop behavior, off-hair holds, length limits, paused-frame limits, no-op edits, and grouped undo.
- Chromium touch test: a stationary held lock grew from approximately 0.445 to 0.580 and then 0.716 in two successive 550 ms waits. Untouched hair stayed unchanged.
- Moving the same finger to a side patch grew that patch by approximately 0.149 while the prior patch stopped. Release stopped growth, autosave retained the length, and one Undo restored the entire touch.
- Scissor touch test: a horizontal swipe cut a central tip to exactly y=140; revisiting it lower down without lifting cut it to approximately y=147.6. Untouched locks remained unchanged; holding still was stable; one Undo restored the original paths.
- Touch cancellation stopped growth. A subsequent hold worked, changing tools stopped an in-flight hold, sustained holding reached the maximum length of 1, and that length survived reload.
- Desktop regression check: a 500 ms mouse hold extended the selected tip by approximately 13.3 SVG units. Brush reversal still moved it smoothly in both directions; the keyboard whole-head shortcut remained functional.
- A zero/earlier animation timestamp must not end a held gesture. The growth loop now stays alive while selected locks can grow, and its clock never moves backward; a focused regression test covers this startup edge case.
- No runtime page errors occurred in the continuous hold/move/release test. Browser checks used emulated touch, not physical-device certification.

No new dependencies, backend, authentication, or external services were introduced.

### Persistent brush placement and soap

- Brush follows continuous touch/mouse dragging and saves the complete final horizontal and vertical bend. Roots remain fixed, subsequent drags continue from the saved pose, and cumulative bends are bounded.
- Added a Soap tool with thick foam and up to 117 bubbles on a fully soaped head. Lather stays until rinsed (or undone/reset), moves with the styled locks, and is retained through tool/friend changes, reloads, and gallery snapshots.
- Wash removes soap only from contacted locks; whole-head Wash rinses everything. It still restores the original dye and removes curls, but no longer resets the brushed arrangement.
- Cutting now accounts for persisted bends, including folded hair. A regression exposed quadratic roundoff excluding a tip contact; tolerating endpoint roundoff fixed repeated stationary cutting.
- Old version-one looks/photos remain supported; malformed new bend or lather fields are rejected with the existing visible save warning.

Verification on an isolated production origin, without changing the normal game's saves:

- Baseline: 43 tests. Final: 54 passing tests in 5 files. `npm test`, strict TypeScript, and `npm run build` passed with exit code 0; HTTP readiness returned 200.
- Chromium touch test reversed direction repeatedly without lifting. On release, the measured tip retained exactly +25 horizontal / +15 vertical SVG units. One Undo restored every original hair path.
- A mouse drag retained +50 horizontal / -30 vertical SVG units, and all saved paths matched after reload.
- A continuous Soap swipe lathered 11 local locks. Switching tools and waiting did not remove foam. Whole-head Soap rendered 13 soaped locks and 117 bubbles.
- Brushing soaped hair moved a sampled bubble approximately +13.8 / +16.5 SVG units. A local rinse left 12 of 13 locks soaped; whole-head rinsing removed all foam without changing the brushed paths. Undo restored the lather.
- Saved pictures preserved foam and the exact brush paths. Friend switching and reload retained soap; washing the live character did not change the saved picture.
- Exported SVG contained all 13 soaped locks. PNG generation produced a valid 800 x 1000 image (356,439 bytes). Native device download behavior still needs the real-device check below.
- All seven tools remained at least 44 x 44 pixels, with no horizontal overflow at widths 320, 390, 768, 1024, and 1440. A gallery test selector was updated to account for the photo count in the button's accessible name; its rerun passed.
- No runtime page errors occurred in the continuous brush/soap touch checks. Physical tablet feel is still unverified.

### GitHub Pages deployment

The game is live at https://aaronc1992.github.io/capy-and-co/ from the public repository https://github.com/AaronC1992/capy-and-co.

- Pages uses the **GitHub Actions** source. `.github/workflows/deploy.yml` runs on every push to `main` (and manually): `npm ci`, `npm test`, `npm run build`, then publishes `dist`. A failing test blocks the deployment.
- `vite.config.ts` sets `base: './'` so the same build works under the `/capy-and-co/` subpath.
- The README starts with a **Play now!** button (`docs/play-now.svg`) that links to the live game.
- Verification: the first workflow run passed (build 14 s, deploy 12 s). The live page, JS, CSS and favicon return HTTP 200. In Chromium the live game loads with no console errors or failed requests, brushing across the hair changed 90 of its 195 strand paths, and the README button renders on GitHub and links to the game.
- Not verified: touch on a physical tablet, or on iOS Safari.

## Browser checks

### Local, flexible brush

Feedback: the brush grabbed hair in a large radius and moved the whole head of hair rigidly.

Cause: a 26-unit hit radius, every touched strand held for the entire gesture, and each strand moved as one rigid quadratic curve.

Change:

- The brush contact radius is now 15 units with a soft edge, measured against the strand's current points, so only strands under the finger are touched.
- Each strand bends point by point: the push ramps from zero at the root to full strength at the contact, with a gentle lean for the loose tail. Roots stay fixed and segment lengths cannot stretch or collapse.
- A strand follows the finger for roughly 50 units, then eases off and stops at 85 units, so long drags do not gather hair into a pile.
- The pose is saved as an optional per-strand `shape` (48 numbers). Cutting truncates it, growing scales it, and saves/gallery pictures/undo include it. Older saves need no migration.
- Curl and Color keep their wider effect radius and show transient, unsaved motion; Soap and Wash do not move hair.
- Per-point spring motion is independent of frame rate and uses a 1/120 s substep.

Verification:

- `npm run typecheck`, `npm test` (74 passed in 6 files), and `npm run build` all passed with exit code 0.
- New tests cover locality, fixed roots, no stretching, bounded slip, reversals, commit without a visual jump, frame-rate independence (30/60/120 fps), reduced motion, shaped cutting, shape undo/clear/clamp/invalid, growth scaling, and storage round-trips and rejection of invalid shapes.
- Chromium mouse drags on the test origin: an 85-unit swipe saved a shape on 32 of 65 strands; a 22-unit stroke saved it on 14; a fast 4-sample flick matched the slow 30-sample drag (32 strands). Close-up screenshots showed a smooth falloff into untouched neighbors, with no kinks.
- One Undo removed the whole stroke (shaped strands 32 to 0). After a reload, all 260 rendered hair paths were identical to the pre-reload geometry.
- Snip, Curl, Color, Soap, Wash, and Blow-dry were then run over brushed hair with no console or page errors; Wash kept the brushed shapes (while removing dye and curls as designed).
- Testing used a desktop mouse in Chromium. Touch feel on a physical tablet is not yet verified.

### Flowing, easier brush

Feedback: brushed hair acted stiff and rigid, and brushing should be easier.

Cause: the springs were very tight (about a 40 ms response, almost no swing), so every point snapped to the finger with no lag or sway. Strands pushed straight toward the scalp could only squash, so they stayed as rods. Touches near the root barely moved the hair, and the finger lost its grip on a strand after 85 units.

Change:

- Motion: the held and loose springs are softer, with a much looser tip. The tip now trails the finger, swings a little past the brushed pose and settles back (about 15% overshoot). Each strand has its own stiffness (±15%), so a swipe fans out instead of moving as one plank.
- Shape: the bend is a smooth arc up to the touch, and the hair beyond it keeps leaning the way it was swept. A touch near the scalp now bends over at least 4 points instead of 8, so low touches move the hair readily.
- Folding: pushing hair along its length toward the scalp turns most of that push into a sideways fold, away from the middle of the head (or toward the side the finger is moving), instead of shortening the strand.
- Easier grab: the contact radius is 18 units (was 15), with a larger full-strength core, and a strand follows the finger for up to 100 units (was 85) before slipping free.
- Unchanged: the saved `shape` format, one undo per stroke, fixed roots, no stretching, and hair stays where the brush ends. Release now sways gently to rest instead of snapping.

Verification:

- `npm run typecheck`, `npm test` (76 passed in 6 files), and `npm run build` all passed with exit code 0.
- Two new tests cover sideways folding when hair is pushed toward the scalp, and tip lag with swing and settling on the brushed pose. The settle-time check in the gradual-movement test was lengthened because the springs now take longer to settle on purpose.
- Chromium mouse drags with real frame timing: a sideways sweep left smooth, curved, fanned strands; a downward stroke folded strands outward rather than shortening them. One Undo reverted exactly one stroke, and the reloaded hair geometry was identical.
- Testing used a desktop mouse in Chromium. The constants (`BRUSH_RADIUS`, `BRUSH_MAX_CARRY`, `HELD_SPRING`, `FREE_SPRING` in `hairBrush.ts` and `hairMotion.ts`) are easy to retune once it has been tried on a real tablet.

### Hairline follows the head

Feedback: brushing the hair down revealed the bare top of the head, as if the character were bald.

Cause: every strand grew from a shallow arch that sat up to 18 SVG units below the real head outline at the crown, and nothing was drawn between the strands. Once the strands were brushed away, the fur above the roots showed.

Change:

- Roots: top strands now grow from the actual head curve (`game/hairline.ts`), 5 to 13 units inside the outline depending on the layer, so the hairline is slightly uneven. The curve is shared with the drawn head, so they cannot drift apart. Side strands are unchanged.
- Scalp cover: a band of hair hugs the head from the outline down to a hairline (about 22 units deep, ending at the temples) and is drawn under the strands. It takes the hair color of the strands above it, blending smoothly between differently colored locks, gets the damp tint when wet, and shows foam and a few bubbles where the hair is soaped. Wash and Blow-dry clear them exactly as they do for strands.
- Pictures: the cover is part of the character artwork, so it also appears in the gallery, in the portrait thumbnails, and in downloaded PNGs.
- Unchanged: saved `shape` data (it stores offsets from the strand's rest position, so older saved poses still load), the save format, undo, and all tool behavior.

Verification:

- `npm run typecheck`, `npm test` (81 passed in 7 files), and `npm run build` all passed with exit code 0.
- New tests check that the outline lookup matches the drawn head, that every top root sits just inside the curve, that the cover contains every point from the outline down through the hairline across the whole crown, that it takes color, wetness and soap from its strands, and that it renders under the strands and tracks color, dampness and soap.
- Chromium mouse drags: five and six downward strokes across the crown, plus a sideways sweep, left the head top covered, with no exposed fur. Painting half the hair honey and half blueberry gave a matching, blended cover. Soap added foam and bubbles to the cover, and Wash removed them.
- Testing used a desktop mouse in Chromium only.

### Fine hair and blow-drying

- Replaced 13 thick locks with 65 finer strands (55 top / 10 side). Colored strokes are now 5.2 SVG units rather than 25. Each strand remains independently editable; all existing tools share the updated drawing/picking geometry.
- Blow-dry runs continuously while held or dragged and gradually removes dampness. Hair keeps its final blown shape as requested. (The first version pushed nearby hair away from the pointer; it was replaced by the directional dryer described below.) Release/cancel/tool changes stop the breeze.
- Soap and Wash make hair visibly damp. Drying removes the darker wet sheen and droplets, but does not rinse soap. Whole-head Blow-dry dries and fluffs all strands. Reduced motion disables continuous flutter.
- Lather uses five small bubbles per fine strand, bounded at 325 for the full head. Tablet framing provides more room above blown hair.
- Existing looks and photos migrate to the finer hair without losing styling, colors, lengths, accessories, or soap. The save envelope is now version 2, using the existing storage key.

Verification:

- `npm test`: 66 passed in 6 files, exit code 0. Strict TypeScript and production build passed, exit code 0; isolated production HTTP response was 200.
- Opened the earlier 13-lock browser save: it expanded to 65 strands and retained two gallery photos, soap, and the exact saved bend (+65 / -12 SVG units). No save warning appeared.
- Chromium touch hold: wetness decreased from 1 to approximately 0.752 and then 0.492 over consecutive 400 ms waits while the hair kept moving. Distant strands stayed wet.
- Moving the same touch to a new fine side strand continued drying there while the old patch stopped changing. Release froze both shape and wetness; all 65 soaped strands retained their foam.
- One Undo restored the whole touch, including drying and movement. A mouse hold fully dried a patch; the dry state, soap, and final shape survived reload.
- Touch cancellation and changing tools stopped active airflow. Whole-head Blow-dry removed all water drops.
- Regression check on added side strand 64: a precise cut ended at y=250; a 550 ms Grow hold extended it about 14.8 SVG units. Brush still retained a +25 / -20 movement.
- All eight tools remained at least 44 x 44 pixels, without horizontal overflow at widths 320, 390, 768, 1024, and 1440.
- The final tablet-framing check kept all 65 blown tips inside the studio (about 48 pixels of minimum top clearance for the tested look); dryer pointer targeting still worked after resizing.
- No page errors occurred during the continuous dryer flow. Testing used browser touch emulation, not a physical tablet.

### Powerful, directional blow-dryer

Feedback: the dryer needed to be much more powerful, to really blow the hair around and make it flap, with all the hair in its path affected by the direction it blows.

Change:

- Direction: the dryer blows the way the finger swipes (`hairBlower.ts`), through a cone that starts behind the fingertip (`hairWind.ts`). Every strand in the cone is blown, not only the ones under the finger, and hair behind or beside the cone is not touched at all.
- Bending: each strand turns segment by segment toward the wind with its root fixed and its length preserved, so it streams out in a smooth curve instead of sliding sideways in one piece. Hair the air meets head-on folds outward from the middle of the head.
- Flapping: hair in the air flaps with a traveling wave that grows toward the tip and has gentle gusts. The flapping dies away when the air does, and reduced motion removes it.
- Keeping the pose: the swept (flap-free) pose is saved as a normal per-point `shape` through the `air` action, so it survives release, reload and saved pictures, and one Undo reverts the gesture. Drying runs at 0.9 wetness per second at full strength; soap stays.
- Feedback: `AirStream` draws the stream (cone, moving lanes, and a dryer icon turned to face the wind) along the same jet that bends the hair.
- Performance: while the dryer was held, painting took 46-61 ms per frame. Lazily creating the motion state, miter joins instead of round joins, and adaptive path decimation (`strandPath`, `PATH_TOLERANCE` 0.8) brought a held dryer to about 19-20 ms per frame on average (median 16.7 ms), measured in a production build in Chromium on the development PC.

Verification:

- `npm run typecheck`, `npm test` (126 passed in 9 files), and `npm run build` all passed with exit code 0.
- New tests cover the stream's reach and edges, per-segment bending that keeps lengths, head-on folding with left/right symmetry, flapping and its limits, swipe aiming (including a first swipe that starts left of the head and a touch-down wobble), linear drying, frame-rate independence at 30/60/120 fps, long-stall handling, saved poses, and the spring layer's handling of blown strands and malformed poses.
- Chromium mouse: rightward, leftward and downward swipes blew the hair that way and the nozzle followed the finger. Strands flapped while the air was held still. Only the strands behind the nozzle were untouched. The swept shape stayed after release and after reload, soap stayed while dampness dropped, one Undo restored the gesture, and there were no console errors.
- Not verified: how it feels or performs on a physical tablet. The frame times above are from a desktop PC.

### Gel comb

Feedback: add a comb that works like the brush but gives more control, almost as if the comb had hair gel on it. While the finger is held down, the hair should follow the path the player traced: the hair before the start of the comb stays in place, and everything from the touch outward is moved onto the traced path.

Change:

- Grip (`hairComb.ts`): for every strand within `COMB_RADIUS` (11) of the finger, the nearest point on the strand becomes its anchor. The hair from the root to the anchor stays exactly as drawn, and the strand stays held until the finger lifts, however far the finger travels.
- Laying down: each segment past the anchor keeps its length and turns toward the direction of the traced line at its own position (read over a 12-unit window, `LINE_WINDOW`), eased by `1 - exp(-length / GEL_TURN)` with `GEL_TURN` 7. Neighboring strands therefore comb side by side. Samples closer than `TRACE_GAP` (0.8) are dropped, and a tap or wobble shorter than `COMB_MIN_PATH` (6) moves nothing.
- Motion: a stiff, fully damped `GEL_SPRING` moves the hair onto the path without overshoot. The pose is saved as one `pose` action when the finger lifts, so it survives release, reload, and saved pictures, and one Undo reverts the whole stroke.
- Taking hold of a curly strand straightens it, shaved scalp is never combed, and whole-head Comb straightens the hair like whole-head Brush.

Verification:

- 12 tests in `hairComb.test.ts`: only the strands under the finger are held, once each; nothing moves until the finger has traveled; a shaky finger is ignored; the hair before the touch stays exactly where it was; the hair after the touch lies along the drawn line with every segment keeping its length; neighbors comb side by side; the hold lasts until the finger lifts; poses stay inside the shapes the studio can save; curly hair combs along its own line like straight hair; shaved scalp is never held; and the pose stays once saved.
- Chromium mouse with a calibrated pointer: strand 2 was pressed 30 units along its length from the root and dragged 80 units east. The hair before the grip stayed identical to the original, the tail turned east at the grip, the strand's length stayed 91.6 units, strands 3 and 15 were combed in parallel with it, and the pose was unchanged 600 ms after release.
- The combed tail runs about 8 units to the side of the finger's own line. That is the gel bend the model predicts (a typical 3.8-unit segment turns about 42% of the way toward the line). Lowering `GEL_TURN` makes the tail hug the line more tightly.
- Not verified: how the comb feels under a real finger. Its constants were tuned by eye on a desktop.

### Water sprayer and wet hair

Feedback: make Wash a sprayer that sprays water the player can see getting the hair wet, and make wet hair fall straight down as if it were heavy.

Change:

- Spray (`hairSprayer.ts`, drawn by `SprayStream`): a spray bottle floats up and to the left of the fingertip (`NOZZLE_OFFSET`) and points at it. Strands within `SPRAY_RADIUS` (44) of the fingertip are sprayed, at full strength within the inner 35% of that radius.
- Wetting: hair gets wet at `WET_RATE` (1.8 per second, so about half a second at full strength), plus an instant `SPLASH` (0.3) so the first touch of mist shows at once.
- Hanging (`hairDroop.ts`): the more a strand is wetted, the further it is pulled down toward hanging straight, with its root fixed and every segment keeping its length (`droopChain`; the tuning constants `ROOT_GIVE` and `GIVE_RUN` are explained under "Water sprayer and wet hair" in `ARCHITECTURE.md`). A 101 x 88 distance field of the head outline (`headShape.ts`, `CLEARANCE` 2.5, `CLIMB` 0.4), built by `warmHeadShape()` when Wash is chosen, makes hair from the crown drape over the head instead of passing through it.
- Rinse: the first water that reaches a strand (`RINSE_AT` 0.04) washes it: soap off, dye back to the natural color, curls straightened. The haircut stays.
- Saving: poses refresh every `POSE_INTERVAL` (50 ms) while the finger is down and are saved as one `air` action on release, so the gesture is one Undo step. "Do all the hair" with Wash soaks the whole head and hangs it the same way (`soakedOffsets`).

Verification:

- 16 tests in `hairSprayer.test.ts` (where the mist lands, soaking in about half a second, wetness never lowered or past full, rinsing once, passing over shaved scalp, hanging with the root and lengths unchanged, hanging further the longer it is sprayed, staying soaked and hanging when the finger moves on, throttled poses that still settle on the exact final pose, the bottle's position, real pointer points), 9 in `hairDroop.test.ts` (fixed roots and lengths, side hair hanging straight down, crown hair flopping over the head, no sinking into the head, a little movement at a time as water soaks in), and 5 in `headShape.test.ts` (the distance field matches the drawn head outline).
- Chromium mouse, Wash held on the crown while dragging from (250, 150) to (250, 175) over 1.5 s: the spray appeared only while the pointer was down, and 24 of the 65 strands became fully wet. Strand 3's tip went from 87.9 units above its root to 54.7 units below it with its length unchanged (88.6 to 88.5). Strands 3 and 16, which clear the head, hung 11.4 and 5.9 degrees from vertical. Shorter strands lie along the head instead, so across all wet strands the mean angle from vertical was 34.5 degrees (maximum 57). The wet count and the shapes were unchanged after release.
- Reload: see the final-build checks below, where the same 12 wet strands and identical shapes were restored.
- Not verified: how the sprayer looks and feels on a real tablet.

### Hold-to-curl, faster grow, and cutting to bald

Feedback: the Curl tool did not really curl the hair; the longer the player holds on a strand, the more curls it should get. Grow was a little too slow. Snip must be able to cut the hair all the way to the scalp, leaving the head bald, while Grow can still regrow it.

Change:

- Curl: a strand's `curl` is now a strength from 0 to 1 instead of an on/off flag. `HairCurler` adds `CURL_PER_SECOND` (0.5) to every strand under the finger while it is held, so a hold takes about 2 seconds to go from straight to ringlets, and it stops when the finger lifts. Older true/false saves still load (true becomes 0.4). A whole-head Curl press adds `CURL_PER_PRESS` (0.34), so three presses give full curls.
- Drawing curls (`curlyPoints`): the strand's own line is wrapped in a wave whose pitch tightens from 64 to 21 and whose radius grows from 3 to 10.5 as curl goes from 0 to 1 (a gentle wave, then loops, then ringlets), drawn through `CURL_DENSITY` (3) points per segment. The strand's own line never changes, so the other tools treat a curly strand like a straight one.
- Grow: `GROWTH_PER_SECOND` went from 0.24 to 0.5, about twice as fast. Regrowing from bare scalp to full length takes 2.4 seconds of holding.
- Cutting to bald: `cutHairStroke` shaves a strand when a cut leaves less than `BALD_REACH` (12 SVG units) of it (`MIN_LENGTH` -0.2). A shaved strand is not drawn, every tool except Grow skips it, and the scalp cover thins out so the head shows bare. Shaving clears the strand's brushed pose, curl, soap, and water but keeps its color, so Grow brings it back in the same color.

Verification:

- 11 tests in `hairCurl.test.ts` (more curl the longer the hold, up to the tightest; the same speed at any frame rate; only the strands under the finger; the hold moving along with the finger; no double counting between move events; stalled frames; stopping at full curl and on release or cancel; shaved scalp never curled). The shave and regrow cases are in `hairEditing.test.ts`, `model.test.ts`, `hair.test.ts`, and `storage.test.ts` (including that a shaved head survives a reload), plus a shaved-lock drawing case in `render.test.tsx`.
- Chromium mouse, Grow: a stationary hold grew 15 strands at about 51 units per second. Strand 7 went from 68 to 129 units in about 1.2 s and then stopped at the maximum, and growth stopped as soon as the finger lifted.
- Chromium mouse, Snip and Grow: one Snip sweep along the roots took the drawn strands from 65 to 0 with Undo enabled, and Grow held at (232, 186) for 1.5 s brought 11 strands back, the longest from 10.8 to 83.5 units.
- Chromium mouse, Curl: a hold on strand 7 took its chord-to-arc ratio (1 is straight) from 0.99 at the start to 0.93, 0.84, 0.58, 0.45, and 0.33 at 0.46, 0.92, 1.37, 1.83, and 2.28 s, and then it stopped changing. The arc length went from 66.7 to 197.4 units, and one hold curled 14 strands. Whole-head Curl presses stored curl 0.34, 0.68, and 1.0, and a fourth press stayed at 1.0.
- Reload: see the final-build checks below.
- Not verified: how holding, curling, and growing feel under a real finger.

### Dress-up outfits

Feedback: add at least 15 different clothes to change into in the Dress up tab.

This section describes the first 18 outfits, and its tile counts are from before ten more were added (see "Ten more girly outfits" below).

Change:

- 18 outfits (`OUTFITS` in `model.ts`, one table of art in `Outfit.tsx`): Cozy cape, Super capy, Snuggly sweater, Overalls, Princess gown, Twirly tutu, Comfy hoodie, Rainy day coat, Party dress, Star tee, Flower lei, Wizard robe, Sailor top, Chef apron, Sleepy PJs, Rainbow poncho, Fancy suit, and Fairy wings. The Cozy cape is the original look and the default.
- Each outfit is drawn in two layers, one behind the paws and one in front of them, using plain SVG attributes only (no CSS, filters, or remote assets), so it also appears in the gallery and in exported PNGs.
- The outfit belongs to each friend and is saved with her look and with every saved picture. Reset returns the Cozy cape, Undo steps back one outfit at a time, and choosing the outfit already worn does nothing. An outfit that does not exist is rejected with a visible warning, and saves from before outfits existed open in the Cozy cape.
- The Dress up tab keeps the selected tool, so a player can change clothes and carry on styling.

Verification:

- Tests: `model.test.ts` (at least 15 distinct outfits with one default, only the active friend changes, one Undo per change, unknown outfits ignored, every outfit can be tried on in turn, Reset restores the Cozy cape), `storage.test.ts` (outfits survive a reload in looks and in saved pictures, and unknown outfits are rejected), and `render.test.tsx` (every outfit draws differently on every friend, every gradient it uses is defined once, every outfit has a small icon and a name, and tapping one puts it on through the same game action as an accessory).
- Chromium mouse, production build: the tab showed 18 tiles with the expected names, exactly one tile was pressed at a time, the 18 outfits drew 18 distinct pictures, Undo stepped back from Fairy wings to Fancy suit to Rainbow poncho, and `localStorage` held `"outfit":"poncho"` for the active friend. Fairy wings was still worn after a reload with no page or console errors.
- On an earlier near-final build (not re-measured on the final one): the gallery shows outfits, the exported SVG carries the outfit art, and the tiles lay out in 3 columns at 800 and 390 pixels. The real Download button was not exercised headless.
- Frame rate with an outfit on: see the final-build checks below.
- Not verified: how comfortable the tiles are to tap on a real tablet.

### Ten more girly outfits

Feedback: add 10 more girly clothes to the Dress up tab.

Change:

- Ten new outfits, 28 in all, added to `OUTFITS` (`model.ts`) and to the same table of art (`ART` in `Outfit.tsx`): Sunny sundress (yellow gingham skirt, coral straps, sash, and bow), Mermaid shimmer (shell top and a shimmering scaled tail fin), Blossom kimono (cream robe, rose obi sash, and blossom sleeves), Strawberry dress (a berry-shaped dress with seeds and a leafy collar), Unicorn dress (rainbow bib, three tiers of lilac tulle, and a horn badge on a gold belt), Snow queen cape (an icy cape with white fur trim and snowflakes), Butterfly dress (a lilac dress with butterfly wings behind the shoulders), Cupcake dress (a frosted top over a cupcake-wrapper skirt, with sprinkles and a cherry), Sweetheart dress (a heart on the bodice and a heart-trimmed hem), and Daisy dress (a periwinkle dress with a daisy-chain collar and daisies on the skirt).
- The same rules as the first 18: two layers (one behind the paws, one in front), plain SVG attributes only, and any gradient or pattern declared inside that outfit's own layer with an id that is unique to the instance. They are saved per friend, appear in the gallery and in exported PNGs, and can be undone. Older saves still load, and the Cozy cape stays the default.
- The picker grid has three columns, so 28 outfits leave one tile (Daisy dress) alone on the last row. A small CSS rule centers a lone last tile.

Verification:

- Typecheck, the production build, and the 250 existing tests pass (exit code 0). The outfit tests loop over every id in `OUTFITS`, so they already cover all 28: distinct art on every friend, unique and defined gradient ids, an icon and a name for each, one picker tile each, select, undo, and reset, and unknown ids rejected. No test hard-codes the number of outfits.
- A temporary contact sheet (since deleted) drew all ten outfits on all three friends so that each could be inspected.
- Chromium mouse (the Vite dev server and the production build): the Dress up tab showed 28 outfit tiles and 6 accessory tiles, with exactly one tile pressed in each group. At 390 and 800 pixels wide all 28 tiles were visible and legible (longer names such as "Mermaid shimmer" wrap to two lines), and the lone Daisy tile was centered at 390, 800, 876, and 1440 pixels. Unicorn dress and, separately, Daisy dress were still the single worn outfit after a reload, with no page or console errors.
- PNG export, checked for four of the ten (Sunny sundress, Mermaid shimmer, Unicorn dress, and Daisy dress): each was saved and exported through the gallery's Download button, and each blob was a valid 800 x 1000 PNG. The four differed from one another, and cropped views of them showed the gingham, the fin gradient, the rainbow bib and tulle, and the daisies all drawn. The other six use the same drawing path.
- Frame rate while blowing, with the Dress up tab open (production build, headless Chromium with software rendering, an 876 x 720 viewport, one 2-second dryer sweep over the hair per outfit): the ten new outfits ran at 34.3 to 38.3 fps, and the Cozy cape, Fairy wings, and Rainbow poncho at 36.2 to 38.7 fps, so none was clearly more expensive. This viewport differs from the earlier sweeps, so compare those numbers with each other and not with the ones below.
- The final-build sweep below predates these outfits and covered the first 18.
- Not verified: a real tablet, how comfortable the tiles are to tap, and the browser's real download event (the embedded browser does not emit one, so the exported Blob was inspected instead).

### Just the game, dye effects, accessories anywhere, sounds and reactions, and the photo booth

Feedback: remove the banner and the footer so the page is just the playable game; add color effects (tips, fade, rainbow, glitter); let accessories go anywhere, with several clips plus hats, glasses, and headbands; give each tool its own sound and the capybara its own reactions; add a photo booth; and make the hair grow a little faster.

Change:

- **Just the game.** The hero banner, the captions, and the footer are gone. The header keeps the logo, the sound toggle, My gallery, and How to play, which is now the only route to the help. At 1024 x 768 the whole game fits without scrolling.
- **Faster growth.** `GROWTH_PER_SECOND` went from 0.5 to 0.65, so regrowing from bare scalp to full length takes about 1.8 seconds of holding instead of 2.4.
- **Dye effects.** The Color tab has three dye modes (All over, Dipped tips, Fade) and two new paints, Rainbow and Glitter. Strands gained optional `tip`, `fade`, `rainbow`, and `glitter` fields. Tips and fades are drawn with a per-strand gradient that follows the lock even when it is curled or blown, the scalp cover takes on each lock's root color, and glitter twinkles on top of any color. Water rinses every kind of dye and glitter out, and shaving keeps the color (and rainbow) for regrowth but drops the tips and glitter.
- **Accessories anywhere.** The single accessory became a hat (5), glasses (4), a headband (4), and up to 12 clips in six kinds (bow, daisy, star, cherries, heart, butterfly). Tapping a worn hat, pair of glasses, or headband takes it off. In Dress up a tap on the capybara puts the chosen clip there; a clip put down on the hair holds that lock and moves with it, and a clip can be dragged somewhere else or off the capybara to take it off. **Take off the clips** removes them all. The hat sits on a shaved head and rides higher on long hair. Glasses are drawn under hair that falls over the face; the headband, hat, and clips go over the hair. Old single-accessory saves migrate (the crown becomes a hat, the rest become a clip in the same spot), and the save envelope is now version 3.
- **Sounds and reactions.** Every tool has its own synthesized sound (a twinkling scale for Grow), plus a pop for dressing up and stickers, a chime for choosing a friend or a booth option, and a shutter for the camera. `SOUND_GAPS` spaces out repeats of the same sound so held tools hum along without delaying other sounds. Sound is still optional and off by default. The capybara reacts to each tool for about a second: happy for brushing, combing, growing, curling, coloring, and clipping, surprised (with a little hop) at a snip, giggling under soap, squinting in the spray and shaking the water off afterwards, and breezy with fluttering ears under the dryer.
- **Photo booth.** “Picture perfect!” opens the “Say capy!” booth: 6 backgrounds, 5 frames, 4 faces, and 8 stickers (up to 10 on a picture). Tap a sticker or the picture to add one, drag to move it, or drag it off the picture to peel it off. **Snap!**, right under the picture, flashes, saves the look and the scene to My gallery, and opens it. The scene is kept for the next picture until a reload. Photos gained an optional `scene`; older photos show the plain studio. Download puts the scene on the 800 x 1000 card above its caption.

Verification:

- Typecheck, the production build, and 281 tests in 18 files pass (exit code 0).
- Tests: `model.test.ts` (dipping tips and fading over the existing color, rainbow replacing other dye, glitter adding without stacking, paint that is not a color ignored, washing and rinsing every kind of dye; one hat, pair of glasses, and headband at a time, each one undo; clips up to the limit, one undo per change, broken clips rejected), `accessories.test.ts` (clips anchoring to the nearest lock and moving with it, where clips can be worn, the hat height on short and long hair, picking the top clip and finding free spots), `audio.test.ts` (a sound for every tool and moment, spacing repeats without delaying other sounds), `photoBooth.test.ts` (scene validation, sticker clamping and the 10-sticker limit, free spots, picking the top sticker, moving and peeling), `storage.test.ts` (dye fields, accessories, and booth scenes surviving a reload, broken ones rejected, single-accessory saves migrating to hats and clips, scenes snapshotted with the photo), `hairEditing.test.ts` (growth at `GROWTH_PER_SECOND`), and `render.test.tsx` (no banner or footer and help still in the header, accessories drawn in the right layers, dye gradients and glitter, a different face for each mood and the shake drops, every picker tile named and pressed correctly, tapping to wear and take off, every booth background and frame drawn differently with only defined gradients, the booth's drawing order, dragged stickers, booth taps and sounds, and the gallery showing booth and older photos).
- Chromium mouse on the Vite dev server (1024 x 768): the page held only the header and the game, with no `footer` element, and was 768 pixels tall. In the Color tab, Dipped tips, Fade, and Rainbow each gave all 65 strands a gradient stroke after “Do all the hair”, and Glitter then added 130 sparkles over the rainbow, with the capybara showing its happy face. In Dress up, taps on the body and on the hair each added a clip, dragging one off the capybara drew it faded and then took it off, and tapping the worn Party hat took it off. The help dialog showed the new steps and scrolled at 1024 x 768. No console errors or warnings.
- Photo booth, same setup: all 6 backgrounds, 5 frames, and 4 faces were inspected visually. Tapping added stickers, a drag moved one (drawn lifted), and dragging one off the picture faded it and peeled it off. Snap! flashed, disabled itself while it fired, saved the scene with its stickers to My gallery, switched to the gallery, and showed “Picture added to your gallery!”. The Download PNG (captured by intercepting the link click, because the embedded browser emits no download event) was an 800 x 1000 card showing the scene and the caption. At a phone width the picture came first, then Snap!, then the pickers. Snap! was moved from below the pickers to right under the picture after it turned out to be below the fold at 1024 x 768.
- Not verified: the sounds by ear on a real device, how the reactions and clip dragging feel under a finger on a real tablet, and the browser's real download event.

### Glitter that shows, poke and tickle reactions, and 23 more accessories

Feedback: glitter hair did not seem to change anything; add reactions to poking an eye, tickling the nose, hitting the belly, and tickling the armpits; and add at least 20 more accessories.

Change:

- **Glitter fix.** Glitter was being painted, but every sparkle was in the top-left corner of the picture, out of sight. The twinkle animation scales each sparkle with CSS `transform`, and a CSS `transform` replaces an SVG element's `transform` attribute, which is where each sparkle's position along its lock was. Each sparkle is now placed by a group around it and only the sparkle inside twinkles. Glittery locks also get a dotted line of glitter dust along their whole length, so glitter shows even between the twinkles.
- **Poke and tickle reactions.** Touching the capybara where there is no hair gets a reaction with its own face, sound, and speech bubble. Tap an eye and it flinches, squeezes that eye shut and stares with the other ("Hey!", with stars). Tap the nose and it squints and sneezes ("Achoo!", with puffs). Tap the belly and it jiggles ("Boing!"). Rub back and forth on an armpit, or the belly, and it squirms and giggles ("Hee hee!") for as long as the tickling goes on. Poking again starts the reaction over. A touch that moves any hair is always styling, so the hair comes first. In Dress up, tapping an eye or the nose reacts instead of putting a clip there. New sounds: `poke`, `sneeze`, `boing`, and `giggle`.
- **23 more accessories.** Hats (12): Cowboy hat, Chef hat, Witch hat, Pirate hat, Ball cap, Sparkly tiara, and Berry beanie are new. Glasses (9): Cat-eye glam, Swim goggles, Fancy monocle, Silly disguise (with a big nose and a mustache), and Rainbow specs. Headbands (9): Unicorn horn, Bee antennae, Teddy ears, Reindeer antlers, and Angel halo, which floats just above the hair, or above the hat when one is on, and bobs gently. Clips (12 kinds): Moon, Rainbow, Strawberry, Seashell, Snowflake, and Ladybug. Every picker grid fills whole rows. Saves need no migration: older saves simply never wore the new items.

Verification:

- Typecheck, the production build, and 287 tests in 19 files pass (exit code 0).
- Tests: `reactions.test.ts` (the touch spots, which reaction each spot and a rub give, a quick tap is a poke but a long press or a slide is not, rubbing back and forth is a tickle but dragging straight through or a small wobble is not), `render.test.tsx` (glitter sparkles drawn in their own lock, each placed by a group around it rather than by a transform the twinkle would replace, and a glitter dust line for each glittery lock; each reaction's face, bubble, stars, and puffs, and a restart class that alternates; the halo above the hair, rising with longer hair, above a taller hat, and kept inside the picture), and `audio.test.ts` (a sound for each reaction). The accessory picker, wearing, undo, and storage tests loop over the item lists, so they cover the new items too; `storage.test.ts` had used `monocle` as an example of glasses that do not exist and now uses `telescope`. The outfit test that draws the capybara 84 times took about 4.7 of Vitest's default 5 seconds and failed now and then on a busy machine, which would also stop a deployment, so it now has a 20-second limit.
- Chromium mouse on the Vite dev server: Glitter painted on long hair showed sparkles along every lock and the glitter dust. On Biscuit, a tap on each eye, the nose, and the belly, and a rub on each armpit and the belly, showed the matching face, bubble, and stars, puffs, or lines, and a second poke restarted the flinch. In Dress up, a tap on an eye or the nose reacted without adding a clip, and a tap on the belly added a clip. All 23 new picker icons, and every new hat, pair of glasses, headband, and clip worn on Biscuit with long hair, were inspected; the halo was moved from a fixed height to above the hair and the hat after it showed up tangled in long hair. No console errors or warnings.
- Not verified: how pokes and tickles feel under a real finger on a tablet, and the new sounds by ear on a real device.

### Final-build sweep, reload checks, and frame rate

Run against a production build of the final code (`vite preview`) in headless desktop Chromium with a real mouse. The sweep and the two reload runs listened for page errors, console errors and warnings, external requests, and on-page alerts.

- Smoke sweep: a diagonal drag (held still for 450 ms first) with each of the nine tools changed the picture every time. Snip took the drawn strands from 65 to 50, and Grow brought them back to 65. The water spray was present only while Wash was pressed, and the airflow only while Blow-dry was pressed. Each of the 18 outfits left exactly one pressed tile and drew a distinct picture, and the last one tried (Fairy wings) was still worn after a reload. No page errors, console errors or warnings, external requests, or on-page alerts occurred.
- Reload after a combined look: a diagonal Snip, a Comb stroke across the head, a 1.8 s Curl hold, and a 1.5 s Wash on the crown, then a reload. Before and after the reload there were 50 drawn strands and 12 wet strands, no strand was missing, no length, tip, or midpoint differed, and no wetness differed. The saved game was 18,949 bytes. No page or console errors occurred. (The cut and the spray left no curly strands in that run, so curls were checked on their own next.)
- Reload after curling: after Reset, a 2.4 s Curl hold on strand 7 left 15 curly strands. After a reload, 15 strands were still curly, all 65 were still drawn, strand 7 was drawn with 73 points and an arc length of 197.4 units both times (13 points and 68 units before it was curled), and no length, tip, or midpoint differed. No page or console errors occurred.
- Frame rate while blowing (headless Chromium with software rendering, mouse, not a tablet): idle held at about 60.6 fps, the display's cap. Sweeping the dryer over a full head of straight hair with the Style tab open ran at about 33 to 34 fps (33.3, 33.7, and 34.2 in three runs). A near-final build measured the same (33.1 and 33.4 fps straight, 13.9 fps curly), so these frame rates are not the result of a late change. A head of full curls under the dryer ran at about 12 to 15 fps (14.7 at curl 0.34, 14.2 at 0.68, and 12.1 at 1.0, with the worst frame gaps 167 to 200 ms). A curled strand is drawn through all 73 points, while an untouched straight one is drawn through 13.
- Outfits and frame rate: with the Dress up tab open and the dryer swept in circles over the crown, the cozy cape, rainbow poncho, party dress, and fairy wings each ran at about 27 to 31 fps in two runs, and none was consistently slower. That sweep differs from the ones above, so compare those four numbers with each other and not with the others.
- Not verified: frame rate or touch feel on a physical tablet. Every number here is from a desktop.

### General browser checks (earlier builds)

Executed with Chromium browser automation:

- Opened the running app and inspected desktop and phone rendering.
- A real mouse drag trimmed 11 locks; one Undo restored the entire stroke.
- Color selection plus whole-head styling updated all 13 locks.
- Applied a bow, saved a gallery image, switched friends, and reloaded; the look and picture persisted.
- Generated and inspected the PNG Blob: correct PNG signature, 800 x 1000 dimensions, nonempty image data.
- **The embedded IDE browser did not emit a download event.** PNG generation was separately verified by inspecting the generated Blob. Actual saving to a device's Downloads/Photos app remains a real-browser checklist item.
- Sent touch events through Chromium's touch emulation; a swipe changed hair into curls.
- Checked widths 320, 390, 768, 1024, and 1440 pixels; no horizontal page overflow.
- Used keyboard tab navigation and Enter for whole-head coloring.
- Verified Escape closes dialogs and restores focus, including after deleting the last photo. Embedded-browser native Escape handling was unreliable, so a scoped key listener also handles the case where deleting a focused photo moves focus out of the dialog.
- Injected corrupt saved data on startup: visible warning and continued play.
- Simulated a quota/blocked-storage write: visible warning and continued play.
- Enabled sound, styled hair, and disabled sound without a browser error. Audible quality has not been assessed on physical devices.
- Served the production build separately and verified styling, gallery creation, cancellation/confirmation of deletion, Escape, and selection persistence after reload. No runtime page errors or external resource requests were observed.
- The development URL responded on both localhost and the PC's LAN address. A connection from a physical mobile device has not been verified.

These are browser checks, not certification of real iOS, Android, or Amazon tablet hardware.

## Real-device acceptance checklist

Use a current Chrome/Edge desktop browser, Android Chrome, and iPad/iPhone Safari. Check both portrait and landscape.

- [ ] Open the network or hosted HTTPS URL.
- [ ] All three friends, tools, colors, dye modes, accessory, and photo booth controls are comfortably tappable.
- [ ] Drag across several locks; confirm one Undo reverses the full gesture.
- [ ] With Brush, drag a fingertip through one small patch of hair; only the strands under your finger should bend, with the neighbors easing off gradually. Brush right, left, up, and down without lifting; the hair should stay where you leave it after release and reload.
- [ ] With Comb, press on a strand partway along its length and drag a path: the hair before your finger should stay put, and the hair from your finger outward should follow the path you traced, side by side with its neighbors and without swinging. It should stay there after you lift and after a reload. A quick tap or a wobble should not move anything.
- [ ] Swipe Soap across a patch, switch tools, and wait; its bubbles should stay. Brush the soaped patch and check the bubbles move with it.
- [ ] Hold Wash over one soaped patch: a visible mist should wet the hair there, the wet hair should hang straight down, and the soap and any dye should rinse off while the haircut stays. Hair outside the mist should not change. Let go and reload: the wet, hanging hair should stay as it is. Then use whole-head Wash. Save a soapy picture and confirm later washing does not change that picture.
- [ ] Spray a patch with Wash, then hold Blow-dry near it and swipe across the hair; every strand in the stream should be blown the way you swipe, flap while the air is on it, and dry gradually. Hair behind the dryer should not move. Move to another patch and confirm the first stops changing.
- [ ] Release Blow-dry and reload: the dry state and the blown shape should remain. Blow-drying soapy hair must not remove its bubbles. Check that blowing stays smooth (no stutter) on the tablet, with straight hair, with an outfit on, and with a whole head of full curls, which is the slowest case.
- [ ] With Snip, draw a cut line and revisit the same area lower down without lifting; only the crossed locks should shorten.
- [ ] With Grow, hold one patch still, slide to another, then release; growth should follow the finger and stop immediately on release. A hold of about a second should visibly lengthen the hair.
- [ ] With Curl, hold one patch still: the longer you hold, the curlier it should get (about 2 seconds to tight ringlets), and it should stop the moment you lift. Slide your finger across more hair to curl several patches. Reload and confirm the curls stay.
- [ ] Cut a lock short, then regrow it. Try brush, curls, dye, and wash.
- [ ] With Snip, cut a patch right down to the scalp: it should look bald, with no leftover bits of hair. Hold Grow on that patch: the hair should grow back in its own color, reaching full length in about 1.8 seconds. Reload and confirm a bald patch stays bald.
- [ ] Touches on the face/background do not change hair.
- [ ] A second finger does not trigger an extra styling gesture.
- [ ] Lift a finger outside the character; the next gesture still works.
- [ ] Scroll outside the character, rotate the device, and keep playing.
- [ ] Open Dress up and tap through all 28 outfits: exactly one is highlighted at a time and the capybara wears it. Save a picture and download a PNG while wearing an outfit and confirm both show it. Undo steps back one outfit at a time, Reset returns the cozy cape, and each friend keeps her own outfit.
- [ ] Paint a few locks with Dipped tips, Fade, Rainbow, and Glitter; they should look different from each other and from plain color, and Wash should rinse each one out.
- [ ] Put on a hat, glasses, and a headband, and tap each again to take it off. Try the Angel halo with short hair, long hair, and a hat: it should float just above whichever is on top. Tap clips onto the hair, the head, and the body; brush the clipped hair and check its clip moves with it. Drag a clip to a new spot, then drag one off the capybara. Reset, then undo.
- [ ] With sound on, try every tool and listen for its own sound; holding a tool should hum, not buzz. Watch the capybara react to each tool.
- [ ] On a friend with short hair, tap each eye, the nose, and the belly, and rub back and forth on each armpit and the belly; each should get its own face, sound, and bubble. Paint a few locks with Glitter and check it sparkles.
- [ ] In the photo booth, pick a background, frame, and face, tap on stickers, drag one, and drag one off the picture. Snap! and check the gallery and the downloaded PNG both show the scene.
- [ ] Save a picture, close/reopen the browser, and find it in My gallery.
- [ ] Download a PNG and open it from the device's Files/Downloads app.
- [ ] Cancel picture removal, then confirm removal.
- [ ] Test sound with the device's media volume low; mute it again.
- [ ] Try private browsing or disabled storage and confirm understandable warnings.
- [ ] Playtest with the intended child, especially recognizing tools and navigating the phone layout.

## Known limitations and next milestone

Hosted publicly on GitHub Pages at https://aaronc1992.github.io/capy-and-co/ (see "GitHub Pages deployment" above). There is no native installer, service worker/offline launch, or cloud gallery. Browser storage is per origin and can be cleared by the device, so pictures saved on one device or browser do not appear on another. Hair consists of stylized editable locks, not fluid strand simulation; outfits, hats, glasses, and headbands use predefined positions, while clips and stickers can be placed anywhere.

Limitations of the newest features:

- A whole head of full curls under the blow-dryer is the slowest thing the game draws: about 12 to 15 fps against about 34 for straight hair, in headless desktop Chromium with software rendering. A curled strand is drawn through 73 points against 13 to 25 for a straight one. Brush, Comb, and Wash straighten hair, so the slowdown goes away once the curls are styled out. A real tablet has not been tested. If a tablet stutters, the first thing to try is lowering `CURL_DENSITY`, or drawing curly strands with fewer points while the dryer is running.
- Outfits, glasses, and headbands have fixed placements and do not adapt to the hair or to movement; the hat and the halo only rise and fall with the hair's length.
- The poke and tickle spots are fixed ovals on the face and body. Hair always comes first, so long hair hanging over the eyes or nose gets styled instead of poked, and a friend has to be poked where her hair is not. Clips follow the lock they hold, but a clip put down away from the hair stays put.
- A clip holds a point a set share of the way along one lock, so cutting or growing that lock slides the clip toward or away from the roots, and on a shaved lock it sits at the scalp. Clips do not hold hair in place against brushing or blowing.
- The booth's scene is remembered only until a reload; each saved picture keeps its own.
- The small picker tile's frame trims a few units off the Butterfly dress's wing tips. The capybara and saved pictures show the full wings.
- Drying sprayed hair lowers its wetness but does not make it fluff back up by itself: it stays hanging until it is brushed, combed, or blown into a new shape.
- Water rinses a strand as soon as the mist reaches it: the soap comes off, the dye returns to the friend's natural color, and curls straighten (the same as Wash always has); the haircut stays. Spray before coloring or curling, not after.
- Cutting to the scalp clears the strand's brushed pose, curl, soap, and water (the color is kept), so Grow brings it back in the same color but without the old style.
- The comb's tail runs about 8 units to the side of the finger's own line. That is the designed gel bend (`GEL_TURN`), tuned by eye.
- Friend cards show only the head and hair, cropped above the clothes.
- Speeds and sizes were tuned by eye on a desktop and may need adjusting after a tablet playtest: `CURL_PER_SECOND`, `GROWTH_PER_SECOND`, `BALD_REACH`, `COMB_RADIUS`, `GEL_TURN`, `SPRAY_RADIUS`, `WET_RATE`, and the poke and tickle limits (`POKE_SLIDE`, `POKE_TIME`, `RUB_STEP`, `RUB_TURNS`).

Next: a supervised real-tablet playtest using the hosted link, paying particular attention to how the comb, hold-to-curl, and sprayer feel and to blow-dryer smoothness on curly hair; any resulting touch/feedback improvements; and verified native-browser downloads. More content can follow after that feedback.

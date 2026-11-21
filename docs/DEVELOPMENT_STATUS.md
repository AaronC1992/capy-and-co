# Development status

## Scope

The fantasy RPG/VR project was cancelled before implementation. The current deliverable is **Capy & Co.**, an original, playable browser-based capybara hair salon.

## Implemented

- Three original capybaras and an illustrated salon.
- Mouse, pen, and touch interaction using shared gameplay actions.
- Local per-strand brushing: only hair under the finger bends, each strand flexes along its length from a fixed root, swings and trails like loose hair, and the full brushed shape is saved.
- 65 fine, independent strands with brush, trim, regrow, curl, soap, wash, blow-dry, and eight-color painting.
- A hairline that follows the head curve, with a color-matched scalp cover so brushing hair aside never shows a bald top.
- Continuous hold-and-drag airflow, visible dampness, gradual drying, and retained blown hairstyles.
- Thick persistent lather that follows styled hair, rinses locally, and appears in saved/exported pictures.
- Continuous position-based scissors and localized hold-to-grow, including repeated edits within one undoable touch.
- Five accessories plus removal.
- Whole-head styling, gesture-level undo, undoable reset.
- Responsive desktop, tablet, and phone layouts.
- Keyboard controls, visible focus, modal focus containment, reduced motion.
- Optional synthesized sound.
- Local autosave and a 12-picture gallery with removal confirmation.
- 800 x 1000 PNG picture generation.
- Visible corrupt-save, storage-quota, audio, render, and export error handling.
- Git initialization, lockfile, strict TypeScript, unit tests, and static production build.
- No ads, accounts, purchases, analytics, remote fonts, or external artwork.

## Automated checks

Executed during implementation:

| Check | Result |
| --- | --- |
| TypeScript strict checking | Passed |
| Vitest | 81 tests passed across 7 files; exit code 0 |
| Vite production build | Passed |
| Local server HTTP response | 200 |

Tests cover real model transitions rather than just UI labels: single-lock editing, length bounds, curl/brush behavior, color/wash behavior, multi-lock stroke undo, friend isolation, accessory/reset undo, bounded history, whole-head edits, geometry picking, fast strokes, malformed saves, inaccessible storage, snapshots, and gallery eviction.

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
- Blow-dry runs continuously while held or dragged, pushes nearby hair away from the pointer, and gradually removes dampness. Hair keeps its final blown shape as requested. Moving changes the local target area; release/cancel/tool changes stop the breeze.
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
- [ ] All three friends, tools, colors, and accessory controls are comfortably tappable.
- [ ] Drag across several locks; confirm one Undo reverses the full gesture.
- [ ] With Brush, drag a fingertip through one small patch of hair; only the strands under your finger should bend, with the neighbors easing off gradually. Brush right, left, up, and down without lifting; the hair should stay where you leave it after release and reload.
- [ ] Swipe Soap across a patch, switch tools, and wait; its bubbles should stay. Brush the soaped patch and check the bubbles move with it.
- [ ] Wash one soaped patch without rinsing the others, then use whole-head Wash. Save a soapy picture and confirm later washing does not change that picture.
- [ ] Wash, then hold Blow-dry near one damp patch; check that it dries gradually and blows away from the finger. Move to another patch and confirm the first stops changing.
- [ ] Release Blow-dry and reload: the dry state and new shape should remain. Blow-drying soapy hair must not remove its bubbles.
- [ ] With Snip, draw a cut line and revisit the same area lower down without lifting; only the crossed locks should shorten.
- [ ] With Grow, hold one patch still, slide to another, then release; growth should follow the finger and stop immediately on release.
- [ ] Cut a lock short, then regrow it. Try brush, curls, dye, and wash.
- [ ] Touches on the face/background do not change hair.
- [ ] A second finger does not trigger an extra styling gesture.
- [ ] Lift a finger outside the character; the next gesture still works.
- [ ] Scroll outside the character, rotate the device, and keep playing.
- [ ] Apply accessories and reset; undo both operations.
- [ ] Save a picture, close/reopen the browser, and find it in My gallery.
- [ ] Download a PNG and open it from the device's Files/Downloads app.
- [ ] Cancel picture removal, then confirm removal.
- [ ] Test sound with the device's media volume low; mute it again.
- [ ] Try private browsing or disabled storage and confirm understandable warnings.
- [ ] Playtest with the intended child, especially recognizing tools and navigating the phone layout.

## Known limitations and next milestone

Not yet publicly hosted. The local server must stay running for LAN play. There is no native installer, service worker/offline launch, or cloud gallery. Browser storage is per origin and can be cleared by the device. Hair consists of stylized editable locks, not fluid strand simulation; accessories use predefined positions.

Next: a supervised real-tablet playtest, any resulting touch/feedback improvements, verified native-browser downloads, and an HTTPS static deployment. More content can follow after that feedback.

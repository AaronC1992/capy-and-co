# Capy & Co. architecture

## Why this stack

React + strict TypeScript + Vite, with original SVG illustrations. A 2D salon does not need the cancelled RPG's Babylon.js, physics, 3D assets, or VR systems. SVG keeps the characters sharp at different screen sizes and lets the interaction geometry match the artwork. Only React and React DOM ship as runtime dependencies.

## Gameplay boundary

`game/model.ts` defines `Look`, `Strand`, `SalonState`, and the `SalonAction` union. The pure `salonReducer` has no DOM, storage, audio, or input-device dependency.

- `select` changes the active friend without discarding their look.
- `style` applies a tool to explicit strand indices (the whole-head shortcut).
- `pose` straightens contacted locks and commits each one's brushed or combed shape (a per-point displacement) when a brush or comb drag ends.
- `lengths` applies bounded per-lock length changes from continuous cutting or growth. Trimming scales the saved bend and truncates the brushed shape; growing scales the shape with the new length. Unchanged values are skipped so no extra history is created. A length at or below `MIN_LENGTH` shaves the strand (see "Cutting to bald and regrowing").
- `curl` sets how curly individual strands are, from hold-to-curl.
- `air` applies a saved pose (a per-point `shape`), wetness, and rinsing from the blow-dryer and the sprayer, as one undo step.
- `accessory` changes the selected decoration.
- `outfit` changes the selected clothes. The same or an unknown outfit is a no-op, so it never adds an empty undo step.
- `undo` restores the previous look.
- `reset` restores that friend's default look, including the cozy cape.

Each look contains 65 independently editable strands, one accessory, and one outfit. Five interleaved strands surround each of the original 13 anchor groups: 55 strands on top and 10 at the sides. Shared geometry uses the anchor group, not a hard-coded side-index cutoff. Hair color strokes are 5.2 SVG units wide instead of 25. Optional scalar `bendX`/`bendY` values describe the saved tip offset from blow-drying and older styling. An optional `shape` holds the brushed pose as x/y displacements for each of the 24 drawn points after the root (48 numbers, rounded to two decimals, each within ±300). The root is never displaced. `soapy` records persistent lather, and `wetness` ranges from 0 (dry) to 1 (wet). `curl` ranges from 0 (straight) to 1 (tightest ringlets), and `length` from `MIN_LENGTH` (a shaved scalp) to 1. Changes are immutable. Undo stores up to 40 structural-sharing snapshots for the current friend.

`game/hairLayout.ts` has no imports and owns the strand constants (`STRAND_COUNT`, `HAIR_POINTS`, `HAIR_SHAPE_LENGTH`) plus the shape helpers (`isHairShape`, `normalizeShape`, `roundShape`, `addShape`, `scaleShape`, `truncateShape`). Keeping it dependency-free lets `model`, `hair`, `hairBrush`, `hairMotion`, and `storage` share one definition without circular imports.

## Input and drawing

`game/hair.ts` supplies the points used by both SVG paths and picking. `Studio` converts screen coordinates into SVG view-box coordinates with the inverse screen transformation matrix. Picking measures the swept finger area against the currently deformed curves, using a forgiving touch radius. It does not repeatedly regenerate geometry at every intermediate finger position.

One active pointer is captured until release, cancellation, or lost capture; blur and document hiding also release it. Secondary touches are ignored. Coalesced pointer samples are consumed when available. For the brush, a strand is grabbed only where the finger's swept segment actually touches it, and stays grabbed for the gesture while the finger moves it (see the stick/slip rule below). Starting a new tool or changing friends clears transient motion and any active growth.

### Brush model

`hairBrush.ts` holds the pure maths and `hairMotion.ts` the per-strand state.

- **Contact.** `brushContact` finds the point on a strand's polyline that is nearest to the finger's swept segment, within `BRUSH_RADIUS` (18 SVG units), with a smoothstep falloff and a full-strength core. Strands outside that radius are untouched, which is why only the hair under the finger moves.
- **Bending.** `bendStrand` moves each point by the finger's movement times a smooth arc (squared distance along the strand) that reaches full strength at the contact point (never fewer than the first four points), keeps leaning the hair beyond the contact by up to 60% so the loose tail swings after the finger, and then rebuilds the chain from the fixed root. Segment lengths are held between half of their natural length and their current or natural length, so strands bend and fold but do not stretch or collapse.
- **Folding.** When the finger pushes along a strand toward the scalp, `buckle` turns 75% of that push into a sideways fold, away from the middle of the head unless the finger is already moving to one side, so upright hair lays over instead of shortening.
- **Stick/slip.** `brushSlip` makes a strand follow the finger fully until it has been carried about 60 units from the pose where it was grabbed, then progressively lets it slip, stopping at 100 units (`BRUSH_MAX_CARRY`). Moving back toward the original pose is always allowed. This stops strands being gathered into a pile by a long drag.
- **Spring motion.** `HairMotion` keeps, for each strand, a rendered position, a target, a velocity, and the grab-time origin, all as 48-number point arrays. An underdamped spring per point moves positions toward targets: stiffest and best damped at the root, and 70% softer with less damping at the tip, so the tip trails the finger and swings slightly past its pose before settling. Each strand's stiffness is scaled by a fixed ±15% so neighbors do not move in lockstep. Substeps are at most 1/120 s with a 50 ms cap, so behavior is the same at 30, 60, and 120 fps. Unmoved strands are skipped, and the animation loop stops when everything has settled. Reduced-motion mode follows the target directly.
- **Commit.** When the gesture ends, `commit` returns each held strand's rounded shift and rebases its position, target, and origin so there is no visual jump. `Studio` adds that shift to the strand's saved `shape` through one `pose` action (the first touch already opened the undo step), then `release` lets residual spring lag settle. Later strokes start from the saved shape, because contact is measured against the current polyline.
- **Other tools.** Color keeps its wider effect radius and also calls the same `drag` for transient motion that is never saved. Soap causes no motion. The comb, curl, dryer and sprayer each have their own model, below.

Spring animation state is local to the studio, not the save model: brushing does not rerender the whole app or write storage every frame. The existing `flow` field remains supported for older hairstyles.

### Hairline and scalp cover

`game/hairline.ts` ties the hair to the head. It exports `HEAD_TOP_PATH`, the top arc of the head outline that `Capybara` draws (so the head and the hair share one definition), and `headTopY(x)`, which solves that curve for the outline height at any x. `hairRoot(index)` places each top strand's fixed root just inside the outline (5 to 13 units deep by layer) instead of on a free-floating arch, so the hairline follows the head's curvature. `strandPoints` reads its root from there.

Brushed strands can leave the crown, so a `ScalpCap` in `Capybara` draws a band of hair under all the strands. `SCALP_CAP_POINTS` is built from the same head arc, enlarged slightly for the outer edge and shrunk toward the head center for the hairline, and cut off at the temples. It is a pure function of the strand data, with no saved state: `scalpTints` averages, for each of the 11 top-of-head columns, the color, wetness and soapiness of its five strands, and the cap paints those as horizontal gradients (color, damp overlay, foam overlay) so it matches the hair above and blends between differently painted locks. Because it lives in the character artwork, gallery thumbnails, portraits and PNG exports include it automatically.

`hairEditing.ts` implements continuous length tools without pulling the hair away from the finger:

- Scissors use a narrower swept contact area and the contact height to determine each crossed lock's new length. Bent or brushed hair uses a piecewise (per-segment) solve to find the retained portion nearest the finger, including folds that cross the same height twice; unshaped hair keeps the original quadratic solve. Trimming truncates the saved shape and scales the saved bend so the cut ends at that contact. Endpoint comparisons tolerate roundoff so holding scissors still does not repeatedly erode folded hair. Both upward-growing top hair and downward-growing side locks are supported.
- `HairGrowth` integrates elapsed time at `GROWTH_PER_SECOND` (0.5 normalized length units per second), capped at 50 ms per update after a stall. Pointer moves and animation frames share one timestamp, so they never count the same time twice. A stationary hold retains its local lock selection as the tips extend. Moving the pointer replaces that selection, rather than accumulating every previously touched lock.
- Length edits use the same bounded, immutable helper in the reducer and the active gesture. This keeps rapid/coalesced events current before React finishes rendering. Length changes update the saved look; storage writes remain debounced. The frame loop runs while growth changes hair, and stops on release, cancellation, leaving hair, or reaching maximum length.

Soaping and painting apply once per lock per gesture while continuously detecting newly crossed locks. Soap does not pull the hair away from the finger and remains through other tools. Whole-head actions cover all locks. All changes in one gesture share an undo checkpoint, including later cuts, growth frames, curls, and the final brush or comb pose. Undo/reset clear residual motion and stop active growth. The keyboard/whole-head shortcut retains its discrete one-step behavior: trim by 0.2 (never below a short crop, so shaving is only done by hand) or grow by 0.2 (which also brings shaved hair back), curl by a third (three presses for fully curly), brush or comb to a gentle fixed flow, and wash by soaking the whole head so it hangs.

### Cutting to bald and regrowing

`hairLayout.ts` defines `MIN_LENGTH` (-0.2), the length of a strand with no hair left: `isBald(length)` is true at or under it, where the strand reaches less than one SVG unit from its root and is not drawn. `cutHairStroke` turns any cut that would leave a strand reaching less than `BALD_REACH` (12 SVG units) from its root into `MIN_LENGTH`, so a close shave is easy to reach with a finger and never leaves a stubby bit the player cannot hit.

- **Shaved strands are skipped by every tool that works on hair.** They are not drawn, picked (`hitHairStroke`), cut, brushed, combed, curled, soaked, or blown, and they are skipped by the reducer's `pose`, `curl` and `air` actions and by the whole-head `style` actions. Soap and Wash do not need special handling because they select strands through the same picking.
- **Shaving clears the strand's style.** `shorn` keeps only the color (and flow), dropping the brushed shape, bends, curl, soap and wetness, so regrowth starts as clean, straight hair of the same color.
- **Grow works on shaved scalp.** `HairGrowth` selects strands with `touchStrands`, which does not filter out bald ones, and the `style` reducer lets `grow` through for them. Regrowing the whole way from bare scalp takes `(1 − MIN_LENGTH) / GROWTH_PER_SECOND` = 2.4 seconds of holding.
- **The scalp cover thins out.** `scalpTints` weights each column by `smoothstep(BARE_REACH, COVERED_REACH, strandReach(...))`, so the color-matched cover under the hair fades when its strands are shaved, and the head shows bare.
- Saved lengths may go down to `MIN_LENGTH`, so a shaved head survives reload, undo and gallery snapshots.

### Gel comb model

`hairComb.ts` holds the pure maths; `HairMotion.comb` animates it with a stiff, fully damped `GEL_SPRING`. The comb is the brush's more controlled sibling: it follows a line the finger *traces* rather than the finger's movement.

- **Grip.** The first time the swept finger segment comes within `COMB_RADIUS` (11 units, finer than the brush) of a strand, the comb takes hold of it, and keeps hold until the finger lifts, however far the finger goes. The nearest point becomes the strand's anchor. Everything from the root up to the anchor is frozen at the pose the studio was showing, so the hair before the touch stays exactly in place. Shaved scalp has nothing to hold.
- **Trace.** The finger's path is a polyline with the distance travelled at each corner. Samples closer than 0.8 units are jitter and are dropped, and nothing is laid down until the finger has travelled `COMB_MIN_PATH` (6 units) past where the strand was grabbed, so a tap or wobble moves nothing.
- **Laying hair down.** From the anchor, each segment keeps its natural length and turns toward the heading of the trace at its own position, read over a 12-unit window so a shaky finger still draws smooth hair. Each turn is eased by `1 − exp(−length / 7)`, so the old direction fades within a few segments rather than kinking. That ease is also why the tail runs alongside the line rather than exactly on it: a strand that was heading straight across the line settles about 8 units to one side of it (measured in the browser for a typical strand), and a smaller `GEL_TURN` hugs the line more closely at the cost of a sharper bend. Hair past the end of the line carries on in the heading it finished on. Because every strand follows the same trace, neighbors comb in parallel. Offsets stay inside the ±300 the shape format allows.
- **Curls.** Curls are only drawn around a strand's line (see below), so the comb lays a curly strand along its line exactly as it would a straight one. Taking hold of a curly strand sets its curl to 0 straight away through the `pose` action.
- **Commit.** While the finger moves, `Studio` sends each strand's combed pose to the springs, with nothing saved. When it lifts, the final positions are added to each strand's saved `shape` through one `pose` action, the same rebase the brush uses, so the hair stays where it was combed and one Undo reverts the stroke.

### Hold-to-curl

`HairCurler` in `hairCurl.ts` raises a strand's `curl` by `CURL_PER_SECOND` (0.5) every second the strand is under the finger, so about two seconds takes a lock from straight to tight ringlets. It shares `HairGrowth`'s mechanics: one monotonic clock for pointer events and animation frames, a 50 ms cap after a stall, newly crossed locks picked up while dragging, locks the finger has left forgotten, and a frame loop that keeps running while the held locks can still curl. Edits go through the `curl` action, so a whole gesture is one undo step. Shaved scalp is never curled. The brush, comb and sprayer straighten curl.

Curls are drawn, not simulated. `curlyPoints` in `hair.ts` wraps the strand's own 24-segment line in a wave: the pitch tightens from 64 to 21 units and the radius grows from 3 to 10.5 units as `curl` goes from 0 to 1, so the hair goes from a gentle wave to loops to ringlets. The amplitude ramps in over the first 8 to 30 units from the root, so roots stay on the scalp, and golden-angle phases keep neighbors out of step. Curly strands are drawn through `CURL_DENSITY` (3) points per segment to keep the loops round. The strand's own line never changes, so picking, cutting, the brush, comb, dryer and sprayer treat a curly strand exactly like a straight one. The cost is in the drawn points. `drawStrand` paints a curled strand through all 73 points (24 segments times `CURL_DENSITY`, plus one), while a straight strand goes through `pathThrough`, which keeps only the points on a visible bend: 13 for an untouched strand and at most 25 for a sharply bent one. That makes a whole curly head under the blow-dryer the heaviest thing the game paints: about 12 to 15 fps against about 34 for straight hair in headless desktop Chromium (see the limitations in `DEVELOPMENT_STATUS.md`).

### Blow-dryer model

`hairWind.ts` holds the pure geometry and `hairBlower.ts` the state of one dryer gesture.

- **Aim.** The dryer blows the way the finger swipes. Until the finger has travelled `FIRST_SWIPE` (5) units the aim points away from the middle of the head, so a wobble at touch-down cannot turn the wind. After that the aim eases toward the direction of travel by `min(1, distance / 30)` each move. The nozzle sits 50 units (`WIND_BACK`) behind the fingertip, so the fingertip is inside the stream.
- **Stream.** `windStrength(jet, point)` is reach times lateral falloff. Reach ramps in over the 36 units around the nozzle, holds, and fades over the far 45% of the 280-unit range. The lateral falloff is a cone whose half-width grows from 32 units at the nozzle by 0.38 per unit of distance, with a soft edge. Hair outside the cone is not touched at all: its strand objects stay identical.
- **Bending.** `bendInWind` turns each segment of a strand about its own start toward the wind heading by `give x lean`. `give` rises from 30% at the root to 100% about two thirds of the way along. Every segment keeps its length and the root never moves, so a strand streams out along the wind like a real lock instead of sliding sideways in one piece. When the air meets a strand head-on, the segments fold outward away from the middle of the head (`HEAD_ON`), so upright hair does not fold straight back onto the scalp.
- **Flapping.** While the air is on a strand, a traveling wave (about 22 rad/s, lagging toward the tip and growing with it) swings the segments from side to side. Its strength follows the air at each point, so it dies away with the air. Each strand has its own phase and rate, and a slow gust variation keeps neighbors from flapping in step. Reduced motion removes the flap and the gusts, which also makes the pose exactly frame-rate independent for a stationary finger.
- **Drying.** Each strand in the air loses 0.9 wetness per second at full strength. Time comes from one monotonic clock shared between pointer events and animation frames, with a 50 ms stall cap. Dry strands produce no edits. Soap stays until rinsed.
- **Keeping the pose.** `HairMotion.blow(poses)` holds the blown strands and points their spring at each wind pose, using a stiffer and whippier `WIND_SPRING` than the brush so the tips whip and the hair can flap. A strand that leaves the air keeps 85% of its strongest bend. When the gesture ends, `settled()` supplies the flap-free pose; `Studio` commits it with the same rebase the brush uses and saves it in one `air` action (`{ index, shape }`), then releases the spring so the hair settles without a jump. The whole gesture is one undo step, and cancellation, blur, hiding the page, and changing tools or friends stop the air.
- **Feedback.** `AirStream` draws the stream along the same jet that bends the hair (a translucent cone, five moving lanes, and the dryer icon turned to face the wind). It is transient and never included in saved pictures.

### Water sprayer and wet hair

`hairSprayer.ts` holds the state of one spray gesture, `hairDroop.ts` the maths of how wet hair hangs, and `headShape.ts` a distance field of the drawn head so that wet hair lies on the head instead of sinking through it.

- **The mist.** The fingertip is what the bottle is aimed at; the bottle floats `NOZZLE_OFFSET` (−44, −58) away from it so the finger does not hide the spray, and stays inside the picture. Mist strength is full within the inner 35% of `SPRAY_RADIUS` (44 units) and eases to nothing at the edge. `jet()` gives `SprayStream` the nozzle and the target to draw the bottle and the spray; like the airflow it is transient and never part of a saved picture.
- **Water.** Every drawn point of every strand soaks up water on its own, at `WET_RATE` (1.8) times the mist strength per second, which is about half a second at full strength. The first time the mist reaches a point it also gives an immediate `SPLASH` (0.3 × strength), so even a quick swipe leaves visibly wet hair. Time steps are capped at 50 ms.
- **Weight.** Water pulls hair toward straight down. Going down a strand, each point leans by the larger of what the point above it did and `water × (2 − water)`, so soaked hair drags everything below it down and the first drops weigh the most. A strand's `wetness` is its wettest point, reported in steps of 0.05 so a soaking strand is not redrawn on every frame.
- **Rinsing.** The first time any point of a strand holds 0.04 water (`RINSE_AT`) the sprayer reports a one-time `rinse`, and `applyHairAir` washes the strand clean: soap off, dye back to the friend's natural color, curl back to 0. The haircut stays.
- **Hanging.** `droopChain` measures a strand's resting segments once, and `droopOffsets(chain, lean)` turns each segment toward straight down by `give × lean`, with the root fixed and every segment keeping its length, so wet hair hangs like hair rather than stretching. `give` is 70% at the scalp (`ROOT_GIVE`) and reaches 100% by the eighth segment (`GIVE_RUN`). Upright hair has no short way round, so it falls away from the middle of the head (`OUTWARD_BIAS`).
- **Lying on the head.** `clearOfHead` checks where each segment would end against `headClearance`, the distance field of the head outline. The field is built once (`warmHeadShape()` does it when the wash tool is picked, so the first spray does not pay for it) and sampled bilinearly. A segment that would end inside the head turns away from it, the way the hair is falling, until it ends `CLEARANCE` (2.5 units) outside the outline, and a strand rooted inside the outline climbs out at a `CLIMB` slope (0.4). This is what makes wet hair flop over the dome and hang beside the face instead of through it.
- **Springs and cost.** Working out a hanging pose is the costly part, so a strand's pose is refreshed at most every `POSE_INTERVAL` (50 ms), and `HairMotion.soak(poses)` points each strand's spring at it. `WATER_SPRING` is soft and fully damped, so wet hair sinks smoothly without bouncing. The sprayer stays busy only while hair in strong mist (`BUSY_AT`, 0.2) can still take on water or hang lower; then the frame loop stops.
- **Keeping the pose.** When the finger lifts, `poses(true)` brings every pose fully up to date and `Studio.keepPose(…, 'soak')` saves them (the same rebase the dryer uses) in one `air` action. Wet hair therefore stays hanging until it is brushed, combed, or blow-dried, and the whole gesture is one undo step. The whole-head shortcut saves `soakedOffsets`, the pose of a fully soaked strand. Shaved scalp is never sprayed.

### Drawing and shared artwork

Soap makes a strand soapy and wet, the sprayer sets wetness from the water a strand has taken, and the dryer dries it but keeps the soap until rinsed. Hair strands are drawn with adaptive decimation (`strandPath`): odd points are skipped where they sit within `PATH_TOLERANCE` (0.8 units) of the chord between their neighbours, which cuts paint work for straight hair while leaving curls and bends exact.

Mouse, touch, and pen all emit the same reducer actions. Keyboard and the whole-head shortcut use that same interface. `touch-action: none` is scoped to the interactive character; the rest of the page retains normal touch scrolling and zoom behavior.

`Capybara` is shared by the live studio, friend picker, and saved gallery. It paints the clothes (`OutfitBack`, `Paws`, `OutfitFront`), then the head and face, the scalp cover, and last the hair, so hair always falls over the clothes. Shaved strands are not drawn. Lather is derived from each soaped strand's actual curve, including saved and transient bends, with five smaller bubbles per strand (325 maximum). It has no expiry timer or separate animation loop, ignores pointer events, and is included in portrait export. Wetness controls a darker sheen and sparse droplets. Airflow and spray feedback are transient and never included in saved pictures. Gradient identifiers are unique per instance. There are no remote assets to load.

### Outfits

An outfit is the `outfit` field of a `Look`, one of the 18 ids in `OUTFITS` (`model.ts`). It is purely cosmetic: no hair tool reads it.

- **Model.** The `outfit` action replaces the field and takes one undo step. Choosing the outfit already worn, or an unknown id, changes nothing and adds no empty undo step. Each friend keeps their own outfit, and `createLook` and `reset` give the cozy cape.
- **Art.** `Outfit.tsx` draws every outfit as two layers in one table (`ART`, a `Record<Outfit, { back, front }>`, so an outfit without art or without a label is a type error). The art is plain SVG attributes, with no CSS classes, filters, or remote assets, so portrait export and saved pictures include it with no extra work. Gradient ids come from `useId()` with the colons stripped.
- **Rendering cost.** `OutfitBack`, `OutfitFront`, and `Paws` are memoized and receive only primitive props (`outfit`, `id`, `fur`, `light`), so they are not redrawn while the hair animates. With the blow-dryer swept over the head in headless desktop Chromium, the cozy cape, rainbow poncho, party dress, and fairy wings each ran at 27 to 31 fps in two runs, and no outfit was consistently slower than the others.
- **Picker.** `DressUpPanel` lists the outfits as a grid of `aria-pressed` buttons above the accessory grid. `OutfitIcon` renders the same back, paws, and front art at a small size, so a picker tile always shows exactly what the capybara will wear.

## Persistence

`StoragePort` separates JSON persistence from the browser. `SavedGame` is a versioned envelope containing current looks, selected character, photos, and sound settings.

Every loaded field is checked: valid character/accessory/outfit, exact lock count, bounded numeric fields (lengths from `MIN_LENGTH` to 1, so a shaved head is valid), six-digit hex colors, valid photo dates, unique photo IDs, and bounded gallery size. Malformed or inaccessible storage returns a fresh playable state **and an explicit user-visible warning**.

The envelope now uses version 2, retaining the original local-storage key so existing data can be found. Validated 13-lock looks and photos are expanded by copying each original lock into five independent strands at its anchor. This also handles a still-open development tab writing its old hair array during hot refresh. Already-expanded 65-strand data is not duplicated. Missing bends/wetness mean zero, missing `soapy` means clean hair, and a missing `shape` means the strand has not been brushed, so no migration is needed. A present `shape` must be exactly 48 finite numbers within ±300; anything else is rejected with the existing visible warning. New fields are validated in both active looks and saved photos; their array/scalar representation keeps the existing independent snapshot copying safe.

Newer fields are read backward-compatibly, so `version` stays 2. A missing `outfit` (a save from before dress-up) loads as the cozy cape, while an unknown outfit is rejected with the visible warning. `curl` may still be the old true/false (true loads as 0.4, a noticeable wave with room to curl tighter) or a number from 0 to 1.

Saves are debounced for 250 ms and flushed on page hide or visibility loss. Snapshots copy the look, so later edits do not alter saved pictures. The gallery keeps the 12 newest snapshots. Storage failures are logged and surfaced in the UI; they do not block in-memory play.

Undo is intentionally not persisted. There is no backend, authentication, or cloud synchronization.

## Audio and export

`SalonAudio` creates an AudioContext only after a user-enabled sound action. Short, rate-limited synthesized notes need no audio assets. Nodes disconnect on completion; the context closes on app unmount. Unsupported audio gives a visible message and disables sound.

Picture export clones a saved portrait, serializes a self-contained SVG, rasterizes it into an 800 x 1000 canvas, and downloads a PNG Blob. The export has an opaque background and fixed local text. Object URLs are released after use. Encoding failures appear on the photo card.

## UI and lifecycle

The layout uses a two-column studio/toolbox at desktop and tablet widths, and a stacked touch layout on phones. Controls have accessible names, pressed/selected states, focus styling, and coarse-pointer sizing. Native dialogs contain keyboard focus, restore it on close, and have explicit Escape handling. Reduced-motion preferences disable character blinking.

`main.tsx` mounts the app under React StrictMode and a render error boundary. It does not register a service worker. Production consists entirely of static files, built with relative asset URLs (`base: './'`) and published to GitHub Pages by `.github/workflows/deploy.yml`.

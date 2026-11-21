# Capy & Co. architecture

## Why this stack

React + strict TypeScript + Vite, with original SVG illustrations. A 2D salon does not need the cancelled RPG's Babylon.js, physics, 3D assets, or VR systems. SVG keeps the characters sharp at different screen sizes and lets the interaction geometry match the artwork. Only React and React DOM ship as runtime dependencies.

## Gameplay boundary

`game/model.ts` defines `Look`, `Strand`, `SalonState`, and the `SalonAction` union. The pure `salonReducer` has no DOM, storage, audio, or input-device dependency.

- `select` changes the active friend without discarding their look.
- `style` applies a tool to explicit strand indices.
- `comb` straightens contacted locks and commits each one's brushed shape (a per-point displacement) when a brush drag ends.
- `lengths` applies bounded per-lock length changes from continuous cutting or growth. Trimming scales the saved bend and truncates the brushed shape; growing scales the shape with the new length. Unchanged values are skipped so no extra history is created.
- `air` applies bounded two-axis poses and wetness updates from continuous blow-drying.
- `accessory` changes the selected decoration.
- `undo` restores the previous look.
- `reset` restores that friend's default look.

Each look contains 65 independently editable strands and one accessory. Five interleaved strands surround each of the original 13 anchor groups: 55 strands on top and 10 at the sides. Shared geometry uses the anchor group, not a hard-coded side-index cutoff. Hair color strokes are 5.2 SVG units wide instead of 25. Optional scalar `bendX`/`bendY` values describe the saved tip offset from blow-drying and older styling. An optional `shape` holds the brushed pose as x/y displacements for each of the 24 drawn points after the root (48 numbers, rounded to two decimals, each within ±300). The root is never displaced. `soapy` records persistent lather, and `wetness` ranges from 0 (dry) to 1 (wet). Changes are immutable. Undo stores up to 40 structural-sharing snapshots for the current friend.

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
- **Commit.** When the gesture ends, `commit` returns each held strand's rounded shift and rebases its position, target, and origin so there is no visual jump. `Studio` adds that shift to the strand's saved `shape` through one `comb` action (without a new undo checkpoint), then `release` lets residual spring lag settle. Later strokes start from the saved shape, because contact is measured against the current polyline.
- **Other tools.** Curl and Color keep their wider effect radius, and additionally call the same `drag` for transient motion that is never saved. Soap and Wash cause no motion.

Spring animation state is local to the studio, not the save model: brushing does not rerender the whole app or write storage every frame. The existing `flow` field remains supported for older hairstyles.

### Hairline and scalp cover

`game/hairline.ts` ties the hair to the head. It exports `HEAD_TOP_PATH`, the top arc of the head outline that `Capybara` draws (so the head and the hair share one definition), and `headTopY(x)`, which solves that curve for the outline height at any x. `hairRoot(index)` places each top strand's fixed root just inside the outline (5 to 13 units deep by layer) instead of on a free-floating arch, so the hairline follows the head's curvature. `strandPoints` reads its root from there.

Brushed strands can leave the crown, so a `ScalpCap` in `Capybara` draws a band of hair under all the strands. `SCALP_CAP_POINTS` is built from the same head arc, enlarged slightly for the outer edge and shrunk toward the head center for the hairline, and cut off at the temples. It is a pure function of the strand data, with no saved state: `scalpTints` averages, for each of the 11 top-of-head columns, the color, wetness and soapiness of its five strands, and the cap paints those as horizontal gradients (color, damp overlay, foam overlay) so it matches the hair above and blends between differently painted locks. Because it lives in the character artwork, gallery thumbnails, portraits and PNG exports include it automatically.

`hairEditing.ts` implements continuous length tools without pulling the hair away from the finger:

- Scissors use a narrower swept contact area and the contact height to determine each crossed lock's new length. Bent or brushed hair uses a piecewise (per-segment) solve to find the retained portion nearest the finger, including folds that cross the same height twice; unshaped hair keeps the original quadratic solve. Trimming truncates the saved shape and scales the saved bend so the cut ends at that contact. Endpoint comparisons tolerate roundoff so holding scissors still does not repeatedly erode folded hair. Both upward-growing top hair and downward-growing side locks are supported.
- `HairGrowth` integrates elapsed time at 0.24 normalized length units per second, capped at 50 ms per update after a stall. Pointer moves and animation frames share one timestamp, so they never count the same time twice. A stationary hold retains its local lock selection as the tips extend. Moving the pointer replaces that selection, rather than accumulating every previously touched lock.
- Length edits use the same bounded, immutable helper in the reducer and the active gesture. This keeps rapid/coalesced events current before React finishes rendering. Length changes update the saved look; storage writes remain debounced. The frame loop runs while growth changes hair, and stops on release, cancellation, leaving hair, or reaching maximum length.

Curling, soaping, washing, and painting apply once per lock per gesture while continuously detecting newly crossed locks. Soap and Wash do not pull the hair away from the finger. Soap remains through other tools; Wash clears it locally, restores the original dye, and removes curls without resetting the saved brush arrangement. Whole-head actions cover all locks. All changes in one gesture share an undo checkpoint, including later cuts, growth frames, and the final brush pose. Undo/reset clear residual motion and stop active growth. The keyboard/whole-head shortcut retains its discrete one-step trim/grow behavior.

`HairBlower` uses a wider local contact area, then holds that selection while stationary so the wind does not stop as the tips move away. Moving replaces the held area and covers crossed strands. Air pushes away from the current pointer location, adds a bounded flutter, and dries at 0.65 wetness units per second. It shares a monotonic clock between pointer events and animation frames, with a 50 ms stall cap. Reduced motion removes the flutter. Air edits update the saved pose directly, so release does not spring back. Cancellation, blur, hiding the page, and changing tools/friends stop airflow; a gesture is one undo action. Soap and Wash set wetness to 1, while the dryer preserves soap until rinsed.

Mouse, touch, and pen all emit the same reducer actions. Keyboard and the whole-head shortcut use that same interface. `touch-action: none` is scoped to the interactive character; the rest of the page retains normal touch scrolling and zoom behavior.

`Capybara` is shared by the live studio, friend picker, and saved gallery. Lather is derived from each soaped strand's actual curve, including saved and transient bends, with five smaller bubbles per strand (325 maximum). It has no expiry timer or separate animation loop, ignores pointer events, and is included in portrait export. Wetness controls a darker sheen and sparse droplets. Airflow feedback is transient and never included in saved pictures. Gradient identifiers are unique per instance. There are no remote assets to load.

## Persistence

`StoragePort` separates JSON persistence from the browser. `SavedGame` is a versioned envelope containing current looks, selected character, photos, and sound settings.

Every loaded field is checked: valid character/accessory, exact lock count, bounded numeric fields, six-digit hex colors, valid photo dates, unique photo IDs, and bounded gallery size. Malformed or inaccessible storage returns a fresh playable state **and an explicit user-visible warning**.

The envelope now uses version 2, retaining the original local-storage key so existing data can be found. Validated 13-lock looks and photos are expanded by copying each original lock into five independent strands at its anchor. This also handles a still-open development tab writing its old hair array during hot refresh. Already-expanded 65-strand data is not duplicated. Missing bends/wetness mean zero, missing `soapy` means clean hair, and a missing `shape` means the strand has not been brushed, so no migration is needed. A present `shape` must be exactly 48 finite numbers within ±300; anything else is rejected with the existing visible warning. New fields are validated in both active looks and saved photos; their array/scalar representation keeps the existing independent snapshot copying safe.

Saves are debounced for 250 ms and flushed on page hide or visibility loss. Snapshots copy the look, so later edits do not alter saved pictures. The gallery keeps the 12 newest snapshots. Storage failures are logged and surfaced in the UI; they do not block in-memory play.

Undo is intentionally not persisted. There is no backend, authentication, or cloud synchronization.

## Audio and export

`SalonAudio` creates an AudioContext only after a user-enabled sound action. Short, rate-limited synthesized notes need no audio assets. Nodes disconnect on completion; the context closes on app unmount. Unsupported audio gives a visible message and disables sound.

Picture export clones a saved portrait, serializes a self-contained SVG, rasterizes it into an 800 x 1000 canvas, and downloads a PNG Blob. The export has an opaque background and fixed local text. Object URLs are released after use. Encoding failures appear on the photo card.

## UI and lifecycle

The layout uses a two-column studio/toolbox at desktop and tablet widths, and a stacked touch layout on phones. Controls have accessible names, pressed/selected states, focus styling, and coarse-pointer sizing. Native dialogs contain keyboard focus, restore it on close, and have explicit Escape handling. Reduced-motion preferences disable character blinking.

`main.tsx` mounts the app under React StrictMode and a render error boundary. It does not register a service worker. Production consists entirely of static files, built with relative asset URLs (`base: './'`) and published to GitHub Pages by `.github/workflows/deploy.yml`.

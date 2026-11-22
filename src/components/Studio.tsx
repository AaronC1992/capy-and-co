import { useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent } from 'react'
import type { ClipKind, DyeMode, HairAirEdit, HairCurlEdit, HairLengthEdit, Look, SalonAction, Tool, WearSlot } from '../game/model'
import { applyHairAir, applyHairCurl, applyHairLengths, CHARACTERS, MAX_CLIPS, STAGE, STRAND_COUNT } from '../game/model'
import { canWearAt, clipAt, clipPosition, clipUnder, isWearable, nextClipSpot, wornSpot, wornUnder } from '../game/accessories'
import { hitHairStroke, strandPoints } from '../game/hair'
import type { Point } from '../game/hair'
import { Capybara } from './Capybara'
import type { Mood } from './Capybara'
import type { Sound } from '../game/audio'
import { CLIP_LABELS } from './Accessories'
import type { Lifted } from './Accessories'
import { SalonRoom } from './SalonRoom'
import { Icon } from './Icon'
import { useHairMotion } from './useHairMotion'
import { cutHairStroke, HairGrowth } from '../game/hairEditing'
import { HairBlower } from '../game/hairBlower'
import { HairComb } from '../game/hairComb'
import { HairCurler } from '../game/hairCurl'
import { HairSprayer } from '../game/hairSprayer'
import type { SprayJet } from '../game/hairSprayer'
import { soakedOffsets } from '../game/hairDroop'
import { warmHeadShape } from '../game/headShape'
import type { AirJet } from '../game/hairWind'
import { addShape } from '../game/hairLayout'
import type { StrandPose } from '../game/hairLayout'
import { BodyTouch, isFaceSpot, isReaction, REACTION_TIMES, reactionFor, spotAt } from '../game/reactions'
import type { BodySpot, Reaction } from '../game/reactions'

interface Props {
  look: Look
  tool: Tool
  color: string
  dye: DyeMode
  // On the Dress up tab, touching the capybara puts on clips instead of styling the hair.
  decorating: boolean
  clip: ClipKind
  dispatch: Dispatch<SalonAction>
  onStyle: (sound: Sound) => void
  canUndo: boolean
}

export const TOOL_HINTS: Record<Tool, string> = {
  brush: 'Brush right where you touch! Hair stays where you leave it.',
  comb: 'Trace a path with the comb! The hair lies along your line.',
  snip: 'Drag to cut right where your finger goes. Cut down to the scalp to go bald!',
  grow: 'Hold to grow! Slide to another patch of hair, even bare scalp.',
  curl: 'Hold your finger on the hair. The longer you hold, the curlier it gets!',
  soap: 'Rub on fluffy soap! Bubbles stay until you wash.',
  wash: 'Hold and swipe to spray! Wet hair rinses clean and hangs straight down.',
  blower: 'Hold and swipe! The air blows the hair around and makes it flap.',
  color: 'Paint the hair! Try dipped tips, a fade, rainbow or glitter.',
}

// How the capybara reacts to each tool: soap tickles, water makes it squint, snips are a little surprising.
const TOOL_MOODS: Record<Tool, Mood> = {
  brush: 'happy',
  comb: 'happy',
  snip: 'surprised',
  grow: 'happy',
  curl: 'happy',
  soap: 'giggle',
  wash: 'squint',
  blower: 'breeze',
  color: 'happy',
}

interface HairGesture {
  id: number
  last: Point
  touched: Set<number>
  started: boolean
  look: Look
  growth: HairGrowth | null
  curler: HairCurler | null
  blower: HairBlower | null
  comb: HairComb | null
  sprayer: HairSprayer | null
}

// A clip (by its number), or the hat, glasses or headband, being carried by a finger. It only moves if the finger
// really slides, so a tap leaves it be.
interface Carried {
  id: number
  item: number | WearSlot
  from: Point
  // From the finger to where the thing sits, so it doesn't jump under the finger when picked up.
  shift: Point
  moved: boolean
}
const CLIP_SLIDE = 6

const REACTION_SOUNDS: Record<Reaction, Sound> = { 'poked-left': 'poke', 'poked-right': 'poke', sneeze: 'sneeze', boop: 'boing', ticklish: 'giggle' }

// A finger on the capybara that might turn out to be a poke or a tickle. `busy` means the press already put on or
// picked up a clip, or moved something being worn, so lifting it isn't a poke.
interface Feeling {
  id: number
  body: BodyTouch
  busy: boolean
}

export function Studio({ look, tool, color, dye, decorating, clip, dispatch, onStyle, canUndo }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<HairGesture | null>(null)
  const carried = useRef<Carried | null>(null)
  const feeling = useRef<Feeling | null>(null)
  const reacting = useRef<{ reaction: Reaction; until: number } | null>(null)
  const [beat, setBeat] = useState(0)
  const [lifted, setLifted] = useState<Lifted | null>(null)
  const { motion, offsets, animate, reset, publish } = useHairMotion(editOnFrame)
  const [mood, setMood] = useState<Mood>('calm')
  const [dragging, setDragging] = useState(false)
  const [airflow, setAirflow] = useState<AirJet | null>(null)
  const [spray, setSpray] = useState<SprayJet | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const friend = CHARACTERS.find((c) => c.id === look.character)!
  const full = look.clips.length >= MAX_CLIPS
  const clipName = CLIP_LABELS[clip].toLowerCase()
  const hint = !decorating ? TOOL_HINTS[tool]
    : full ? 'That’s a lot of clips! Drag one off to make room.'
      : `Tap anywhere on ${friend.name} to add a ${clipName}. Drag anything ${friend.name} is wearing to move it, or off to take it off.`
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    const current = gesture.current
    current?.growth?.stop()
    current?.curler?.stop()
    current?.blower?.stop()
    current?.sprayer?.stop()
    gesture.current = null
    if (current && svgRef.current?.hasPointerCapture(current.id)) svgRef.current.releasePointerCapture(current.id)
    const held = carried.current
    carried.current = null
    if (held && svgRef.current?.hasPointerCapture(held.id)) svgRef.current.releasePointerCapture(held.id)
    feeling.current = null
    reset()
    setDragging(false)
    setAirflow(null)
    setSpray(null)
    setLifted(null)
  }, [look.character, tool, decorating, reset])
  // The sprayer measures hair against the head's outline; build it before the first spray so that touch isn't slow.
  useEffect(() => { if (tool === 'wash') warmHeadShape() }, [tool])

  function feel(next: Mood, time = 1000) {
    setMood(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMood('calm'), time)
  }

  // A poke or tickle shows on the capybara's face for a moment, even if styling carries on.
  function reactionPlaying(): Reaction | null {
    const current = reacting.current
    return current && performance.now() < current.until ? current.reaction : null
  }

  function reactToStyling() {
    if (!reactionPlaying()) feel(decorating ? 'happy' : TOOL_MOODS[tool])
    onStyle(decorating ? 'pop' : tool)
  }

  // A sneeze plays out before the next one, and a tickle carries on while the rubbing does; anything else starts over.
  function react(spot: BodySpot, rubbed: boolean) {
    const reaction = reactionFor(spot, rubbed)
    const playing = reactionPlaying()
    if (playing === 'sneeze' && reaction === 'sneeze') return
    if (!(playing === 'ticklish' && reaction === 'ticklish')) setBeat((count) => count + 1)
    reacting.current = { reaction, until: performance.now() + REACTION_TIMES[reaction] }
    feel(reaction, REACTION_TIMES[reaction])
    onStyle(REACTION_SOUNDS[reaction])
  }

  // Ends a finger's poke-or-tickle tracking. Returns the spot it poked, if it was a poke.
  function letGo(id: number, point: Point | null, now: number): BodySpot | null {
    const current = feeling.current
    if (current?.id !== id) return null
    feeling.current = null
    return point && !current.busy ? current.body.lift(point, now) : null
  }

  // A soaked capybara shakes the water off once the spraying stops.
  function shakeOff() {
    feel('shake', 900)
    onStyle('wash')
  }

  function pointFromEvent(event: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(matrix.inverse())
  }

  // Touching hair makes the capybara react; only a saved change (`started`) earns an undo step. Held tools keep
  // making their sound while they work; the audio spaces the sounds out.
  function markTouched(current: HairGesture, indices: number[]) {
    const fresh = indices.some((index) => !current.touched.has(index))
    indices.forEach((index) => current.touched.add(index))
    setDragging(true)
    if (fresh) reactToStyling()
    else onStyle(tool)
  }

  function markEdited(current: HairGesture, indices: number[]) {
    current.started = true
    markTouched(current, indices)
  }

  function changeLengths(current: HairGesture, edits: HairLengthEdit[]): boolean {
    const next = applyHairLengths(current.look, edits)
    if (next === current.look) return false
    dispatch({ type: 'lengths', edits, checkpoint: !current.started })
    current.look = next
    markEdited(current, edits.map(({ index }) => index))
    return true
  }

  function changeCurls(current: HairGesture, edits: HairCurlEdit[]) {
    const next = applyHairCurl(current.look, edits)
    if (next === current.look) return
    dispatch({ type: 'curl', edits, checkpoint: !current.started })
    current.look = next
    markEdited(current, edits.map(({ index }) => index))
  }

  function changeAir(current: HairGesture, edits: HairAirEdit[]) {
    const next = applyHairAir(current.look, edits)
    if (next === current.look) return
    dispatch({ type: 'air', edits, checkpoint: !current.started })
    current.look = next
    markEdited(current, edits.map(({ index }) => index))
  }

  // Sends the pose the air is blowing the hair toward to the springs; flapping comes from that pose
  // changing every frame. Nothing is saved until the finger lifts.
  function blowHair(current: HairGesture, blower: HairBlower) {
    const poses = blower.poses()
    if (!poses.length) return
    motion.current.blow(poses)
    markTouched(current, poses.map(({ index }) => index))
  }

  // The comb takes hold of the hair it touches and lays it along the line the finger draws. Nothing is
  // saved until the finger lifts.
  function combHair(current: HairGesture, comb: HairComb, point: Point) {
    const taken = comb.move(look, point, motion.current.offsets())
    const curly = taken.filter((index) => look.hair[index].curl > 0)
    if (curly.length) {
      // Combing smooths curls out at once.
      dispatch({ type: 'pose', locks: curly.map((index) => ({ index, flow: look.hair[index].flow })), checkpoint: !current.started })
      current.started = true
    }
    if (taken.length) markTouched(current, taken)
    const poses = comb.poses()
    if (!poses.length) return
    motion.current.comb(poses)
    animate()
  }

  // Weighs the hair the spray has soaked down toward the way it hangs. Water takes a moment to pull hair down, so the
  // springs carry it there; nothing is saved until the finger lifts.
  function soakHair(current: HairGesture, sprayer: HairSprayer) {
    const poses = sprayer.poses()
    if (!poses.length) return
    motion.current.soak(poses)
    markTouched(current, poses.map(({ index }) => index))
  }

  // Makes the pose the air or the water left the hair in its resting shape, so it stays that way.
  function keepPose(current: HairGesture, poses: readonly StrandPose[], hold: 'blow' | 'soak') {
    motion.current[hold](poses)
    const edits = motion.current.heldStrands().flatMap((index) => {
      const shift = motion.current.commit(index)
      return shift ? [{ index, shape: addShape(current.look.hair[index].shape, shift) ?? null }] : []
    })
    if (edits.length) dispatch({ type: 'air', edits, checkpoint: !current.started })
  }

  function editOnFrame(now: number): boolean {
    const current = gesture.current
    if (!current || current.look.character !== look.character || document.hidden) return false
    if (current.growth && tool === 'grow') {
      changeLengths(current, current.growth.hold(current.look, now))
      return current.growth.canGrow(current.look)
    }
    if (current.curler && tool === 'curl') {
      changeCurls(current, current.curler.hold(current.look, now))
      return current.curler.canCurl(current.look)
    }
    if (current.blower && tool === 'blower') {
      changeAir(current, current.blower.hold(current.look, now))
      blowHair(current, current.blower)
      return current.blower.isBlowing()
    }
    if (current.sprayer && tool === 'wash') {
      changeAir(current, current.sprayer.hold(now))
      soakHair(current, current.sprayer)
      return current.sprayer.isSpraying()
    }
    return false
  }

  function stroke(point: Point) {
    const current = gesture.current
    if (!current) return
    if (tool === 'snip') {
      changeLengths(current, cutHairStroke(current.look, current.last, point))
      current.last = point
      return
    }
    if (current.growth) {
      changeLengths(current, current.growth.move(current.look, point, performance.now()))
      current.last = point
      animate()
      return
    }
    if (current.curler) {
      changeCurls(current, current.curler.move(current.look, point, performance.now()))
      current.last = point
      animate()
      return
    }
    if (current.blower) {
      changeAir(current, current.blower.move(current.look, point, performance.now()))
      blowHair(current, current.blower)
      current.last = point
      setAirflow(current.blower.jet())
      animate()
      return
    }
    if (current.comb) {
      combHair(current, current.comb, point)
      return
    }
    if (current.sprayer) {
      changeAir(current, current.sprayer.move(point, performance.now()))
      soakHair(current, current.sprayer)
      current.last = point
      setSpray(current.sprayer.jet())
      animate()
      return
    }
    // The brush only touches the hair directly under the fingertip; other tools affect a wider patch.
    const hits = tool === 'brush' ? motion.current.drag(look, current.last, point) : hitHairStroke(look, current.last, point, motion.current.offsets())
    if (tool === 'color') motion.current.drag(look, current.last, point)
    const fresh = hits.filter((index) => !current.touched.has(index))
    if (fresh.length) {
      if (tool === 'brush') {
        dispatch({ type: 'pose', locks: fresh.map((index) => ({ index, flow: look.hair[index].flow })), checkpoint: !current.started })
      } else {
        dispatch({ type: 'style', tool, strands: fresh, color, dye, direction: 0, checkpoint: !current.started })
      }
      current.started = true
      fresh.forEach((index) => current.touched.add(index))
      setDragging(true)
      reactToStyling()
    }
    if (current.started) animate()
    current.last = point
  }

  function addClip(point: Point) {
    if (full) return
    dispatch({ type: 'clips', clips: [...look.clips, clipAt(look, clip, point)] })
    reactToStyling()
  }

  // Puts a clip on where the finger tapped. Tapping an eye or the nose pokes it instead, so nothing goes on there.
  function tapToClip(point: Point): boolean {
    if (!isWearable(look, point, offsets) || isFaceSpot(spotAt(point))) return false
    addClip(point)
    if (feeling.current) feeling.current.busy = true
    return true
  }

  // Picks up the clip under the finger, or gets ready to carry the hat, glasses or headband if the finger slides, or
  // puts a new clip on.
  function startDecorating(event: PointerEvent<SVGSVGElement>, point: Point) {
    const index = clipUnder(look, point, offsets)
    const slot = index < 0 ? wornUnder(look, point) : null
    if (index < 0 && !slot) {
      tapToClip(point)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const spot = slot ? wornSpot(look, slot) : clipPosition(look, look.clips[index], offsets)
    carried.current = { id: event.pointerId, item: slot ?? index, from: point, shift: { x: spot.x - point.x, y: spot.y - point.y }, moved: false }
    if (slot) return
    if (feeling.current) feeling.current.busy = true
    setLifted({ item: index, x: spot.x, y: spot.y, away: false })
  }

  function fitsAt(item: number | WearSlot, spot: Point): boolean {
    return typeof item === 'number' ? isWearable(look, spot, offsets) : canWearAt(look, item, spot, offsets)
  }

  function carriedTo(held: Carried, point: Point): Point {
    return {
      x: Math.max(0, Math.min(STAGE.width, point.x + held.shift.x)),
      y: Math.max(0, Math.min(STAGE.height, point.y + held.shift.y)),
    }
  }

  function moveCarried(point: Point) {
    const held = carried.current
    if (!held) return
    if (!held.moved && Math.hypot(point.x - held.from.x, point.y - held.from.y) > CLIP_SLIDE) {
      held.moved = true
      if (feeling.current) feeling.current.busy = true
    }
    if (!held.moved) return
    const spot = carriedTo(held, point)
    setLifted({ item: held.item, ...spot, away: !fitsAt(held.item, spot) })
  }

  // Lets go of whatever is being carried: it goes on where it is dropped, or comes off if dropped away from the
  // capybara. A tap on the hat, glasses or headband that didn't carry it puts a clip there or pokes, as it would
  // anywhere else.
  function dropCarried(point: Point | null, poked: BodySpot | null = null) {
    const held = carried.current
    if (!held) return
    carried.current = null
    setLifted(null)
    if (svgRef.current?.hasPointerCapture(held.id)) svgRef.current.releasePointerCapture(held.id)
    if (!point) return
    const item = held.item
    if (!held.moved) {
      if (typeof item !== 'number' && !tapToClip(point) && poked) react(poked, false)
      return
    }
    const spot = carriedTo(held, point)
    const fits = fitsAt(item, spot)
    if (typeof item === 'number') {
      const others = look.clips.filter((_, index) => index !== item)
      // A moved clip goes on top of the others.
      dispatch({ type: 'clips', clips: fits ? [...others, clipAt(look, look.clips[item].kind, spot)] : others })
    } else {
      dispatch(fits ? { type: 'place', slot: item, ...spot } : { type: 'wear', slot: item, item: 'none' })
    }
    reactToStyling()
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (gesture.current || carried.current || !event.isPrimary || event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    feeling.current = { id: event.pointerId, body: new BodyTouch(point, event.timeStamp), busy: false }
    if (decorating) {
      startDecorating(event, point)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      id: event.pointerId,
      last: point,
      touched: new Set(),
      started: false,
      look,
      growth: tool === 'grow' ? new HairGrowth(look, point, performance.now()) : null,
      curler: tool === 'curl' ? new HairCurler(look, point, performance.now()) : null,
      blower: tool === 'blower' ? new HairBlower(look, point, performance.now(), matchMedia('(prefers-reduced-motion: reduce)').matches) : null,
      comb: tool === 'comb' ? new HairComb(point) : null,
      sprayer: tool === 'wash' ? new HairSprayer(look, point, performance.now()) : null,
    }
    stroke(point)
  }

  function finish() {
    const current = gesture.current
    if (!current) return
    const swept = current.blower?.settled() ?? []
    const soaked = current.sprayer?.poses(true) ?? []
    current.growth?.stop()
    current.curler?.stop()
    current.blower?.stop()
    current.sprayer?.stop()
    gesture.current = null
    if (current.comb) motion.current.comb(current.comb.poses())
    if (current.comb || (tool === 'brush' && current.started)) {
      // The last brushed or combed position becomes the strand's resting shape, so the hair stays where it was left.
      const locks = motion.current.heldStrands().flatMap((index) => {
        const strand = look.hair[index]
        const shift = motion.current.commit(index)
        return shift ? [{ index, flow: strand.flow, shape: addShape(strand.shape, shift) ?? null }] : []
      })
      if (locks.length) dispatch({ type: 'pose', locks, checkpoint: !current.started })
    }
    // Blown hair stays swept the way the air left it, minus the flapping; soaked hair stays hanging.
    if (swept.length) keepPose(current, swept, 'blow')
    if (soaked.length) keepPose(current, soaked, 'soak')
    motion.current.release()
    publish()
    animate()
    setDragging(false)
    setAirflow(null)
    setSpray(null)
    if (svgRef.current?.hasPointerCapture(current.id)) svgRef.current.releasePointerCapture(current.id)
    if (current.sprayer && current.touched.size) shakeOff()
  }

  const finishRef = useRef(finish)
  useEffect(() => { finishRef.current = finish })
  const dropRef = useRef(dropCarried)
  useEffect(() => { dropRef.current = dropCarried })
  useEffect(() => {
    const release = () => { finishRef.current(); dropRef.current(null) }
    const hidden = () => { if (document.visibilityState === 'hidden') release() }
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [])

  function styleAll() {
    finish()
    reset()
    dispatch({ type: 'style', tool, strands: Array.from({ length: STRAND_COUNT }, (_, i) => i), color, dye, direction: 0.6, checkpoint: true })
    if (tool === 'wash') {
      // A soaked head hangs down all over, the same as hair the spray has reached.
      const edits = look.hair.map((strand, index) => ({ index, shape: addShape(strand.shape, soakedOffsets(strandPoints(strand, index))) ?? null }))
      dispatch({ type: 'air', edits, checkpoint: false })
      shakeOff()
      return
    }
    reactToStyling()
  }

  function restore(type: 'undo' | 'reset') {
    finish()
    dropCarried(null)
    reset()
    dispatch({ type })
  }

  return <section className={`studio-panel tool-${tool} ${decorating ? 'decorating' : ''}`} aria-label="Interactive hair studio">
    <SalonRoom />
    <div className="studio-actions">
      <button className="round-button" title="Undo last change" aria-label="Undo last change" disabled={!canUndo} onClick={() => restore('undo')}><Icon name="undo" /></button>
      <button className="round-button" title="Start this look again (you can undo)" aria-label="Reset this look" onClick={() => restore('reset')}><Icon name="reset" /></button>
    </div>
    <Capybara
      look={look}
      svgRef={svgRef}
      className="studio-capy"
      data-testid="styling-canvas"
      role="group"
      tabIndex={0}
      aria-label={decorating ? `${friend.name}. ${hint} Press Enter to add a ${clipName}.` : `${friend.name}'s hair. ${hint} Press Enter to apply to all hair.`}
      mood={dragging && !decorating && !isReaction(mood) ? TOOL_MOODS[tool] : mood}
      beat={beat}
      hairOffsets={offsets}
      airflow={airflow ?? undefined}
      spray={spray ?? undefined}
      lifted={lifted ?? undefined}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (carried.current?.id === event.pointerId) {
          const point = pointFromEvent(event)
          if (point) moveCarried(point)
          return
        }
        const styling = gesture.current?.id === event.pointerId
        const touch = feeling.current?.id === event.pointerId ? feeling.current : null
        // A mouse that let go outside the picture is only hovering now.
        if (touch && !styling && event.buttons === 0) feeling.current = null
        if (!styling && (!touch || event.buttons === 0)) return
        const samples = event.nativeEvent.getCoalescedEvents?.() ?? []
        for (const sample of samples.length ? samples : [event]) {
          const point = pointFromEvent(sample)
          if (!point) continue
          if (styling) stroke(point)
          // Rubbing bare fur tickles; rubbing hair is just styling.
          const tickled = touch?.body.move(point)
          if (tickled && !gesture.current?.touched.size) react(tickled, true)
        }
      }}
      onPointerUp={(event) => {
        const point = pointFromEvent(event)
        const poked = letGo(event.pointerId, point, event.timeStamp)
        if (carried.current?.id === event.pointerId) {
          dropCarried(point, poked)
          return
        }
        const current = gesture.current?.id === event.pointerId ? gesture.current : null
        if (current && point) stroke(point)
        // A tap that didn't touch any hair is a poke.
        const quiet = !current?.touched.size
        if (current) finish()
        if (poked && quiet) react(poked, false)
      }}
      onPointerCancel={(event) => {
        letGo(event.pointerId, null, event.timeStamp)
        if (carried.current?.id === event.pointerId) dropCarried(null)
        if (gesture.current?.id === event.pointerId) finish()
      }}
      onLostPointerCapture={(event) => {
        letGo(event.pointerId, null, event.timeStamp)
        if (carried.current?.id === event.pointerId) dropCarried(null)
        if (gesture.current?.id === event.pointerId) finish()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (decorating) addClip(nextClipSpot(look))
        else styleAll()
      }}
    />
    <div className="studio-tip"><Icon name="sparkles" size={17} /><span>{hint}</span></div>
    {decorating
      ? <button className="all-hair-button" disabled={!look.clips.length} onClick={() => { dispatch({ type: 'clips', clips: [] }); reactToStyling() }}><Icon name="trash" size={17} /> Take off the clips</button>
      : <button className="all-hair-button" onClick={styleAll}><Icon name={tool} size={17} /> Do all the hair</button>}
  </section>
}

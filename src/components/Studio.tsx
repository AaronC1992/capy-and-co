import { useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent } from 'react'
import type { HairAirEdit, HairLengthEdit, Look, SalonAction, Tool } from '../game/model'
import { applyHairAir, applyHairLengths, CHARACTERS, STRAND_COUNT } from '../game/model'
import { hitHairStroke, strandPoints } from '../game/hair'
import type { Point } from '../game/hair'
import { Capybara } from './Capybara'
import { SalonRoom } from './SalonRoom'
import { Icon } from './Icon'
import { useHairMotion } from './useHairMotion'
import { cutHairStroke, HairGrowth } from '../game/hairEditing'
import { HairBlower } from '../game/hairBlower'
import { HairComb } from '../game/hairComb'
import { HairSprayer } from '../game/hairSprayer'
import type { SprayJet } from '../game/hairSprayer'
import { soakedOffsets } from '../game/hairDroop'
import { warmHeadShape } from '../game/headShape'
import type { AirJet } from '../game/hairWind'
import { addShape } from '../game/hairLayout'
import type { StrandPose } from '../game/hairLayout'

interface Props {
  look: Look
  tool: Tool
  color: string
  dispatch: Dispatch<SalonAction>
  onStyle: () => void
  canUndo: boolean
}

export const TOOL_HINTS: Record<Tool, string> = {
  brush: 'Brush right where you touch! Hair stays where you leave it.',
  comb: 'Trace a path with the comb! The hair lies along your line.',
  snip: 'Drag to cut right where your finger goes.',
  grow: 'Hold to grow! Slide to another patch of hair.',
  curl: 'Swipe the hair for bouncy, happy curls.',
  soap: 'Rub on fluffy soap! Bubbles stay until you wash.',
  wash: 'Hold and swipe to spray! Wet hair rinses clean and hangs straight down.',
  blower: 'Hold and swipe! The air blows the hair around and makes it flap.',
  color: 'Paint the hair with your favorite color.',
}

interface HairGesture {
  id: number
  last: Point
  touched: Set<number>
  started: boolean
  look: Look
  growth: HairGrowth | null
  blower: HairBlower | null
  comb: HairComb | null
  sprayer: HairSprayer | null
}

export function Studio({ look, tool, color, dispatch, onStyle, canUndo }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<HairGesture | null>(null)
  const { motion, offsets, animate, reset, publish } = useHairMotion(editOnFrame)
  const [happy, setHappy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [airflow, setAirflow] = useState<AirJet | null>(null)
  const [spray, setSpray] = useState<SprayJet | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const friend = CHARACTERS.find((c) => c.id === look.character)!
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    const current = gesture.current
    current?.growth?.stop()
    current?.blower?.stop()
    current?.sprayer?.stop()
    gesture.current = null
    if (current && svgRef.current?.hasPointerCapture(current.id)) svgRef.current.releasePointerCapture(current.id)
    reset()
    setDragging(false)
    setAirflow(null)
    setSpray(null)
  }, [look.character, tool, reset])
  // The sprayer measures hair against the head's outline; build it before the first spray so that touch isn't slow.
  useEffect(() => { if (tool === 'wash') warmHeadShape() }, [tool])

  function reactToStyling() {
    setHappy(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHappy(false), 1000)
    onStyle()
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

  // Touching hair makes the capybara happy; only a saved change (`started`) earns an undo step.
  function markTouched(current: HairGesture, indices: number[]) {
    const fresh = indices.some((index) => !current.touched.has(index))
    indices.forEach((index) => current.touched.add(index))
    setDragging(true)
    if (fresh) reactToStyling()
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
    const curly = taken.filter((index) => look.hair[index].curl)
    if (curly.length) {
      // Combing smooths curls out at once, so the hair is drawn the way it will be saved.
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
    const hits = tool === 'brush' ? motion.current.drag(look, current.last, point, true) : hitHairStroke(look, current.last, point, motion.current.offsets())
    if (tool === 'curl' || tool === 'color') motion.current.drag(look, current.last, point)
    const fresh = hits.filter((index) => !current.touched.has(index))
    if (fresh.length) {
      if (tool === 'brush') {
        dispatch({ type: 'pose', locks: fresh.map((index) => ({ index, flow: look.hair[index].flow })), checkpoint: !current.started })
      } else {
        dispatch({ type: 'style', tool, strands: fresh, color, direction: 0, checkpoint: !current.started })
      }
      current.started = true
      fresh.forEach((index) => current.touched.add(index))
      setDragging(true)
      reactToStyling()
    }
    if (current.started) animate()
    current.last = point
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (gesture.current || !event.isPrimary || event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      id: event.pointerId,
      last: point,
      touched: new Set(),
      started: false,
      look,
      growth: tool === 'grow' ? new HairGrowth(look, point, performance.now()) : null,
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
  }

  const finishRef = useRef(finish)
  useEffect(() => { finishRef.current = finish })
  useEffect(() => {
    const release = () => finishRef.current()
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
    dispatch({ type: 'style', tool, strands: Array.from({ length: STRAND_COUNT }, (_, i) => i), color, direction: 0.6, checkpoint: true })
    if (tool === 'wash') {
      // A soaked head hangs down all over, the same as hair the spray has reached.
      const edits = look.hair.map((strand, index) => ({ index, shape: addShape(strand.shape, soakedOffsets(strandPoints(strand.curl ? { ...strand, curl: false } : strand, index))) ?? null }))
      dispatch({ type: 'air', edits, checkpoint: false })
    }
    reactToStyling()
  }

  function restore(type: 'undo' | 'reset') {
    finish()
    reset()
    dispatch({ type })
  }

  return <section className={`studio-panel tool-${tool}`} aria-label="Interactive hair studio">
    <SalonRoom />
    <div className="studio-tag"><span className="live-dot" /> {friend.name}'s happy place</div>
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
      aria-label={`${friend.name}'s hair. ${TOOL_HINTS[tool]} Press Enter to apply to all hair.`}
      happy={happy || dragging}
      hairOffsets={offsets}
      airflow={airflow ?? undefined}
      spray={spray ?? undefined}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (gesture.current?.id !== event.pointerId) return
        const samples = event.nativeEvent.getCoalescedEvents?.() ?? []
        for (const sample of samples.length ? samples : [event]) {
          const point = pointFromEvent(sample)
          if (point) stroke(point)
        }
      }}
      onPointerUp={(event) => {
        if (gesture.current?.id !== event.pointerId) return
        const point = pointFromEvent(event)
        if (point) stroke(point)
        finish()
      }}
      onPointerCancel={(event) => { if (gesture.current?.id === event.pointerId) finish() }}
      onLostPointerCapture={(event) => { if (gesture.current?.id === event.pointerId) finish() }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); styleAll() } }}
    />
    <div className="studio-tip"><Icon name="sparkles" size={17} /><span>{TOOL_HINTS[tool]}</span></div>
    <button className="all-hair-button" onClick={styleAll}><Icon name={tool} size={17} /> Do all the hair</button>
  </section>
}

<script lang="ts">
  import type { Rect } from '@game/engine/types'

  interface Props {
    rect: Rect
    kind: 'hotspot' | 'walkbox'
    label?: string
    selected: boolean
    // Fattore di scala dello stage: i clientX/Y vanno divisi per k.
    k: number
    onselect: () => void
    onchange: (rect: Rect) => void
  }

  let { rect, kind, label, selected, k, onselect, onchange }: Props = $props()

  type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  const DIRS: Dir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const MIN = 4

  function handleStyle(dir: Dir): string {
    const [, , w, h] = rect
    const cx = dir.includes('w') ? 0 : dir.includes('e') ? w : w / 2
    const cy = dir.includes('n') ? 0 : dir.includes('s') ? h : h / 2
    const cursor = `${dir}-resize`
    return `left:${cx - 4}px;top:${cy - 4}px;cursor:${cursor}`
  }

  function startDrag(e: PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    onselect()
    const [x0, y0, w, h] = rect
    trackPointer(e, (dx, dy) => onchange([Math.round(x0 + dx), Math.round(y0 + dy), w, h]))
  }

  function startResize(e: PointerEvent, dir: Dir) {
    if (e.button !== 0) return
    e.stopPropagation()
    const [x0, y0, w0, h0] = rect
    trackPointer(e, (dx, dy) => {
      let x = x0
      let y = y0
      let w = w0
      let h = h0
      if (dir.includes('e')) w = Math.max(MIN, w0 + dx)
      if (dir.includes('s')) h = Math.max(MIN, h0 + dy)
      if (dir.includes('w')) {
        w = Math.max(MIN, w0 - dx)
        x = x0 + w0 - w
      }
      if (dir.includes('n')) {
        h = Math.max(MIN, h0 - dy)
        y = y0 + h0 - h
      }
      onchange([Math.round(x), Math.round(y), Math.round(w), Math.round(h)])
    })
  }

  // Segue il pointer su window finché non viene rilasciato, riportando i
  // delta già convertiti in coordinate di gioco.
  function trackPointer(e: PointerEvent, move: (dx: number, dy: number) => void) {
    const sx = e.clientX
    const sy = e.clientY
    const onMove = (ev: PointerEvent) => move((ev.clientX - sx) / k, (ev.clientY - sy) / k)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- superficie di manipolazione col mouse, gli stessi valori sono editabili da form -->
<div
  class="rect-box {kind}"
  class:selected
  style="left:{rect[0]}px;top:{rect[1]}px;width:{rect[2]}px;height:{rect[3]}px"
  onpointerdown={startDrag}
>
  {#if label}
    <span class="tag">{label}</span>
  {/if}
  {#if selected}
    {#each DIRS as dir (dir)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="handle" style={handleStyle(dir)} onpointerdown={(e) => startResize(e, dir)}></div>
    {/each}
  {/if}
</div>

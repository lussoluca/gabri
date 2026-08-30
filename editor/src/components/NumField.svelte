<script lang="ts">
  // Campo numerico con stepper: su tablet i pulsanti +/− sono molto più
  // comodi degli spinner nativi (che iOS non mostra).
  interface Props {
    value: number
    set: (n: number) => void
    label: string
    step?: number
  }

  let { value, set, label, step = 1 }: Props = $props()

  function onInput(e: Event & { currentTarget: HTMLInputElement }) {
    const n = Number(e.currentTarget.value)
    if (!Number.isNaN(n)) set(n)
  }
</script>

<div class="numfield">
  <button type="button" aria-label="{label}: diminuisci" onclick={() => set(value - step)}>−</button>
  <input type="number" inputmode="numeric" aria-label={label} {value} oninput={onInput} />
  <button type="button" aria-label="{label}: aumenta" onclick={() => set(value + step)}>+</button>
</div>

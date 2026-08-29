<script lang="ts">
  import { issues } from '../state/store.svelte'

  let collapsed = $state(false)
  const list = $derived(issues())
  const errors = $derived(list.filter((i) => i.severity === 'error').length)
  const warnings = $derived(list.length - errors)
</script>

{#if list.length > 0}
  <footer class="validation">
    <button
      style="border: none; background: none; padding: 0; margin-bottom: 4px"
      onclick={() => (collapsed = !collapsed)}
    >
      {collapsed ? '▸' : '▾'} Validazione:
      {#if errors > 0}<span class="badge errors">{errors}</span>{/if}
      {#if warnings > 0}<span class="badge warnings">{warnings}</span>{/if}
    </button>
    {#if !collapsed}
      {#each list as issue, i (i)}
        <div class="issue {issue.severity}">
          <span class="sev">{issue.severity === 'error' ? '✘' : '⚠'}</span>
          <span class="file">{issue.file}</span>
          <span>{issue.message}</span>
        </div>
      {/each}
    {/if}
  </footer>
{/if}

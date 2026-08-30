<script lang="ts">
  import type { AlertEvent } from '../../lib/types'
  import { formatRelativeTime } from '../../lib/formatters'
  import { alertStore } from './alertStore'

  export let alerts: AlertEvent[] = []

  const SEVERITY_STYLE: Record<AlertEvent['severity'], string> = {
    info: 'border-l-slate-500 text-slate-300',
    warning: 'border-l-amber-500 text-amber-200',
    critical: 'border-l-red-500 text-red-200',
  }
</script>

<ul class="flex flex-col gap-1 overflow-y-auto">
  {#each alerts as alert (alert.id)}
    <li class="border-l-4 bg-slate-800/40 px-3 py-2 text-xs {SEVERITY_STYLE[alert.severity]} {alert.acknowledged ? 'opacity-40' : ''}">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium uppercase tracking-wide">{alert.severity}</span>
        <span class="text-slate-500">{formatRelativeTime(alert.timestamp)}</span>
      </div>
      <div class="mt-0.5 text-slate-200">{alert.description}</div>
      <div class="mt-1 flex items-center justify-between text-slate-500">
        <span>{alert.source}</span>
        {#if !alert.acknowledged}
          <button
            type="button"
            class="text-slate-400 underline underline-offset-2 hover:text-slate-200"
            onclick={() => alertStore.acknowledge(alert.id)}
          >
            acknowledge
          </button>
        {/if}
      </div>
    </li>
  {:else}
    <li class="p-3 text-xs text-slate-500">No alerts yet.</li>
  {/each}
</ul>

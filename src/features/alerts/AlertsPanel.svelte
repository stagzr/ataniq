<script lang="ts">
  import type { AlertEvent, Vehicle } from '../../lib/types'
  import { formatRelativeTime } from '../../lib/formatters'
  import { alertStore } from './alertStore'

  export let alerts: AlertEvent[] = []
  export let vehicles: Vehicle[] = []
  export let onSelectSource: (source: string) => void = () => {}

  const SEVERITY_STYLE: Record<AlertEvent['severity'], string> = {
    info: 'border-l-slate-500 text-slate-300',
    warning: 'border-l-amber-500 text-amber-200',
    critical: 'border-l-red-500 text-red-200',
  }

  function sourceLabel(source: string): string {
    return vehicles.find((vehicle) => vehicle.id === source)?.name ?? source
  }
</script>

<ul class="flex flex-col gap-1 overflow-y-auto">
  {#each alerts as alert (alert.id)}
    <li class="border-l-4 bg-slate-800/40 px-3 py-2 text-xs {SEVERITY_STYLE[alert.severity]} {alert.acknowledged ? 'opacity-40' : ''}">
      <button
        type="button"
        class="block w-full rounded text-left transition-colors hover:bg-slate-800/70 focus:outline-none focus:ring-1 focus:ring-slate-600"
        onclick={() => onSelectSource(alert.source)}
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium uppercase tracking-wide">{alert.severity}</span>
          <span class="text-slate-500">{formatRelativeTime(alert.timestamp)}</span>
        </div>
        <div class="mt-0.5 text-slate-200">{alert.description}</div>
      </button>
      <div class="mt-1 flex items-center justify-between text-slate-500">
        <span>{sourceLabel(alert.source)}</span>
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

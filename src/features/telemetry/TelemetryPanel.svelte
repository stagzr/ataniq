<script lang="ts">
  import type { Vehicle } from '../../lib/types'
  import { formatBattery, formatHeading, formatRelativeTime, formatSpeed } from '../../lib/formatters'

  export let vehicle: Vehicle | undefined = undefined
  export let onClearSelection: () => void = () => {}
  export let onReturnToBase: (id: string) => void = () => {}
  export let isFollowing = false
  export let onToggleFollow: (id: string) => void = () => {}
  export let onOpenMission: (missionId: string) => void = () => {}
  export let onAbortCurrentMission: (vehicle: Vehicle) => void = () => {}

  const ORDER_LABEL: Record<Vehicle['order']['type'], string> = {
    patrol: 'On patrol',
    'return-to-base': 'Returning to base',
    intercept: 'On intercept mission',
    'orbit-contact': 'Orbiting contact',
    'hold-position': 'Holding station',
  }

  function getMissionId(order: Vehicle['order']): string | undefined {
    return 'missionId' in order ? order.missionId : undefined
  }

  $: missionId = vehicle ? getMissionId(vehicle.order) : undefined
</script>

{#if vehicle}
  <div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-white">{vehicle.name}</h2>
      <div class="flex items-center gap-1.5">
        {#if missionId}
          <button
            type="button"
            class="flex items-center gap-1 rounded bg-sky-600/80 px-2 py-0.5 text-xs font-medium text-white hover:bg-sky-500"
            onclick={() => onOpenMission(missionId!)}
          >
            {ORDER_LABEL[vehicle.order.type]}
            <span aria-hidden="true">▸</span>
          </button>
        {:else}
          <span class="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
            {ORDER_LABEL[vehicle.order.type]}
          </span>
        {/if}
        <button
          type="button"
          class="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          title="Deselect this boat"
          onclick={onClearSelection}
        >
          Clear
        </button>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Speed</div>
        <div class="font-mono text-lg">{formatSpeed(vehicle.speed)}</div>
      </div>
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Heading</div>
        <div class="font-mono text-lg">{formatHeading(vehicle.heading)}</div>
      </div>
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Battery</div>
        <div class="font-mono text-lg">{formatBattery(vehicle.battery)}</div>
      </div>
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Signal</div>
        <div class="font-mono text-lg">{Math.round(vehicle.connectivity)}%</div>
      </div>
    </div>
    <div class="text-xs text-slate-500">Updated {formatRelativeTime(vehicle.lastUpdate)}</div>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded px-3 py-2 text-xs font-medium text-white {isFollowing ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'}"
        onclick={() => onToggleFollow(vehicle.id)}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
      <button
        type="button"
        class="flex-1 rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={vehicle.order.type === 'return-to-base'}
        onclick={() => onReturnToBase(vehicle.id)}
      >
        Return to base
      </button>
    </div>
    {#if missionId}
      <button
        type="button"
        class="rounded border border-red-900/70 bg-red-950/50 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-900/70"
        onclick={() => onAbortCurrentMission(vehicle)}
      >
        Abort current mission for this drone
      </button>
    {/if}
  </div>
{:else}
  <div class="p-4 text-sm text-slate-500">Select a vehicle to see telemetry.</div>
{/if}

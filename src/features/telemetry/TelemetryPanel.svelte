<script lang="ts">
  import type { Vehicle } from '../../lib/types'
  import { formatBattery, formatHeading, formatRelativeTime, formatSpeed } from '../../lib/formatters'

  export let vehicle: Vehicle | undefined = undefined
</script>

{#if vehicle}
  <div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
    <h2 class="text-base font-semibold text-white">{vehicle.name}</h2>
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
  </div>
{:else}
  <div class="p-4 text-sm text-slate-500">Select a vehicle to see telemetry.</div>
{/if}

<script lang="ts">
  import type { FormationMission, Vehicle } from '../../lib/types'
  import { formatBattery, formatSpeed } from '../../lib/formatters'

  export let vehicles: Vehicle[] = []
  export let missions: FormationMission[] = []
  export let selectedVehicleId: string | undefined = undefined
  export let selectedMissionId: string | undefined = undefined
  export let onSelect: (id: string) => void = () => {}
  export let onSelectMission: (id: string) => void = () => {}
  export let multiSelectMode = false
  export let multiSelectedIds: Set<string> = new Set()
  export let onToggleMultiSelect: (id: string) => void = () => {}
  export let onSelectAll: () => void = () => {}

  const STATUS_DOT: Record<Vehicle['status'], string> = {
    active: 'bg-emerald-500',
    idle: 'bg-slate-400',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    offline: 'bg-slate-600',
  }

  const MISSION_LABEL: Record<FormationMission['action'], string> = {
    attack: 'Attack',
    inspect: 'Inspect',
    circle: 'Circle',
    line: 'Line',
    embargo: 'Embargo',
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
  {#if missions.length}
    <section class="flex flex-col gap-1">
      <div class="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Current missions</div>
      {#each missions as mission (mission.id)}
        <button
          type="button"
          class="flex items-center justify-between gap-2 rounded px-3 py-2 text-left text-xs transition-colors hover:bg-slate-800
            {selectedMissionId === mission.id ? 'bg-slate-800 ring-1 ring-slate-600' : ''}"
          onclick={() => onSelectMission(mission.id)}
        >
          <span class="font-medium text-slate-200">{MISSION_LABEL[mission.action]}</span>
          <span class="text-slate-500">{mission.vehicleIds.length} boats</span>
        </button>
      {/each}
    </section>
  {/if}

  <section class="flex min-h-0 flex-1 flex-col gap-1">
    <div class="flex items-center justify-between px-2">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Boats</div>
      {#if multiSelectMode}
        <button
          type="button"
          class="rounded bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-default disabled:opacity-50"
          disabled={multiSelectedIds.size === vehicles.length}
          onclick={onSelectAll}
        >
          Select all
        </button>
      {/if}
    </div>
    <ul class="flex flex-col gap-1 overflow-y-auto">
      {#each vehicles as vehicle (vehicle.id)}
        <li>
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800
              {selectedVehicleId === vehicle.id ? 'bg-slate-800 ring-1 ring-slate-600' : ''}"
            onclick={() => (multiSelectMode ? onToggleMultiSelect(vehicle.id) : onSelect(vehicle.id))}
          >
            <span class="flex items-center gap-2">
              {#if multiSelectMode}
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5 accent-emerald-500"
                  checked={multiSelectedIds.has(vehicle.id)}
                  onclick={(e) => e.stopPropagation()}
                  onchange={() => onToggleMultiSelect(vehicle.id)}
                />
              {/if}
              <span class="h-2 w-2 shrink-0 rounded-full {STATUS_DOT[vehicle.status]}"></span>
              <span class="text-slate-200">{vehicle.name}</span>
            </span>
            <span class="flex gap-2 text-xs text-slate-400">
              <span>{formatSpeed(vehicle.speed)}</span>
              <span>{formatBattery(vehicle.battery)}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
</div>

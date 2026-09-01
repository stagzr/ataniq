<script lang="ts">
  import { tick } from 'svelte'
  import { slide } from 'svelte/transition'
  import type { FormationMission, Vehicle } from '../../lib/types'
  import { formatBattery, formatSpeed } from '../../lib/formatters'

  export let vehicles: Vehicle[] = []
  export let missions: FormationMission[] = []
  export let selectedVehicleId: string | undefined = undefined
  export let selectedMissionId: string | undefined = undefined
  export let onSelect: (id: string) => void = () => {}
  export let onSelectMission: (id: string) => void = () => {}
  export let onRenameVehicle: (id: string, name: string) => void = () => {}
  export let onRenameMission: (id: string, name: string) => void = () => {}
  export let onToggleMultiAction: () => void = () => {}
  export let onStartVehicleAction: (id: string) => void = () => {}
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
    'return-to-base': 'Return to base',
    circle: 'Circle',
    line: 'Line',
    embargo: 'Embargo',
  }

  let editingVehicleId: string | undefined = undefined
  let editingMissionId: string | undefined = undefined
  let expandedVehicleId: string | undefined = undefined
  let editingName = ''
  let renameInput: HTMLInputElement | undefined

  function missionName(mission: FormationMission): string {
    return mission.name ?? MISSION_LABEL[mission.action]
  }

  function startVehicleRename(vehicle: Vehicle) {
    editingMissionId = undefined
    editingVehicleId = vehicle.id
    editingName = vehicle.name
    void tick().then(() => renameInput?.focus())
  }

  function startMissionRename(mission: FormationMission) {
    editingVehicleId = undefined
    editingMissionId = mission.id
    editingName = missionName(mission)
    void tick().then(() => renameInput?.focus())
  }

  function saveRename() {
    if (editingVehicleId) onRenameVehicle(editingVehicleId, editingName)
    if (editingMissionId) onRenameMission(editingMissionId, editingName)
    editingVehicleId = undefined
    editingMissionId = undefined
  }

  function cancelRename() {
    editingVehicleId = undefined
    editingMissionId = undefined
  }

  function toggleVehicleDetails(vehicleId: string) {
    expandedVehicleId = expandedVehicleId === vehicleId ? undefined : vehicleId
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
  {#if missions.length}
    <section class="flex flex-col gap-1">
      <div class="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Current missions</div>
      {#each missions as mission (mission.id)}
        <div
          role="button"
          tabindex="0"
          class="flex items-center justify-between gap-2 rounded px-3 py-2 text-left text-xs transition-colors hover:bg-slate-800
            {selectedMissionId === mission.id ? 'bg-slate-800 ring-1 ring-slate-600' : ''}"
          onclick={() => onSelectMission(mission.id)}
          onkeydown={(event) => event.key === 'Enter' && onSelectMission(mission.id)}
        >
          {#if editingMissionId === mission.id}
            <input
              class="min-w-0 flex-1 rounded border border-sky-500 bg-slate-950 px-1 py-0.5 text-xs font-medium text-white outline-none"
              bind:value={editingName}
              bind:this={renameInput}
              aria-label="Mission name"
              onclick={(event) => event.stopPropagation()}
              onblur={saveRename}
              onkeydown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') cancelRename()
              }}
            />
          {:else}
            <button type="button" class="min-w-0 truncate text-left font-medium text-slate-200 hover:text-sky-300" title="Rename mission" onclick={(event) => { event.stopPropagation(); startMissionRename(mission) }}>
              {missionName(mission)}
            </button>
          {/if}
          <span class="text-slate-500">{mission.vehicleIds.length} boats</span>
        </div>
      {/each}
    </section>
  {/if}

  <section class="flex min-h-0 flex-1 flex-col gap-1">
    <div class="flex items-center justify-between px-2">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Boats</div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded px-2 py-1 text-[10px] font-medium {multiSelectMode ? 'bg-teal-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
          title="Select several boats and issue a group action"
          onclick={onToggleMultiAction}
        >
          Multi-action
        </button>
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
    </div>
    <ul class="flex flex-col gap-1 overflow-y-auto">
      {#each vehicles as vehicle (vehicle.id)}
        <li class={expandedVehicleId === vehicle.id && !multiSelectMode ? 'overflow-hidden rounded bg-slate-800/70' : ''}>
          <div
            role="button"
            tabindex="0"
            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800
              {expandedVehicleId === vehicle.id && !multiSelectMode ? '' : 'rounded'}
              {selectedVehicleId === vehicle.id ? 'bg-slate-800 ring-1 ring-slate-600' : ''}"
            onclick={() => (multiSelectMode ? onToggleMultiSelect(vehicle.id) : onSelect(vehicle.id))}
            onkeydown={(event) => event.key === 'Enter' && (multiSelectMode ? onToggleMultiSelect(vehicle.id) : onSelect(vehicle.id))}
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
              {#if editingVehicleId === vehicle.id}
                <input
                  class="w-28 rounded border border-sky-500 bg-slate-950 px-1 py-0.5 text-sm text-white outline-none"
                  bind:value={editingName}
                  bind:this={renameInput}
                  aria-label="Boat name"
                  onclick={(event) => event.stopPropagation()}
                  onblur={saveRename}
                  onkeydown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                    if (event.key === 'Escape') cancelRename()
                  }}
                />
              {:else}
                <button type="button" class="text-left text-slate-200 hover:text-sky-300" title="Rename boat" onclick={(event) => { event.stopPropagation(); startVehicleRename(vehicle) }}>
                  {vehicle.name}
                </button>
              {/if}
            </span>
            <span class="flex gap-2 text-xs text-slate-400">
              <span>{formatSpeed(vehicle.speed)}</span>
              <span>{formatBattery(vehicle.battery)}</span>
              {#if !multiSelectMode}
                <button
                  type="button"
                  class="flex h-5 w-5 items-center justify-center rounded text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
                  aria-label={expandedVehicleId === vehicle.id ? `Collapse ${vehicle.name} actions` : `Show ${vehicle.name} actions`}
                  aria-expanded={expandedVehicleId === vehicle.id}
                  title={expandedVehicleId === vehicle.id ? 'Hide actions' : 'Show actions'}
                  onclick={(event) => { event.stopPropagation(); toggleVehicleDetails(vehicle.id) }}
                >
                  <span class="transition-transform duration-150 {expandedVehicleId === vehicle.id ? 'rotate-90' : ''}">&gt;</span>
                </button>
              {/if}
            </span>
          </div>
          {#if expandedVehicleId === vehicle.id && !multiSelectMode}
            <div transition:slide={{ duration: 150 }} class="flex items-center border-t border-slate-700/80 py-1.5 pl-7 pr-3">
              <button
                type="button"
                class="rounded bg-teal-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-teal-600"
                onclick={() => onStartVehicleAction(vehicle.id)}
              >
                Action
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
</div>

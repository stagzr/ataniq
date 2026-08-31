<script lang="ts">
  import type { Contact, FormationMission, Vehicle } from '../../lib/types'

  export let mission: FormationMission | undefined = undefined
  export let vehicles: Vehicle[] = []
  export let contact: Contact | undefined = undefined

  const TITLE: Record<FormationMission['action'], string> = {
    attack: 'Attack mission',
    inspect: 'Inspect mission',
    circle: 'Circle formation',
    line: 'Line formation',
    embargo: 'Embargo line',
  }

  $: description = mission
    ? mission.action === 'attack'
      ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} converging to attack ${contact?.label ?? 'the contact'}.`
      : mission.action === 'inspect'
        ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} orbiting ${contact?.label ?? 'the contact'} at a standoff distance.`
        : mission.action === 'circle'
          ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an even circle formation.`
          : mission.action === 'line'
            ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an even line formation.`
            : `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an embargo line, and will break off to inspect any contact that comes close.`
    : ''
</script>

{#if mission}
  <div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-white">{TITLE[mission.action]}</h2>
      <button
        type="button"
        class="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
        title="Open this mission in a separate tab, without the fleet list"
        onclick={() => window.open(`${location.pathname}${location.search}#mission=${mission!.id}`, '_blank')}
      >
        Open in new tab ↗
      </button>
    </div>
    <p class="text-xs text-slate-400">{description}</p>

    <div class="flex flex-col gap-1">
      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Boats included</div>
      <ul class="flex flex-col gap-1">
        {#each vehicles as vehicle (vehicle.id)}
          <li class="flex items-center justify-between rounded bg-slate-800/60 px-2 py-1.5 text-xs">
            <span class="text-slate-200">{vehicle.name}</span>
            <span class="text-slate-500">{vehicle.status}</span>
          </li>
        {:else}
          <li class="rounded bg-slate-800/60 px-2 py-1.5 text-xs text-slate-500">No boats remaining in this mission.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

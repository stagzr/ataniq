<script lang="ts">
  import type { Contact, FormationMission, Vehicle } from '../../lib/types'

  export let mission: FormationMission | undefined = undefined
  export let vehicles: Vehicle[] = []
  export let contact: Contact | undefined = undefined
  export let onAbortMission: (mission: FormationMission, outcome: 'return-to-base' | 'stay-idle') => void = () => {}
  export let onAbortVehicle: (mission: FormationMission, vehicleId: string, outcome: 'return-to-base' | 'stay-idle') => void = () => {}

  let abortTarget: 'mission' | string | undefined = undefined

  const TITLE: Record<FormationMission['action'], string> = {
    attack: 'Attack mission',
    inspect: 'Inspect mission',
    'return-to-base': 'Return to base',
    circle: 'Circle formation',
    line: 'Line formation',
    embargo: 'Embargo line',
  }

  $: description = mission
    ? mission.action === 'attack'
      ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} converging to attack ${contact?.label ?? 'the contact'}.`
      : mission.action === 'inspect'
        ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} orbiting ${contact?.label ?? 'the contact'} at a standoff distance.`
        : mission.action === 'return-to-base'
          ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} returning to base.`
        : mission.action === 'circle'
          ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an even circle formation.`
          : mission.action === 'line'
            ? `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an even line formation.`
            : `${vehicles.length} boat${vehicles.length === 1 ? '' : 's'} holding an embargo line, and will break off to inspect any contact that comes close.`
    : ''

  function confirmAbort(outcome: 'return-to-base' | 'stay-idle') {
    if (!mission || !abortTarget) return
    const target = abortTarget
    abortTarget = undefined
    if (target === 'mission') onAbortMission(mission, outcome)
    else onAbortVehicle(mission, target, outcome)
  }
</script>

{#if mission}
  <div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-white">{mission.name ?? TITLE[mission.action]}</h2>
      <div class="flex gap-1.5">
        <button
          type="button"
          class="rounded bg-red-950/80 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900"
          title="Abort this mission"
          onclick={() => (abortTarget = 'mission')}
        >
          Abort
        </button>
        <button
          type="button"
          class="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
          title="Open this mission in a separate tab, without the fleet list"
          onclick={() => window.open(`${location.pathname}${location.search}#mission=${mission!.id}`, '_blank')}
        >
          Open in new tab ↗
        </button>
      </div>
    </div>
    <p class="text-xs text-slate-400">{description}</p>

    <div class="flex flex-col gap-1">
      <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Boats included</div>
      <ul class="flex flex-col gap-1">
        {#each vehicles as vehicle (vehicle.id)}
          <li class="flex items-center justify-between gap-2 rounded bg-slate-800/60 px-2 py-1.5 text-xs">
            <span class="min-w-0 flex-1 truncate text-slate-200">{vehicle.name}</span>
            <span class="text-slate-500">{vehicle.status}</span>
            <button
              type="button"
              class="rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-600"
              title="Abort current mission for this drone"
              onclick={() => (abortTarget = vehicle.id)}
            >
              Abort drone
            </button>
          </li>
        {:else}
          <li class="rounded bg-slate-800/60 px-2 py-1.5 text-xs text-slate-500">No boats remaining in this mission.</li>
        {/each}
      </ul>
    </div>
  </div>

  {#if abortTarget}
    <div class="fixed inset-0 z-50 bg-slate-950/75"></div>
    <dialog open class="fixed left-1/2 top-1/2 z-[51] m-0 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded border border-slate-700 bg-slate-900 p-4 text-slate-200 shadow-2xl" aria-labelledby="abort-mission-title">
        <h3 id="abort-mission-title" class="text-sm font-semibold text-white">Abort {abortTarget === 'mission' ? 'mission' : 'drone'}?</h3>
        <p class="mt-2 text-xs leading-5 text-slate-400">Choose what {abortTarget === 'mission' ? `the ${vehicles.length} assigned boat${vehicles.length === 1 ? '' : 's'}` : vehicles.find((vehicle) => vehicle.id === abortTarget)?.name ?? 'this boat'} should do after {abortTarget === 'mission' ? 'this mission is removed' : 'leaving this mission'}.</p>
        <div class="mt-4 flex flex-col gap-2">
          <button
            type="button"
            class="rounded bg-red-700 px-3 py-2 text-left text-xs font-medium text-white hover:bg-red-600"
            onclick={() => confirmAbort('return-to-base')}
          >
            Abort and return to base
          </button>
          <button
            type="button"
            class="rounded bg-slate-700 px-3 py-2 text-left text-xs font-medium text-white hover:bg-slate-600"
            onclick={() => confirmAbort('stay-idle')}
          >
            Abort and stay idle
          </button>
          <button type="button" class="rounded px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white" onclick={() => (abortTarget = undefined)}>
            Cancel
          </button>
        </div>
    </dialog>
  {/if}
{/if}

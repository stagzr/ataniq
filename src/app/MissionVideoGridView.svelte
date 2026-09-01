<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { contactStore } from '../features/contacts/contactStore'
  import { missionStore } from '../features/fleet/missionStore'

  export let missionId: string

  $: vehicles = $vehicleStore
  $: contacts = $contactStore
  $: mission = $missionStore[missionId]
  $: missionVehicles = mission ? vehicles.filter((vehicle) => mission.vehicleIds.includes(vehicle.id)) : []

  onMount(() => {
    vehicleStore.init()
    contactStore.init()
    missionStore.init()
  })

  onDestroy(() => {
    vehicleStore.destroy()
    contactStore.destroy()
    missionStore.destroy()
  })
</script>

<main class="min-h-screen bg-slate-950 text-slate-100">
  <header class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
    <div class="min-w-0">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mission video grid</div>
      <h1 class="truncate text-sm font-semibold text-slate-100">{mission?.name ?? 'Mission'}</h1>
    </div>
    <div class="flex items-center gap-3 text-xs text-slate-400">
      <span>{missionVehicles.length} feeds</span>
      <a href="./" class="rounded bg-slate-800 px-2 py-1 font-medium text-slate-200 hover:bg-slate-700">Back to full view</a>
    </div>
  </header>
  <section class="p-4">
    {#if mission}
      <VideoPanel vehicles={missionVehicles} {contacts} initialLayout="grid" wideGrid />
    {:else}
      <p class="text-sm text-slate-500">Waiting for mission data...</p>
    {/if}
  </section>
</main>
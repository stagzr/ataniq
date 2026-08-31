<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MapView from '../features/map/MapView.svelte'
  import MissionPanel from '../features/fleet/MissionPanel.svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { contactStore } from '../features/contacts/contactStore'
  import { missionStore } from '../features/fleet/missionStore'

  export let missionId: string

  $: vehicles = $vehicleStore
  $: contacts = $contactStore
  $: mission = $missionStore[missionId]
  $: missionVehicles = mission ? vehicles.filter((v) => mission!.vehicleIds.includes(v.id)) : []
  $: missionContact = mission?.contactId ? contacts.find((c) => c.id === mission!.contactId) : undefined
  $: ringHighlightIds = mission ? new Set(mission.vehicleIds) : new Set<string>()

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

<div class="grid h-screen grid-cols-[1fr_360px] grid-rows-[auto_1fr] bg-slate-950 text-slate-100">
  <header class="col-span-2 flex items-center justify-between border-b border-slate-800 px-4 py-2">
    <h1 class="text-sm font-semibold tracking-wide text-slate-200">ATANIQ GROUND CONTROL — Mission view</h1>
    <a href="./" class="text-xs text-slate-400 hover:text-slate-200">Back to full view</a>
  </header>

  <main class="relative">
    <MapView selectedVehicleId={undefined} selectedContactId={undefined} {ringHighlightIds} />
  </main>

  <aside class="flex flex-col divide-y divide-slate-800 overflow-y-auto border-l border-slate-800">
    <section>
      <h2 class="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mission area</h2>
      {#if mission}
        <MissionPanel {mission} vehicles={missionVehicles} contact={missionContact} />
      {:else}
        <p class="p-4 text-sm text-slate-500">Waiting for mission data…</p>
      {/if}
    </section>
    <section class="p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Video</h2>
      <VideoPanel vehicles={missionVehicles} {contacts} />
    </section>
  </aside>
</div>

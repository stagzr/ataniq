<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MapView from '../features/map/MapView.svelte'
  import MissionPanel from '../features/fleet/MissionPanel.svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { contactStore } from '../features/contacts/contactStore'
  import { missionStore } from '../features/fleet/missionStore'
  import type { FormationGeometry } from '../lib/types'
  import { computeCirclePositions } from '../lib/formations'

  export let missionId: string
  export let showVideoGrid = false

  $: vehicles = $vehicleStore
  $: contacts = $contactStore
  $: mission = $missionStore[missionId]
  $: missionVehicles = mission ? vehicles.filter((v) => mission!.vehicleIds.includes(v.id)) : []
  $: missionContact = mission?.contactId ? contacts.find((c) => c.id === mission!.contactId) : undefined
  $: ringHighlightIds = mission ? new Set(mission.vehicleIds) : new Set<string>()

  function updateMissionGeometry(id: string, geometry: FormationGeometry) {
    const currentMission = $missionStore[id]
    if (!currentMission) return
    missionStore.updateMission({ ...currentMission, geometry })
    if (geometry.type !== 'circle') return
    const points = computeCirclePositions(geometry.center, geometry.radiusDeg, currentMission.vehicleIds.length)
    currentMission.vehicleIds.forEach((vehicleId, index) => {
      vehicleStore.sendCommand(vehicleId, { type: 'hold-position', point: points[index], missionId: id })
    })
  }

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

  function abortMission(_mission: NonNullable<typeof mission>, outcome: 'return-to-base' | 'stay-idle') {
    if (!mission) return
    mission.vehicleIds.forEach((vehicleId) => {
      if (outcome === 'return-to-base') vehicleStore.sendCommand(vehicleId, { type: 'return-to-base' })
      else abortVehicleToIdle(vehicleId)
    })
    missionStore.removeMission(mission.id)
  }

  function abortVehicleMission(_mission: NonNullable<typeof mission>, vehicleId: string, outcome: 'return-to-base' | 'stay-idle') {
    if (!mission) return
    if (outcome === 'return-to-base') vehicleStore.sendCommand(vehicleId, { type: 'return-to-base' })
    else abortVehicleToIdle(vehicleId)
    const remainingIds = mission.vehicleIds.filter((id) => id !== vehicleId)
    if (remainingIds.length) missionStore.updateMission({ ...mission, vehicleIds: remainingIds })
    else missionStore.removeMission(mission.id)
  }

  function abortVehicleToIdle(vehicleId: string) {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return
    vehicleStore.sendCommand(vehicleId, { type: 'hold-position', point: vehicle.position })
  }

  function openMissionVideoGrid() {
    window.open(`${location.pathname}${location.search}#mission=${missionId}&view=video-grid`, '_blank')
  }
</script>

<div class="grid h-screen grid-cols-[1fr_360px] grid-rows-[auto_1fr] bg-slate-950 text-slate-100">
  <header class="col-span-2 flex items-center justify-between border-b border-slate-800 px-4 py-2">
    <h1 class="text-sm font-semibold tracking-wide text-slate-200">ATANIQ GROUND CONTROL — Mission view</h1>
    <a href="./" class="text-xs text-slate-400 hover:text-slate-200">Back to full view</a>
  </header>

  <main class="relative">
    <MapView
      selectedVehicleId={undefined}
      selectedContactId={undefined}
      missions={mission ? [mission] : []}
      selectedMissionId={missionId}
      onUpdateMissionGeometry={updateMissionGeometry}
      {ringHighlightIds}
    />
  </main>

  <aside class="flex flex-col divide-y divide-slate-800 overflow-y-auto border-l border-slate-800">
    <section>
      <h2 class="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mission area</h2>
      {#if mission}
        <MissionPanel {mission} vehicles={missionVehicles} contact={missionContact} onAbortMission={abortMission} onAbortVehicle={abortVehicleMission} />
      {:else}
        <p class="p-4 text-sm text-slate-500">Waiting for mission data…</p>
      {/if}
    </section>
    <section class="p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Video</h2>
      <VideoPanel vehicles={missionVehicles} {contacts} initialLayout={showVideoGrid ? 'grid' : 'tabs'} onOpenGrid={openMissionVideoGrid} />
    </section>
  </aside>
</div>

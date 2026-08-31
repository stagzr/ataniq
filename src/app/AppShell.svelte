<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MapView from '../features/map/MapView.svelte'
  import VehicleList from '../features/fleet/VehicleList.svelte'
  import TelemetryPanel from '../features/telemetry/TelemetryPanel.svelte'
  import AlertsPanel from '../features/alerts/AlertsPanel.svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import ContactPanel from '../features/contacts/ContactPanel.svelte'
  import MultiActionPanel from '../features/fleet/MultiActionPanel.svelte'
  import type { FormationAction } from '../features/fleet/MultiActionPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { alertStore } from '../features/alerts/alertStore'
  import { contactStore } from '../features/contacts/contactStore'
  import { findAssignedVehicle, findNearestVehicle, nearestVehicleTo } from '../features/contacts/dispatch'
  import { computeCirclePositions, computeLinePositions } from '../lib/formations'

  const CIRCLE_RADIUS_DEG = 0.05
  const LINE_EMBARGO_RADIUS_DEG = 0.04
  const INSPECT_ORBIT_RADIUS_DEG = 0.04

  let selectedVehicleId: string | undefined = undefined
  let selectedContactId: string | undefined = undefined
  let followedTarget: { type: 'vehicle' | 'contact'; id: string } | undefined = undefined
  let multiActionMode = false
  let multiSelectedIds: Set<string> = new Set()
  let activeFormationAction: FormationAction | undefined = undefined
  let lineStart: [number, number] | undefined = undefined

  $: vehicles = $vehicleStore
  $: alerts = $alertStore
  $: contacts = $contactStore
  $: selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
  $: selectedContact = contacts.find((c) => c.id === selectedContactId)
  $: videoVehicle = selectedContact
    ? (findAssignedVehicle(vehicles, selectedContact.id) ?? nearestVehicleTo(vehicles, selectedContact.position))
    : selectedVehicle

  function selectVehicle(id: string) {
    selectedVehicleId = id
    selectedContactId = undefined
  }

  function selectContact(id: string) {
    if (multiActionMode && (activeFormationAction === 'attack' || activeFormationAction === 'inspect') && multiSelectedIds.size) {
      dispatchFormationToContact(id, activeFormationAction)
      return
    }
    selectedContactId = id
    selectedVehicleId = undefined
  }

  function handleReturnToBase(vehicleId: string) {
    vehicleStore.sendCommand(vehicleId, { type: 'return-to-base' })
  }

  function dispatchToContact(contactId: string, mode: 'inspect' | 'attack') {
    const contact = contacts.find((c) => c.id === contactId)
    if (!contact) return
    const nearest = findNearestVehicle(vehicles, contact)
    if (!nearest) return
    vehicleStore.sendCommand(nearest.id, { type: 'intercept', contactId, mode })
  }

  function toggleFollowVehicle(id: string) {
    followedTarget =
      followedTarget?.type === 'vehicle' && followedTarget.id === id ? undefined : { type: 'vehicle', id }
  }

  function toggleFollowContact(id: string) {
    followedTarget =
      followedTarget?.type === 'contact' && followedTarget.id === id ? undefined : { type: 'contact', id }
  }

  function toggleMultiActionMode() {
    multiActionMode = !multiActionMode
    if (!multiActionMode) resetMultiAction()
  }

  function resetMultiAction() {
    multiSelectedIds = new Set()
    activeFormationAction = undefined
    lineStart = undefined
  }

  function toggleVehicleMultiSelect(id: string) {
    const next = new Set(multiSelectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    multiSelectedIds = next
  }

  function selectFormationAction(action: FormationAction) {
    activeFormationAction = activeFormationAction === action ? undefined : action
    lineStart = undefined
  }

  function dispatchFormationToContact(contactId: string, action: 'attack' | 'inspect') {
    for (const id of multiSelectedIds) {
      if (action === 'attack') {
        vehicleStore.sendCommand(id, { type: 'intercept', contactId, mode: 'attack' })
      } else {
        vehicleStore.sendCommand(id, { type: 'orbit-contact', contactId, radiusDeg: INSPECT_ORBIT_RADIUS_DEG })
      }
    }
    multiActionMode = false
    resetMultiAction()
  }

  function handleMapBackgroundClick(point: [number, number]) {
    if (!multiActionMode || !activeFormationAction || multiSelectedIds.size === 0) return
    const ids = [...multiSelectedIds]

    if (activeFormationAction === 'circle') {
      const points = computeCirclePositions(point, CIRCLE_RADIUS_DEG, ids.length)
      ids.forEach((id, i) => vehicleStore.sendCommand(id, { type: 'hold-position', point: points[i] }))
      multiActionMode = false
      resetMultiAction()
      return
    }

    if (activeFormationAction === 'line' || activeFormationAction === 'embargo') {
      if (!lineStart) {
        lineStart = point
        return
      }
      const points = computeLinePositions(lineStart, point, ids.length)
      const embargoLine: [[number, number], [number, number]] | undefined =
        activeFormationAction === 'embargo' ? [lineStart, point] : undefined
      ids.forEach((id, i) =>
        vehicleStore.sendCommand(id, { type: 'hold-position', point: points[i], embargoLine }),
      )
      multiActionMode = false
      resetMultiAction()
    }
  }

  onMount(() => {
    vehicleStore.init()
    alertStore.init()
    contactStore.init()
  })

  onDestroy(() => {
    vehicleStore.destroy()
    alertStore.destroy()
    contactStore.destroy()
  })
</script>

<div class="grid h-screen grid-cols-[280px_1fr_320px] grid-rows-[auto_1fr] bg-slate-950 text-slate-100">
  <header class="col-span-3 flex items-center justify-between border-b border-slate-800 px-4 py-2">
    <h1 class="text-sm font-semibold tracking-wide text-slate-200">ATANIQ GROUND CONTROL</h1>
    <div class="flex gap-4 text-xs text-slate-400">
      <span>{vehicles.length} vehicles</span>
      <span>{alerts.filter((a) => !a.acknowledged).length} unacknowledged alerts</span>
    </div>
  </header>

  <aside class="flex flex-col border-r border-slate-800 p-2">
    <h2 class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Fleet</h2>
    <VehicleList
      {vehicles}
      {selectedVehicleId}
      onSelect={selectVehicle}
      multiSelectMode={multiActionMode}
      {multiSelectedIds}
      onToggleMultiSelect={toggleVehicleMultiSelect}
    />
  </aside>

  <main class="relative">
    <MapView
      {selectedVehicleId}
      onSelectVehicle={selectVehicle}
      {selectedContactId}
      onSelectContact={selectContact}
      {followedTarget}
      onStopFollow={() => (followedTarget = undefined)}
      multiSelectMode={multiActionMode}
      {multiSelectedIds}
      onToggleVehicleMultiSelect={toggleVehicleMultiSelect}
      onMapBackgroundClick={handleMapBackgroundClick}
    />
    <div class="absolute left-56 top-3 z-10 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
      <button
        type="button"
        class="rounded px-2 py-1 font-medium {multiActionMode ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}"
        onclick={toggleMultiActionMode}
      >
        Multiaction
      </button>
    </div>
  </main>

  <aside class="flex flex-col divide-y divide-slate-800 overflow-y-auto border-l border-slate-800">
    <section>
      <h2 class="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {multiActionMode ? 'Multi-action' : selectedContact ? 'Contact' : 'Telemetry'}
      </h2>
      {#if multiActionMode}
        <MultiActionPanel
          selectedCount={multiSelectedIds.size}
          activeAction={activeFormationAction}
          onSelectAction={selectFormationAction}
        />
      {:else if selectedContact}
        <ContactPanel
          contact={selectedContact}
          onInspect={(id) => dispatchToContact(id, 'inspect')}
          onAttack={(id) => dispatchToContact(id, 'attack')}
          isFollowing={followedTarget?.type === 'contact' && followedTarget.id === selectedContact.id}
          onToggleFollow={toggleFollowContact}
        />
      {:else}
        <TelemetryPanel
          vehicle={selectedVehicle}
          onReturnToBase={handleReturnToBase}
          isFollowing={followedTarget?.type === 'vehicle' && followedTarget.id === selectedVehicle?.id}
          onToggleFollow={toggleFollowVehicle}
        />
      {/if}
    </section>
    <section class="p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Video</h2>
      <VideoPanel vehicleId={videoVehicle?.id} vehicleName={videoVehicle?.name} />
    </section>
    <section class="flex min-h-0 flex-1 flex-col p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Alerts</h2>
      <AlertsPanel {alerts} />
    </section>
  </aside>
</div>

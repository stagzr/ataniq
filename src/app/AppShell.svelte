<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import MapView from '../features/map/MapView.svelte'
  import VehicleList from '../features/fleet/VehicleList.svelte'
  import TelemetryPanel from '../features/telemetry/TelemetryPanel.svelte'
  import AlertsPanel from '../features/alerts/AlertsPanel.svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import ContactPanel from '../features/contacts/ContactPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { alertStore } from '../features/alerts/alertStore'
  import { contactStore } from '../features/contacts/contactStore'
  import { findNearestVehicle } from '../features/contacts/dispatch'

  let selectedVehicleId: string | undefined = undefined
  let selectedContactId: string | undefined = undefined

  $: vehicles = $vehicleStore
  $: alerts = $alertStore
  $: contacts = $contactStore
  $: selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
  $: selectedContact = contacts.find((c) => c.id === selectedContactId)

  function selectVehicle(id: string) {
    selectedVehicleId = id
    selectedContactId = undefined
  }

  function selectContact(id: string) {
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
    <VehicleList {vehicles} {selectedVehicleId} onSelect={selectVehicle} />
  </aside>

  <main class="relative">
    <MapView
      {selectedVehicleId}
      onSelectVehicle={selectVehicle}
      {selectedContactId}
      onSelectContact={selectContact}
    />
  </main>

  <aside class="flex flex-col divide-y divide-slate-800 overflow-y-auto border-l border-slate-800">
    <section>
      <h2 class="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {selectedContact ? 'Contact' : 'Telemetry'}
      </h2>
      {#if selectedContact}
        <ContactPanel
          contact={selectedContact}
          onInspect={(id) => dispatchToContact(id, 'inspect')}
          onAttack={(id) => dispatchToContact(id, 'attack')}
        />
      {:else}
        <TelemetryPanel vehicle={selectedVehicle} onReturnToBase={handleReturnToBase} />
      {/if}
    </section>
    <section class="p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Video</h2>
      <VideoPanel vehicleId={selectedVehicleId} vehicleName={selectedVehicle?.name} />
    </section>
    <section class="flex min-h-0 flex-1 flex-col p-3">
      <h2 class="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Alerts</h2>
      <AlertsPanel {alerts} />
    </section>
  </aside>
</div>

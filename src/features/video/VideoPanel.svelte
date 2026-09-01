<script lang="ts">
  import { createVideoSource } from '../../lib/api/factory'
  import type { VideoStreamVariant } from '../../lib/api/types'
  import type { Contact, Vehicle } from '../../lib/types'

  export let vehicles: Vehicle[] = []
  export let contacts: Contact[] = []

  const videoSource = createVideoSource()
  const ARRIVED_CONTACT_DEG = 0.055
  const STILL_SPEED_KNOTS = 0.5

  let activeId: string | undefined = undefined
  let layout: 'tabs' | 'grid' = 'tabs'

  // keep the active tab valid as the vehicle list changes (e.g. switching missions)
  $: if (!vehicles.some((v) => v.id === activeId)) {
    activeId = vehicles[0]?.id
  }

  $: activeVehicle = vehicles.find((v) => v.id === activeId)
  $: streamUrl = activeVehicle ? getVehicleStreamUrl(activeVehicle) : undefined

  function getVehicleStreamUrl(vehicle: Vehicle) {
    return videoSource.getStreamUrl(vehicle.id, getVideoVariant(vehicle))
  }

  function getVideoVariant(vehicle: Vehicle): VideoStreamVariant {
    if (isInspectingNearUnidentifiedContact(vehicle)) return 'arrived'
    if (vehicle.speed > STILL_SPEED_KNOTS && vehicle.order.type !== 'hold-position') return 'default'
    if (isNearUnidentifiedContact(vehicle)) return 'arrived'
    return 'still'
  }

  function isInspectingNearUnidentifiedContact(vehicle: Vehicle) {
    const contactId =
      vehicle.order.type === 'orbit-contact'
        ? vehicle.order.contactId
        : vehicle.order.type === 'intercept' && vehicle.order.mode === 'inspect'
          ? vehicle.order.contactId
          : undefined
    if (!contactId) return false
    const contact = contacts.find((c) => c.id === contactId && c.status === 'unidentified')
    return contact ? distanceDeg(vehicle.position, contact.position) <= ARRIVED_CONTACT_DEG : false
  }

  function isNearUnidentifiedContact(vehicle: Vehicle) {
    return contacts.some(
      (contact) =>
        contact.status === 'unidentified' && distanceDeg(vehicle.position, contact.position) <= ARRIVED_CONTACT_DEG,
    )
  }

  function distanceDeg(a: [number, number], b: [number, number]) {
    return Math.hypot(a[0] - b[0], a[1] - b[1])
  }

  // deterministic per-vehicle offset so identical looping clips don't look in sync in the grid
  function staggerStart(video: HTMLVideoElement, vehicleId: string) {
    function onLoaded() {
      let hash = 0
      for (let i = 0; i < vehicleId.length; i++) hash = (hash << 5) - hash + vehicleId.charCodeAt(i)
      const duration = video.duration || 0
      if (duration > 0) video.currentTime = Math.abs(hash) % duration
    }
    video.addEventListener('loadedmetadata', onLoaded)
    return {
      destroy() {
        video.removeEventListener('loadedmetadata', onLoaded)
      },
    }
  }
</script>

{#if vehicles.length > 1}
  <div class="mb-2 flex items-center justify-between gap-2">
    <span class="text-xs text-slate-500">{layout === 'tabs' ? 'Select feed' : `${vehicles.length} feeds`}</span>
    <div class="flex shrink-0 gap-1">
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium {layout === 'tabs' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
        onclick={() => (layout = 'tabs')}
      >
        Tabs
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium {layout === 'grid' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
        onclick={() => (layout = 'grid')}
      >
        Grid
      </button>
    </div>
  </div>
  {#if layout === 'tabs'}
    <div class="mb-2 flex flex-wrap gap-1">
      {#each vehicles as vehicle (vehicle.id)}
        <button
          type="button"
          class="rounded px-2 py-1 text-xs font-medium {activeId === vehicle.id
            ? 'bg-sky-600 text-white'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
          onclick={() => (activeId = vehicle.id)}
        >
          {vehicle.name}
        </button>
      {/each}
    </div>
  {/if}
{/if}

{#if layout === 'grid' && vehicles.length > 1}
  <div class="grid grid-cols-2 gap-2">
    {#each vehicles as vehicle (vehicle.id)}
      <div class="relative flex aspect-video items-center justify-center overflow-hidden rounded bg-black">
        <video
          src={getVehicleStreamUrl(vehicle)}
          use:staggerStart={vehicle.id}
          autoplay
          loop
          muted
          playsinline
          class="h-full w-full object-cover"
        ></video>
        <div class="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-red-400">
          <span class="h-1 w-1 animate-pulse rounded-full bg-red-500"></span>
          LIVE
        </div>
        <div class="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-300">{vehicle.name}</div>
      </div>
    {/each}
  </div>
{:else}
  <div class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-black">
    {#if streamUrl}
      <video src={streamUrl} use:staggerStart={activeVehicle?.id ?? ''} autoplay loop muted playsinline class="h-full w-full object-cover"></video>
      <div class="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-red-400">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
        LIVE
      </div>
      <div class="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-slate-300">{activeVehicle?.name}</div>
    {:else}
      <div class="text-sm text-slate-600">No feed selected</div>
    {/if}
  </div>
{/if}

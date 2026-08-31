<script lang="ts">
  import { createVideoSource } from '../../lib/api/factory'

  export let vehicles: { id: string; name: string }[] = []

  const videoSource = createVideoSource()

  let activeId: string | undefined = undefined

  // keep the active tab valid as the vehicle list changes (e.g. switching missions)
  $: if (!vehicles.some((v) => v.id === activeId)) {
    activeId = vehicles[0]?.id
  }

  $: activeVehicle = vehicles.find((v) => v.id === activeId)
  $: streamUrl = activeVehicle ? videoSource.getStreamUrl(activeVehicle.id) : undefined
</script>

{#if vehicles.length > 1}
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

<div class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-black">
  {#if streamUrl}
    <video src={streamUrl} autoplay loop muted playsinline class="h-full w-full object-cover"></video>
    <div class="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-red-400">
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
      LIVE
    </div>
    <div class="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-slate-300">{activeVehicle?.name}</div>
  {:else}
    <div class="text-sm text-slate-600">No feed selected</div>
  {/if}
</div>

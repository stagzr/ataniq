<script lang="ts">
  import { createVideoSource } from '../../lib/api/factory'

  export let vehicleId: string | undefined = undefined
  export let vehicleName: string | undefined = undefined

  const videoSource = createVideoSource()
  $: streamUrl = vehicleId ? videoSource.getStreamUrl(vehicleId) : undefined
</script>

<div class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-black">
  {#if streamUrl}
    <video src={streamUrl} autoplay loop muted playsinline class="h-full w-full object-cover"></video>
    <div class="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-red-400">
      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></span>
      LIVE
    </div>
    <div class="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-slate-300">{vehicleName}</div>
  {:else}
    <div class="text-sm text-slate-600">No feed selected</div>
  {/if}
</div>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import VideoPanel from '../features/video/VideoPanel.svelte'
  import { vehicleStore } from '../features/fleet/vehicleStore'
  import { contactStore } from '../features/contacts/contactStore'

  export let videoId: string

  $: vehicles = $vehicleStore.filter((vehicle) => vehicle.id === videoId)
  $: contacts = $contactStore

  onMount(() => {
    vehicleStore.init()
    contactStore.init()
  })

  onDestroy(() => {
    vehicleStore.destroy()
    contactStore.destroy()
  })
</script>

<main class="min-h-screen bg-slate-950 p-4 text-slate-100">
  <header class="mb-3 flex items-center justify-between">
    <h1 class="text-sm font-semibold tracking-wide text-slate-200">ATANIQ GROUND CONTROL - Video</h1>
    <a href="./" class="text-xs text-slate-400 hover:text-slate-200">Back to full view</a>
  </header>
  <VideoPanel {vehicles} {contacts} />
</main>
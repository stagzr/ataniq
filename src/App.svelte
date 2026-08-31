<script lang="ts">
  import AppShell from './app/AppShell.svelte'
  import MissionView from './app/MissionView.svelte'

  const match = location.hash.match(/^#mission=(.+)$/)
  const missionId = match?.[1]
</script>

{#if missionId}
  <MissionView {missionId} />
{:else}
  <AppShell />
{/if}

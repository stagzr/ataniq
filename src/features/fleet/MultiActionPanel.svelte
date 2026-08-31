<script context="module" lang="ts">
  export type FormationAction = 'attack' | 'inspect' | 'circle' | 'line' | 'embargo'
</script>

<script lang="ts">
  export let selectedCount = 0
  export let activeAction: FormationAction | undefined = undefined
  export let onSelectAction: (action: FormationAction) => void = () => {}

  const ACTIONS: { id: FormationAction; label: string; hint: string; description: string }[] = [
    {
      id: 'attack',
      label: 'Attack',
      hint: 'Click an unidentified contact on the map',
      description: 'Send the selected boats to intercept and attack an unidentified contact. Click a contact on the map after selecting this.',
    },
    {
      id: 'inspect',
      label: 'Inspect',
      hint: 'Click an unidentified contact to orbit at standoff range',
      description: 'Send the selected boats to orbit an unidentified contact at a safe distance instead of closing in. Click a contact on the map after selecting this.',
    },
    {
      id: 'circle',
      label: 'Circle',
      hint: 'Click the map to spread the selection in a circle',
      description: 'Spread the selected boats evenly around a point in a circle formation. Click anywhere on the map after selecting this.',
    },
    {
      id: 'line',
      label: 'Line',
      hint: 'Click two points on the map to draw a line',
      description: 'Spread the selected boats evenly along a line and hold position. Click two points on the map after selecting this.',
    },
    {
      id: 'embargo',
      label: 'Embargo',
      hint: 'Draw a line; boats inspect any contact that gets close',
      description: 'Same as Line, but boats will break off to inspect any unidentified contact that drifts close to the line, then return to their post. Click two points on the map after selecting this.',
    },
  ]
</script>

<div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
  <div class="flex items-center justify-between">
    <h2 class="text-base font-semibold text-white">Multi-action</h2>
    <span class="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
      {selectedCount} selected
    </span>
  </div>

  <div class="flex flex-col gap-1.5">
    {#each ACTIONS as action (action.id)}
      <button
        type="button"
        class="rounded px-3 py-2 text-left text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40
          {activeAction === action.id ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-700 hover:bg-slate-600'}"
        disabled={selectedCount === 0}
        title={action.description}
        onclick={() => onSelectAction(action.id)}
      >
        {action.label}
      </button>
    {/each}
  </div>

  {#if selectedCount === 0}
    <p class="text-xs text-slate-500">Check boats in the Fleet list or click them on the map to select.</p>
  {:else if activeAction}
    <p class="text-xs text-sky-300">{ACTIONS.find((a) => a.id === activeAction)?.hint}</p>
  {/if}
</div>

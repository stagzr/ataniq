<script lang="ts">
  import type { Contact } from '../../lib/types'
  import { formatRelativeTime } from '../../lib/formatters'

  export let contact: Contact | undefined = undefined
  export let onInspect: (id: string) => void = () => {}
  export let onAttack: (id: string) => void = () => {}
  export let isFollowing = false
  export let onToggleFollow: (id: string) => void = () => {}

  const STATUS_LABEL: Record<Contact['status'], string> = {
    unidentified: 'Unidentified',
    inspecting: 'Being inspected',
    identified: 'Identified',
    neutralized: 'Neutralized',
  }
</script>

{#if contact}
  <div class="flex flex-col gap-3 p-4 text-sm text-slate-200">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-white">{contact.label}</h2>
      <span class="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
        {STATUS_LABEL[contact.status]}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Speed</div>
        <div class="font-mono text-lg">{contact.speed.toFixed(1)} kn</div>
      </div>
      <div class="rounded bg-slate-800/60 p-2">
        <div class="text-xs text-slate-400">Heading</div>
        <div class="font-mono text-lg">{Math.round(contact.heading)}°</div>
      </div>
    </div>
    <div class="text-xs text-slate-500">Updated {formatRelativeTime(contact.lastUpdate)}</div>

    <button
      type="button"
      class="rounded px-3 py-2 text-xs font-medium text-white {isFollowing ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'}"
      onclick={() => onToggleFollow(contact.id)}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>

    {#if contact.status === 'unidentified'}
      <div class="mt-2 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
          onclick={() => onInspect(contact.id)}
        >
          Inspect
        </button>
        <button
          type="button"
          class="flex-1 rounded bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
          onclick={() => onAttack(contact.id)}
        >
          Attack
        </button>
      </div>
    {/if}
  </div>
{:else}
  <div class="p-4 text-sm text-slate-500">Select a contact to see details.</div>
{/if}

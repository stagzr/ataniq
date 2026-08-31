<script lang="ts">
  import AppShell from './app/AppShell.svelte'
  import MissionView from './app/MissionView.svelte'

  const FALLBACK_PASSWORD = [111, 99, 120, 120, 119, 111, 114]
    .map((code, index) => String.fromCharCode(code - index - 1))
    .join('')
  const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? FALLBACK_PASSWORD
  const AUTH_KEY = 'ataniq-demo-authenticated'

  const match = location.hash.match(/^#mission=(.+)$/)
  const missionId = match?.[1]

  let password = ''
  let loginError = ''
  let isAuthenticated = sessionStorage.getItem(AUTH_KEY) === 'true'

  function login() {
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      isAuthenticated = true
      loginError = ''
      password = ''
      return
    }
    loginError = 'Incorrect password'
  }
</script>

{#if !isAuthenticated}
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
    <form class="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900/90 p-5 shadow-2xl" onsubmit={(event) => { event.preventDefault(); login() }}>
      <div class="mb-5">
        <h1 class="text-sm font-semibold tracking-wide text-slate-100">ATANIQ GROUND CONTROL</h1>
        <p class="mt-1 text-xs text-slate-500">Operator access</p>
      </div>
      <label class="block text-xs font-medium uppercase tracking-wide text-slate-500" for="demo-password">Password</label>
      <input
        id="demo-password"
        class="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        type="password"
        autocomplete="current-password"
        bind:value={password}
      />
      {#if loginError}
        <p class="mt-2 text-xs text-red-300">{loginError}</p>
      {/if}
      <button type="submit" class="mt-4 w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
        Enter ground control
      </button>
    </form>
  </main>
{:else if missionId}
  <MissionView {missionId} />
{:else}
  <AppShell />
{/if}

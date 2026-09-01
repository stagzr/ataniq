<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import AppShell from './app/AppShell.svelte'
  import MissionView from './app/MissionView.svelte'
  import MissionVideoGridView from './app/MissionVideoGridView.svelte'
  import VideoView from './app/VideoView.svelte'

  const FALLBACK_PASSWORD = [111, 99, 120, 120, 119, 111, 114]
    .map((code, index) => String.fromCharCode(code - index - 1))
    .join('')
  const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? FALLBACK_PASSWORD
  const AUTH_KEY = 'ataniq-demo-authenticated'

  const missionMatch = location.hash.match(/^#mission=([^&]+)/)
  const videoMatch = location.hash.match(/^#video=([^&]+)/)
  const missionId = missionMatch?.[1]
  const showMissionVideoGrid = location.hash.includes('view=video-grid')
  const videoId = videoMatch?.[1]

  let password = ''
  let loginError = ''
  let isAuthenticated = sessionStorage.getItem(AUTH_KEY) === 'true'
  const loadSteps = ['loading channels', 'loading primitives', 'calibrating GPS', 'systems ready']
  let activeLoadStep = 0
  let bootFinished = false
  let loadHistory: { id: number; label: string }[] = []
  let loadTimer: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    loadTimer = setInterval(() => {
      loadHistory = [...loadHistory, { id: Date.now(), label: loadSteps[activeLoadStep] }].slice(-3)
      if (activeLoadStep === loadSteps.length - 1) {
        bootFinished = true
        clearInterval(loadTimer)
        return
      }
      activeLoadStep += 1
    }, 1800)
  })

  onDestroy(() => clearInterval(loadTimer))

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
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-100">
    <div class="login-water-field"></div>
    <div class="login-contact-track" aria-hidden="true"><span class="login-contact"></span></div>
    <span class="login-island login-island-one" aria-hidden="true"></span>
    <span class="login-island login-island-two" aria-hidden="true"></span>
    <span class="login-island login-island-three" aria-hidden="true"></span>
    <span class="login-vessel login-vessel-one" aria-hidden="true"></span>
    <span class="login-vessel login-vessel-two" aria-hidden="true"></span>
    <span class="login-vessel login-vessel-three" aria-hidden="true"></span>
    <div class="login-status" aria-live="polite">
      <div class="login-status-history" aria-hidden="true">
        {#each loadHistory as step (step.id)}
          <div in:slide={{ duration: 180, axis: 'y' }} out:slide={{ duration: 180 }} class:login-status-ready={step.label === 'systems ready'} class="login-status-entry" onanimationend={() => step.label !== 'systems ready' && (loadHistory = loadHistory.filter((entry) => entry.id !== step.id))}>{step.label} <span>{step.label === 'systems ready' ? 'ready' : 'ok'}</span></div>
        {/each}
      </div>
      {#if !bootFinished}
        <div class="login-status-current">{loadSteps[activeLoadStep]}<span class="login-status-dots" aria-hidden="true">...</span></div>
      {/if}
    </div>

    <form class="relative z-10 w-full max-w-sm rounded-lg border border-slate-600/80 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-sm" onsubmit={(event) => { event.preventDefault(); login() }}>
      <div class="mb-5">
        <h1 class="text-sm font-semibold tracking-wide text-slate-100">ATANIQ GROUND CONTROL</h1>
        <p class="mt-1 text-xs text-slate-500">Operator access</p>
      </div>
      <label class="block text-xs font-medium uppercase tracking-wide text-slate-500" for="demo-password">Password</label>
      <input
        id="demo-password"
        class="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        type="password"
        autocomplete="current-password"
        bind:value={password}
      />
      {#if loginError}
        <p class="mt-2 text-xs text-red-300">{loginError}</p>
      {/if}
      <button type="submit" class="mt-4 w-full rounded bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600">
        Enter ground control
      </button>
    </form>
  </main>
{:else if videoId}
  <VideoView {videoId} />
{:else if missionId && showMissionVideoGrid}
  <MissionVideoGridView {missionId} />
{:else if missionId}
  <MissionView {missionId} showVideoGrid={showMissionVideoGrid} />
{:else}
  <AppShell />
{/if}

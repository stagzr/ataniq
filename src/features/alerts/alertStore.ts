import { writable } from 'svelte/store'
import type { AlertEvent } from '../../lib/types'
import { createAlertSource } from '../../lib/api/factory'

const MAX_ALERTS = 50

function createAlertStore() {
  const { subscribe, update } = writable<AlertEvent[]>([])
  const source = createAlertSource()

  function init() {
    source.onAlert((alert) => {
      update((alerts) => [alert, ...alerts].slice(0, MAX_ALERTS))
    })
    source.connect()
  }

  function destroy() {
    source.disconnect()
  }

  function acknowledge(id: string) {
    update((alerts) => alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  }

  return { subscribe, init, destroy, acknowledge }
}

export const alertStore = createAlertStore()

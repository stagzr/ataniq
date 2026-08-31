<script lang="ts">
  import * as maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { onDestroy, onMount } from 'svelte'
  import type { Contact, InterceptMarker, Vehicle } from '../../lib/types'
  import { getBaseLocation } from '../../lib/api/factory'
  import { formatBattery, formatHeading, formatRelativeTime, formatSpeed } from '../../lib/formatters'
  import { VehicleAnimator } from './animation'
  import { vehicleStore } from '../fleet/vehicleStore'
  import { contactStore } from '../contacts/contactStore'

  export let selectedVehicleId: string | undefined = undefined
  export let onSelectVehicle: (id: string) => void = () => {}
  export let selectedContactId: string | undefined = undefined
  export let onSelectContact: (id: string) => void = () => {}
  export let followedTarget: { type: 'vehicle' | 'contact'; id: string } | undefined = undefined
  export let onStopFollow: () => void = () => {}
  export let multiSelectMode = false
  export let ringHighlightIds: Set<string> = new Set()
  export let onToggleVehicleMultiSelect: (id: string) => void = () => {}
  export let onMapBackgroundClick: (point: [number, number]) => void = () => {}

  let mapContainer: HTMLDivElement
  let map: maplibregl.Map
  let animator = new VehicleAnimator()
  let rafId: number
  let flashTimer: ReturnType<typeof setInterval>
  let unsubscribeVehicles: () => void
  let unsubscribeContacts: () => void
  let styleLoaded = false
  let showNames = true
  let latestContacts: Contact[] = []
  let latestVehicles = new Map<string, Vehicle>()
  let vehiclePopup: maplibregl.Popup | undefined
  let interceptMarkers: InterceptMarker[] = []
  let vehiclePulses: Array<{ id: string; vehicleId: string; startedAt: number }> = []
  let lastPulseSelectedVehicleId: string | undefined = undefined
  let lastPulseFollowedVehicleId: string | undefined = undefined
  let flashOn = true

  $: if (styleLoaded) setNamesVisible(showNames)
  $: if (styleLoaded) setSelectedVehicle(selectedVehicleId)
  $: if (styleLoaded) setSelectedContact(selectedContactId)
  $: if (styleLoaded) triggerSelectedVehiclePulse(selectedVehicleId)
  $: if (styleLoaded) triggerFollowedVehiclePulse(followedTarget)

  function setNamesVisible(show: boolean): void {
    map.setLayoutProperty('vehicles-layer', 'text-field', show ? ['get', 'name'] : '')
  }

  function setSelectedVehicle(id: string | undefined): void {
    map.setPaintProperty(
      'destinations-layer',
      'line-width',
      id ? ['case', ['==', ['get', 'id'], id], 3, 1] : 1,
    )
    map.setPaintProperty(
      'destinations-layer',
      'line-opacity',
      id ? ['case', ['==', ['get', 'id'], id], 0.9, 0.35] : 0.5,
    )
  }

  function setSelectedContact(id: string | undefined): void {
    map.setPaintProperty(
      'contact-destinations-layer',
      'line-width',
      id ? ['case', ['==', ['get', 'id'], id], 3, 1.5] : 1.5,
    )
    map.setPaintProperty(
      'contact-destinations-layer',
      'line-opacity',
      id ? ['case', ['==', ['get', 'id'], id], 0.9, 0.5] : 0.6,
    )
  }

  function triggerSelectedVehiclePulse(id: string | undefined): void {
    if (id && id !== lastPulseSelectedVehicleId) addVehiclePulse(id)
    lastPulseSelectedVehicleId = id
  }

  function triggerFollowedVehiclePulse(target: { type: 'vehicle' | 'contact'; id: string } | undefined): void {
    const id = target?.type === 'vehicle' ? target.id : undefined
    if (id && id !== lastPulseFollowedVehicleId) addVehiclePulse(id)
    lastPulseFollowedVehicleId = id
  }

  function addVehiclePulse(vehicleId: string): void {
    vehiclePulses = [...vehiclePulses, { id: `${vehicleId}-${performance.now()}`, vehicleId, startedAt: performance.now() }]
  }

  const STATUS_COLORS: Record<Vehicle['status'], string> = {
    active: '#22c55e',
    idle: '#94a3b8',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#475569',
  }

  const CONTACT_COLORS: Record<Contact['status'], string> = {
    unidentified: '#f59e0b',
    inspecting: '#38bdf8',
    identified: '#60a5fa',
    neutralized: '#475569',
  }

  const BASEMAP_STYLE: maplibregl.StyleSpecification = {
    version: 8,
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors © CARTO',
      },
    },
    layers: [{ id: 'carto-light', type: 'raster', source: 'carto-light' }],
  }

  const ORDER_LABEL: Record<Vehicle['order']['type'], string> = {
    patrol: 'On patrol',
    'return-to-base': 'Returning to base',
    intercept: 'On intercept mission',
    'orbit-contact': 'Orbiting contact',
    'hold-position': 'Holding station',
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function getVehicleFromFeature(feature: maplibregl.MapGeoJSONFeature | undefined): Vehicle | undefined {
    const id = feature?.properties?.id
    return typeof id === 'string' ? latestVehicles.get(id) : undefined
  }

  function getOrderDetail(vehicle: Vehicle): string {
    if (vehicle.order.type === 'intercept') return `${vehicle.order.mode} ${vehicle.order.contactId}`
    if (vehicle.order.type === 'orbit-contact') return vehicle.order.contactId
    if (vehicle.order.type === 'return-to-base') return 'Base station'
    if (vehicle.order.type === 'hold-position') return 'Station keeping'
    return 'Routine patrol'
  }

  function renderVehiclePopup(vehicle: Vehicle): string {
    return `
      <div class="min-w-44 text-xs text-slate-800">
        <div class="mb-1 flex items-center justify-between gap-3">
          <div class="font-semibold text-slate-950">${escapeHtml(vehicle.name)}</div>
          <div class="uppercase text-slate-600">${escapeHtml(vehicle.status)}</div>
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <span class="text-slate-600">Speed</span><span class="font-mono text-slate-800">${formatSpeed(vehicle.speed)}</span>
          <span class="text-slate-600">Heading</span><span class="font-mono text-slate-800">${formatHeading(vehicle.heading)}</span>
          <span class="text-slate-600">Battery</span><span class="font-mono text-slate-800">${formatBattery(vehicle.battery)}</span>
          <span class="text-slate-600">Signal</span><span class="font-mono text-slate-800">${Math.round(vehicle.connectivity)}%</span>
          <span class="text-slate-600">Mission</span><span class="text-slate-800">${escapeHtml(ORDER_LABEL[vehicle.order.type])}</span>
          <span class="text-slate-600">Target</span><span class="text-slate-800">${escapeHtml(getOrderDetail(vehicle))}</span>
        </div>
        <div class="mt-1 text-slate-700">Updated ${escapeHtml(formatRelativeTime(vehicle.lastUpdate))}</div>
      </div>
    `
  }

  function showVehiclePopup(e: maplibregl.MapLayerMouseEvent): void {
    const vehicle = getVehicleFromFeature(e.features?.[0])
    if (!vehicle) return
    vehiclePopup?.setLngLat(e.lngLat).setHTML(renderVehiclePopup(vehicle)).addTo(map)
  }

  function buildArrowIcon(size: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(size / 2, 2)
    ctx.lineTo(size - 4, size - 4)
    ctx.lineTo(size / 2, size * 0.7)
    ctx.lineTo(4, size - 4)
    ctx.closePath()
    ctx.fill()
    return ctx.getImageData(0, 0, size, size)
  }

  function buildDiamondIcon(size: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(size / 2, 2)
    ctx.lineTo(size - 2, size / 2)
    ctx.lineTo(size / 2, size - 2)
    ctx.lineTo(2, size / 2)
    ctx.closePath()
    ctx.fill()
    return ctx.getImageData(0, 0, size, size)
  }

  function buildBaseIcon(size: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(size / 2, 2)
    ctx.lineTo(size - 4, size * 0.45)
    ctx.lineTo(size - 4, size - 4)
    ctx.lineTo(4, size - 4)
    ctx.lineTo(4, size * 0.45)
    ctx.closePath()
    ctx.fill()
    return ctx.getImageData(0, 0, size, size)
  }

  function buildCrossIcon(size: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = size * 0.18
    ctx.beginPath()
    ctx.moveTo(4, 4)
    ctx.lineTo(size - 4, size - 4)
    ctx.moveTo(size - 4, 4)
    ctx.lineTo(4, size - 4)
    ctx.stroke()
    return ctx.getImageData(0, 0, size, size)
  }

  function toFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>) {
    return {
      type: 'FeatureCollection' as const,
      features: states.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { id: s.id, name: s.name, status: s.status, heading: s.heading, onMission: s.onMission },
      })),
    }
  }

  function toTrailFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>) {
    return {
      type: 'FeatureCollection' as const,
      features: states
        .filter((s) => s.trail.length > 1)
        .map((s) => ({
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: s.trail },
          properties: { id: s.id, status: s.status },
        })),
    }
  }

  function toDestinationFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>) {
    return {
      type: 'FeatureCollection' as const,
      features: states.map((s) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [s.lng, s.lat],
            s.destination,
          ],
        },
        properties: { id: s.id, status: s.status },
      })),
    }
  }

  function toContactFeatureCollection(contacts: Contact[]) {
    return {
      type: 'FeatureCollection' as const,
      features: contacts.map((c) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: c.position },
        properties: { id: c.id, label: c.label, status: c.status, heading: c.heading },
      })),
    }
  }

  function toContactDestinationFeatureCollection(contacts: Contact[]) {
    return {
      type: 'FeatureCollection' as const,
      features: contacts.map((c) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [c.position, c.destination] },
        properties: { id: c.id, status: c.status },
      })),
    }
  }

  function toInterceptMarkerFeatureCollection(markers: InterceptMarker[]) {
    return {
      type: 'FeatureCollection' as const,
      features: markers.map((m) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: m.position },
        properties: { id: m.id, mode: m.mode },
      })),
    }
  }

  function refreshContactSources() {
    const contactsSource = map?.getSource('contacts') as maplibregl.GeoJSONSource | undefined
    const contactDestinationsSource = map?.getSource('contact-destinations') as maplibregl.GeoJSONSource | undefined
    contactsSource?.setData(toContactFeatureCollection(latestContacts) as any)
    contactDestinationsSource?.setData(toContactDestinationFeatureCollection(latestContacts) as any)
  }

  function refreshInterceptMarkers() {
    const source = map?.getSource('intercept-markers') as maplibregl.GeoJSONSource | undefined
    source?.setData(toInterceptMarkerFeatureCollection(interceptMarkers) as any)
  }

  function toMultiSelectFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>) {
    return {
      type: 'FeatureCollection' as const,
      features: states
        .filter((s) => ringHighlightIds.has(s.id))
        .map((s) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: {},
        })),
    }
  }

  function toVehiclePulseFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>, now: number) {
    const stateById = new Map(states.map((state) => [state.id, state]))
    return {
      type: 'FeatureCollection' as const,
      features: vehiclePulses
        .map((pulse) => {
          const state = stateById.get(pulse.vehicleId)
          if (!state) return undefined
          const progress = Math.min(1, (now - pulse.startedAt) / 2000)
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [state.lng, state.lat] },
            properties: { id: pulse.id, progress },
          }
        })
        .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature)),
    }
  }

  function renderFrame(now: number) {
    const states = animator.getInterpolatedState(now)
    const vehiclesSource = map?.getSource('vehicles') as maplibregl.GeoJSONSource | undefined
    const trailsSource = map?.getSource('trails') as maplibregl.GeoJSONSource | undefined
    const destinationsSource = map?.getSource('destinations') as maplibregl.GeoJSONSource | undefined
    const multiSelectSource = map?.getSource('multiselect-rings') as maplibregl.GeoJSONSource | undefined
    const pulseSource = map?.getSource('vehicle-pulses') as maplibregl.GeoJSONSource | undefined
    vehiclePulses = vehiclePulses.filter((pulse) => now - pulse.startedAt < 2000)
    vehiclesSource?.setData(toFeatureCollection(states) as any)
    trailsSource?.setData(toTrailFeatureCollection(states) as any)
    destinationsSource?.setData(toDestinationFeatureCollection(states) as any)
    multiSelectSource?.setData(toMultiSelectFeatureCollection(states) as any)
    pulseSource?.setData(toVehiclePulseFeatureCollection(states, now) as any)

    if (followedTarget) {
      let position: [number, number] | undefined
      if (followedTarget.type === 'vehicle') {
        const state = states.find((s) => s.id === followedTarget!.id)
        if (state) position = [state.lng, state.lat]
      } else {
        position = latestContacts.find((c) => c.id === followedTarget!.id)?.position
      }
      if (position) map.setCenter(position)
    }

    rafId = requestAnimationFrame(renderFrame)
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: BASEMAP_STYLE,
      center: [19.9, 57.5],
      zoom: 9,
    })
    vehiclePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18, className: 'vehicle-hover-popup' })

    map.on('load', () => {
      map.addImage('vehicle-arrow', buildArrowIcon(32), { sdf: true })
      map.addImage('contact-diamond', buildDiamondIcon(28), { sdf: true })
      map.addImage('base-icon', buildBaseIcon(28), { sdf: true })
      map.addImage('intercept-cross', buildCrossIcon(20), { sdf: true })

      map.addSource('trails', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'trails-layer',
        type: 'line',
        source: 'trails',
        paint: {
          'line-color': [
            'match', ['get', 'status'],
            'active', STATUS_COLORS.active,
            'idle', STATUS_COLORS.idle,
            'warning', STATUS_COLORS.warning,
            'critical', STATUS_COLORS.critical,
            STATUS_COLORS.offline,
          ],
          'line-width': 2,
          'line-opacity': 0.5,
        },
      })

      map.addSource('destinations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'destinations-layer',
        type: 'line',
        source: 'destinations',
        layout: {
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'match', ['get', 'status'],
            'active', STATUS_COLORS.active,
            'idle', STATUS_COLORS.idle,
            'warning', STATUS_COLORS.warning,
            'critical', STATUS_COLORS.critical,
            STATUS_COLORS.offline,
          ],
          'line-width': 1,
          'line-opacity': 0.5,
          'line-dasharray': [2, 2],
        },
      })

      map.addSource('contact-destinations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'contact-destinations-layer',
        type: 'line',
        source: 'contact-destinations',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match', ['get', 'status'],
            'unidentified', CONTACT_COLORS.unidentified,
            'inspecting', CONTACT_COLORS.inspecting,
            'identified', CONTACT_COLORS.identified,
            CONTACT_COLORS.neutralized,
          ],
          'line-width': 1.5,
          'line-opacity': 0.6,
          'line-dasharray': [1, 1.5],
        },
      })

      map.addSource('multiselect-rings', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'multiselect-rings-layer',
        type: 'circle',
        source: 'multiselect-rings',
        paint: {
          'circle-radius': 14,
          'circle-color': 'transparent',
          'circle-stroke-color': '#38bdf8',
          'circle-stroke-width': 2,
        },
      })

      map.addSource('vehicle-pulses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'vehicle-pulses-layer',
        type: 'circle',
        source: 'vehicle-pulses',
        paint: {
          'circle-radius': ['+', 12, ['*', ['get', 'progress'], 34]],
          'circle-color': 'transparent',
          'circle-stroke-color': '#38bdf8',
          'circle-stroke-width': 3,
          'circle-stroke-opacity': ['-', 0.85, ['*', ['get', 'progress'], 0.85]],
        },
      })

      map.addSource('vehicles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'vehicles-layer',
        type: 'symbol',
        source: 'vehicles',
        layout: {
          'icon-image': 'vehicle-arrow',
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-size': 0.8,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-optional': true,
        },
        paint: {
          'icon-color': [
            'match', ['get', 'status'],
            'active', STATUS_COLORS.active,
            'idle', STATUS_COLORS.idle,
            'warning', STATUS_COLORS.warning,
            'critical', STATUS_COLORS.critical,
            STATUS_COLORS.offline,
          ],
          'icon-opacity': 1,
          'text-color': '#e2e8f0',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.2,
        },
      })

      map.addSource('contacts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'contacts-layer',
        type: 'symbol',
        source: 'contacts',
        layout: {
          'icon-image': 'contact-diamond',
          'icon-allow-overlap': true,
          'icon-size': 0.8,
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-optional': true,
        },
        paint: {
          'icon-color': [
            'match', ['get', 'status'],
            'unidentified', CONTACT_COLORS.unidentified,
            'inspecting', CONTACT_COLORS.inspecting,
            'identified', CONTACT_COLORS.identified,
            CONTACT_COLORS.neutralized,
          ],
          'text-color': '#fcd34d',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.2,
        },
      })

      map.addSource('base', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: getBaseLocation() }, properties: {} }] },
      })
      map.addLayer({
        id: 'base-layer',
        type: 'symbol',
        source: 'base',
        layout: { 'icon-image': 'base-icon', 'icon-size': 1, 'icon-allow-overlap': true },
        paint: { 'icon-color': '#38bdf8' },
      })

      map.addSource('intercept-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'intercept-markers-layer',
        type: 'symbol',
        source: 'intercept-markers',
        layout: { 'icon-image': 'intercept-cross', 'icon-size': 1, 'icon-allow-overlap': true },
        paint: {
          'icon-color': ['case', ['==', ['get', 'mode'], 'attack'], '#ef4444', '#38bdf8'],
        },
      })

      map.on('click', 'vehicles-layer', (e: maplibregl.MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id
        if (!id) return
        if (multiSelectMode) onToggleVehicleMultiSelect(id)
        else onSelectVehicle(id)
      })
      map.on('click', 'contacts-layer', (e: maplibregl.MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onSelectContact(id)
      })
      map.on('mouseenter', 'vehicles-layer', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer'
        showVehiclePopup(e)
      })
      map.on('mousemove', 'vehicles-layer', showVehiclePopup)
      map.on('mouseleave', 'vehicles-layer', () => {
        map.getCanvas().style.cursor = ''
        vehiclePopup?.remove()
      })
      map.on('mouseenter', 'contacts-layer', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'contacts-layer', () => (map.getCanvas().style.cursor = ''))

      // background clicks (not on a vehicle/contact) are used for formation placement
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['vehicles-layer', 'contacts-layer'] })
        if (hits.length === 0) onMapBackgroundClick([e.lngLat.lng, e.lngLat.lat])
      })

      // stop auto-centering as soon as the operator manually pans the map
      map.on('dragstart', () => {
        if (followedTarget) onStopFollow()
      })

      styleLoaded = true
      rafId = requestAnimationFrame(renderFrame)
    })

    unsubscribeVehicles = vehicleStore.subscribe((vehicles) => {
      latestVehicles = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
      if (vehicles.length) animator.update(vehicles)
    })

    unsubscribeContacts = contactStore.subscribe((contacts) => {
      latestContacts = contacts
      if (styleLoaded) refreshContactSources()
    })

    vehicleStore.onInterceptMarker((marker) => {
      interceptMarkers = [...interceptMarkers, marker]
      if (styleLoaded) refreshInterceptMarkers()
    })

    flashTimer = setInterval(() => {
      flashOn = !flashOn
      if (!styleLoaded) return
      map.setPaintProperty('vehicles-layer', 'icon-opacity', [
        'case', ['==', ['get', 'onMission'], true], flashOn ? 1 : 0.25, 1,
      ])
    }, 450)
  })

  onDestroy(() => {
    cancelAnimationFrame(rafId)
    clearInterval(flashTimer)
    unsubscribeVehicles?.()
    unsubscribeContacts?.()
    vehiclePopup?.remove()
    map?.remove()
  })
</script>

<div class="relative h-full w-full">
  <div class="absolute left-3 top-3 z-10 flex items-stretch gap-3">
    <div class="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={showNames} class="h-3.5 w-3.5 accent-emerald-500" />
        Show vehicle names
      </label>
    </div>
    <slot name="toolbar-extra" />
  </div>
  <div bind:this={mapContainer} class="h-full w-full"></div>
</div>

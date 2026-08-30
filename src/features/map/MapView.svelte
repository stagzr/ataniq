<script lang="ts">
  import * as maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { onDestroy, onMount } from 'svelte'
  import type { Vehicle } from '../../lib/types'
  import { VehicleAnimator } from './animation'
  import { vehicleStore } from '../fleet/vehicleStore'

  export const selectedVehicleId: string | undefined = undefined
  export let onSelectVehicle: (id: string) => void = () => {}

  let mapContainer: HTMLDivElement
  let map: maplibregl.Map
  let animator = new VehicleAnimator()
  let rafId: number
  let unsubscribe: () => void

  const STATUS_COLORS: Record<Vehicle['status'], string> = {
    active: '#22c55e',
    idle: '#94a3b8',
    warning: '#f59e0b',
    critical: '#ef4444',
    offline: '#475569',
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

  function toFeatureCollection(states: ReturnType<VehicleAnimator['getInterpolatedState']>) {
    return {
      type: 'FeatureCollection' as const,
      features: states.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { id: s.id, name: s.name, status: s.status, heading: s.heading },
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

  function renderFrame(now: number) {
    const states = animator.getInterpolatedState(now)
    const vehiclesSource = map?.getSource('vehicles') as maplibregl.GeoJSONSource | undefined
    const trailsSource = map?.getSource('trails') as maplibregl.GeoJSONSource | undefined
    vehiclesSource?.setData(toFeatureCollection(states) as any)
    trailsSource?.setData(toTrailFeatureCollection(states) as any)
    rafId = requestAnimationFrame(renderFrame)
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [11.94, 57.7],
      zoom: 9,
    })

    map.addImage('vehicle-arrow', buildArrowIcon(32), { sdf: true })

    map.on('load', () => {
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
        },
      })

      map.on('click', 'vehicles-layer', (e: maplibregl.MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onSelectVehicle(id)
      })
      map.on('mouseenter', 'vehicles-layer', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'vehicles-layer', () => (map.getCanvas().style.cursor = ''))

      rafId = requestAnimationFrame(renderFrame)
    })

    unsubscribe = vehicleStore.subscribe((vehicles) => {
      if (vehicles.length) animator.update(vehicles)
    })
  })

  onDestroy(() => {
    cancelAnimationFrame(rafId)
    unsubscribe?.()
    map?.remove()
  })
</script>

<div bind:this={mapContainer} class="h-full w-full"></div>

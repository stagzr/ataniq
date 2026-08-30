# Nautrik Ground Control Station Project Plan

## 1. Project Vision

Build a modern ground control interface for monitoring and controlling a swarm of autonomous marine drones. The product should help operators understand the real-time state of the fleet, monitor multiple sensor feeds, visualize mission data on a map, and react quickly to anomalies in high-pressure operational environments.

## 2. Product Goal

Create a production-quality frontend demo or MVP that reflects the type of system described in the role:

- a marine fleet overview dashboard
- real-time map and geospatial layers
- video streaming panels for multiple vehicles
- telemetry and mission status views
- operator-focused interface designed for clarity under stress

## 3. Target Users

- Fleet operator / mission commander
- System pilot / remote operator
- Maintenance or mission planning specialist

## 4. Core User Needs

- See the current position, status and health of every vessel in the swarm
- Understand mission progress and critical alerts at a glance
- View multiple video streams and sensor feeds without losing context
- Interact with map layers, route overlays, mission changes and warnings
- Make fast decisions with clear visual hierarchy and low cognitive load

## 5. Scope for MVP

### Must-have features

- Fleet overview dashboard
- Interactive map with vehicle markers and vessel paths
- Real-time telemetry cards
- Multiple video stream panes
- Alerts and event log
- Mission status and control actions
- Responsive layout optimized for a monitoring workstation

### Nice-to-have for later

- Multi-operator collaborative views
- Historical playback
- Advanced charting
- Vector map layers for nautical data
- Desktop packaging via Tauri
- Role-based permissions

## 6. Recommended Tech Stack

### Frontend

- Svelte + TypeScript
- Vite for app tooling and dev workflow
- Tailwind CSS or a component library for UI consistency
- State management: Svelte stores or a small reactive state pattern
- Testing: Vitest + Playwright

### Map and geospatial

- MapLibre GL JS or Mapbox GL JS
- Leaflet if lighter/simple map usage is preferred
- Custom overlays for vehicle markers, routes, geofences, hazards, and mission fields
- Note on nautical charts: MapLibre renders MVT vector tiles, not native S-57/S-63 ENC data. Real S-57/S-63 support requires converting ENC data (via GDAL/ogr2ogr + tippecanoe) and decrypting S-63 with a licensed key, plus building custom S-52-style symbolization — no drop-in renderer exists for MapLibre. For MVP/demo purposes, use OpenSeaMap vector/raster layers or a national hydrographic office's raster WMS as a stand-in "nautical chart" look. Full ENC integration (licensing + S-52 symbology) is a separate, larger effort — track as nice-to-have/later phase.

### Real-time communication

- WebSocket integration for telemetry and event streams
- WebRTC or HLS for video streaming
- RxJS optional if event handling becomes more complex

### Desktop packaging (optional later)

- Tauri + Rust if a native desktop app is desired

## 7. Suggested Architecture

### Frontend structure

- src/app
- src/features/map
- src/features/fleet
- src/features/video
- src/features/telemetry
- src/features/alerts
- src/components/ui
- src/lib/api
- src/lib/streaming
- src/lib/types
- src/lib/formatters

### Key architectural principles

- Keep the UI model based on real-time state data
- Separate map logic from telemetry logic and UI concerns
- Build reusable components for cards, panels, alerts and stream tiles
- Use typed interfaces for all vehicle, mission and telemetry models
- Design for observability and rapid iteration

### Mock/real backend swap pattern

To make the fake-backend approach easy to replace with a real backend later, abstract every data source behind a shared TypeScript interface instead of calling mock logic directly from UI/stores:

- `src/lib/api/types.ts` — shared interfaces (`TelemetrySource`, `VehicleRepository`, `VideoSource`, `MissionService`) and shared data types (`Vehicle`, `TelemetryEvent`, `Alert`)
- `src/lib/api/mock/` — mock implementations (timers/simulated data) of those interfaces
- `src/lib/api/real/` — real implementations (WebSocket/HTTP/WebRTC) of the same interfaces
- `src/lib/api/factory.ts` — selects mock vs real implementation based on an env var (e.g. `VITE_USE_MOCK`), so stores/components only ever depend on the interface, never the concrete implementation
- Mock implementations should still be async/event-driven (simulate latency/disconnects) so UI behavior matches what a real network integration will look like
- Switching to a real backend later should require only a config change, no changes to UI or store code

### Vehicle map animation approach

Per-vehicle graphics/animations on the map, layered on top of the mock/real telemetry stream:

- **Icon + heading**: MapLibre GeoJSON symbol layer, data-driven (`icon-rotate` from heading, color/icon by status), fed by the vehicle store
- **Smooth movement**: interpolate position with `requestAnimationFrame` between the last two telemetry updates (dead-reckoning) instead of snapping the marker on each tick
- **Selection/alert emphasis**: pulsing ring or glow, either an HTML marker with CSS keyframes synced via `map.project()`, or a second animated symbol layer
- **Trails/wake**: rolling buffer of recent positions per vehicle rendered as a fading `LineString`; use a custom WebGL layer or deck.gl overlay if a true shader-based wake/heatmap effect is wanted
- Keep animation/interpolation logic in its own module (e.g. `src/features/map/animation.ts`) that consumes the `Vehicle` store, so it works the same regardless of mock or real data source

## 8. Design Priorities

- High information density without clutter
- Clear status colors and alert patterns
- Fast scanning for critical events
- Strong component hierarchy with consistent spacing and typography
- Tools and controls built for operators rather than generic consumer UX

## 9. Data Model Concepts

- Vehicle
  - id
  - name
  - status
  - position
  - heading
  - speed
  - battery
  - connectivity
  - last update time

- Mission
  - id
  - objectives
  - route
  - status
  - assigned vehicles

- Alert/Event
  - type
  - severity
  - timestamp
  - source
  - description

- Stream
  - video source URL
  - format
  - active state
  - quality metrics

## 10. MVP Screens

### 1. Fleet dashboard

- map occupying the main area
- sidebar with vehicle list
- status widgets across the top

### 2. Vehicle detail panel

- telemetry values
- current route
- video stream
- event history

### 3. Mission overview

- active mission summary
- vehicle assignments
- route overlays
- progress and warnings

### 4. Alerts center

- recent events
- severity sorting
- operator acknowledgements

## 11. Development Phases

### Phase 1: Foundation and design system

- Create repo structure
- Configure TypeScript, Vite, Svelte and linting
- Define design tokens and component library
- Build app shell layout

### Phase 2: Fleet and map experience

- Implement map and vehicle markers
- Integrate mock telemetry stream
- Build fleet cards and status widgets
- Create route overlays and markers

### Phase 3: Video and telemetry panels

- Add multi-stream video area
- Build live telemetry sections
- Support alert states and event feed

### Phase 4: Interaction and UX quality

- Improve responsiveness and keyboard support
- Add detailed mission interactions
- Validate readability, alert recognition and operator flow

### Phase 5: Hardening and polish

- Add tests
- Improve error handling and loading states
- Final refactor and documentation

## 12. Risks and Constraints

- Real-time UI complexity can become noisy if data changes too frequently
- Video + map + telemetry together can create cognitive overload
- Geographic and maritime map standards are more complex than generic GIS tools
- Operator design requires high clarity and minimal ambiguity

## 13. Immediate Next Steps

1. Decide whether the initial project is a frontend-only prototype or a full desktop app MVP.
2. Scaffold the repo with Svelte + TypeScript + Vite.
3. Build the app shell and a design system.
4. Add a mock real-time data layer to drive the fleet map and telemetry.
5. Implement map overlays and vehicle detail views.
6. Add video panes and alert/event panels.
7. Validate UX with a realistic operator workflow.

## 14. Recommendation

For this role description, the strongest fit is a Svelte + TypeScript + MapLibre/WebGL-based frontend with real-time telemetry and live video integration. If you want the project to feel closest to a real defense-tech control system, prioritize:

- map-based situational awareness
- fleet monitoring
- real-time alerts
- operator-centered UI
- high-clarity information architecture

That is the core of the project, and it matches the skills in the role description more closely than a generic web app.

## 15. Notes

This plan is meant to evolve with the project. It should be updated as soon as you decide on the exact MVP, preferred stack, and which parts are mock data versus real integrations.

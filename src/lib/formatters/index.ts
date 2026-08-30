export function formatSpeed(knots: number): string {
  return `${knots.toFixed(1)} kn`
}

export function formatBattery(percent: number): string {
  return `${Math.round(percent)}%`
}

export function formatHeading(degrees: number): string {
  return `${Math.round(degrees)}°`
}

export function formatRelativeTime(epochMs: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - epochMs) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return `${minutes}m ago`
}

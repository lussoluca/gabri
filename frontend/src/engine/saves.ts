import type { GameState } from './types'

export async function saveGame(slot: string, state: GameState): Promise<void> {
  const res = await fetch(`/api/saves/${encodeURIComponent(slot)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  if (!res.ok) throw new Error(`Salvataggio fallito: ${res.status}`)
}

export async function loadGame(slot: string): Promise<GameState | null> {
  const res = await fetch(`/api/saves/${encodeURIComponent(slot)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Caricamento fallito: ${res.status}`)
  return res.json()
}

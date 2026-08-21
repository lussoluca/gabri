import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface SaveStore {
  get(slot: string): Promise<unknown | null>
  put(slot: string, data: unknown): Promise<void>
}

// Su Cloud Run (K_SERVICE presente) o con FIRESTORE_PROJECT usa Firestore,
// in locale usa una mappa in memoria.
async function createStore(): Promise<SaveStore> {
  if (process.env.K_SERVICE || process.env.FIRESTORE_PROJECT) {
    const { Firestore } = await import('@google-cloud/firestore')
    const db = new Firestore({
      projectId: process.env.FIRESTORE_PROJECT || undefined,
    })
    const saves = db.collection('saves')
    return {
      async get(slot) {
        const doc = await saves.doc(slot).get()
        return doc.exists ? (doc.data() ?? null) : null
      },
      async put(slot, data) {
        await saves.doc(slot).set(data as FirebaseFirestore.DocumentData)
      },
    }
  }
  const map = new Map<string, unknown>()
  return {
    async get(slot) {
      return map.get(slot) ?? null
    },
    async put(slot, data) {
      map.set(slot, data)
    },
  }
}

const store = await createStore()
const app = new Hono()

const SLOT_RE = /^[\w-]{1,64}$/

app.use('/api/*', cors())

app.get('/healthz', (c) => c.text('ok'))

app.get('/api/saves/:slot', async (c) => {
  const slot = c.req.param('slot')
  if (!SLOT_RE.test(slot)) return c.json({ error: 'invalid slot' }, 400)
  const data = await store.get(slot)
  if (data === null) return c.json({ error: 'not found' }, 404)
  return c.json(data)
})

app.put('/api/saves/:slot', async (c) => {
  const slot = c.req.param('slot')
  if (!SLOT_RE.test(slot)) return c.json({ error: 'invalid slot' }, 400)
  const body = await c.req.json()
  await store.put(slot, body)
  return c.json({ ok: true })
})

const port = Number(process.env.PORT ?? 8080)
serve({ fetch: app.fetch, port })
console.log(`Backend in ascolto sulla porta ${port}`)

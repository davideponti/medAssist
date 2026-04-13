import 'server-only'

interface RateLimitResult {
  ok: boolean
  retryAfterSec: number
  remaining: number
  total: number
}

let redis: any = null

function getRedisClient() {
  if (redis) return redis
  
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.warn('REDIS_URL non configurato, usando fallback in-memory')
    return null
  }

  try {
    // In produzione, installa e usa ioredis o redis
    // import Redis from 'ioredis'
    // redis = new Redis(redisUrl)
    // return redis
    return null
  } catch (error) {
    console.error('Errore connessione Redis:', error)
    return null
  }
}

// Fallback in-memory per sviluppo
const memoryStore = new Map<string, { count: number; resetAt: number }>()

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetAt = now + windowMs
  
  const client = getRedisClient()
  
  if (client) {
    try {
      // Implementazione Redis (richiede ioredis installato)
      const pipeline = client.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, Math.ceil(windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results?.[0]?.[1] as number || 1
      
      return {
        ok: count <= limit,
        retryAfterSec: count > limit ? Math.ceil(windowMs / 1000) : 0,
        remaining: Math.max(0, limit - count),
        total: limit
      }
    } catch (error) {
      console.error('Errore rate limiting Redis:', error)
      // Fallback a memoria
    }
  }
  
  // Fallback in-memory
  const current = memoryStore.get(key)
  if (!current || current.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt })
    return {
      ok: true,
      retryAfterSec: Math.ceil(windowMs / 1000),
      remaining: limit - 1,
      total: limit
    }
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      remaining: 0,
      total: limit
    }
  }

  current.count += 1
  return {
    ok: true,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    remaining: limit - current.count,
    total: limit
  }
}

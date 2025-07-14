// _libs/cors.ts
export const corsHeaders = {
    origin: '*',
    allowHeaders: ['authorization','x-client-info','apikey','content-type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}

import type { Context, Next } from 'jsr:@hono/hono'

export const createCorsMiddleware = () => {
  return async (c: Context, next: Next) => {
    c.header('Access-Control-Allow-Origin', corsHeaders.origin)
    c.header('Access-Control-Allow-Headers', corsHeaders.allowHeaders.join(', '))
    c.header('Access-Control-Allow-Methods', corsHeaders.allowMethods.join(', '))
    if (c.req.method === 'OPTIONS') {
      c.status(204)
      return c.body(null)
    }
    await next()
  }
}

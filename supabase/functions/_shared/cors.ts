// _shared/cors.ts
export const corsHeaders = {
    origin: '*',
    allowHeaders: ['authorization','x-client-info','apikey','content-type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}



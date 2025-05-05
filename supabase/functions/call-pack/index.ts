import { Hono } from 'jsr:@hono/hono';

const app = new Hono();

app.post('/call-pack', async (c) => {
  const { name } = await c.req.json();
  return new Response(`Hello ${name}!`)
});

app.get('/call-pack', (c) => {
  return new Response('Hello World!')
});

Deno.serve(app.fetch);
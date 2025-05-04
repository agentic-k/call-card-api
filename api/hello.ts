import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withAuth } from './middleware'

const handler = (req: VercelRequest, res: VercelResponse) => {
  const { name = 'World' } = req.query
  return res.json({
    message: `Hello ${name}!`,
  })
}

export default withAuth(handler)

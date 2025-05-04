import type { VercelRequest, VercelResponse } from '@vercel/node'

// Dummy authentication check - replace with actual Supabase auth check later
const isAuthenticated = (req: VercelRequest): boolean => {
  // For testing purposes, we'll check for a dummy token
  const authHeader = req.headers.authorization
  return authHeader === 'Bearer test-token'
}

export const withAuth = (handler: Function) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    return handler(req, res)
  }
} 
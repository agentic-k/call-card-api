import { getAndValidateEnv } from './env.ts';

const requiredGoogleEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

const googleEnv = getAndValidateEnv(requiredGoogleEnvVars);

/**
 * The Google Client ID for OAuth, retrieved from environment variables.
 */
export const GOOGLE_CLIENT_ID = googleEnv.GOOGLE_CLIENT_ID;

/**
 * The Google Client Secret for OAuth, retrieved from environment variables.
 */
export const GOOGLE_CLIENT_SECRET = googleEnv.GOOGLE_CLIENT_SECRET; 
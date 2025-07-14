/**
 * Retrieves and validates a set of environment variables.
 * It logs the variables being accessed and throws an error if any are missing.
 *
 * @param requiredEnvVars - An array of environment variable names to retrieve.
 * @returns An object containing the requested environment variables.
 * @throws {Error} If any of the required environment variables are not set.
 */
export function getAndValidateEnv<T extends string>(
  requiredEnvVars: readonly T[]
): Record<T, string> {
  const envVars: Partial<Record<T, string>> = {};
  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    const value = Deno.env.get(varName);
    if (value) {
      envVars[varName] = value;
    } else {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return envVars as Record<T, string>;
} 
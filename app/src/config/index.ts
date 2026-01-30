/**
 * Application Configuration
 * Reads from environment variables set in .env files
 */

export type Environment = 'development' | 'test' | 'production';

interface Config {
  // Environment
  env: Environment;
  isDevelopment: boolean;
  isTest: boolean;
  isProduction: boolean;

  // API
  apiBaseUrl: string;

  // Feature Flags
  enableDebug: boolean;
  enableLogging: boolean;

  // App
  appName: string;
}

function getEnv(): Environment {
  const env = import.meta.env.VITE_ENV as string;
  if (env === 'production' || env === 'test' || env === 'development') {
    return env;
  }
  return 'development';
}

function createConfig(): Config {
  const env = getEnv();

  return {
    // Environment
    env,
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isProduction: env === 'production',

    // API
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',

    // Feature Flags
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',

    // App
    appName: import.meta.env.VITE_APP_NAME || 'Fund Ops Admin',
  };
}

export const config = createConfig();

export default config;

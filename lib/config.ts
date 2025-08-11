// Configuração centralizada do projeto
export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auiidcxarcjjxvyswwhf.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY',
  },

  // Application Configuration
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Profarma Bipagem',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT || 'development',
  },

  // Scanner Configuration
  scanner: {
    timeout: parseInt(process.env.NEXT_PUBLIC_SCANNER_TIMEOUT || '30000'),
    interval: parseInt(process.env.NEXT_PUBLIC_SCANNER_INTERVAL || '500'),
  },

  // Feature Flags
  features: {
    barcodeScanner: process.env.NEXT_PUBLIC_ENABLE_BARCODE_SCANNER !== 'false',
    chat: process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'false',
    adminFeatures: process.env.NEXT_PUBLIC_ENABLE_ADMIN_FEATURES !== 'false',
  },

  // Logging Configuration
  logging: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_LOGGING !== 'false',
    level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'debug',
  },

  // Development Configuration
  development: {
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    allowHttp: process.env.NEXT_PUBLIC_ALLOW_HTTP_IN_DEVELOPMENT === 'true',
  },

  // API Configuration
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },

  // Security Configuration
  security: {
    enableHttps: process.env.NEXT_PUBLIC_ENABLE_HTTPS === 'true',
  },

  // Performance Configuration
  performance: {
    enableCache: process.env.NEXT_PUBLIC_ENABLE_CACHE !== 'false',
    cacheDuration: parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION || '3600'),
  },
}

// Função para verificar se estamos em desenvolvimento
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || config.app.environment === 'development'
}

// Função para verificar se estamos em produção
export const isProduction = () => {
  return process.env.NODE_ENV === 'production' || config.app.environment === 'production'
}

// Função para obter configurações específicas do ambiente
export const getEnvironmentConfig = () => {
  if (isDevelopment()) {
    return {
      ...config,
      logging: {
        ...config.logging,
        enabled: true,
        level: 'debug',
      },
      development: {
        ...config.development,
        debugMode: true,
        allowHttp: true,
      },
    }
  }

  return {
    ...config,
    logging: {
      ...config.logging,
      enabled: false,
      level: 'error',
    },
    development: {
      ...config.development,
      debugMode: false,
      allowHttp: false,
    },
  }
}

// Função para validar configurações obrigatórias
export const validateConfig = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn('⚠️ Variáveis de ambiente ausentes:', missing)
    console.warn('Usando valores padrão para desenvolvimento')
  }

  return missing.length === 0
}

// Exportar configuração validada
export const validatedConfig = getEnvironmentConfig()

// Função para debug de configuração
export const debugConfig = () => {
  if (config.development.debugMode) {
    console.log('🔧 Configuração do projeto:', {
      app: config.app,
      environment: process.env.NODE_ENV,
      features: config.features,
      scanner: config.scanner,
    })
  }
} 
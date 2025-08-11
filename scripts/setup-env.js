#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando variáveis de ambiente...\n');

const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://auiidcxarcjjxvyswwhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY

# Application Configuration
NEXT_PUBLIC_APP_NAME=Profarma Bipagem
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENVIRONMENT=development

# Scanner Configuration
NEXT_PUBLIC_SCANNER_TIMEOUT=30000
NEXT_PUBLIC_SCANNER_INTERVAL=500

# Feature Flags
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_ADMIN_FEATURES=true

# Logging Configuration
NEXT_PUBLIC_ENABLE_LOGGING=true
NEXT_PUBLIC_LOG_LEVEL=debug

# Development Configuration
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ALLOW_HTTP_IN_DEVELOPMENT=true

# Security Configuration
NEXT_PUBLIC_ENABLE_HTTPS=false

# Performance Configuration
NEXT_PUBLIC_ENABLE_CACHE=true
NEXT_PUBLIC_CACHE_DURATION=3600
`;

const envPath = path.join(process.cwd(), '.env.local');

try {
  // Verificar se o arquivo já existe
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env.local já existe!');
    console.log('   Para sobrescrever, delete o arquivo atual e execute novamente.');
    console.log(`   Arquivo: ${envPath}\n`);
  } else {
    // Criar o arquivo .env.local
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env.local criado com sucesso!');
    console.log(`   Localização: ${envPath}\n`);
  }

  console.log('📋 Variáveis configuradas:');
  console.log('   • Supabase URL e chave anônima');
  console.log('   • Configurações do scanner');
  console.log('   • Feature flags');
  console.log('   • Configurações de logging');
  console.log('   • Configurações de desenvolvimento\n');

  console.log('🚀 Próximos passos:');
  console.log('   1. Verifique se as credenciais do Supabase estão corretas');
  console.log('   2. Execute: npm run dev');
  console.log('   3. Acesse: http://localhost:3000');
  console.log('   4. Teste o scanner de código de barras\n');

  console.log('📖 Para mais informações, consulte: ENV_SETUP.md');

} catch (error) {
  console.error('❌ Erro ao criar arquivo .env.local:', error.message);
  process.exit(1);
} 
# Configuração de Variáveis de Ambiente

Este documento explica como configurar as variáveis de ambiente para o projeto Profarma Bipagem.

## 📁 Arquivos de Configuração

### 1. Criar arquivo `.env.local`

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# Supabase Configuration
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
```

### 2. Criar arquivo `.env.production` (para produção)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://auiidcxarcjjxvyswwhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY

# Application Configuration
NEXT_PUBLIC_APP_NAME=Profarma Bipagem
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENVIRONMENT=production

# Scanner Configuration
NEXT_PUBLIC_SCANNER_TIMEOUT=30000
NEXT_PUBLIC_SCANNER_INTERVAL=500

# Feature Flags
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_ADMIN_FEATURES=true

# Logging Configuration
NEXT_PUBLIC_ENABLE_LOGGING=false
NEXT_PUBLIC_LOG_LEVEL=error

# Security Configuration
NEXT_PUBLIC_ENABLE_HTTPS=true
NEXT_PUBLIC_ALLOW_HTTP_IN_DEVELOPMENT=false

# Performance Configuration
NEXT_PUBLIC_ENABLE_CACHE=true
NEXT_PUBLIC_CACHE_DURATION=3600
```

## 🔧 Variáveis de Ambiente Disponíveis

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima do Supabase

### Application Configuration
- `NEXT_PUBLIC_APP_NAME`: Nome da aplicação
- `NEXT_PUBLIC_APP_VERSION`: Versão da aplicação
- `NEXT_PUBLIC_APP_ENVIRONMENT`: Ambiente (development/production)

### Scanner Configuration
- `NEXT_PUBLIC_SCANNER_TIMEOUT`: Timeout do scanner em ms (padrão: 30000)
- `NEXT_PUBLIC_SCANNER_INTERVAL`: Intervalo entre tentativas em ms (padrão: 500)

### Feature Flags
- `NEXT_PUBLIC_ENABLE_BARCODE_SCANNER`: Habilitar scanner de código de barras
- `NEXT_PUBLIC_ENABLE_CHAT`: Habilitar sistema de chat
- `NEXT_PUBLIC_ENABLE_ADMIN_FEATURES`: Habilitar recursos de administrador

### Logging Configuration
- `NEXT_PUBLIC_ENABLE_LOGGING`: Habilitar logs
- `NEXT_PUBLIC_LOG_LEVEL`: Nível de log (debug/info/warn/error)

### Development Configuration
- `NEXT_PUBLIC_DEBUG_MODE`: Modo debug
- `NEXT_PUBLIC_ALLOW_HTTP_IN_DEVELOPMENT`: Permitir HTTP em desenvolvimento

### Security Configuration
- `NEXT_PUBLIC_ENABLE_HTTPS`: Forçar HTTPS

### Performance Configuration
- `NEXT_PUBLIC_ENABLE_CACHE`: Habilitar cache
- `NEXT_PUBLIC_CACHE_DURATION`: Duração do cache em segundos

## 🚀 Como Usar

### 1. Desenvolvimento Local

```bash
# Criar arquivo .env.local
cp .env.example .env.local

# Editar as variáveis conforme necessário
nano .env.local

# Iniciar o servidor de desenvolvimento
npm run dev
```

### 2. Produção

```bash
# Criar arquivo .env.production
cp .env.example .env.production

# Editar as variáveis para produção
nano .env.production

# Build para produção
npm run build
npm start
```

### 3. Verificação de Configuração

O sistema automaticamente:
- ✅ Valida as variáveis obrigatórias
- ✅ Usa valores padrão para desenvolvimento
- ✅ Exibe logs de debug quando habilitado
- ✅ Ajusta configurações baseado no ambiente

## 🔍 Debug de Configuração

Para verificar se a configuração está correta, abra o console do navegador e procure por:

```
🔧 Configuração do projeto: {
  app: { name: "Profarma Bipagem", version: "1.0.0", environment: "development" },
  environment: "development",
  features: { barcodeScanner: true, chat: true, adminFeatures: true },
  scanner: { timeout: 30000, interval: 500 }
}
```

## ⚠️ Importante

1. **Nunca commite arquivos `.env`** - eles estão no `.gitignore`
2. **Use `NEXT_PUBLIC_`** para variáveis que precisam estar no cliente
3. **Configure HTTPS** em produção para o scanner funcionar
4. **Teste as configurações** antes de fazer deploy

## 🛠️ Troubleshooting

### Problema: Scanner não funciona
- Verifique se `NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true`
- Certifique-se de estar usando HTTPS em produção
- Verifique as permissões da câmera no navegador

### Problema: Supabase não conecta
- Verifique `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Confirme se as credenciais estão corretas

### Problema: Logs não aparecem
- Verifique se `NEXT_PUBLIC_ENABLE_LOGGING=true`
- Confirme o `NEXT_PUBLIC_LOG_LEVEL` desejado

## 📝 Notas

- O arquivo `lib/config.ts` centraliza toda a configuração
- Valores padrão são fornecidos para desenvolvimento
- A configuração é validada automaticamente
- Logs de debug são exibidos apenas em desenvolvimento 
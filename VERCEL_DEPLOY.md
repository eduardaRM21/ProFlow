# 🚀 Guia de Deploy no Vercel

Este guia resolve o erro `supabaseKey is required` e outros problemas de deploy no Vercel.

## ❌ **Problema Identificado**

O erro ocorre porque:
1. **Variáveis de ambiente não configuradas** no Vercel
2. **API routes tentando acessar Supabase** sem configuração
3. **Build falhando** durante a coleta de dados das páginas

## ✅ **Soluções Implementadas**

### 1. **Cliente Supabase Centralizado** (`lib/supabase-client.ts`)

```typescript
// Cliente unificado que funciona em dev e produção
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const createServerSupabaseClient = () => { ... }
```

### 2. **Configuração do Vercel** (`vercel.json`)

```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "...",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "..."
  }
}
```

### 3. **API Routes Corrigidas**

```typescript
// Usar cliente centralizado
import { createServerSupabaseClient } from '@/lib/supabase-client'
const supabase = createServerSupabaseClient()
```

## 🔧 **Passos para Deploy**

### **Opção 1: Configuração Manual no Vercel**

1. **Acesse o painel do Vercel**
2. **Vá para seu projeto**
3. **Settings → Environment Variables**
4. **Adicione as variáveis:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://auiidcxarcjjxvyswwhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY
NEXT_PUBLIC_APP_NAME=Profarma Bipagem
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENVIRONMENT=production
NEXT_PUBLIC_SCANNER_TIMEOUT=30000
NEXT_PUBLIC_SCANNER_INTERVAL=500
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_ADMIN_FEATURES=true
NEXT_PUBLIC_ENABLE_LOGGING=false
NEXT_PUBLIC_LOG_LEVEL=error
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_HTTPS=true
NEXT_PUBLIC_ENABLE_CACHE=true
NEXT_PUBLIC_CACHE_DURATION=3600
```

### **Opção 2: Usar vercel.json (Recomendado)**

O arquivo `vercel.json` já está configurado com todas as variáveis necessárias.

### **Opção 3: Deploy via CLI**

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel --prod
```

## 🛠️ **Verificação do Deploy**

### 1. **Verificar Build Logs**

Após o deploy, verifique se não há erros:
- ✅ "Compiled successfully"
- ✅ "Build completed"
- ❌ Sem erros de "supabaseKey is required"

### 2. **Testar Funcionalidades**

1. **Acesse o site** no domínio do Vercel
2. **Teste o login** na aplicação
3. **Verifique o scanner** de código de barras
4. **Teste as funcionalidades** principais

### 3. **Debug de Configuração**

Abra o console do navegador e procure por:
```
🔧 Configuração Supabase: {
  url: "✅ Configurado",
  key: "✅ Configurado",
  environment: "production"
}
```

## 🔍 **Troubleshooting**

### **Problema: Ainda aparece "supabaseKey is required"**

**Solução:**
1. Verifique se as variáveis estão configuradas no Vercel
2. Aguarde alguns minutos para o cache atualizar
3. Force um novo deploy: `vercel --prod`

### **Problema: Scanner não funciona em produção**

**Solução:**
1. Certifique-se de estar usando HTTPS
2. Verifique permissões da câmera
3. Teste em diferentes navegadores

### **Problema: API routes retornam erro**

**Solução:**
1. Verifique se `createServerSupabaseClient()` está sendo usado
2. Confirme se as variáveis estão acessíveis no servidor
3. Teste localmente primeiro: `npm run build`

### **Problema: Build falha no Vercel**

**Solução:**
1. Teste localmente: `npm run build`
2. Verifique se não há imports quebrados
3. Confirme se todas as dependências estão instaladas

## 📋 **Checklist de Deploy**

- [ ] **Variáveis de ambiente configuradas** no Vercel
- [ ] **vercel.json** presente no projeto
- [ ] **Cliente Supabase centralizado** implementado
- [ ] **API routes** usando cliente correto
- [ ] **Build local** funcionando (`npm run build`)
- [ ] **Deploy** executado com sucesso
- [ ] **Funcionalidades** testadas em produção

## 🚀 **Comandos Úteis**

```bash
# Testar build localmente
npm run build

# Deploy para produção
vercel --prod

# Ver logs do deploy
vercel logs

# Configurar variáveis via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

## 📞 **Suporte**

Se ainda houver problemas:

1. **Verifique os logs** do Vercel
2. **Teste localmente** primeiro
3. **Compare com deploy anterior** que funcionava
4. **Consulte a documentação** do Vercel

---

**✅ Com essas correções, o deploy deve funcionar perfeitamente!** 
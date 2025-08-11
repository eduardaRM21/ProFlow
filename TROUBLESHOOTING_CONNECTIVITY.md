# 🔧 Guia de Troubleshooting - Problemas de Conectividade

Este guia ajuda a resolver os erros `net::ERR_CONNECTION_CLOSED` e `net::ERR_QUIC_PROTOCOL_ERROR` que você está enfrentando.

## 🚨 Problemas Identificados

### 1. **Erros de Conexão Fechada**
- `net::ERR_CONNECTION_CLOSED`: Conexões sendo fechadas inesperadamente
- `net::ERR_QUIC_PROTOCOL_ERROR`: Problemas com o protocolo QUIC
- 1250+ erros relacionados a `sessions` e `recebimento_notas`

### 2. **Causas Prováveis**
- Timeout de conexão com Supabase
- Problemas de rede intermitentes
- Falta de retry automático
- Circuit breaker não implementado
- Tabelas do banco não existem

## ✅ Soluções Implementadas

### 1. **Sistema de Retry com Backoff Exponencial**
```typescript
// lib/supabase-client.ts
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T>
```

### 2. **Circuit Breaker**
```typescript
// Previne muitas tentativas falhadas
class CircuitBreaker {
  private failures = 0
  private readonly threshold = 5
  private readonly timeout = 30000
}
```

### 3. **Fallback para localStorage**
```typescript
// hooks/use-database.ts
const getSession = async (sessionId: string) => {
  if (isFullyConnected) {
    return await SessionService.getSession(sessionId)
  } else {
    // Fallback para localStorage
    const sessionData = localStorage.getItem('sistema_session')
    return sessionData ? JSON.parse(sessionData) : null
  }
}
```

### 4. **Monitoramento de Conectividade**
```typescript
// hooks/use-database.ts
export const useConnectivity = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true)
}
```

## 🛠️ Passos para Resolver

### **Passo 1: Testar Conectividade**

Execute o script de diagnóstico:

```bash
node scripts/test-connectivity.js
```

Este script irá:
- ✅ Testar conectividade básica
- ✅ Verificar API REST do Supabase
- ✅ Testar autenticação
- ✅ Verificar existência das tabelas
- ✅ Medir latência

### **Passo 2: Verificar Configuração**

1. **Verifique as variáveis de ambiente:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://auiidcxarcjjxvyswwhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **Verifique se as tabelas existem:**
```sql
-- Execute no Supabase SQL Editor
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'sessions'
);

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'recebimento_notas'
);
```

### **Passo 3: Executar Migração do Banco**

Se as tabelas não existem:

```bash
# Execute o script de migração
node scripts/setup-env.js
```

Ou execute manualmente no Supabase:

```sql
-- Tabela sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL,
  colaboradores TEXT[] NOT NULL,
  data TEXT NOT NULL,
  turno TEXT NOT NULL,
  login_time TEXT NOT NULL,
  usuario_custos TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela recebimento_notas
CREATE TABLE IF NOT EXISTS recebimento_notas (
  session_id TEXT PRIMARY KEY,
  notas JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Passo 4: Configurar Políticas RLS**

```sql
-- Habilitar RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_notas ENABLE ROW LEVEL SECURITY;

-- Política para acesso anônimo (desenvolvimento)
CREATE POLICY "Allow anonymous access" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access" ON recebimento_notas
  FOR ALL USING (true);
```

### **Passo 5: Verificar Configuração do Vercel**

1. **Acesse o painel do Vercel**
2. **Vá para Settings → Environment Variables**
3. **Verifique se as variáveis estão configuradas:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Passo 6: Testar Localmente**

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Testar build
npm run build

# Executar localmente
npm run dev
```

## 🔍 Diagnóstico Avançado

### **Verificar Logs do Supabase**

1. Acesse o painel do Supabase
2. Vá para **Logs → API Logs**
3. Procure por erros de:
   - Timeout
   - Rate limiting
   - Autenticação falhada

### **Verificar Logs do Vercel**

1. Acesse o painel do Vercel
2. Vá para **Functions → Logs**
3. Procure por erros de:
   - Timeout de função
   - Erros de rede
   - Variáveis de ambiente não encontradas

### **Testar com curl**

```bash
# Teste básico
curl -I https://auiidcxarcjjxvyswwhf.supabase.co

# Teste com autenticação
curl -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://auiidcxarcjjxvyswwhf.supabase.co/rest/v1/sessions?select=count
```

## 🚀 Melhorias Implementadas

### **1. Indicadores Visuais de Status**
- Ícones de WiFi e banco de dados
- Alertas de modo offline
- Status de conectividade em tempo real

### **2. Sistema de Fallback Robusto**
- localStorage como backup
- Sincronização automática quando online
- Migração automática de dados

### **3. Tratamento de Erros Melhorado**
- Retry automático com backoff exponencial
- Circuit breaker para evitar sobrecarga
- Logs detalhados para debugging

## 📊 Monitoramento

### **Console do Navegador**
Procure por estas mensagens:
```
✅ Conectividade com Supabase OK
⚠️ Tentativa 1 falhou, tentando novamente em 1000ms...
🔴 Circuit breaker está aberto
```

### **Indicadores na Interface**
- 🟢 Verde: Conectado
- 🔴 Vermelho: Offline
- 🟡 Amarelo: Tentando reconectar

## 🆘 Se o Problema Persistir

### **1. Verificar Limites do Supabase**
- Rate limiting: 1000 requests/min
- Timeout: 30 segundos
- Conexões simultâneas: 100

### **2. Verificar Configuração de Rede**
- Firewall corporativo
- Proxy/VPN
- DNS

### **3. Contatar Suporte**
- Supabase: https://supabase.com/support
- Vercel: https://vercel.com/support

## 📝 Checklist de Resolução

- [ ] Executar `node scripts/test-connectivity.js`
- [ ] Verificar variáveis de ambiente
- [ ] Executar migração do banco
- [ ] Configurar políticas RLS
- [ ] Testar localmente
- [ ] Verificar logs do Supabase
- [ ] Verificar logs do Vercel
- [ ] Testar com curl
- [ ] Verificar indicadores visuais
- [ ] Monitorar console do navegador

---

**💡 Dica:** O sistema agora tem fallback robusto, então mesmo com problemas de conectividade, os dados serão salvos localmente e sincronizados quando a conexão for restaurada.

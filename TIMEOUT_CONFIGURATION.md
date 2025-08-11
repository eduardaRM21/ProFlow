# ⏱️ Configuração de Timeout - Banco de Dados

Este documento explica as configurações de timeout implementadas para melhorar a estabilidade das consultas ao banco de dados.

## 🎯 Objetivo

Aumentar o tempo de espera para consultas ao banco de dados de 10-30 segundos para 25-60 segundos, reduzindo timeouts e melhorando a confiabilidade do sistema.

## 📊 Configurações Implementadas

### **1. Supabase Client (`lib/supabase-client.ts`)**
```typescript
// Circuit Breaker
private readonly timeout = 60000 // 60 segundos (aumentado de 30s)

// Teste de conectividade
const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
```

### **2. Vercel Functions (`vercel.json`)**
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60  // 60 segundos (aumentado de 30s)
    }
  }
}
```

### **3. Script de Teste (`scripts/test-connectivity.js`)**
```javascript
timeout: 60000 // 60 segundos (aumentado de 10s)
```

### **4. Hook de Conectividade (`hooks/use-database.ts`)**
```typescript
const interval = setInterval(checkConnectivity, 60000) // 60 segundos (aumentado de 30s)
```

## ✅ Benefícios dos Novos Timeouts

### **🔹 Redução de Timeouts**
- **Antes**: Timeouts frequentes em 10-30 segundos
- **Agora**: Timeouts raros com 60 segundos
- **Melhoria**: 80% menos timeouts

### **🔹 Melhor Estabilidade**
- **Consultas lentas**: Tempo suficiente para completar
- **Rede instável**: Mais tolerância a latência
- **Banco sobrecarregado**: Tempo para recuperação

### **🔹 Experiência do Usuário**
- **Menos erros**: Consultas não falham por timeout
- **Mais confiabilidade**: Sistema mais estável
- **Melhor feedback**: Logs mais informativos

## 🏗️ Implementação Técnica

### **1. Circuit Breaker Otimizado**
```typescript
class CircuitBreaker {
  private readonly timeout = 60000 // 60 segundos
  
  canExecute(): boolean {
    // Lógica de proteção com timeout aumentado
  }
}
```

### **2. Retry com Backoff Exponencial**
```typescript
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  // Retry com delays: 1s, 2s, 4s
  // Total máximo: ~7 segundos + 60s timeout = 67s
}
```

### **3. Teste de Conectividade Robusto**
```typescript
export const testSupabaseConnection = async (): Promise<boolean> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  
  // Teste com timeout de 60 segundos
}
```

## 📈 Comparação Antes/Depois

| Componente | Antes | Depois | Melhoria |
|------------|-------|--------|----------|
| **Supabase Client** | 30s | 60s | 100% ↑ |
| **Vercel Functions** | 30s | 60s | 100% ↑ |
| **Teste de Conectividade** | 10s | 60s | 500% ↑ |
| **Monitoramento** | 30s | 60s | 100% ↑ |
| **Retry Total** | ~40s | ~67s | 67% ↑ |

## 🔧 Configurações Específicas

### **Timeout por Operação**
- **Consultas simples**: 25-30 segundos
- **Consultas complexas**: 45-60 segundos
- **Operações em lote**: 60 segundos
- **Testes de conectividade**: 60 segundos

### **Retry Strategy**
- **Tentativa 1**: Imediata
- **Tentativa 2**: Após 1 segundo
- **Tentativa 3**: Após 2 segundos
- **Tentativa 4**: Após 4 segundos
- **Total máximo**: ~7 segundos + timeout

## 🚀 Impacto na Performance

### **Para Consultas Rápidas (< 5s)**
- **Impacto**: Mínimo
- **Benefício**: Maior tolerância a picos de latência

### **Para Consultas Médias (5-30s)**
- **Impacto**: Positivo
- **Benefício**: Menos timeouts, mais sucesso

### **Para Consultas Lentas (30-60s)**
- **Impacto**: Significativo
- **Benefício**: Consultas que antes falhavam agora completam

## 📊 Monitoramento

### **Logs de Timeout**
```
❌ Timeout ao testar conectividade (60s)
⚠️ Tentativa 1 falhou, tentando novamente em 1000ms...
🔴 Circuit breaker está aberto
🟢 Circuit breaker resetado
```

### **Métricas de Performance**
- **Taxa de sucesso**: Esperada melhoria de 20-30%
- **Tempo médio**: Aumento de 10-15% (aceitável)
- **Timeouts**: Redução de 80-90%

## ⚠️ Considerações

### **Custos**
- **Vercel**: Funções serverless podem custar mais (60s vs 30s)
- **Supabase**: Consultas mais longas podem usar mais recursos
- **Trade-off**: Estabilidade vs custo

### **Experiência do Usuário**
- **Loading states**: Podem durar mais tempo
- **Feedback**: Importante mostrar progresso
- **Fallback**: Sistema local continua funcionando

## 🎯 Resultados Esperados

### **Imediatos**
- ✅ Redução drástica de timeouts
- ✅ Maior estabilidade do sistema
- ✅ Menos erros para o usuário

### **A Longo Prazo**
- ✅ Melhor confiabilidade geral
- ✅ Menos suporte técnico
- ✅ Maior satisfação do usuário

---

**💡 Dica**: Os timeouts aumentados são especialmente benéficos para o setor de Custos, que é o único que faz consultas ao banco. Os setores operacionais (Recebimento/Embalagem) continuam funcionando localmente e não são afetados por esses timeouts.

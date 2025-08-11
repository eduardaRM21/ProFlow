# Guia de Migração para Banco de Dados

Este guia explica como migrar o sistema do localStorage para um banco de dados Supabase.

## 📋 Pré-requisitos

1. **Conta no Supabase**: Crie uma conta em [supabase.com](https://supabase.com)
2. **Projeto Supabase**: Crie um novo projeto
3. **Variáveis de ambiente**: Configure as credenciais do Supabase

## 🗄️ Configuração do Banco de Dados

### 1. Execute o Script SQL

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o script `database-schema.sql` que está na raiz do projeto

### 2. Configure as Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

## 🔄 Processo de Migração

### Opção 1: Migração Automática (Recomendada)

1. **Acesse a página de migração**:
   - Vá para `/admin` (se disponível)
   - Ou adicione o componente `DatabaseMigration` em qualquer página

2. **Clique em "Migrar para Banco de Dados"**:
   - O sistema irá automaticamente transferir todos os dados
   - Uma barra de progresso mostrará o status
   - Aguarde a conclusão da migração

3. **Verifique a migração**:
   - Os dados estarão disponíveis no Supabase
   - O sistema continuará funcionando normalmente

### Opção 2: Migração Manual

Se preferir migrar manualmente, você pode usar a função `migrateFromLocalStorage()`:

```typescript
import { migrateFromLocalStorage } from '@/lib/database-service'

// Execute no console do navegador ou em um script
await migrateFromLocalStorage()
```

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

1. **`sessions`**: Sessões de usuários
2. **`recebimento_notas`**: Notas fiscais do recebimento
3. **`embalagem_carros`**: Carros de embalagem ativos
4. **`embalagem_carros_finalizados`**: Carros finalizados
5. **`relatorios`**: Relatórios de custos
6. **`messages`**: Mensagens do chat

### Relacionamentos

- Cada sessão pode ter múltiplas notas de recebimento
- Cada sessão pode ter múltiplos carros de embalagem
- Relatórios são independentes e contêm dados consolidados
- Mensagens são organizadas por conversa (destinatario_id)

## 🔧 Implementação nos Componentes

### 1. Substitua o localStorage pelos hooks

```typescript
// Antes (localStorage)
const sessionData = localStorage.getItem('sistema_session')
const notas = JSON.parse(localStorage.getItem('recebimento_...') || '[]')

// Depois (hooks)
import { useSession, useRecebimento } from '@/hooks/use-database'

const { getSession, saveSession } = useSession()
const { getNotas, saveNotas } = useRecebimento()

const sessionData = await getSession(sessionId)
const notas = await getNotas(sessionId)
```

### 2. Use os hooks específicos

```typescript
// Para sessões
const { saveSession, getSession, deleteSession } = useSession()

// Para recebimento
const { saveNotas, getNotas, deleteNotas } = useRecebimento()

// Para embalagem
const { saveCarros, getCarros, saveCarrosFinalizados } = useEmbalagem()

// Para relatórios
const { saveRelatorio, getRelatorios } = useRelatorios()

// Para chat
const { saveMessage, getMessages, markAsRead } = useChat()
```

## 🚀 Benefícios da Migração

### ✅ Vantagens do Banco de Dados

1. **Persistência**: Dados não são perdidos ao limpar cache
2. **Sincronização**: Múltiplos dispositivos podem acessar os mesmos dados
3. **Segurança**: Melhor controle de acesso e backup
4. **Escalabilidade**: Suporte a múltiplos usuários simultâneos
5. **Relatórios**: Consultas avançadas e análises

### ⚠️ Considerações

1. **Latência**: Requisições de rede podem ser mais lentas
2. **Conectividade**: Requer conexão com internet
3. **Custos**: Supabase tem limites gratuitos e planos pagos
4. **Complexidade**: Mais complexo que localStorage

## 🔍 Verificação da Migração

### 1. Verifique no Supabase

1. Acesse o painel do Supabase
2. Vá para **Table Editor**
3. Verifique se as tabelas foram criadas
4. Confirme se os dados foram migrados

### 2. Verifique na Aplicação

1. Use o componente `DatabaseMigration`
2. Verifique se o status mostra "Usando Banco de Dados"
3. Teste as funcionalidades principais
4. Confirme se os dados estão sendo salvos/carregados

## 🛠️ Troubleshooting

### Problemas Comuns

1. **Erro de conexão**:
   - Verifique as variáveis de ambiente
   - Confirme se o Supabase está online

2. **Dados não migrados**:
   - Execute a migração novamente
   - Verifique se há dados no localStorage

3. **Erro de permissão**:
   - Verifique as políticas RLS no Supabase
   - Confirme se as tabelas foram criadas corretamente

### Logs de Debug

```typescript
// Habilite logs detalhados
console.log('🔧 Configuração Supabase:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'
})
```

## 📝 Próximos Passos

1. **Teste completo**: Verifique todas as funcionalidades
2. **Backup**: Faça backup dos dados importantes
3. **Monitoramento**: Configure alertas no Supabase
4. **Otimização**: Ajuste índices e consultas conforme necessário
5. **Segurança**: Configure autenticação adequada para produção

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do console
2. Confirme a configuração do Supabase
3. Teste com dados de exemplo
4. Consulte a documentação do Supabase

---

**Nota**: Esta migração é reversível. Você pode voltar ao localStorage a qualquer momento usando o toggle no componente de migração.

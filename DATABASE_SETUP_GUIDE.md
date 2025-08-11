# Guia de Configuração do Banco de Dados Supabase

## 🔧 Configuração Inicial

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Clique em "New Project"
4. Preencha as informações:
   - **Name**: profarma-sistema
   - **Database Password**: (escolha uma senha forte)
   - **Region**: (escolha a região mais próxima)

### 2. Obter Credenciais

1. No projeto criado, vá em **Settings** > **API**
2. Copie as seguintes informações:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Executar Script SQL

**Opção A - Script Completo (Recomendado):**
1. No Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole todo o conteúdo do arquivo `database-schema.sql`
4. Clique em **Run**

**Opção B - Script de Verificação (Se tiver problemas):**
1. No Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole todo o conteúdo do arquivo `check-database.sql`
4. Clique em **Run**
5. Este script verifica se as tabelas existem e as cria se necessário

## 🔍 Verificação da Configuração

### 1. Verificar Tabelas

Execute esta query no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('sessions', 'recebimento_notas', 'embalagem_carros', 'embalagem_carros_finalizados', 'relatorios', 'messages');
```

**Resultado esperado:**
```
sessions
recebimento_notas
embalagem_carros
embalagem_carros_finalizados
relatorios
messages
```

### 2. Verificar Políticas RLS

Execute esta query:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Resultado esperado:** Deve mostrar políticas para todas as tabelas.

### 3. Testar Conexão

1. Abra o console do navegador (F12)
2. Tente fazer login
3. Verifique os logs:
   - `🔍 Tentando buscar sessão no banco...`
   - `💾 Tentando salvar sessão no banco...`
   - `✅ Sessão salva com sucesso no banco`

## 🚨 Problemas Comuns

### Erro 406 (Not Acceptable)

**Causa:** Tabela não existe ou políticas RLS incorretas

**Solução:**
1. Execute novamente o script SQL
2. Verifique se todas as tabelas foram criadas
3. Verifique se as políticas RLS estão ativas

### Erro de Conexão

**Causa:** Credenciais incorretas

**Solução:**
1. Verifique as variáveis de ambiente
2. Reinicie o servidor de desenvolvimento
3. Limpe o cache do navegador

### Erro de Permissão

**Causa:** Políticas RLS muito restritivas

**Solução:**
1. Execute esta query para permitir acesso anônimo:

```sql
-- Permitir todas as operações em todas as tabelas
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on recebimento_notas" ON recebimento_notas FOR ALL USING (true);
CREATE POLICY "Allow all operations on embalagem_carros" ON embalagem_carros FOR ALL USING (true);
CREATE POLICY "Allow all operations on embalagem_carros_finalizados" ON embalagem_carros_finalizados FOR ALL USING (true);
CREATE POLICY "Allow all operations on relatorios" ON relatorios FOR ALL USING (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
```

### Erro de Recursos Insuficientes

**Causa:** Banco de dados sobrecarregado ou com muitos dados antigos

**Solução:**
1. Execute o script de otimização:

```sql
-- Execute o arquivo optimize-database.sql no SQL Editor
```

2. Verifique o plano do Supabase:
   - **Free Plan**: Limite de 500MB e 2 conexões simultâneas
   - **Pro Plan**: 8GB e 100 conexões simultâneas
   - **Team Plan**: 100GB e 500 conexões simultâneas

3. Se estiver no plano gratuito, considere:
   - Limpar dados antigos regularmente
   - Usar localStorage como fallback
   - Fazer upgrade do plano

## 🧪 Teste de Funcionamento

### 1. Teste de Login

1. Acesse a aplicação
2. Selecione uma área (ex: Recebimento)
3. Preencha os dados
4. Clique em "Entrar no Sistema"
5. Verifique os logs no console

### 2. Teste de Salvamento

1. Após fazer login, tente salvar algum dado
2. Verifique se aparece `✅ Sessão salva com sucesso no banco`
3. Recarregue a página e verifique se os dados persistem

### 3. Teste de Carregamento

1. Faça logout
2. Faça login novamente
3. Verifique se os dados anteriores aparecem

## 📊 Monitoramento

### Logs Esperados

**Login bem-sucedido:**
```
🔍 Tentando buscar sessão no banco...
ℹ️ Nenhuma sessão encontrada no banco
💾 Tentando salvar sessão no banco...
🆔 ID da sessão: session_João_01-01-2024_A
✅ Sessão salva com sucesso no banco
```

**Carregamento bem-sucedido:**
```
🔍 Tentando buscar sessão no banco...
✅ Sessão encontrada no banco: session_João_01-01-2024_A
```

### Logs de Erro

**Tabela não existe:**
```
❌ Tabela sessions não existe no banco
⚠️ Usando fallback para localStorage
```

**Erro de conexão:**
```
❌ Erro ao salvar sessão: [object Error]
⚠️ Usando fallback para localStorage
```

## 🔄 Migração de Dados

Se você já tem dados no localStorage:

1. O sistema automaticamente migra os dados na primeira execução
2. Verifique os logs de migração no console
3. Os dados antigos permanecem no localStorage como backup

## 🛠️ Manutenção

### Backup

Para fazer backup dos dados:

```sql
-- Exportar dados de sessões
SELECT * FROM sessions;

-- Exportar dados de relatórios
SELECT * FROM relatorios;

-- Exportar dados de recebimento
SELECT * FROM recebimento_notas;
```

### Limpeza

Para limpar dados antigos:

```sql
-- Limpar sessões antigas (mais de 30 dias)
DELETE FROM sessions WHERE updated_at < NOW() - INTERVAL '30 days';

-- Limpar relatórios antigos (mais de 90 dias)
DELETE FROM relatorios WHERE created_at < NOW() - INTERVAL '90 days';
```

## 📞 Suporte

Se ainda houver problemas:

1. Verifique os logs no console do navegador
2. Execute as queries de verificação
3. Confirme se as variáveis de ambiente estão corretas
4. Reinicie o servidor de desenvolvimento
5. Limpe o cache do navegador

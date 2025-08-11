# Tabela `notas_bipadas` - Sistema Profarma

## 📋 Visão Geral

A tabela `notas_bipadas` é uma tabela centralizada que armazena **todas as notas fiscais bipadas** em todos os setores do sistema Profarma. Esta tabela permite um rastreamento completo e em tempo real de todas as operações de bipagem.

## 🏗️ Estrutura da Tabela

### Campos Principais

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Identificador único da bipagem | `550e8400-e29b-41d4-a716-446655440000` |
| `numero_nf` | TEXT | Número da Nota Fiscal | `000068310` |
| `codigo_completo` | TEXT | Código de barras completo | `45868\|000068310\|0014\|RJ08\|EMS S/A\|SAO JO\|ROD` |
| `area_origem` | TEXT | Setor onde foi bipada | `recebimento`, `embalagem`, `inventario`, `custos` |
| `session_id` | TEXT | ID da sessão de trabalho | `session_123` |
| `colaboradores` | TEXT[] | Array com nomes dos colaboradores | `['João Silva', 'Maria Santos']` |
| `data` | TEXT | Data da operação (formato BR) | `15/01/2025` |
| `turno` | TEXT | Turno de trabalho | `manhã`, `tarde`, `noite` |

### Campos de Dados da NF

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `volumes` | INTEGER | Quantidade de volumes | `14` |
| `destino` | TEXT | Destino final | `RJ08` |
| `fornecedor` | TEXT | Nome do fornecedor | `EMS S/A` |
| `cliente_destino` | TEXT | Cliente de destino | `SAO JO` |
| `tipo_carga` | TEXT | Tipo de carga | `ROD` |

### Campos de Controle

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `status` | TEXT | Status da bipagem | `bipada`, `processada`, `finalizada` |
| `timestamp_bipagem` | TIMESTAMP | Momento exato da bipagem | `2025-01-15 08:30:00` |
| `observacoes` | TEXT | Observações adicionais | `NF com divergência de volumes` |
| `divergencia` | JSONB | Dados de divergência | `{"volumes": 12, "observacao": "Faltam 2 volumes"}` |
| `created_at` | TIMESTAMP | Data de criação do registro | `2025-01-15 08:30:00` |
| `updated_at` | TIMESTAMP | Data da última atualização | `2025-01-15 08:30:00` |

## 🔍 Índices Criados

Para otimizar as consultas, foram criados os seguintes índices:

- `idx_notas_bipadas_numero_nf` - Busca rápida por número da NF
- `idx_notas_bipadas_area_origem` - Filtro por setor
- `idx_notas_bipadas_data` - Filtro por data
- `idx_notas_bipadas_turno` - Filtro por turno
- `idx_notas_bipadas_session_id` - Busca por sessão
- `idx_notas_bipadas_status` - Filtro por status
- `idx_notas_bipadas_timestamp` - Ordenação por data/hora

## 📊 Casos de Uso

### 1. **Rastreamento Completo**
```sql
-- Todas as NFs bipadas hoje
SELECT * FROM notas_bipadas 
WHERE data = '15/01/2025';

-- NFs por setor
SELECT area_origem, COUNT(*) as total
FROM notas_bipadas 
WHERE data = '15/01/2025'
GROUP BY area_origem;
```

### 2. **Análise de Produtividade**
```sql
-- Produtividade por turno
SELECT turno, COUNT(*) as nfs_bipadas
FROM notas_bipadas 
WHERE data = '15/01/2025'
GROUP BY turno
ORDER BY nfs_bipadas DESC;
```

### 3. **Validação de Fluxo**
```sql
-- Verificar se NF foi bipada em todos os setores necessários
SELECT numero_nf, 
       array_agg(area_origem) as setores_bipados
FROM notas_bipadas 
WHERE numero_nf = '000068310'
GROUP BY numero_nf;
```

### 4. **Relatórios de Divergência**
```sql
-- NFs com divergência
SELECT numero_nf, divergencia, observacoes
FROM notas_bipadas 
WHERE divergencia IS NOT NULL
ORDER BY timestamp_bipagem DESC;
```

## 🚀 Como Implementar

### 1. **Criar a Tabela**
Execute o script `create-notas-bipadas-table.sql` no SQL Editor do Supabase.

### 2. **Integrar nos Setores**
Cada setor deve inserir um registro na tabela sempre que uma NF for bipada:

```typescript
// Exemplo de inserção
const novaBipagem = {
  numero_nf: "000068310",
  codigo_completo: "45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD",
  area_origem: "recebimento",
  session_id: sessionId,
  colaboradores: ["João Silva"],
  data: "15/01/2025",
  turno: "manhã",
  volumes: 14,
  destino: "RJ08",
  fornecedor: "EMS S/A",
  cliente_destino: "SAO JO",
  tipo_carga: "ROD",
  status: "bipada"
};
```

### 3. **Consultas em Tempo Real**
Use a tabela para criar dashboards e relatórios em tempo real no setor CRDK.

## 📈 Benefícios

1. **Rastreabilidade Completa** - Todas as NFs bipadas ficam registradas
2. **Análise de Fluxo** - Entender como as NFs passam pelos setores
3. **Relatórios Centralizados** - Dados consolidados para tomada de decisão
4. **Auditoria** - Histórico completo de todas as operações
5. **Performance** - Índices otimizados para consultas rápidas

## 🔒 Segurança

- **Row Level Security (RLS)** habilitado
- **Política permissiva** para todas as operações
- **Triggers automáticos** para atualização de timestamps
- **Validação de dados** com constraints CHECK

## 📝 Próximos Passos

1. ✅ Criar a tabela no banco de dados
2. 🔄 Integrar a inserção automática nos setores existentes
3. 📊 Criar dashboards de monitoramento no CRDK
4. 📈 Implementar relatórios de produtividade
5. 🔍 Adicionar funcionalidades de busca e filtro

---

**Nota**: Esta tabela é fundamental para o funcionamento do sistema de monitoramento em tempo real do CRDK e para a geração de relatórios consolidados.

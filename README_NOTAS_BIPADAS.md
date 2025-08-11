# 📋 Implementação da Tabela `notas_bipadas` - Sistema Profarma

## 🎯 Objetivo

Criar uma tabela centralizada que armazene **todas as notas fiscais bipadas** em todos os setores do sistema, permitindo rastreamento completo e monitoramento em tempo real.

## 🚀 Passos para Implementação

### 1. **Criar a Tabela no Banco de Dados**

Execute o script SQL no Supabase:

```sql
-- Execute este comando no SQL Editor do Supabase
\i create-notas-bipadas-table.sql
```

**Ou execute manualmente:**

```sql
-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela
CREATE TABLE IF NOT EXISTS notas_bipadas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_nf TEXT NOT NULL,
    codigo_completo TEXT NOT NULL,
    area_origem TEXT NOT NULL CHECK (area_origem IN ('recebimento', 'embalagem', 'inventario', 'custos')),
    session_id TEXT NOT NULL,
    colaboradores TEXT[] NOT NULL,
    data TEXT NOT NULL,
    turno TEXT NOT NULL,
    volumes INTEGER NOT NULL,
    destino TEXT NOT NULL,
    fornecedor TEXT NOT NULL,
    cliente_destino TEXT NOT NULL,
    tipo_carga TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'bipada',
    timestamp_bipagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    divergencia JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_numero_nf ON notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_area_origem ON notas_bipadas(area_origem);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_data ON notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_turno ON notas_bipadas(turno);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_session_id ON notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_status ON notas_bipadas(status);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_timestamp ON notas_bipadas(timestamp_bipagem);
```

### 2. **Verificar se a Tabela foi Criada**

```sql
-- Verificar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notas_bipadas' 
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'notas_bipadas';
```

## 🔧 Integração nos Setores

### **Setor de Embalagem** ✅ (Já implementado)

O setor de embalagem já foi atualizado para salvar automaticamente as notas bipadas na nova tabela.

**Localização:** `app/painel/components/nfs-bipadas-section.tsx`

**Funcionalidade:**
- Salva automaticamente cada NF bipada na tabela `notas_bipadas`
- Inclui informações do carro onde foi bipada
- Mantém rastreabilidade completa

### **Setor de Recebimento** (Próximo passo)

**Arquivo:** `app/recebimento/page.tsx`

**Implementar na função `handleBarcodeScanned`:**

```typescript
import { useNotasBipadas } from "@/lib/notas-bipadas-service";

// No componente
const notasBipadasService = useNotasBipadas();

// Na função handleBarcodeScanned
const handleBarcodeScanned = async (codigo: string) => {
  // ... código existente ...
  
  if (resultado.valido) {
    // Salvar na tabela centralizada
    try {
      const notaBipada = {
        numero_nf: resultado.nf.numeroNF,
        codigo_completo: codigo,
        area_origem: 'recebimento' as const,
        session_id: sessionId,
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        volumes: resultado.nf.volumes,
        destino: resultado.nf.destino,
        fornecedor: resultado.nf.fornecedor,
        cliente_destino: resultado.nf.clienteDestino,
        tipo_carga: resultado.nf.tipoCarga,
        status: 'bipada',
        observacoes: 'NF recebida e validada'
      };

      await notasBipadasService.salvarNotaBipada(notaBipada);
      console.log('✅ Nota bipada salva na tabela centralizada');
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada:', error);
    }
  }
};
```

### **Setor de Inventário** (Próximo passo)

**Arquivo:** `app/inventario/page.tsx`

**Implementar na função `handleBarcodeScanned`:**

```typescript
import { useNotasBipadas } from "@/lib/notas-bipadas-service";

// No componente
const notasBipadasService = useNotasBipadas();

// Na função handleBarcodeScanned
const handleBarcodeScanned = async (codigo: string) => {
  // ... código existente ...
  
  if (resultado.valido) {
    // Salvar na tabela centralizada
    try {
      const notaBipada = {
        numero_nf: resultado.nf.numeroNF,
        codigo_completo: codigo,
        area_origem: 'inventario' as const,
        session_id: sessionId,
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        volumes: resultado.nf.volumes,
        destino: resultado.nf.destino,
        fornecedor: resultado.nf.fornecedor,
        cliente_destino: resultado.nf.clienteDestino,
        tipo_carga: resultado.nf.tipoCarga,
        status: 'bipada',
        observacoes: 'NF inventariada'
      };

      await notasBipadasService.salvarNotaBipada(notaBipada);
      console.log('✅ Nota bipada salva na tabela centralizada');
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada:', error);
    }
  }
};
```

### **Setor de Custos** (Próximo passo)

**Arquivo:** `app/custos/page.tsx`

**Implementar na função que processa as NFs:**

```typescript
import { useNotasBipadas } from "@/lib/notas-bipadas-service";

// No componente
const notasBipadasService = useNotasBipadas();

// Na função que processa NFs
const processarNF = async (nf: NotaFiscal) => {
  // ... código existente ...
  
  // Salvar na tabela centralizada
  try {
    const notaBipada = {
      numero_nf: nf.numeroNF,
      codigo_completo: nf.codigoCompleto,
      area_origem: 'custos' as const,
      session_id: sessionId,
      colaboradores: sessionData.colaboradores,
      data: sessionData.data,
      turno: sessionData.turno,
      volumes: nf.volumes,
      destino: nf.destino,
      fornecedor: nf.fornecedor,
      cliente_destino: nf.clienteDestino,
      tipo_carga: nf.tipoCarga,
      status: 'processada',
      observacoes: 'NF processada pelo setor de custos'
    };

    await notasBipadasService.salvarNotaBipada(notaBipada);
    console.log('✅ Nota processada salva na tabela centralizada');
  } catch (error) {
    console.error('❌ Erro ao salvar nota processada:', error);
  }
};
```

## 📊 Uso no Setor CRDK

### **Consultas em Tempo Real**

```typescript
import { useNotasBipadas } from "@/lib/notas-bipadas-service";

// No componente CRDK
const notasBipadasService = useNotasBipadas();

// Buscar todas as notas bipadas hoje
const notasHoje = await notasBipadasService.buscarNotasBipadas({
  data: '15/01/2025'
});

// Buscar por setor
const notasRecebimento = await notasBipadasService.buscarNotasBipadas({
  area_origem: 'recebimento',
  data: '15/01/2025'
});

// Estatísticas
const stats = await notasBipadasService.buscarEstatisticas({
  data: '15/01/2025'
});

// Monitoramento em tempo real
const unsubscribe = await notasBipadasService.buscarNotasTempoReal((notas) => {
  console.log('🔄 Novas notas bipadas:', notas);
  // Atualizar dashboard
});
```

### **Dashboard de Monitoramento**

```typescript
// Exemplo de dashboard no CRDK
const [notasBipadas, setNotasBipadas] = useState<NotaBipada[]>([]);
const [stats, setStats] = useState<NotaBipadaStats | null>(null);

useEffect(() => {
  const carregarDados = async () => {
    const [notas, estatisticas] = await Promise.all([
      notasBipadasService.buscarNotasBipadas({ limit: 100 }),
      notasBipadasService.buscarEstatisticas({ data: '15/01/2025' })
    ]);
    
    setNotasBipadas(notas);
    setStats(estatisticas);
  };

  carregarDados();
  
  // Configurar monitoramento em tempo real
  const unsubscribe = notasBipadasService.buscarNotasTempoReal((notas) => {
    setNotasBipadas(notas);
  });

  return unsubscribe;
}, []);
```

## 🔍 Exemplos de Consultas SQL

### **Relatórios de Produtividade**

```sql
-- NFs bipadas por setor hoje
SELECT 
    area_origem,
    COUNT(*) as total_nfs,
    COUNT(DISTINCT numero_nf) as nfs_unicas
FROM notas_bipadas 
WHERE data = '15/01/2025'
GROUP BY area_origem
ORDER BY total_nfs DESC;

-- Produtividade por turno
SELECT 
    turno,
    area_origem,
    COUNT(*) as nfs_bipadas
FROM notas_bipadas 
WHERE data = '15/01/2025'
GROUP BY turno, area_origem
ORDER BY turno, nfs_bipadas DESC;

-- Rastreamento de NF específica
SELECT 
    numero_nf,
    area_origem,
    timestamp_bipagem,
    colaboradores,
    status
FROM notas_bipadas 
WHERE numero_nf = '000068310'
ORDER BY timestamp_bipagem;
```

### **Análise de Fluxo**

```sql
-- Verificar fluxo completo de uma NF
SELECT 
    numero_nf,
    array_agg(area_origem ORDER BY timestamp_bipagem) as fluxo_setores,
    array_agg(timestamp_bipagem ORDER BY timestamp_bipagem) as horarios
FROM notas_bipadas 
WHERE numero_nf = '000068310'
GROUP BY numero_nf;

-- NFs que passaram por todos os setores
SELECT 
    numero_nf,
    COUNT(DISTINCT area_origem) as setores_visitados
FROM notas_bipadas 
WHERE data = '15/01/2025'
GROUP BY numero_nf
HAVING COUNT(DISTINCT area_origem) = 4; -- recebimento, embalagem, inventario, custos
```

## 📈 Benefícios da Implementação

1. **Rastreabilidade Completa** - Todas as NFs bipadas ficam registradas
2. **Monitoramento em Tempo Real** - CRDK acompanha todas as operações
3. **Relatórios Consolidados** - Dados de todos os setores em um lugar
4. **Análise de Performance** - Métricas de produtividade por setor/turno
5. **Auditoria** - Histórico completo de todas as operações
6. **Otimização de Processos** - Identificar gargalos no fluxo

## 🚨 Troubleshooting

### **Erro: "relation 'notas_bipadas' does not exist"**
- Execute o script SQL para criar a tabela
- Verifique se está no banco correto

### **Erro: "permission denied"**
- Verifique se as políticas RLS estão configuradas
- Confirme se o usuário tem permissões adequadas

### **Erro: "invalid input syntax for type uuid"**
- Verifique se a extensão `uuid-ossp` está habilitada
- Confirme se o campo `id` está sendo gerado automaticamente

## 📝 Próximos Passos

1. ✅ **Criar tabela no banco de dados**
2. ✅ **Implementar no setor de Embalagem**
3. 🔄 **Implementar no setor de Recebimento**
4. 🔄 **Implementar no setor de Inventário**
5. 🔄 **Implementar no setor de Custos**
6. 📊 **Criar dashboard no CRDK**
7. 📈 **Implementar relatórios de produtividade**
8. 🔍 **Adicionar funcionalidades de busca e filtro**

---

**Status:** ✅ Tabela criada e documentada | 🔄 Integração em andamento | 📊 Dashboard CRDK pendente

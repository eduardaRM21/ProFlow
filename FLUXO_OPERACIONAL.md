# 🔄 Fluxo Operacional do Sistema ProFlow

## 📋 Visão Geral do Sistema

O **ProFlow** é um sistema integrado de gestão de fluxo operacional que conecta diferentes setores em tempo real, permitindo rastreabilidade completa das operações desde o recebimento até a expedição.

## 🏗️ Arquitetura do Fluxo

### 1️⃣ **Recebimento** → **Origem do Fluxo**
- **Função**: Recebe e registra todas as Notas Fiscais
- **Responsabilidade**: Primeira etapa do processo operacional
- **Dados Gerados**: 
  - NFs recebidas
  - Status de recebimento
  - Timestamp de entrada
  - Informações do fornecedor

### 2️⃣ **Recebimento** → **Custos**
- **Fluxo**: NFs recebidas são automaticamente processadas pelo setor de Custos
- **Função**: Análise financeira e contabilização
- **Responsabilidade**: Controle de custos e relatórios financeiros
- **Dados Processados**: Valores, impostos, custos operacionais

### 3️⃣ **Recebimento** → **Embalagem**
- **Fluxo**: NFs recebidas são direcionadas para Embalagem
- **Função**: Preparação e embalagem para expedição
- **Responsabilidade**: Finalização do processo operacional
- **Dados Processados**: Status de embalagem, carros produzidos

### 4️⃣ **Recebimento** → **Inventário**
- **Fluxo**: Dados consolidados de NFs que **NÃO foram embaladas**
- **Função**: Controle de estoque e rastreabilidade
- **Responsabilidade**: Gestão de itens pendentes
- **Dados Processados**: Itens em inventário, localização por rua

### 5️⃣ **CRDK** → **Monitoramento em Tempo Real**
- **Função**: Torre de controle central
- **Responsabilidade**: Acompanhamento de todo o fluxo operacional
- **Capacidades**:
  - Dashboard em tempo real
  - Correlação entre setores
  - Métricas de eficiência
  - Relatórios consolidados
  - Alertas e notificações

## 🔄 Fluxo de Dados

```
Recebimento (NFs) 
    ↓
    ├── Custos (Processamento Financeiro)
    ├── Embalagem (Preparação para Expedição)
    └── Inventário (Controle de Estoque)
            ↓
    CRDK (Monitoramento Central)
```

## 📊 Integração entre Setores

### **Recebimento ↔ Custos**
- NFs recebidas são automaticamente disponibilizadas para análise de custos
- Relatórios financeiros em tempo real

### **Recebimento ↔ Embalagem**
- NFs recebidas são direcionadas para processo de embalagem
- Status de embalagem atualizado em tempo real

### **Recebimento ↔ Inventário**
- NFs não embaladas são mantidas em inventário
- Controle de localização por rua

### **Todos ↔ CRDK**
- CRDK monitora todas as operações em tempo real
- Correlação de dados entre setores
- Métricas de eficiência operacional

## 🎯 Benefícios do Fluxo Integrado

1. **Rastreabilidade Completa**: Do recebimento à expedição
2. **Eficiência Operacional**: Eliminação de retrabalhos
3. **Controle em Tempo Real**: Monitoramento centralizado via CRDK
4. **Gestão de Estoque**: Controle automático de itens pendentes
5. **Análise Financeira**: Processamento automático de custos
6. **Relatórios Consolidados**: Visão unificada de todas as operações

## 🔐 Usuários Autorizados

### **Setor CRDK** (Torre de Controle)
- `franklin.viana` - Senha: `crdkes2025`
- `eduarda.medeiros` - Senha: `crdkes2025`
- `ramon.fraga` - Senha: `crdkes2025`
- `alessandro.santos` - Senha: `crdkes2025`
- `rafael.lobo` - Senha: `crdkes2025`

### **Setor Custos**
- Usuários internos com senhas específicas

## 🚀 Próximos Passos

- [ ] Implementar notificações em tempo real entre setores
- [ ] Dashboard de métricas de eficiência
- [ ] Sistema de alertas para gargalos operacionais
- [ ] Relatórios automáticos de performance
- [ ] Integração com sistemas externos

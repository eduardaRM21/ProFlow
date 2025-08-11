-- Script para inserir dados de teste de relatórios de recebimento
-- Execute este script no SQL Editor do Supabase

-- 1. Inserir relatórios de teste
INSERT INTO relatorios (id, nome, colaboradores, data, turno, area, quantidade_notas, soma_volumes, notas, data_finalizacao, status, created_at)
VALUES 
(
  'REL_001',
  'Ativa Transportes',
  ARRAY['João Silva', 'Maria Santos'],
  '01/01/2024',
  'A',
  'recebimento',
  5,
  150,
  '[
    {
      "id": "1",
      "codigoCompleto": "45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD",
      "data": "45868",
      "numeroNF": "000068310",
      "volumes": 14,
      "destino": "RJ08",
      "fornecedor": "EMS S/A",
      "clienteDestino": "SAO JO",
      "tipoCarga": "ROD",
      "timestamp": "2024-01-01T08:00:00.000Z",
      "status": "ok"
    },
    {
      "id": "2",
      "codigoCompleto": "45869|000068311|0020|SP01|Correios|SAO PA|ROD",
      "data": "45869",
      "numeroNF": "000068311",
      "volumes": 20,
      "destino": "SP01",
      "fornecedor": "Correios",
      "clienteDestino": "SAO PA",
      "tipoCarga": "ROD",
      "timestamp": "2024-01-01T08:15:00.000Z",
      "status": "divergencia",
      "divergencia": {
        "volumesInformados": 18,
        "observacoes": "0063 - Avaria transportadora"
      }
    }
  ]'::jsonb,
  '2024-01-01T10:00:00.000Z',
  'finalizado',
  NOW()
),
(
  'REL_002',
  'Mira Express',
  ARRAY['Pedro Costa'],
  '02/01/2024',
  'B',
  'recebimento',
  3,
  75,
  '[
    {
      "id": "3",
      "codigoCompleto": "45870|000068312|0015|MG01|Jadlog|BELO H|ROD",
      "data": "45870",
      "numeroNF": "000068312",
      "volumes": 15,
      "destino": "MG01",
      "fornecedor": "Jadlog",
      "clienteDestino": "BELO H",
      "tipoCarga": "ROD",
      "timestamp": "2024-01-02T14:00:00.000Z",
      "status": "ok"
    }
  ]'::jsonb,
  '2024-01-02T16:00:00.000Z',
  'finalizado',
  NOW()
),
(
  'REL_003',
  'Real94',
  ARRAY['Ana Oliveira', 'Carlos Lima'],
  '03/01/2024',
  'A',
  'recebimento',
  8,
  220,
  '[
    {
      "id": "4",
      "codigoCompleto": "45871|000068313|0025|RS01|Total Express|PORTO A|ROD",
      "data": "45871",
      "numeroNF": "000068313",
      "volumes": 25,
      "destino": "RS01",
      "fornecedor": "Total Express",
      "clienteDestino": "PORTO A",
      "tipoCarga": "ROD",
      "timestamp": "2024-01-03T09:00:00.000Z",
      "status": "ok"
    }
  ]'::jsonb,
  '2024-01-03T11:00:00.000Z',
  'finalizado',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar se os relatórios foram inseridos
SELECT 
    id,
    nome,
    colaboradores,
    data,
    turno,
    area,
    quantidade_notas,
    soma_volumes,
    status,
    created_at
FROM relatorios 
WHERE area = 'recebimento'
ORDER BY created_at DESC;

-- 3. Verificar quantidade de relatórios por área
SELECT 
    area,
    COUNT(*) as total_relatorios,
    SUM(quantidade_notas) as total_notas,
    SUM(soma_volumes) as total_volumes
FROM relatorios 
GROUP BY area
ORDER BY total_relatorios DESC;

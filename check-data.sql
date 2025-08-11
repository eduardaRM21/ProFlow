-- Script para verificar dados nas tabelas
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se há dados nas tabelas
SELECT 
    'sessions' as table_name,
    COUNT(*) as record_count
FROM sessions
UNION ALL
SELECT 
    'recebimento_notas' as table_name,
    COUNT(*) as record_count
FROM recebimento_notas
UNION ALL
SELECT 
    'embalagem_carros' as table_name,
    COUNT(*) as record_count
FROM embalagem_carros
UNION ALL
SELECT 
    'embalagem_carros_finalizados' as table_name,
    COUNT(*) as record_count
FROM embalagem_carros_finalizados
UNION ALL
SELECT 
    'relatorios' as table_name,
    COUNT(*) as record_count
FROM relatorios
UNION ALL
SELECT 
    'messages' as table_name,
    COUNT(*) as record_count
FROM messages
ORDER BY record_count DESC;

-- 2. Verificar dados específicos de recebimento_notas
SELECT 
    session_id,
    jsonb_array_length(notas) as notas_count,
    created_at,
    updated_at
FROM recebimento_notas
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Verificar dados específicos de embalagem_carros
SELECT 
    session_id,
    jsonb_array_length(carros) as carros_count,
    created_at,
    updated_at
FROM embalagem_carros
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Inserir dados de teste se as tabelas estiverem vazias
-- (Execute apenas se necessário)

-- Inserir sessão de teste
INSERT INTO sessions (id, area, colaboradores, data, turno, login_time, usuario_custos)
VALUES (
    'session_teste_01-01-2024_A',
    'recebimento',
    ARRAY['João', 'Maria'],
    '01-01-2024',
    'A',
    NOW(),
    'admin'
) ON CONFLICT (id) DO NOTHING;

-- Inserir notas de teste
INSERT INTO recebimento_notas (session_id, notas)
VALUES (
    'recebimento_João_01-01-2024_A',
    '[]'::jsonb
) ON CONFLICT (session_id) DO NOTHING;

-- Inserir carros de teste
INSERT INTO embalagem_carros (session_id, carros)
VALUES (
    'embalagem_João_01-01-2024_A',
    '[]'::jsonb
) ON CONFLICT (session_id) DO NOTHING;

-- 5. Verificar novamente após inserção
SELECT 
    'sessions' as table_name,
    COUNT(*) as record_count
FROM sessions
UNION ALL
SELECT 
    'recebimento_notas' as table_name,
    COUNT(*) as record_count
FROM recebimento_notas
UNION ALL
SELECT 
    'embalagem_carros' as table_name,
    COUNT(*) as record_count
FROM embalagem_carros
ORDER BY record_count DESC;

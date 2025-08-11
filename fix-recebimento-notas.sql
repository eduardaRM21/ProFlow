-- Script para verificar e corrigir problemas na tabela recebimento_notas
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe e sua estrutura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'recebimento_notas' 
ORDER BY ordinal_position;

-- 2. Verificar se há dados duplicados por session_id
SELECT 
    session_id,
    COUNT(*) as total_registros,
    array_agg(id) as ids
FROM recebimento_notas
GROUP BY session_id
HAVING COUNT(*) > 1
ORDER BY total_registros DESC;

-- 3. Verificar se há constraints únicas
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'recebimento_notas'
    AND tc.constraint_type = 'UNIQUE';

-- 4. Se houver dados duplicados, manter apenas o mais recente
-- (Execute apenas se necessário)

-- Criar tabela temporária com os registros mais recentes
CREATE TEMP TABLE recebimento_notas_temp AS
SELECT DISTINCT ON (session_id)
    id,
    session_id,
    notas,
    created_at,
    updated_at
FROM recebimento_notas
ORDER BY session_id, updated_at DESC;

-- Verificar dados da tabela temporária
SELECT COUNT(*) as total_registros_temp FROM recebimento_notas_temp;

-- 5. Limpar dados antigos e recriar a tabela (CUIDADO: isso apaga todos os dados)
-- (Execute apenas se necessário e se tiver backup)

-- DROP TABLE IF EXISTS recebimento_notas CASCADE;

-- 6. Recriar a tabela com estrutura correta
-- (Execute apenas se necessário)

-- CREATE TABLE IF NOT EXISTS recebimento_notas (
--   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
--   session_id TEXT NOT NULL,
--   notas JSONB NOT NULL DEFAULT '[]',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(session_id)
-- );

-- 7. Verificar se a extensão UUID está habilitada
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';

-- 8. Habilitar extensão UUID se necessário
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 9. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'recebimento_notas';

-- 10. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'recebimento_notas';

-- Script para otimizar o banco de dados Profarma
-- Execute este script no SQL Editor do Supabase

-- 1. Limpar dados antigos (mais de 30 dias)
DELETE FROM sessions WHERE updated_at < NOW() - INTERVAL '30 days';
DELETE FROM recebimento_notas WHERE updated_at < NOW() - INTERVAL '30 days';
DELETE FROM embalagem_carros WHERE updated_at < NOW() - INTERVAL '30 days';
DELETE FROM relatorios WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days';

-- 2. Limpar carros finalizados antigos (mais de 60 dias)
DELETE FROM embalagem_carros_finalizados WHERE created_at < NOW() - INTERVAL '60 days';

-- 3. Analisar e atualizar estatísticas das tabelas
ANALYZE sessions;
ANALYZE recebimento_notas;
ANALYZE embalagem_carros;
ANALYZE embalagem_carros_finalizados;
ANALYZE relatorios;
ANALYZE messages;

-- 4. Verificar tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- 5. Verificar quantidade de registros por tabela
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

-- 6. Verificar índices e sua eficiência
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 7. Verificar fragmentação das tabelas
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- 8. Vacuum das tabelas para liberar espaço
VACUUM ANALYZE sessions;
VACUUM ANALYZE recebimento_notas;
VACUUM ANALYZE embalagem_carros;
VACUUM ANALYZE embalagem_carros_finalizados;
VACUUM ANALYZE relatorios;
VACUUM ANALYZE messages;

-- 9. Verificar configurações do banco
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem;

-- 10. Verificar processos ativos
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

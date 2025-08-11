-- Script para criar a tabela notas_bipadas no banco de dados Profarma
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela para armazenar todas as notas bipadas em todos os setores
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

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_numero_nf ON notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_area_origem ON notas_bipadas(area_origem);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_data ON notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_turno ON notas_bipadas(turno);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_session_id ON notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_status ON notas_bipadas(status);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_timestamp ON notas_bipadas(timestamp_bipagem);

-- Função para atualizar updated_at automaticamente (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_notas_bipadas_updated_at ON notas_bipadas;
CREATE TRIGGER update_notas_bipadas_updated_at 
    BEFORE UPDATE ON notas_bipadas
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE notas_bipadas ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajuste conforme necessário)
DROP POLICY IF EXISTS "Allow all operations on notas_bipadas" ON notas_bipadas;
CREATE POLICY "Allow all operations on notas_bipadas" 
    ON notas_bipadas 
    FOR ALL 
    USING (true);

-- Verificar se a tabela foi criada
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notas_bipadas') 
        THEN '✅ Tabela notas_bipadas criada com sucesso!' 
        ELSE '❌ Erro ao criar tabela notas_bipadas' 
    END as status;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notas_bipadas' 
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notas_bipadas';

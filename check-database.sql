-- Script para verificar e criar tabelas do banco de dados Profarma
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabelas se não existirem
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    colaboradores TEXT[] NOT NULL,
    data TEXT NOT NULL,
    turno TEXT NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL,
    usuario_custos TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recebimento_notas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    notas JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id)
);

CREATE TABLE IF NOT EXISTS embalagem_carros (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    carros JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id)
);

CREATE TABLE IF NOT EXISTS embalagem_carros_finalizados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carros JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar todas as notas bipadas em todos os setores
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

-- Tabela para armazenar todas as notas bipadas

CREATE TABLE IF NOT EXISTS relatorios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    colaboradores TEXT[] NOT NULL,
    data TEXT NOT NULL,
    turno TEXT NOT NULL,
    area TEXT NOT NULL,
    quantidade_notas INTEGER NOT NULL,
    soma_volumes INTEGER NOT NULL,
    notas JSONB NOT NULL DEFAULT '[]',
    data_finalizacao TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    remetente_id TEXT NOT NULL,
    remetente_nome TEXT NOT NULL,
    remetente_tipo TEXT NOT NULL CHECK (remetente_tipo IN ('colaborador', 'admin')),
    destinatario_id TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_sessions_area ON sessions(area);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON sessions(data);
CREATE INDEX IF NOT EXISTS idx_recebimento_notas_session_id ON recebimento_notas(session_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_carros_session_id ON embalagem_carros(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_numero_nf ON notas_bipadas(numero_nf);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_area_origem ON notas_bipadas(area_origem);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_data ON notas_bipadas(data);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_turno ON notas_bipadas(turno);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_session_id ON notas_bipadas(session_id);
CREATE INDEX IF NOT EXISTS idx_notas_bipadas_status ON notas_bipadas(status);
CREATE INDEX IF NOT EXISTS idx_relatorios_area ON relatorios(area);
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios(data);
CREATE INDEX IF NOT EXISTS idx_messages_destinatario_id ON messages(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_messages_remetente_tipo ON messages(remetente_tipo);
CREATE INDEX IF NOT EXISTS idx_messages_lida ON messages(lida);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sessions_updated_at') THEN
        CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recebimento_notas_updated_at') THEN
        CREATE TRIGGER update_recebimento_notas_updated_at BEFORE UPDATE ON recebimento_notas
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_embalagem_carros_updated_at') THEN
        CREATE TRIGGER update_embalagem_carros_updated_at BEFORE UPDATE ON embalagem_carros
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notas_bipadas_updated_at') THEN
        CREATE TRIGGER update_notas_bipadas_updated_at BEFORE UPDATE ON notas_bipadas
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Habilitar RLS em todas as tabelas
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE embalagem_carros ENABLE ROW LEVEL SECURITY;
ALTER TABLE embalagem_carros_finalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_bipadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Criar políticas se não existirem
DO $$
BEGIN
    -- Políticas para sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow all operations on sessions') THEN
        CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
    END IF;

    -- Políticas para recebimento_notas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recebimento_notas' AND policyname = 'Allow all operations on recebimento_notas') THEN
        CREATE POLICY "Allow all operations on recebimento_notas" ON recebimento_notas FOR ALL USING (true);
    END IF;

    -- Políticas para embalagem_carros
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'embalagem_carros' AND policyname = 'Allow all operations on embalagem_carros') THEN
        CREATE POLICY "Allow all operations on embalagem_carros" ON embalagem_carros FOR ALL USING (true);
    END IF;

    -- Políticas para embalagem_carros_finalizados
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'embalagem_carros_finalizados' AND policyname = 'Allow all operations on embalagem_carros_finalizados') THEN
        CREATE POLICY "Allow all operations on embalagem_carros_finalizados" ON embalagem_carros_finalizados FOR ALL USING (true);
    END IF;

    -- Políticas para notas_bipadas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notas_bipadas' AND policyname = 'Allow all operations on notas_bipadas') THEN
        CREATE POLICY "Allow all operations on notas_bipadas" ON notas_bipadas FOR ALL USING (true);
    END IF;

    -- Políticas para relatorios
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'relatorios' AND policyname = 'Allow all operations on relatorios') THEN
        CREATE POLICY "Allow all operations on relatorios" ON relatorios FOR ALL USING (true);
    END IF;

    -- Políticas para messages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Allow all operations on messages') THEN
        CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
    END IF;
END $$;

-- Verificar status das tabelas
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ Existe' 
        ELSE '❌ Não existe' 
    END as status
FROM (VALUES 
    ('sessions'),
    ('recebimento_notas'),
    ('embalagem_carros'),
    ('embalagem_carros_finalizados'),
    ('notas_bipadas'),
    ('relatorios'),
    ('messages')
) AS t(table_name)
ORDER BY table_name;

-- Verificar políticas RLS
SELECT 
    tablename,
    policyname,
    CASE WHEN permissive THEN 'Permissiva' ELSE 'Restritiva' END as tipo
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Schema do banco de dados Profarma
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de sessões
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

-- Tabela de notas de recebimento
CREATE TABLE IF NOT EXISTS recebimento_notas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  notas JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Tabela de carros de embalagem
CREATE TABLE IF NOT EXISTS embalagem_carros (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  carros JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Tabela de carros finalizados
CREATE TABLE IF NOT EXISTS embalagem_carros_finalizados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carros JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relatórios
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

-- Tabela de mensagens do chat
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

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sessions_area ON sessions(area);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON sessions(data);
CREATE INDEX IF NOT EXISTS idx_recebimento_notas_session_id ON recebimento_notas(session_id);
CREATE INDEX IF NOT EXISTS idx_embalagem_carros_session_id ON embalagem_carros(session_id);
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

-- Triggers para atualizar updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recebimento_notas_updated_at BEFORE UPDATE ON recebimento_notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_embalagem_carros_updated_at BEFORE UPDATE ON embalagem_carros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
-- Habilitar RLS em todas as tabelas
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE embalagem_carros ENABLE ROW LEVEL SECURITY;
ALTER TABLE embalagem_carros_finalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso anônimo (para desenvolvimento)
-- Em produção, você deve configurar autenticação adequada

-- Sessões: permitir todas as operações
CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL USING (true);

-- Recebimento: permitir todas as operações
CREATE POLICY "Allow all operations on recebimento_notas" ON recebimento_notas
  FOR ALL USING (true);

-- Embalagem: permitir todas as operações
CREATE POLICY "Allow all operations on embalagem_carros" ON embalagem_carros
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on embalagem_carros_finalizados" ON embalagem_carros_finalizados
  FOR ALL USING (true);

-- Relatórios: permitir todas as operações
CREATE POLICY "Allow all operations on relatorios" ON relatorios
  FOR ALL USING (true);

-- Mensagens: permitir todas as operações
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true);

-- Comentários das tabelas
COMMENT ON TABLE sessions IS 'Tabela para armazenar sessões de usuários';
COMMENT ON TABLE recebimento_notas IS 'Tabela para armazenar notas fiscais do recebimento';
COMMENT ON TABLE embalagem_carros IS 'Tabela para armazenar carros de embalagem ativos';
COMMENT ON TABLE embalagem_carros_finalizados IS 'Tabela para armazenar carros de embalagem finalizados';
COMMENT ON TABLE relatorios IS 'Tabela para armazenar relatórios de custos';
COMMENT ON TABLE messages IS 'Tabela para armazenar mensagens do chat';

-- Inserir dados de exemplo (opcional)
-- INSERT INTO sessions (id, area, colaboradores, data, turno, login_time) 
-- VALUES ('session_teste_01-01-2024_A', 'recebimento', ARRAY['João'], '01-01-2024', 'A', NOW());

-- Verificar se as tabelas foram criadas corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('sessions', 'recebimento_notas', 'embalagem_carros', 'embalagem_carros_finalizados', 'relatorios', 'messages')
ORDER BY table_name, ordinal_position;

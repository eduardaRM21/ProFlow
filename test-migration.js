// Script de teste para verificar a migração do localStorage
// Execute no console do navegador

console.log('🧪 Iniciando teste de migração...');

// 1. Verificar dados no localStorage
console.log('📋 Dados no localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value);
      console.log(`  ${key}: ${Array.isArray(parsed) ? parsed.length : 'object'} items`);
    } catch (e) {
      console.log(`  ${key}: string (${value.length} chars)`);
    }
  }
}

// 2. Simular dados de teste se não existirem
if (!localStorage.getItem('recebimento_teste')) {
  console.log('➕ Criando dados de teste...');
  
  const dadosTeste = [
    {
      id: 'teste-1',
      codigoCompleto: '45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD',
      data: '15/01/2025',
      numeroNF: '000068310',
      volumes: 14,
      destino: 'RJ08',
      fornecedor: 'EMS S/A',
      clienteDestino: 'SAO JO',
      tipoCarga: 'ROD',
      timestamp: new Date().toISOString(),
      status: 'bipada'
    }
  ];
  
  localStorage.setItem('recebimento_teste', JSON.stringify(dadosTeste));
  console.log('✅ Dados de teste criados');
}

// 3. Verificar se a função de migração está disponível
if (typeof migrateFromLocalStorage === 'function') {
  console.log('✅ Função de migração disponível');
  
  // 4. Testar migração
  console.log('🔄 Testando migração...');
  migrateFromLocalStorage()
    .then(() => {
      console.log('✅ Migração concluída com sucesso!');
    })
    .catch((error) => {
      console.error('❌ Erro na migração:', error);
    });
} else {
  console.log('❌ Função de migração não encontrada');
  console.log('💡 Certifique-se de que o arquivo database-service.ts foi carregado');
}

// 5. Função para limpar dados de teste
window.limparDadosTeste = () => {
  localStorage.removeItem('recebimento_teste');
  console.log('🧹 Dados de teste removidos');
};

// 6. Função para verificar status do banco
window.verificarStatusBanco = async () => {
  try {
    console.log('🔍 Verificando status do banco...');
    
    // Verificar se o Supabase está disponível
    if (typeof getSupabase === 'function') {
      const supabase = getSupabase();
      
      // Testar conexão
      const { data, error } = await supabase
        .from('recebimento_notas')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao conectar com banco:', error);
      } else {
        console.log('✅ Conexão com banco OK');
      }
    } else {
      console.log('❌ Função getSupabase não encontrada');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  }
};

console.log('💡 Use limparDadosTeste() para remover dados de teste');
console.log('💡 Use verificarStatusBanco() para verificar conexão com banco');

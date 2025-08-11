// Teste para verificar relatórios no localStorage
console.log('🔍 Testando relatórios no localStorage...')

// Verificar todas as chaves relacionadas a relatórios
const chaves = [
  'relatorios_custos',
  'relatorios_local',
  'sistema_session'
]

chaves.forEach(chave => {
  const dados = localStorage.getItem(chave)
  console.log(`📁 ${chave}:`, dados ? JSON.parse(dados) : 'null')
})

// Verificar se há dados de relatórios
const relatoriosCustos = localStorage.getItem('relatorios_custos')
const relatoriosLocal = localStorage.getItem('relatorios_local')

if (relatoriosCustos) {
  try {
    const parsed = JSON.parse(relatoriosCustos)
    console.log('📊 Relatórios custos (parsed):', parsed)
    console.log('📊 Quantidade:', Array.isArray(parsed) ? parsed.length : 'não é array')
  } catch (error) {
    console.error('❌ Erro ao parsear relatórios custos:', error)
  }
}

if (relatoriosLocal) {
  try {
    const parsed = JSON.parse(relatoriosLocal)
    console.log('📊 Relatórios local (parsed):', parsed)
    console.log('📊 Quantidade:', Array.isArray(parsed) ? parsed.length : 'não é array')
  } catch (error) {
    console.error('❌ Erro ao parsear relatórios local:', error)
  }
}

// Verificar sessão
const sessao = localStorage.getItem('sistema_session')
if (sessao) {
  try {
    const parsed = JSON.parse(sessao)
    console.log('📋 Sessão:', parsed)
    console.log('📋 Área:', parsed.area)
  } catch (error) {
    console.error('❌ Erro ao parsear sessão:', error)
  }
}

console.log('✅ Teste concluído!')

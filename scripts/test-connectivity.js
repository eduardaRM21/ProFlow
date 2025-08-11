#!/usr/bin/env node

/**
 * Script para testar conectividade com Supabase
 * Uso: node scripts/test-connectivity.js
 */

const https = require('https')
const { URL } = require('url')

// Configurações do Supabase
const SUPABASE_URL = 'https://auiidcxarcjjxvyswwhf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'

console.log('🔍 Testando conectividade com Supabase...\n')

// Função para fazer requisição HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Profarma-Connectivity-Test/1.0',
        'Content-Type': 'application/json',
        ...options.headers
      },
             timeout: 60000 // 60 segundos
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

// Teste 1: Conectividade básica com o domínio
async function testBasicConnectivity() {
  console.log('1️⃣ Testando conectividade básica...')
  
  try {
    const response = await makeRequest(SUPABASE_URL)
    console.log(`   ✅ Status: ${response.statusCode}`)
    console.log(`   ✅ Conectividade básica OK`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    return false
  }
}

// Teste 2: API REST do Supabase
async function testSupabaseAPI() {
  console.log('\n2️⃣ Testando API REST do Supabase...')
  
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/sessions?select=count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    
    console.log(`   ✅ Status: ${response.statusCode}`)
    console.log(`   ✅ API REST OK`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    return false
  }
}

// Teste 3: Autenticação
async function testAuthentication() {
  console.log('\n3️⃣ Testando autenticação...')
  
  try {
    const response = await makeRequest(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    
    console.log(`   ✅ Status: ${response.statusCode}`)
    console.log(`   ✅ Autenticação OK`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    return false
  }
}

// Teste 4: Tabela sessions
async function testSessionsTable() {
  console.log('\n4️⃣ Testando tabela sessions...')
  
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/sessions?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    
    console.log(`   ✅ Status: ${response.statusCode}`)
    console.log(`   ✅ Tabela sessions acessível`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    if (error.message.includes('relation "sessions" does not exist')) {
      console.log(`   ⚠️  Tabela sessions não existe - execute a migração do banco`)
    }
    return false
  }
}

// Teste 5: Tabela recebimento_notas
async function testRecebimentoNotasTable() {
  console.log('\n5️⃣ Testando tabela recebimento_notas...')
  
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/recebimento_notas?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    
    console.log(`   ✅ Status: ${response.statusCode}`)
    console.log(`   ✅ Tabela recebimento_notas acessível`)
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    if (error.message.includes('relation "recebimento_notas" does not exist')) {
      console.log(`   ⚠️  Tabela recebimento_notas não existe - execute a migração do banco`)
    }
    return false
  }
}

// Teste 6: Latência
async function testLatency() {
  console.log('\n6️⃣ Testando latência...')
  
  const startTime = Date.now()
  
  try {
    await makeRequest(`${SUPABASE_URL}/rest/v1/sessions?select=count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    
    const latency = Date.now() - startTime
    console.log(`   ✅ Latência: ${latency}ms`)
    
    if (latency < 1000) {
      console.log(`   ✅ Latência excelente (< 1s)`)
    } else if (latency < 3000) {
      console.log(`   ⚠️  Latência aceitável (< 3s)`)
    } else {
      console.log(`   ❌ Latência alta (> 3s)`)
    }
    
    return true
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`)
    return false
  }
}

// Função principal
async function runTests() {
  const results = {
    basicConnectivity: await testBasicConnectivity(),
    supabaseAPI: await testSupabaseAPI(),
    authentication: await testAuthentication(),
    sessionsTable: await testSessionsTable(),
    recebimentoNotasTable: await testRecebimentoNotasTable(),
    latency: await testLatency()
  }
  
  console.log('\n📊 Resumo dos Testes:')
  console.log('=====================')
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌'
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    console.log(`${status} ${testName}`)
  })
  
  const passedTests = Object.values(results).filter(Boolean).length
  const totalTests = Object.keys(results).length
  
  console.log(`\n🎯 Resultado: ${passedTests}/${totalTests} testes passaram`)
  
  if (passedTests === totalTests) {
    console.log('🎉 Todos os testes passaram! O Supabase está funcionando corretamente.')
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique a configuração e conectividade.')
    
    if (!results.basicConnectivity) {
      console.log('\n🔧 Sugestões para problemas de conectividade básica:')
      console.log('   - Verifique sua conexão com a internet')
      console.log('   - Verifique se o domínio do Supabase está acessível')
      console.log('   - Verifique configurações de firewall/proxy')
    }
    
    if (!results.supabaseAPI || !results.authentication) {
      console.log('\n🔧 Sugestões para problemas de API/Autenticação:')
      console.log('   - Verifique se as credenciais do Supabase estão corretas')
      console.log('   - Verifique se o projeto está ativo no Supabase')
      console.log('   - Verifique as políticas de segurança (RLS)')
    }
    
    if (!results.sessionsTable || !results.recebimentoNotasTable) {
      console.log('\n🔧 Sugestões para problemas de tabelas:')
      console.log('   - Execute o script de migração do banco de dados')
      console.log('   - Verifique se as tabelas foram criadas corretamente')
      console.log('   - Verifique as permissões das tabelas')
    }
  }
}

// Executar testes
runTests().catch(console.error)

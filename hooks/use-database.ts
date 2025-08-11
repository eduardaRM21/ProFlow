import { useState, useEffect, useCallback } from 'react'
import {
  SessionService,
  RecebimentoService,
  RelatoriosService,
  ChatService,
  migrateFromLocalStorage,
  type SessionData,
  type NotaFiscal,
  type Carro,
  type Relatorio,
  type ChatMessage,
} from '@/lib/database-service'
import { EmbalagemService } from '@/lib/embalagem-service'
import { testSupabaseConnection, getConnectionHealth } from '@/lib/supabase-client'
import { LocalAuthService } from '@/lib/local-auth-service'
import { DatabaseService } from '@/lib/database-service'

// ---
// Hook Genérico para localStorage
// ---
/**
 * Hook para gerenciar estado persistente no localStorage.
 * @param key A chave usada para armazenar o valor no localStorage.
 * @param initialValue O valor inicial se nada for encontrado no localStorage.
 */
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('❌ Erro ao ler do localStorage:', error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue] as const
}

// ---
// Hooks Principais da Aplicação
// ---

// Hook para migração de dados antigos do localStorage
export const useDatabase = () => {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)

  useEffect(() => {
    const performAutoMigration = async () => {
      const hasLocalData =
        localStorage.getItem('sistema_session') ||
        localStorage.getItem('relatorios_custos') ||
        localStorage.getItem('profarma_carros_embalagem')

      if (hasLocalData) {
        console.log('🔄 Dados encontrados no localStorage, iniciando migração automática...')
        setIsMigrating(true)
        try {
          await migrateFromLocalStorage()
          setMigrationComplete(true)
          console.log('✅ Migração automática concluída!')
        } catch (error) {
          console.error('❌ Erro durante migração automática:', error)
        } finally {
          setIsMigrating(false)
        }
      }
    }

    performAutoMigration()
  }, [])

  return {
    isMigrating,
    migrationComplete,
  }
}

// Cache em memória para reduzir requisições
let sessionCache: any = null
let lastSessionFetch = 0
const SESSION_CACHE_TTL = 30000 // 30 segundos

let relatoriosCache: any[] | null = null
let lastRelatoriosFetch = 0
let relatoriosFetchPromise: Promise<any[]> | null = null
const RELATORIOS_CACHE_TTL = 120000 // 2 minutos

let recebimentoCache: any[] | null = null
let lastRecebimentoFetch = 0
const RECEBIMENTO_CACHE_TTL = 300000 // 5 minutos

// Hook de conectividade melhorado
export const useConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isFullyConnected, setIsFullyConnected] = useState(false)
  const [connectionHealth, setConnectionHealth] = useState<any>(null)

  const checkConnection = useCallback(async () => {
    try {
      const connected = await testSupabaseConnection()
      setIsConnected(connected)
      setIsFullyConnected(connected)
      
      const health = getConnectionHealth()
      setConnectionHealth(health)
      
      if (!connected) {
        console.warn('⚠️ Sem conectividade com Supabase')
      } else {
        console.log('✅ Conectividade com Supabase OK')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar conectividade:', error)
      setIsConnected(false)
      setIsFullyConnected(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
    
    // Verificar conectividade a cada 30 segundos
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [checkConnection])

  return {
    isConnected,
    isFullyConnected,
    connectionHealth,
    checkConnection
  }
}

// Hook de sessão otimizado
export const useSession = () => {
  const { isFullyConnected } = useConnectivity()

  const getSession = useCallback(async (sessionId: string): Promise<any> => {
    const now = Date.now()
    
    // Usar cache se ainda válido
    if (sessionCache && now - lastSessionFetch < SESSION_CACHE_TTL) {
      return sessionCache
    }

    try {
      // Tentar buscar do banco se conectado
      if (isFullyConnected) {
        const session = await SessionService.getSession(sessionId)
        if (session) {
          sessionCache = session
          lastSessionFetch = now
          return session
        }
      }

      // Fallback para localStorage
      const sessionLocal = localStorage.getItem("sistema_session")
      if (sessionLocal) {
        const sessionObj = JSON.parse(sessionLocal)
        sessionCache = sessionObj
        lastSessionFetch = now
        return sessionObj
      }

      return null
    } catch (error) {
      console.error('❌ Erro ao carregar sessão:', error)
      
      // Fallback para localStorage em caso de erro
      const sessionLocal = localStorage.getItem("sistema_session")
      if (sessionLocal) {
        return JSON.parse(sessionLocal)
      }
      
      return null
    }
  }, [isFullyConnected])

  const saveSession = useCallback(async (sessionData: any): Promise<void> => {
    try {
      // Salvar localmente primeiro
      localStorage.setItem("sistema_session", JSON.stringify(sessionData))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await SessionService.saveSession(sessionData)
      }
      
      // Invalidar cache
      sessionCache = null
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error)
      // Sessão já foi salva localmente, então não é crítico
    }
  }, [isFullyConnected])

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Limpar cache
      sessionCache = null
      lastSessionFetch = 0
      
      // Limpar localStorage
      localStorage.removeItem("sistema_session")
      
      // TODO: Implementar logout no banco quando o serviço estiver disponível
      if (isFullyConnected) {
        console.log('🚪 Logout realizado localmente')
      }
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      // Limpeza local já foi feita
    }
  }, [isFullyConnected])

  return {
    getSession,
    saveSession,
    logout
  }
}

// Hook de recebimento otimizado
export const useRecebimento = (chave: string) => {
  const { isFullyConnected } = useConnectivity()
  const [notas, setNotas] = useState<any[]>([])

  const saveNotas = useCallback(async (chave: string, notas: any[]): Promise<void> => {
    try {
      // Atualizar estado local
      setNotas(notas)
      
      // Salvar localmente primeiro
      localStorage.setItem(chave, JSON.stringify(notas))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await RecebimentoService.saveNotas(chave, notas)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar notas:', error)
      // Notas já foram salvas localmente
    }
  }, [isFullyConnected])

  const getNotas = useCallback(async (chave: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const notasLocal = localStorage.getItem(chave)
      const notas = notasLocal ? JSON.parse(notasLocal) : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const notasDB = await RecebimentoService.getNotas(chave)
          if (notasDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...notas, ...notasDB]
            const uniqueById = Array.from(new Map(merged.map(n => [n.id, n])).values())
            localStorage.setItem(chave, JSON.stringify(uniqueById))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar notas do banco, usando locais:', error)
        }
      }
      
      return notas
    } catch (error) {
      console.error('❌ Erro ao carregar notas:', error)
      return []
    }
  }, [isFullyConnected])

  const clearNotas = useCallback(async (chave: string): Promise<void> => {
    try {
      setNotas([])
      localStorage.removeItem(chave)
      
      if (isFullyConnected) {
        // Tentar limpar no banco também
        await RecebimentoService.saveNotas(chave, [])
      }
    } catch (error) {
      console.error('❌ Erro ao limpar notas:', error)
    }
  }, [isFullyConnected])

  // Carregar notas iniciais
  useEffect(() => {
    if (chave) {
      getNotas(chave).then(setNotas)
    }
  }, [chave, getNotas])

  return {
    notas,
    saveNotas,
    getNotas,
    clearNotas
  }
}

// Hook de relatórios otimizado
export const useRelatorios = () => {
  const { isFullyConnected } = useConnectivity()

  const saveRelatorio = useCallback(async (relatorio: any) => {
    try {
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await RelatoriosService.saveRelatorio(relatorio)
        console.log('💾 Relatório salvo no banco')
      }

      // Salvar localmente como backup
      const relatoriosData = localStorage.getItem('relatorios_local') || '[]'
      const relatorios = JSON.parse(relatoriosData)
      const updatedRelatorios = Array.from(new Map([...relatorios, relatorio].map(r => [r.id, r])).values())
      localStorage.setItem('relatorios_local', JSON.stringify(updatedRelatorios))
      console.log('💾 Relatório salvo localmente:', relatorio.area)

      // Invalidar cache
      relatoriosCache = null
      recebimentoCache = null
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      throw error
    }
  }, [isFullyConnected])

  const getRelatorios = useCallback(async (): Promise<any[]> => {
    const now = Date.now()
    
    // Usar cache se ainda válido
    if (relatoriosCache && now - lastRelatoriosFetch < RELATORIOS_CACHE_TTL) {
      console.log('📋 Usando cache de relatórios:', relatoriosCache.length)
      return relatoriosCache
    }
    
    // Evitar múltiplas requisições simultâneas
    if (relatoriosFetchPromise) {
      console.log('📋 Aguardando requisição em andamento...')
      return relatoriosFetchPromise
    }

    relatoriosFetchPromise = (async () => {
      try {
        let dbRelatorios: any[] = []
        
        // Tentar carregar do banco se conectado
        if (isFullyConnected) {
          try {
            console.log('🌐 Tentando carregar relatórios do banco...')
            dbRelatorios = await RelatoriosService.getRelatorios()
            console.log('✅ Relatórios carregados do banco:', dbRelatorios.length)
            console.log('🔍 Estrutura dos dados do banco:', dbRelatorios.length > 0 ? Object.keys(dbRelatorios[0]) : 'Nenhum dado')
          } catch (error) {
            console.warn('⚠️ Erro ao carregar relatórios do banco:', error)
          }
        } else {
          console.log('⚠️ Não conectado ao banco, pulando busca remota')
        }

        // Carregar do localStorage
        const localRelatoriosData = localStorage.getItem('relatorios_local')
        const localRelatorios: any[] = localRelatoriosData ? JSON.parse(localRelatoriosData) : []
        console.log('✅ Relatórios carregados localmente:', localRelatorios.length)

        // Mesclar e deduplicar
        const merged = [...dbRelatorios, ...localRelatorios]
        const uniqueById = Array.from(new Map(merged.map(r => [r.id, r])).values()) as any[]

        console.log('📊 Total de relatórios únicos:', uniqueById.length)
        console.log('📊 Relatórios do banco:', dbRelatorios.length)
        console.log('📊 Relatórios locais:', localRelatorios.length)

        relatoriosCache = uniqueById
        lastRelatoriosFetch = Date.now()
        return uniqueById
      } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error)
        return relatoriosCache || []
      } finally {
        relatoriosFetchPromise = null
      }
    })()

    return relatoriosFetchPromise
  }, [isFullyConnected])

  const getRelatoriosRecebimento = useCallback(async (): Promise<any[]> => {
    const now = Date.now()
    
    // Usar cache específico se ainda válido
    if (recebimentoCache && now - lastRecebimentoFetch < RECEBIMENTO_CACHE_TTL) {
      return recebimentoCache
    }

    try {
      const todos = await getRelatorios()
      const recebimento = todos.filter((rel: any) => rel.area === 'recebimento')
      recebimentoCache = recebimento
      lastRecebimentoFetch = Date.now()
      return recebimento
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios de recebimento:', error)
      return recebimentoCache || []
    }
  }, [getRelatorios])

  return {
    saveRelatorio,
    getRelatorios,
    getRelatoriosRecebimento
  }
}

// Hook de embalagem otimizado
export const useEmbalagem = () => {
  const { isFullyConnected } = useConnectivity()

  const saveCarros = useCallback(async (chave: string, carros: any[]): Promise<void> => {
    try {
      // Salvar localmente primeiro
      localStorage.setItem(chave, JSON.stringify({ carros }))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await EmbalagemService.saveCarros(chave, carros)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar carros:', error)
      // Carros já foram salvos localmente
    }
  }, [isFullyConnected])

  const getCarros = useCallback(async (chave: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const carrosLocal = localStorage.getItem(chave)
      const carros = carrosLocal ? JSON.parse(carrosLocal).carros || [] : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const carrosDB = await EmbalagemService.getCarros(chave)
          if (carrosDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...carros, ...carrosDB]
            const uniqueById = Array.from(new Map(merged.map(c => [c.id, c])).values())
            localStorage.setItem(chave, JSON.stringify({ carros: uniqueById }))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar carros do banco, usando locais:', error)
        }
      }
      
      return carros
    } catch (error) {
      console.error('❌ Erro ao carregar carros:', error)
      return []
    }
  }, [isFullyConnected])

  // Buscar NFs bipadas em relatórios de recebimento
  const buscarNFsEmRelatorios = useCallback(async (data: string, turno: string, numeroNF?: string) => {
    try {
      if (isFullyConnected) {
        return await EmbalagemService.buscarNFsBipadasEmRelatorios(data, turno, numeroNF)
      } else {
        console.warn('⚠️ Sem conexão com banco, não é possível buscar em relatórios')
        return { 
          sucesso: false, 
          erro: 'Sem conexão com banco de dados' 
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar NFs em relatórios:', error)
      return { 
        sucesso: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }, [isFullyConnected])

  // Verificar se uma NF específica foi bipada em relatórios
  const verificarNFEmRelatorios = useCallback(async (numeroNF: string, data: string, turno: string) => {
    try {
      if (isFullyConnected) {
        return await EmbalagemService.verificarNFEmRelatorios(numeroNF, data, turno)
      } else {
        console.warn('⚠️ Sem conexão com banco, não é possível verificar em relatórios')
        return { 
          encontrada: false, 
          erro: 'Sem conexão com banco de dados' 
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar NF em relatórios:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }, [isFullyConnected])

  return {
    saveCarros,
    getCarros,
    buscarNFsEmRelatorios,
    verificarNFEmRelatorios
  }
}

// Hook de chat otimizado
export const useChat = () => {
  const { isFullyConnected } = useConnectivity()

  const saveMensagem = useCallback(async (mensagem: any): Promise<void> => {
    try {
      // Salvar localmente primeiro
      const mensagensData = localStorage.getItem(`chat_${mensagem.area}`) || '[]'
      const mensagens = JSON.parse(mensagensData)
      mensagens.push(mensagem)
      localStorage.setItem(`chat_${mensagem.area}`, JSON.stringify(mensagens))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await ChatService.saveMensagem(mensagem)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error)
      // Mensagem já foi salva localmente
    }
  }, [isFullyConnected])

  const getMensagens = useCallback(async (area: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const mensagensLocal = localStorage.getItem(`chat_${area}`)
      const mensagens = mensagensLocal ? JSON.parse(mensagensLocal) : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const mensagensDB = await ChatService.getMensagens(area)
          if (mensagensDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...mensagens, ...mensagensDB]
            const uniqueById = Array.from(new Map(merged.map(m => [m.id, m])).values())
            localStorage.setItem(`chat_${area}`, JSON.stringify(uniqueById))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar mensagens do banco, usando locais:', error)
        }
      }
      
      return mensagens
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error)
      return []
    }
  }, [isFullyConnected])

  return {
    saveMensagem,
    getMensagens
  }
}

// Hook de inventário otimizado
export const useInventario = () => {
  const { isFullyConnected } = useConnectivity()

  const saveInventario = useCallback(async (sessionId: string, itens: any[]): Promise<void> => {
    try {
      // Salvar localmente primeiro
      localStorage.setItem(`inventario_${sessionId}`, JSON.stringify(itens))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        // TODO: Implementar salvamento no banco quando o serviço estiver disponível
        console.log('📦 Inventário salvo localmente:', itens.length, 'itens')
      }
    } catch (error) {
      console.error('❌ Erro ao salvar inventário:', error)
      // Inventário já foi salvo localmente
    }
  }, [isFullyConnected])

  const getInventario = useCallback(async (sessionId: string): Promise<any[]> => {
    try {
      // Carregar do localStorage
      const inventarioLocal = localStorage.getItem(`inventario_${sessionId}`)
      const inventario = inventarioLocal ? JSON.parse(inventarioLocal) : []
      
      // TODO: Implementar carregamento do banco quando o serviço estiver disponível
      if (isFullyConnected) {
        console.log('📦 Inventário carregado localmente:', inventario.length, 'itens')
      }
      
      return inventario
    } catch (error) {
      console.error('❌ Erro ao carregar inventário:', error)
      return []
    }
  }, [isFullyConnected])

  const saveRelatorio = useCallback(async (relatorio: any): Promise<void> => {
    try {
      // Salvar localmente primeiro
      const relatoriosData = localStorage.getItem('relatorios_inventario') || '[]'
      const relatorios = JSON.parse(relatoriosData)
      relatorios.push(relatorio)
      localStorage.setItem('relatorios_inventario', JSON.stringify(relatorios))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        // TODO: Implementar salvamento no banco quando o serviço estiver disponível
        console.log('📊 Relatório de inventário salvo localmente:', relatorio.rua)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar relatório de inventário:', error)
      // Relatório já foi salvo localmente
    }
  }, [isFullyConnected])

  return {
    saveInventario,
    getInventario,
    saveRelatorio
  }
}

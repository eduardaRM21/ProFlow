import { getSupabase, ensureSupabaseConnection, retryWithBackoff } from './supabase-client'

export interface CRDKSectorData {
  recebimento: {
    totalNFs: number
    totalVolumes: number
    totalDivergencias: number
    totalRelatorios: number
    lastUpdate: string
    nfsRecebidas: Array<{
      id: string
      numeroNF: string
      volumes: number
      fornecedor: string
      clienteDestino: string
      timestamp: string
    }>
  }
  embalagem: {
    totalCarros: number
    carrosEmProducao: number
    totalNFs: number
    totalVolumes: number
    lastUpdate: string
    carrosAtivos: Array<{
      id: string
      numeroNF: string
      volumes: number
      status: string
      timestamp: string
    }>
  }
  inventario: {
    totalNFs: number
    totalVolumes: number
    totalRuas: number
    ruasAtivas: number
    lastUpdate: string
    itensInventario: Array<{
      id: string
      numeroNF: string
      volumes: number
      rua: string
      fornecedor: string
      clienteDestino: string
      timestamp: string
    }>
  }
  custos: {
    totalRelatorios: number
    aguardandoLancamento: number
    emLancamento: number
    lancados: number
    totalNFs: number
    totalVolumes: number
    lastUpdate: string
    relatorios: Array<{
      id: string
      nome: string
      status: string
      quantidadeNotas: number
      somaVolumes: number
      dataFinalizacao: string
    }>
  }
}

export interface CRDKRealtimeEvent {
  id: string
  timestamp: string
  sector: string
  type: 'nf_scanned' | 'carro_created' | 'inventory_updated' | 'relatorio_finalized' | 'session_started' | 'session_ended'
  message: string
  data: any
}

export class CRDKDatabaseService {
  private static instance: CRDKDatabaseService
  private realtimeChannels: Map<string, any> = new Map()
  private isConnected: boolean = false

  static getInstance(): CRDKDatabaseService {
    if (!CRDKDatabaseService.instance) {
      CRDKDatabaseService.instance = new CRDKDatabaseService()
    }
    return CRDKDatabaseService.instance
  }

  async initialize(): Promise<boolean> {
    try {
      this.isConnected = await ensureSupabaseConnection()
      if (this.isConnected) {
        await this.setupRealtimeSubscriptions()
        console.log('✅ CRDK Database Service inicializado com sucesso')
      } else {
        console.warn('⚠️ CRDK Database Service usando fallback local')
      }
      return this.isConnected
    } catch (error) {
      console.error('❌ Erro ao inicializar CRDK Database Service:', error)
      this.isConnected = false
      return false
    }
  }

  private async setupRealtimeSubscriptions(): Promise<void> {
    try {
      const supabase = getSupabase()

      // Canal para sessões (login/logout)
      const sessionsChannel = supabase
        .channel('crdk-sessions')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sessions' },
          (payload) => {
            this.handleRealtimeEvent({
              id: `session_${Date.now()}`,
              timestamp: new Date().toISOString(),
              sector: 'system',
              type: payload.eventType === 'INSERT' ? 'session_started' : 'session_ended',
              message: `Sessão ${payload.eventType === 'INSERT' ? 'iniciada' : 'finalizada'} em ${(payload.new as any)?.area || (payload.old as any)?.area}`,
              data: payload
            })
          }
        )
        .subscribe()

      // Canal para recebimento
      const recebimentoChannel = supabase
        .channel('crdk-recebimento')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'recebimento_notas' },
          (payload) => {
            this.handleRealtimeEvent({
              id: `recebimento_${Date.now()}`,
              timestamp: new Date().toISOString(),
              sector: 'recebimento',
              type: 'nf_scanned',
              message: 'Nova NF recebida',
              data: payload
            })
          }
        )
        .subscribe()

      // Canal para embalagem
      const embalagemChannel = supabase
        .channel('crdk-embalagem')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'embalagem_carros' },
          (payload) => {
            this.handleRealtimeEvent({
              id: `embalagem_${Date.now()}`,
              timestamp: new Date().toISOString(),
              sector: 'embalagem',
              type: 'carro_created',
              message: 'Carro de embalagem atualizado',
              data: payload
            })
          }
        )
        .subscribe()

      // Canal para relatórios (custos)
      const relatoriosChannel = supabase
        .channel('crdk-relatorios')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'relatorios' },
          (payload) => {
            this.handleRealtimeEvent({
              id: `relatorio_${Date.now()}`,
              timestamp: new Date().toISOString(),
              sector: 'custos',
              type: 'relatorio_finalized',
              message: 'Relatório atualizado',
              data: payload
            })
          }
        )
        .subscribe()

      // Armazenar canais para limpeza posterior
      this.realtimeChannels.set('sessions', sessionsChannel)
      this.realtimeChannels.set('recebimento', recebimentoChannel)
      this.realtimeChannels.set('embalagem', embalagemChannel)
      this.realtimeChannels.set('relatorios', relatoriosChannel)

      console.log('✅ Canais realtime configurados para CRDK')
    } catch (error) {
      console.error('❌ Erro ao configurar canais realtime:', error)
    }
  }

  private handleRealtimeEvent(event: CRDKRealtimeEvent): void {
    // Emitir evento para componentes que estão escutando
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crdk-realtime-event', { detail: event }))
    }
  }

  async loadAllSectorData(): Promise<CRDKSectorData> {
    if (!this.isConnected) {
      console.warn('⚠️ Usando dados locais (sem conexão com banco)')
      return this.getLocalSectorData()
    }

    try {
      const supabase = getSupabase()
      
      // Carregar dados de todas as tabelas em paralelo
      const [
        recebimentoResult,
        embalagemResult,
        embalagemFinalizadosResult,
        relatoriosResult,
        sessionsResult
      ] = await Promise.all([
        retryWithBackoff(async () => await supabase.from('recebimento_notas').select('*')),
        retryWithBackoff(async () => await supabase.from('embalagem_carros').select('*')),
        retryWithBackoff(async () => await supabase.from('embalagem_carros_finalizados').select('*')),
        retryWithBackoff(async () => await supabase.from('relatorios').select('*')),
        retryWithBackoff(async () => await supabase.from('sessions').select('*').eq('area', 'inventario'))
      ])

      // Processar dados de recebimento
      const recebimentoData = this.processRecebimentoData((recebimentoResult as any).data || [])
      
      // Processar dados de embalagem
      const embalagemData = this.processEmbalagemData(
        (embalagemResult as any).data || [], 
        (embalagemFinalizadosResult as any).data || []
      )
      
      // Processar dados de inventário (sessões de inventário)
      const inventarioData = this.processInventarioData((sessionsResult as any).data || [])
      
      // Processar dados de custos
      const custosData = this.processCustosData((relatoriosResult as any).data || [])

      const sectorData: CRDKSectorData = {
        recebimento: recebimentoData,
        embalagem: embalagemData,
        inventario: inventarioData,
        custos: custosData
      }

      console.log('✅ Dados de todos os setores carregados:', sectorData)
      return sectorData

    } catch (error) {
      console.error('❌ Erro ao carregar dados dos setores:', error)
      return this.getLocalSectorData()
    }
  }

  private processRecebimentoData(data: any[]): CRDKSectorData['recebimento'] {
    const totalNFs = data.length
    let totalVolumes = 0
    const nfsRecebidas: any[] = []

    data.forEach(session => {
      if (session.notas && Array.isArray(session.notas)) {
        session.notas.forEach((nf: any) => {
          totalVolumes += nf.volumes || 0
          nfsRecebidas.push({
            id: nf.id || `nf_${Date.now()}`,
            numeroNF: nf.numeroNF || 'N/A',
            volumes: nf.volumes || 0,
            fornecedor: nf.fornecedor || 'N/A',
            clienteDestino: nf.clienteDestino || 'N/A',
            timestamp: session.updated_at || session.created_at || new Date().toISOString()
          })
        })
      }
    })

    return {
      totalNFs,
      totalVolumes,
      totalDivergencias: 0, // Implementar quando houver tabela de divergências
      totalRelatorios: 0, // Implementar quando houver tabela de relatórios de recebimento
      lastUpdate: new Date().toISOString(),
      nfsRecebidas
    }
  }

  private processEmbalagemData(ativos: any[], finalizados: any[]): CRDKSectorData['embalagem'] {
    const totalCarros = ativos.length + finalizados.length
    const carrosEmProducao = ativos.length
    let totalNFs = 0
    let totalVolumes = 0
    const carrosAtivos: any[] = []

    // Processar carros ativos
    ativos.forEach(carro => {
      if (carro.carros && Array.isArray(carro.carros)) {
        carro.carros.forEach((item: any) => {
          totalNFs++
          totalVolumes += item.volumes || 0
          carrosAtivos.push({
            id: item.id || `carro_${Date.now()}`,
            numeroNF: item.numeroNF || 'N/A',
            volumes: item.volumes || 0,
            status: 'Em Produção',
            timestamp: carro.updated_at || carro.created_at || new Date().toISOString()
          })
        })
      }
    })

    // Processar carros finalizados
    finalizados.forEach(carro => {
      if (carro.carros && Array.isArray(carro.carros)) {
        carro.carros.forEach((item: any) => {
          totalNFs++
          totalVolumes += item.volumes || 0
        })
      }
    })

    return {
      totalCarros,
      carrosEmProducao,
      totalNFs,
      totalVolumes,
      lastUpdate: new Date().toISOString(),
      carrosAtivos
    }
  }

  private processInventarioData(sessions: any[]): CRDKSectorData['inventario'] {
    // Para inventário, vamos simular dados baseados nas sessões
    // Em uma implementação real, você teria uma tabela específica para inventário
    const totalNFs = sessions.length
    const totalVolumes = sessions.reduce((sum, session) => sum + (session.volumes || 0), 0)
    const ruas = new Set(sessions.map(s => s.rua).filter(Boolean))
    
    const itensInventario = sessions.map(session => ({
      id: session.id || `inventario_${Date.now()}`,
      numeroNF: session.numeroNF || 'N/A',
      volumes: session.volumes || 0,
      rua: session.rua || 'N/A',
      fornecedor: session.fornecedor || 'N/A',
      clienteDestino: session.clienteDestino || 'N/A',
      timestamp: session.updated_at || session.created_at || new Date().toISOString()
    }))

    return {
      totalNFs,
      totalVolumes,
      totalRuas: ruas.size,
      ruasAtivas: ruas.size,
      lastUpdate: new Date().toISOString(),
      itensInventario
    }
  }

  private processCustosData(data: any[]): CRDKSectorData['custos'] {
    const totalRelatorios = data.length
    const aguardandoLancamento = data.filter(r => r.status === 'aguardando').length
    const emLancamento = data.filter(r => r.status === 'em_lancamento').length
    const lancados = data.filter(r => r.status === 'lancado').length
    
    let totalNFs = 0
    let totalVolumes = 0

    data.forEach(relatorio => {
      totalNFs += relatorio.quantidade_notas || 0
      totalVolumes += relatorio.soma_volumes || 0
    })

    const relatorios = data.map(r => ({
      id: r.id,
      nome: r.nome,
      status: r.status,
      quantidadeNotas: r.quantidade_notas || 0,
      somaVolumes: r.soma_volumes || 0,
      dataFinalizacao: r.data_finalizacao || r.created_at || new Date().toISOString()
    }))

    return {
      totalRelatorios,
      aguardandoLancamento,
      emLancamento,
      lancados,
      totalNFs,
      totalVolumes,
      lastUpdate: new Date().toISOString(),
      relatorios
    }
  }

  private getLocalSectorData(): CRDKSectorData {
    // Dados locais como fallback
    return {
      recebimento: {
        totalNFs: 0,
        totalVolumes: 0,
        totalDivergencias: 0,
        totalRelatorios: 0,
        lastUpdate: new Date().toISOString(),
        nfsRecebidas: []
      },
      embalagem: {
        totalCarros: 0,
        carrosEmProducao: 0,
        totalNFs: 0,
        totalVolumes: 0,
        lastUpdate: new Date().toISOString(),
        carrosAtivos: []
      },
      inventario: {
        totalNFs: 0,
        totalVolumes: 0,
        totalRuas: 0,
        ruasAtivas: 0,
        lastUpdate: new Date().toISOString(),
        itensInventario: []
      },
      custos: {
        totalRelatorios: 0,
        aguardandoLancamento: 0,
        emLancamento: 0,
        lancados: 0,
        totalNFs: 0,
        totalVolumes: 0,
        lastUpdate: new Date().toISOString(),
        relatorios: []
      }
    }
  }

  async getSectorEfficiency(): Promise<{ sector: string; efficiency: number; metric: string }[]> {
    try {
      const sectorData = await this.loadAllSectorData()
      
      const efficiency = [
        {
          sector: 'Recebimento',
          efficiency: sectorData.recebimento.totalNFs > 0 ? 
            (sectorData.recebimento.totalVolumes / sectorData.recebimento.totalNFs) : 0,
          metric: 'Volumes por NF'
        },
        {
          sector: 'Embalagem',
          efficiency: sectorData.embalagem.totalCarros > 0 ? 
            (sectorData.embalagem.totalVolumes / sectorData.embalagem.totalCarros) : 0,
          metric: 'Volumes por Carro'
        },
        {
          sector: 'Inventário',
          efficiency: sectorData.inventario.totalRuas > 0 ? 
            (sectorData.inventario.totalNFs / sectorData.inventario.totalRuas) : 0,
          metric: 'NFs por Rua'
        },
        {
          sector: 'Custos',
          efficiency: sectorData.custos.totalRelatorios > 0 ? 
            (sectorData.custos.lancados / sectorData.custos.totalRelatorios) * 100 : 0,
          metric: '% Relatórios Lançados'
        }
      ]

      return efficiency
    } catch (error) {
      console.error('❌ Erro ao calcular eficiência:', error)
      return []
    }
  }

  async getCrossSectorInsights(): Promise<string[]> {
    try {
      const sectorData = await this.loadAllSectorData()
      const insights: string[] = []

      // Análise de fluxo
      if (sectorData.recebimento.totalNFs > 0) {
        const embalagemRate = (sectorData.embalagem.totalNFs / sectorData.recebimento.totalNFs) * 100
        insights.push(`Taxa de embalagem: ${embalagemRate.toFixed(1)}% das NFs recebidas foram embaladas`)
      }

      if (sectorData.inventario.totalNFs > 0) {
        const inventarioRate = (sectorData.inventario.totalNFs / sectorData.recebimento.totalNFs) * 100
        insights.push(`Taxa de inventário: ${inventarioRate.toFixed(1)}% das NFs estão em inventário`)
      }

      if (sectorData.custos.totalRelatorios > 0) {
        const custosRate = (sectorData.custos.lancados / sectorData.custos.totalRelatorios) * 100
        insights.push(`Taxa de lançamento: ${custosRate.toFixed(1)}% dos relatórios foram lançados`)
      }

      // Análise de volume
      if (sectorData.recebimento.totalVolumes > 0) {
        const volumeEfficiency = (sectorData.embalagem.totalVolumes / sectorData.recebimento.totalVolumes) * 100
        insights.push(`Eficiência de volume: ${volumeEfficiency.toFixed(1)}% dos volumes foram processados`)
      }

      return insights
    } catch (error) {
      console.error('❌ Erro ao gerar insights:', error)
      return ['Análise de dados temporariamente indisponível']
    }
  }

  cleanup(): void {
    // Limpar canais realtime
    this.realtimeChannels.forEach(channel => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe()
      }
    })
    this.realtimeChannels.clear()
    
    this.isConnected = false
    console.log('🧹 CRDK Database Service limpo')
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }
}

// Hook personalizado para usar o serviço CRDK
export const useCRDKDatabase = () => {
  const service = CRDKDatabaseService.getInstance()
  
  return {
    initialize: () => service.initialize(),
    loadAllSectorData: () => service.loadAllSectorData(),
    getSectorEfficiency: () => service.getSectorEfficiency(),
    getCrossSectorInsights: () => service.getCrossSectorInsights(),
    getConnectionStatus: () => service.getConnectionStatus(),
    cleanup: () => service.cleanup()
  }
}

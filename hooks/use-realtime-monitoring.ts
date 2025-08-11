import { useState, useEffect, useCallback } from 'react'

interface CrossSectorData {
  recebimento: {
    totalNFs: number
    totalVolumes: number
    totalDivergencias: number
    totalRelatorios: number
    lastUpdate: string
  }
  embalagem: {
    totalCarros: number
    carrosEmProducao: number
    totalNFs: number
    totalVolumes: number
    lastUpdate: string
  }
  inventario: {
    totalNFs: number
    totalVolumes: number
    totalRuas: number
    ruasAtivas: number
    lastUpdate: string
  }
  custos: {
    totalRelatorios: number
    aguardandoLancamento: number
    emLancamento: number
    lancados: number
    totalNFs: number
    totalVolumes: number
    lastUpdate: string
  }
}

interface RealtimeEvent {
  id: string
  timestamp: string
  sector: string
  type: 'nf_scanned' | 'carro_created' | 'inventory_updated' | 'relatorio_finalized'
  message: string
  data: any
}

export const useRealtimeMonitoring = (updateInterval: number = 30000) => {
  const [crossSectorData, setCrossSectorData] = useState<CrossSectorData>({
    recebimento: { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0, lastUpdate: '' },
    embalagem: { totalCarros: 0, totalNFs: 0, totalVolumes: 0, carrosEmProducao: 0, lastUpdate: '' },
    inventario: { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0, lastUpdate: '' },
    custos: { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '' }
  })

  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Load data from all sectors
  const loadAllSectorData = useCallback(() => {
    const now = new Date().toISOString()
    
    // Load Recebimento data
    let recebimentoData = { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0 }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("recebimento_")) {
        try {
          const notas = JSON.parse(localStorage.getItem(key) || "[]")
          recebimentoData.totalNFs += notas.length
          recebimentoData.totalVolumes += notas.reduce((sum: number, nota: any) => 
            sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)
          recebimentoData.totalDivergencias += notas.filter((n: any) => n.status === "divergencia").length
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e)
        }
      }
    }

    // Load Embalagem data
    let embalagemData = { totalCarros: 0, carrosEmProducao: 0, totalNFs: 0, totalVolumes: 0 }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("profarma_carros_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}")
          const carros = data.carros || []
          embalagemData.totalCarros = carros.length
          embalagemData.carrosEmProducao = carros.filter((c: any) => c.statusCarro === "em_producao").length
          const nfsValidas = carros.flatMap((c: any) => c.nfs.filter((nf: any) => nf.status === "valida"))
          embalagemData.totalNFs = nfsValidas.length
          embalagemData.totalVolumes = nfsValidas.reduce((sum: number, nf: any) => sum + nf.volume, 0)
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e)
        }
      }
    }

    // Load Inventario data
    let inventarioData = { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0 }
    const ruasUnicas = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("inventario_")) {
        try {
          const itens = JSON.parse(localStorage.getItem(key) || "[]")
          inventarioData.totalNFs += itens.length
          inventarioData.totalVolumes += itens.reduce((sum: number, item: any) => 
            sum + (item.volumes * item.quantidade), 0)
          itens.forEach((item: any) => {
            if (item.rua) ruasUnicas.add(item.rua)
          })
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e)
        }
      }
    }
    inventarioData.totalRuas = ruasUnicas.size
    inventarioData.ruasAtivas = ruasUnicas.size

    // Load Custos data
    let custosData = { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0 }
    try {
      const relatorios = JSON.parse(localStorage.getItem("relatorios_custos") || "[]")
      custosData.totalRelatorios = relatorios.length
      custosData.aguardandoLancamento = relatorios.filter((r: any) => r.status === "aguardando_lancamento").length
      custosData.emLancamento = relatorios.filter((r: any) => r.status === "em_lancamento").length
      custosData.lancados = relatorios.filter((r: any) => r.status === "lancado").length
      custosData.totalNFs = relatorios.reduce((sum: number, r: any) => sum + r.quantidadeNotas, 0)
      custosData.totalVolumes = relatorios.reduce((sum: number, r: any) => sum + r.somaVolumes, 0)
    } catch (e) {
      console.error('Error parsing relatorios_custos:', e)
    }

    // Update cross-sector data
    setCrossSectorData({
      recebimento: { ...recebimentoData, lastUpdate: now },
      embalagem: { ...embalagemData, lastUpdate: now },
      inventario: { ...inventarioData, lastUpdate: now },
      custos: { ...custosData, lastUpdate: now }
    })

    // Add real-time event for data update
    addRealtimeEvent({
      id: Date.now().toString(),
      timestamp: now,
      sector: 'crdk',
      type: 'inventory_updated',
      message: 'Dados de todos os setores atualizados',
      data: { recebimento: recebimentoData, embalagem: embalagemData, inventario: inventarioData, custos: custosData }
    })

    setIsConnected(true)
  }, [])

  // Add real-time event
  const addRealtimeEvent = useCallback((event: RealtimeEvent) => {
    setRealtimeEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
  }, [])

  // Get sector efficiency metrics
  const getSectorEfficiency = useCallback(() => {
    const { recebimento, embalagem, inventario, custos } = crossSectorData
    
    return {
      recebimento: {
        efficiency: recebimento.totalNFs > 0 ? ((recebimento.totalNFs - recebimento.totalDivergencias) / recebimento.totalNFs) * 100 : 0,
        throughput: recebimento.totalVolumes,
        quality: recebimento.totalDivergencias
      },
      embalagem: {
        efficiency: embalagem.totalCarros > 0 ? (embalagem.carrosEmProducao / embalagem.totalCarros) * 100 : 0,
        throughput: embalagem.totalVolumes,
        productivity: embalagem.totalNFs
      },
      inventario: {
        coverage: inventario.totalRuas > 0 ? (inventario.ruasAtivas / inventario.totalRuas) * 100 : 0,
        throughput: inventario.totalVolumes,
        accuracy: inventario.totalNFs
      },
      custos: {
        completion: custos.totalRelatorios > 0 ? (custos.lancados / custos.totalRelatorios) * 100 : 0,
        pending: custos.aguardandoLancamento + custos.emLancamento,
        processed: custos.lancados
      }
    }
  }, [crossSectorData])

  // Get cross-sector correlation insights
  const getCrossSectorInsights = useCallback(() => {
    const { recebimento, embalagem, inventario, custos } = crossSectorData
    
    const insights = []
    
    // Recebimento to Embalagem flow
    if (recebimento.totalNFs > 0 && embalagem.totalNFs > 0) {
      const flowRate = (embalagem.totalNFs / recebimento.totalNFs) * 100
      insights.push({
        type: 'flow_rate',
        message: `Taxa de fluxo Recebimento → Embalagem: ${flowRate.toFixed(1)}%`,
        status: flowRate > 80 ? 'good' : flowRate > 60 ? 'warning' : 'critical'
      })
    }
    
    // Embalagem to Inventario flow
    if (embalagem.totalVolumes > 0 && inventario.totalVolumes > 0) {
      const trackingRate = (inventario.totalVolumes / embalagem.totalVolumes) * 100
      insights.push({
        type: 'tracking_rate',
        message: `Taxa de rastreamento Embalagem → Inventário: ${trackingRate.toFixed(1)}%`,
        status: trackingRate > 80 ? 'good' : trackingRate > 60 ? 'warning' : 'critical'
      })
    }
    
    // Overall completion rate
    if (recebimento.totalNFs > 0 && custos.lancados > 0) {
      const completionRate = (custos.lancados / recebimento.totalNFs) * 100
      insights.push({
        type: 'completion_rate',
        message: `Taxa de conclusão geral: ${completionRate.toFixed(1)}%`,
        status: completionRate > 80 ? 'good' : completionRate > 60 ? 'warning' : 'critical'
      })
    }
    
    return insights
  }, [crossSectorData])

  // Start real-time monitoring
  useEffect(() => {
    loadAllSectorData()
    
    const interval = setInterval(loadAllSectorData, updateInterval)
    return () => clearInterval(interval)
  }, [loadAllSectorData, updateInterval])

  return {
    crossSectorData,
    realtimeEvents,
    isConnected,
    loadAllSectorData,
    addRealtimeEvent,
    getSectorEfficiency,
    getCrossSectorInsights
  }
}

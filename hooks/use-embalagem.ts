import { useState, useCallback } from 'react'
import { EmbalagemService } from '@/lib/embalagem-service'
import type { NFEmbalagem, CarroEmbalagem } from '@/lib/embalagem-service'

interface UseEmbalagemProps {
  data: string
  turno: string
  sessionId: string
}

export function useEmbalagem({ data, turno, sessionId }: UseEmbalagemProps) {
  const [carros, setCarros] = useState<CarroEmbalagem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validar NF para embalagem
  const validateNF = useCallback(async (numeroNF: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Hook: Validando NF ${numeroNF} para embalagem`)
      const resultado = await EmbalagemService.validateNF(numeroNF, data, turno)
      
      if (!resultado.valido) {
        setError(resultado.erro || 'NF não foi bipada no Recebimento')
        return { valido: false, erro: resultado.erro }
      }
      
      return { valido: true, nota: resultado.nota }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro interno na validação'
      setError(errorMsg)
      return { valido: false, erro: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [data, turno])

  // Processar código de barras para embalagem
  const processarCodigoBarras = useCallback(async (codigo: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Hook: Processando código de barras para embalagem`)
      const resultado = await EmbalagemService.processarCodigoBarras(codigo, data, turno)
      
      if (!resultado.valido) {
        setError(resultado.erro || 'Erro ao processar código de barras')
        return { valido: false, erro: resultado.erro }
      }
      
      return { valido: true, nf: resultado.nf }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro interno ao processar código'
      setError(errorMsg)
      return { valido: false, erro: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [data, turno])

  // Carregar carros de embalagem
  const loadCarros = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`📋 Hook: Carregando carros de embalagem`)
      const carrosData = await EmbalagemService.getCarros(sessionId)
      setCarros(carrosData)
      
      return carrosData
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar carros'
      setError(errorMsg)
      return []
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Salvar carros de embalagem
  const saveCarros = useCallback(async (carrosData: CarroEmbalagem[]) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`💾 Hook: Salvando carros de embalagem`)
      await EmbalagemService.saveCarros(sessionId, carrosData)
      setCarros(carrosData)
      
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar carros'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Adicionar NF a um carro
  const addNFToCarro = useCallback(async (carroId: string, codigo: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`➕ Hook: Adicionando NF ao carro ${carroId}`)
      
      // Processar código de barras
      const resultado = await processarCodigoBarras(codigo)
      
      if (!resultado.valido || !resultado.nf) {
        return { valido: false, erro: resultado.erro }
      }
      
      // Atualizar carros
      const carrosAtualizados = carros.map(carro => {
        if (carro.id === carroId) {
          // Verificar se a NF já existe
          const nfExistente = carro.nfs.find(nf => nf.numeroNF === resultado.nf!.numeroNF)
          if (nfExistente) {
            throw new Error(`NF ${resultado.nf.numeroNF} já foi adicionada a este carro`)
          }
          
          return {
            ...carro,
            nfs: [...carro.nfs, resultado.nf!],
            quantidadeNFs: carro.nfs.length + 1,
            totalVolumes: carro.totalVolumes + resultado.nf.volume
          }
        }
        return carro
      })
      
      // Salvar no banco
      await saveCarros(carrosAtualizados)
      
      return { valido: true, nf: resultado.nf }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao adicionar NF ao carro'
      setError(errorMsg)
      return { valido: false, erro: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [carros, processarCodigoBarras, saveCarros])

  // Remover NF de um carro
  const removeNFFromCarro = useCallback(async (carroId: string, nfId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`➖ Hook: Removendo NF ${nfId} do carro ${carroId}`)
      
      const carrosAtualizados = carros.map(carro => {
        if (carro.id === carroId) {
          const nfRemovida = carro.nfs.find(nf => nf.id === nfId)
          if (!nfRemovida) {
            throw new Error('NF não encontrada no carro')
          }
          
          return {
            ...carro,
            nfs: carro.nfs.filter(nf => nf.id !== nfId),
            quantidadeNFs: carro.nfs.length - 1,
            totalVolumes: carro.totalVolumes - nfRemovida.volume
          }
        }
        return carro
      })
      
      // Salvar no banco
      await saveCarros(carrosAtualizados)
      
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao remover NF do carro'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [carros, saveCarros])

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    carros,
    loading,
    error,
    validateNF,
    processarCodigoBarras,
    loadCarros,
    saveCarros,
    addNFToCarro,
    removeNFFromCarro,
    clearError
  }
}

import { getSupabase, retryWithBackoff } from './supabase-client'
import { SessionService } from './database-service'
import type { NotaFiscal, Carro } from './database-service'

// Interface para NF de embalagem
export interface NFEmbalagem {
  id: string
  numeroNF: string
  volume: number
  fornecedor: string
  codigo: string
  codigoDestino: string
  destinoFinal: string
  tipo: string
  codigoCompleto: string
  timestamp: string
  status: "valida" | "invalida"
}

// Interface para carro de embalagem
export interface CarroEmbalagem {
  id: string
  nomeCarro: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataCriacao: string
  dataFinalizacao?: string
  statusCarro: "ativo" | "embalando" | "em_producao" | "finalizado" | "divergencia_lancamento"
  nfs: NFEmbalagem[]
  estimativaPallets: number
}

// Serviço de Embalagem
export const EmbalagemService = {
  // Validar NF para embalagem
  async validateNF(numeroNF: string, data: string, turno: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> {
    try {
      console.log(`🔍 EmbalagemService: Validando NF ${numeroNF}`)
      
      // Usar a função de validação do database-service
      const resultado = await SessionService.validateNFForEmbalagem(numeroNF, data, turno)
      
      if (resultado.valido && resultado.nota) {
        console.log(`✅ NF ${numeroNF} validada com sucesso para embalagem`)
        return resultado
      } else {
        console.log(`❌ NF ${numeroNF} não validada: ${resultado.erro}`)
        return resultado
      }
    } catch (error) {
      console.error('❌ Erro no EmbalagemService.validateNF:', error)
      return { 
        valido: false, 
        erro: `Erro interno na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Processar código de barras para embalagem
  async processarCodigoBarras(codigo: string, data: string, turno: string): Promise<{ valido: boolean; nf?: NFEmbalagem; erro?: string }> {
    try {
      console.log(`🔍 Processando código de barras para embalagem: ${codigo}`)
      
      // Extrair informações do código de barras
      const partes = codigo.split("|")
      if (partes.length !== 7) {
        return { 
          valido: false, 
          erro: `Código deve ter 7 partes. Encontradas: ${partes.length}` 
        }
      }
      
      const [dataNF, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes
      const volumes = parseInt(volumesStr, 10)
      
      if (isNaN(volumes) || volumes <= 0) {
        return { 
          valido: false, 
          erro: `Volumes deve ser um número válido maior que 0. Recebido: "${volumesStr}"` 
        }
      }
      
      // Validar se a NF foi bipada no recebimento
      const validacao = await this.validateNF(numeroNF, data, turno)
      
      if (!validacao.valido) {
        return { 
          valido: false, 
          erro: validacao.erro || 'NF não foi bipada no Recebimento' 
        }
      }
      
      // Criar objeto NF para embalagem
      const nfEmbalagem: NFEmbalagem = {
        id: `${Date.now()}-${numeroNF}`,
        numeroNF,
        volume: volumes,
        fornecedor,
        codigo: codigo,
        codigoDestino: destino,
        destinoFinal: clienteDestino,
        tipo: tipoCarga,
        codigoCompleto: codigo,
        timestamp: new Date().toISOString(),
        status: "valida"
      }
      
      console.log(`✅ Código de barras processado com sucesso para embalagem`)
      return { 
        valido: true, 
        nf: nfEmbalagem 
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar código de barras para embalagem:', error)
      return { 
        valido: false, 
        erro: `Erro interno ao processar código: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Buscar NFs bipadas nos relatórios de recebimento
  async buscarNFsBipadasEmRelatorios(data: string, turno: string, numeroNF?: string): Promise<{ 
    sucesso: boolean; 
    nfs?: NotaFiscal[]; 
    erro?: string;
    totalRelatorios?: number;
    totalNFs?: number;
  }> {
    try {
      console.log(`🔍 Buscando NFs bipadas em relatórios - Data: ${data}, Turno: ${turno}`)
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      // Buscar relatórios finalizados de recebimento para a data e turno
      const { data: relatoriosData, error: relatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .eq('area', 'recebimento')
          .eq('data', data)
          .eq('turno', turno)
          .eq('status', 'finalizado')
          .order('data_finalizacao', { ascending: false })
      })
      
      if (relatoriosError) {
        console.error('❌ Erro ao buscar relatórios:', relatoriosError)
        return { 
          sucesso: false, 
          erro: `Erro ao buscar relatórios: ${relatoriosError.message}` 
        }
      }
      
      if (!relatoriosData || relatoriosData.length === 0) {
        console.log(`⚠️ Nenhum relatório finalizado encontrado para ${data} - ${turno}`)
        return { 
          sucesso: false, 
          erro: `Nenhum relatório finalizado encontrado para ${data} - ${turno}` 
        }
      }
      
      console.log(`📋 Encontrados ${relatoriosData.length} relatórios finalizados`)
      
      // Coletar todas as NFs dos relatórios
      const todasNFs: NotaFiscal[] = []
      let totalNFs = 0
      
      for (const relatorio of relatoriosData) {
        if (relatorio.notas && Array.isArray(relatorio.notas)) {
          console.log(`📋 Relatório ${relatorio.nome}: ${relatorio.notas.length} NFs`)
          
          // Filtrar por número de NF específico se fornecido
          if (numeroNF) {
            const nfsFiltradas = relatorio.notas.filter((nf: any) => 
              nf.numeroNF === numeroNF || 
              nf.numeroNF.includes(numeroNF) ||
              nf.codigoCompleto.includes(numeroNF)
            )
            todasNFs.push(...nfsFiltradas)
          } else {
            todasNFs.push(...relatorio.notas)
          }
          
          totalNFs += relatorio.notas.length
        }
      }
      
      // Remover duplicatas baseado no número da NF
      const nfsUnicas = todasNFs.filter((nf, index, self) => 
        index === self.findIndex(n => n.numeroNF === nf.numeroNF)
      )
      
      console.log(`✅ Total de NFs únicas encontradas: ${nfsUnicas.length}`)
      
      return {
        sucesso: true,
        nfs: nfsUnicas,
        totalRelatorios: relatoriosData.length,
        totalNFs: totalNFs
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar NFs em relatórios:', error)
      return { 
        sucesso: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Verificar se uma NF específica foi bipada em relatórios
  async verificarNFEmRelatorios(numeroNF: string, data: string, turno: string): Promise<{ 
    encontrada: boolean; 
    relatorio?: string; 
    dataRelatorio?: string; 
    turnoRelatorio?: string;
    erro?: string;
  }> {
    try {
      console.log(`🔍 Verificando NF ${numeroNF} em relatórios - Data: ${data}, Turno: ${turno}`)
      
      const resultado = await this.buscarNFsBipadasEmRelatorios(data, turno, numeroNF)
      
      if (!resultado.sucesso) {
        return { 
          encontrada: false, 
          erro: resultado.erro 
        }
      }
      
      if (resultado.nfs && resultado.nfs.length > 0) {
        const nf = resultado.nfs[0]
        console.log(`✅ NF ${numeroNF} encontrada em relatórios`)
        
        return {
          encontrada: true,
          relatorio: `Relatório com ${nf.numeroNF}`,
          dataRelatorio: data,
          turnoRelatorio: turno
        }
      }
      
      // Se não encontrou no dia/turno específico, tentar buscar nos últimos 7 dias
      console.log('🔍 NF não encontrada no dia/turno, buscando nos últimos 7 dias...')
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      // Calcular data de 7 dias atrás
      const dataAtual = new Date()
      const data7DiasAtras = new Date(dataAtual.getTime() - (7 * 24 * 60 * 60 * 1000))
      const dataFormatada = data7DiasAtras.toLocaleDateString('pt-BR')
      
      const { data: relatoriosAntigosData, error: relatoriosAntigosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .eq('area', 'recebimento')
          .eq('status', 'finalizado')
          .gte('data', dataFormatada)
          .order('data', { ascending: false })
          .limit(50)
      })
      
      if (!relatoriosAntigosError && relatoriosAntigosData && relatoriosAntigosData.length > 0) {
        for (const relatorio of relatoriosAntigosData) {
          if (relatorio.notas && Array.isArray(relatorio.notas)) {
            const nfEncontrada = relatorio.notas.find((nf: any) => 
              nf.numeroNF === numeroNF || 
              nf.numeroNF.includes(numeroNF) ||
              nf.codigoCompleto.includes(numeroNF)
            )
            
            if (nfEncontrada) {
              console.log(`✅ NF ${numeroNF} encontrada em relatório antigo: ${relatorio.nome}`)
              return {
                encontrada: true,
                relatorio: relatorio.nome,
                dataRelatorio: relatorio.data,
                turnoRelatorio: relatorio.turno
              }
            }
          }
        }
      }
      
      console.log(`❌ NF ${numeroNF} não encontrada em nenhum relatório`)
      return { 
        encontrada: false, 
        erro: `NF ${numeroNF} não foi encontrada em nenhum relatório finalizado` 
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar NF em relatórios:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Salvar carros de embalagem
  async saveCarros(sessionId: string, carros: CarroEmbalagem[]): Promise<void> {
    try {
      console.log(`💾 Salvando ${carros.length} carros de embalagem para sessão ${sessionId}`)
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .upsert({
            session_id: sessionId,
            carros: carros
          })
      })
      
      if (error) throw error
      console.log('✅ Carros de embalagem salvos com sucesso')
    } catch (error) {
      console.error('❌ Erro ao salvar carros de embalagem:', error)
      throw error
    }
  },

  // Carregar carros de embalagem
  async getCarros(sessionId: string): Promise<CarroEmbalagem[]> {
    try {
      console.log(`📋 Carregando carros de embalagem para sessão ${sessionId}`)
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('carros')
          .eq('session_id', sessionId)
          .single()
      })
      
      if (error) throw error
      
      const carros = data?.carros || []
      console.log(`✅ ${carros.length} carros de embalagem carregados`)
      return carros
    } catch (error) {
      console.error('❌ Erro ao carregar carros de embalagem:', error)
      return []
    }
  },

  // Salvar carros finalizados
  async saveCarrosFinalizados(carros: CarroEmbalagem[]): Promise<void> {
    try {
      console.log(`💾 Salvando ${carros.length} carros finalizados de embalagem`)
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .insert({
            carros: carros
          })
      })
      
      if (error) throw error
      console.log('✅ Carros finalizados salvos com sucesso')
    } catch (error) {
      console.error('❌ Erro ao salvar carros finalizados:', error)
      throw error
    }
  },

  // Carregar carros finalizados
  async getCarrosFinalizados(): Promise<CarroEmbalagem[]> {
    try {
      console.log('📋 Carregando carros finalizados de embalagem')
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .select('carros')
          .order('created_at', { ascending: false })
      })
      
      if (error) throw error
      
      const todosCarros: CarroEmbalagem[] = []
      data?.forEach(item => {
        if (item.carros && Array.isArray(item.carros)) {
          todosCarros.push(...item.carros)
        }
      })
      
      console.log(`✅ ${todosCarros.length} carros finalizados carregados`)
      return todosCarros
    } catch (error) {
      console.error('❌ Erro ao carregar carros finalizados:', error)
      return []
    }
  }
}

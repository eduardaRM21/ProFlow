import { getSupabase, retryWithBackoff, testSupabaseConnection } from './supabase-client'

// Tipos de dados
export interface SessionData {
  area: string
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
  usuarioCustos?: string
}

export interface NotaFiscal {
  id: string
  codigoCompleto: string
  data: string
  numeroNF: string
  volumes: number
  destino: string
  fornecedor: string
  clienteDestino: string
  tipoCarga: string
  timestamp: string
  status: string
  divergencia?: {
    volumesInformados: number
    observacoes: string
  }
}

export interface Carro {
  id: string
  nome: string
  destinoFinal: string
  nfs: NotaFiscal[]
  statusCarro: "aguardando_colagem" | "em_conferencia" | "liberado" | "embalando" | "em_producao"
  dataInicio: string
  ativo: boolean
  sessionId: string
}

export interface Relatorio {
  id: string
  nome: string
  colaboradores: string[]
  data: string
  turno: string
  area: string
  quantidadeNotas: number
  somaVolumes: number
  notas: NotaFiscal[]
  dataFinalizacao: string
  status: string
}

export interface ChatMessage {
  id: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: 'colaborador' | 'adm' | 'sistema'
  destinatarioId: string
  mensagem: string
  timestamp: string // ISO
  lida?: boolean
}

export interface Conversa {
  id: string
  colaboradores: string[]
  data: string
  turno: string
  ultimaMensagem: string
  ultimoTimestamp: string
  mensagensNaoLidas: number
}
// === Helpers: cole no topo do arquivo (perto dos tipos) ===
function normalizeNF(nf: string | undefined) {
  const raw = (nf ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  return {
    raw,
    withZeros: digits,                        // "003230827"
    withoutZeros: digits.replace(/^0+/, "") || "0", // "3230827"
  };
}

// Gera janela diária em ISO (usa horário local do navegador)
function dayRangeBR(dateBR: string) {
  // dateBR no formato "dd/MM/yyyy"
  const [d, m, y] = dateBR.split("/").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}
// Serviço de Sessão
export const SessionService = {
  // Salvar sessão
  async saveSession(sessionData: SessionData): Promise<string> {
    try {
      console.log('💾 Tentando salvar sessão no banco...')
      console.log('📊 Dados da sessão:', JSON.stringify(sessionData, null, 2))
      
      // Validar dados obrigatórios
      if (!sessionData.area || !sessionData.colaboradores || !sessionData.data || !sessionData.turno || !sessionData.loginTime) {
        throw new Error('Dados obrigatórios da sessão estão faltando')
      }
      
      // Gerar ID único para a sessão baseado na área, data, turno e timestamp
      const sessionId = `session_${sessionData.area}_${sessionData.data.replace(/\//g, '-')}_${sessionData.turno}_${Date.now()}`
      
      // Preparar dados para o banco
      const sessionPayload = {
        id: sessionId,
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        area: sessionData.area,
        login_time: sessionData.loginTime,
        updated_at: new Date().toISOString()
      }
      
      console.log('📤 Payload para o banco:', JSON.stringify(sessionPayload, null, 2))
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('sessions')
          .upsert(sessionPayload)
      })

      if (error) {
        console.error('❌ Erro ao salvar sessão:', error)
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2))
        throw error
      }
      
      console.log('✅ Sessão salva com sucesso no banco')
      return sessionId
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error)
      throw error
    }
  },

  // Carregar sessão
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      console.log('🔍 Tentando buscar sessão no banco...')
      const isConnected = await testSupabaseConnection()
      if (!isConnected) {
        console.log('⚠️ Sem conectividade com Supabase, usando fallback')
        return null
      }
      
      const knownAreas = ['recebimento', 'embalagem', 'inventario', 'custos']
      const filterByArea = knownAreas.includes(sessionId) // Check if sessionId is a known area

      const { data, error } = await retryWithBackoff(async () => {
        let query = getSupabase()
          .from('sessions')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (filterByArea) { // Apply filter if it's a known area
          query = query.eq('area', sessionId)
        }
        return await query.maybeSingle()
      })

      if (error) {
        console.error('❌ Erro ao buscar sessão:', error)
        return null
      }

      if (!data) {
        console.log('⚠️ Nenhuma sessão encontrada no banco')
        return null
      }

             console.log('✅ Sessão encontrada no banco:', data.area)
       return {
         colaboradores: data.colaboradores as string[],
         data: data.data as string,
         turno: data.turno as string,
         area: data.area as string,
         loginTime: data.login_time as string
       }
    } catch (error) {
      console.error('❌ Erro ao carregar sessão:', error)
      return null
    }
  },

  // Deletar sessão
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('sessions')
          .delete()
          .eq('id', sessionId)
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      throw error
    }
  }
}

// Serviço de Recebimento
export const RecebimentoService = {
  // Salvar notas de recebimento
  async saveNotas(sessionId: string, notas: NotaFiscal[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar notas no banco...')
      
      // Primeiro, verificar se já existe um registro para esta sessão
      const { data: existingData, error: checkError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .select('id, notas')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (checkError && !checkError.message?.includes('relation "recebimento_notas" does not exist')) {
        console.error('❌ Erro ao verificar notas existentes:', checkError)
        throw checkError
      }

      if (existingData) {
        // Se já existe, fazer update
        console.log('📝 Atualizando notas existentes para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('recebimento_notas')
            .update({
              notas: notas,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
        })

        if (error) {
          console.error('❌ Erro ao atualizar notas de recebimento:', error)
          throw error
        }
      } else {
        // Se não existe, fazer insert
        console.log('➕ Inserindo novas notas para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('recebimento_notas')
            .insert({
              session_id: sessionId,
              notas: notas,
              updated_at: new Date().toISOString()
            })
        })

        if (error) {
          console.error('❌ Erro ao inserir notas de recebimento:', error)
          throw error
        }
      }
      
      console.log('✅ Notas salvas com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar notas de recebimento:', error)
      throw error
    }
  },

  // Carregar notas de recebimento
  async getNotas(sessionId: string): Promise<NotaFiscal[]> {
    try {
      console.log('📋 Tentando carregar notas do banco...')
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .select('notas')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (error) {
        console.error('❌ Erro ao buscar notas de recebimento:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "recebimento_notas" does not exist')) {
          console.log('❌ Tabela recebimento_notas não existe no banco')
          return []
        }
        
        throw error
      }

      if (data && data.notas) {
        const notas = data.notas as NotaFiscal[] | null
        console.log('✅ Notas encontradas no banco:', notas?.length || 0, 'notas')
        return notas || []
      }

      console.log('ℹ️ Nenhuma nota encontrada para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar notas de recebimento:', error)
      return []
    }
  },

  // Deletar notas de recebimento
  async deleteNotas(sessionId: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .delete()
          .eq('session_id', sessionId)
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao deletar notas de recebimento:', error)
      throw error
    }
  }
}

// Serviço de Embalagem (Carros)
export const EmbalagemService = {
  // Salvar carros
  async saveCarros(sessionId: string, carros: Carro[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar carros no banco...')
      
      // Primeiro, verificar se já existe um registro para esta sessão
      const { data: existingData, error: checkError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('id, carros')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (checkError && !checkError.message?.includes('relation "embalagem_carros" does not exist')) {
        console.error('❌ Erro ao verificar carros existentes:', checkError)
        throw checkError
      }

      if (existingData) {
        // Se já existe, fazer update
        console.log('📝 Atualizando carros existentes para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_carros')
            .update({
              carros: carros,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
        })

        if (error) {
          console.error('❌ Erro ao atualizar carros:', error)
          throw error
        }
      } else {
        // Se não existe, fazer insert
        console.log('➕ Inserindo novos carros para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_carros')
            .insert({
              session_id: sessionId,
              carros: carros,
              updated_at: new Date().toISOString()
            })
        })

        if (error) {
          console.error('❌ Erro ao inserir carros:', error)
          throw error
        }
      }
      
      console.log('✅ Carros salvos com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar carros:', error)
      throw error
    }
  },

  // Carregar carros
  async getCarros(sessionId: string): Promise<Carro[]> {
    try {
      console.log('📋 Tentando carregar carros do banco...')
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('carros')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (error) {
        console.error('❌ Erro ao buscar carros:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "embalagem_carros" does not exist')) {
          console.log('❌ Tabela embalagem_carros não existe no banco')
          return []
        }
        
        throw error
      }

      if (data && data.carros) {
        const carros = data.carros as Carro[] | null
        console.log('✅ Carros encontrados no banco:', carros?.length || 0, 'carros')
        return carros || []
      }

      console.log('ℹ️ Nenhum carro encontrado para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar carros:', error)
      return []
    }
  },

  // Salvar carros finalizados
  async saveCarrosFinalizados(carros: Carro[]): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .insert({
            carros: carros,
            created_at: new Date().toISOString()
          })
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar carros finalizados:', error)
      throw error
    }
  },

  // Carregar carros finalizados
  async getCarrosFinalizados(): Promise<Carro[]> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .select('carros')
          .order('created_at', { ascending: false })
      })

      if (error) throw error

      return data?.flatMap((item: any) => (item.carros as Carro[]) || []) || []
    } catch (error) {
      console.error('Erro ao carregar carros finalizados:', error)
      return []
    }
  }
}

// Serviço de Relatórios
export const RelatoriosService = {
  // Salvar relatório
  async saveRelatorio(relatorio: Relatorio): Promise<void> {
    try {
      console.log('💾 Tentando salvar relatório no banco...')
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .upsert({ // Changed from .insert to .upsert
            id: relatorio.id,
            nome: relatorio.nome,
            colaboradores: relatorio.colaboradores,
            data: relatorio.data,
            turno: relatorio.turno,
            area: relatorio.area,
            quantidade_notas: relatorio.quantidadeNotas,
            soma_volumes: relatorio.somaVolumes,
            notas: relatorio.notas,
            data_finalizacao: relatorio.dataFinalizacao,
            status: relatorio.status,
            created_at: new Date().toISOString()
          })
      })
      
      if (error) {
        console.error('❌ Erro ao salvar relatório:', error)
        
        // Se for erro de recursos insuficientes, tentar novamente
        if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
          console.log('⚠️ Recursos insuficientes, tentando novamente em 2 segundos...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const { error: retryError } = await getSupabase()
            .from('relatorios')
            .upsert({
              id: relatorio.id,
              nome: relatorio.nome,
              colaboradores: relatorio.colaboradores,
              data: relatorio.data,
              turno: relatorio.turno,
              area: relatorio.area,
              quantidade_notas: relatorio.quantidadeNotas,
              soma_volumes: relatorio.somaVolumes,
              notas: relatorio.notas,
              data_finalizacao: relatorio.dataFinalizacao,
              status: relatorio.status,
              created_at: new Date().toISOString()
            })
          
          if (retryError) {
            console.error('❌ Erro na segunda tentativa:', retryError)
            throw retryError
          }
        } else {
          throw error
        }
      }
      
      console.log('✅ Relatório salvo/atualizado com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      throw error
    }
  },

  // Carregar relatórios
  async getRelatorios(): Promise<Relatorio[]> {
    try {
      console.log('📋 Tentando carregar relatórios do banco...')
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .order('created_at', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar relatórios:', error)
        
        // Se for erro de recursos insuficientes, retornar array vazio
        if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
          console.log('⚠️ Recursos insuficientes no banco, retornando array vazio')
          return []
        }
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "relatorios" does not exist')) {
          console.log('❌ Tabela relatorios não existe no banco')
          return []
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Relatórios carregados do banco:', data.length, 'relatórios')
        console.log('🔍 Dados brutos do banco:', data)
        
        if (data.length > 0) {
          console.log('🔍 Primeiro item bruto:', data[0])
          console.log('🔍 Campos disponíveis:', Object.keys(data[0]))
        }
        
        const relatorios: Relatorio[] = (data ?? []).map((item: any) => ({
          id: item.id,
          nome: item.nome ?? 'Relatório sem nome',
          colaboradores: item.colaboradores ?? [],
          data: item.data,
          turno: item.turno,
          area: item.area ?? 'custos',
          quantidadeNotas: item.quantidade_notas ?? 0,
          somaVolumes: item.soma_volumes ?? 0,
          notas: item.notas ?? [],
          dataFinalizacao: item.data_finalizacao ?? new Date().toISOString(),
          status: item.status ?? 'finalizado',
        }))
        
        console.log('✅ Relatórios carregados do banco:', relatorios.length)
        return relatorios
      } else {
        console.log('ℹ️ Nenhum relatório encontrado no banco')
        return []
      }
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios:', error)
      return []
    }
  }
}

// Serviço de Chat
export const ChatMessage = {
  // INSERT correto
  async saveMensagem(m: ChatMessage): Promise<void> {
    const { error } = await retryWithBackoff(async () =>
      getSupabase().from('messages').insert({
        id: m.id,
        remetente_id: m.remetenteId,
        remetente_nome: m.remetenteNome,
        remetente_tipo: m.remetenteTipo,
        destinatario_id: m.destinatarioId,
        mensagem: m.mensagem,
        timestamp: m.timestamp,
        lida: m.lida ?? false,
        created_at: new Date().toISOString(),
      })
    )
    if (error) throw error
  },

  // SELECT (conversa entre A e B)
  async getMensagens(a: string, b: string): Promise<ChatMessage[]> {
    const { data, error } = await retryWithBackoff(async () =>
      getSupabase()
        .from('messages')
        .select('*')
        .or(
          `and(remetente_id.eq.${a},destinatario_id.eq.${b}),and(remetente_id.eq.${b},destinatario_id.eq.${a})`
        )
        .order('timestamp', { ascending: true })
    )
    if (error) throw error
    return (data ?? []).map((it: any) => ({
      id: it.id,
      remetenteId: it.remetente_id,
      remetenteNome: it.remetente_nome,
      remetenteTipo: it.remetente_tipo,
      destinatarioId: it.destinatario_id,
      mensagem: it.mensagem,
      timestamp: it.timestamp,
      lida: it.lida,
    }))
  },

  // Marcar mensagens como lidas
  async markAsRead(conversaId: string, remetenteTipo: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('messages')
          .update({ lida: true })
          .eq('destinatario_id', conversaId)
          .eq('remetente_tipo', remetenteTipo)
          .eq('lida', false)
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error)
      throw error
    }
  },

  // Contar mensagens não lidas
  async countUnreadMessages(conversaId: string, remetenteTipo: string): Promise<number> {
    try {
      const { count, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('destinatario_id', conversaId)
          .eq('remetente_tipo', remetenteTipo)
          .eq('lida', false)
      })

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error)
      return 0
    }
  },

  // Validar se uma NF foi bipada no recebimento (para uso na embalagem)
  async validateNFForEmbalagem(numeroNF: string, data: string, turno: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> {
    try {
      console.log(`🔍 Validando NF ${numeroNF} para embalagem - Data: ${data}, Turno: ${turno}`)
      
      // Normalizar o número da NF (com e sem zeros à esquerda)
      const normalizedNF = normalizeNF(numeroNF)
      console.log(`📝 NF normalizada:`, normalizedNF)
      
      // Gerar janela diária para buscar NFs recebidas
      const dayRange = dayRangeBR(data)
      console.log(`📅 Janela diária: ${dayRange.start} até ${dayRange.end}`)
      
      // PRIMEIRA TENTATIVA: Buscar nas sessões de recebimento ativas
      console.log('🔍 Buscando NF nas sessões de recebimento ativas...')
      let notaEncontrada: NotaFiscal | undefined
      
      try {
        // Buscar todas as sessões de recebimento do dia
        const { data: sessions, error: sessionsError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('sessions')
            .select('id')
            .eq('area', 'recebimento')
            .eq('data', data)
            .eq('turno', turno)
        })
        
        if (!sessionsError && sessions && sessions.length > 0) {
          console.log(`📋 Encontradas ${sessions.length} sessões de recebimento ativas`)
          
          // Buscar NFs em todas as sessões de recebimento do dia/turno
          const sessionIds = sessions.map(s => s.id)
          const { data: recebimentoData, error: recebimentoError } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('recebimento_notas')
              .select('notas')
              .in('session_id', sessionIds)
          })
          
          if (!recebimentoError && recebimentoData && recebimentoData.length > 0) {
            // Procurar pela NF em todas as sessões
            for (const recebimento of recebimentoData) {
              if (recebimento.notas && Array.isArray(recebimento.notas)) {
                // Procurar por diferentes formatos da NF
                const nota = recebimento.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                                 if (nota) {
                   notaEncontrada = nota
                   console.log(`✅ NF ${numeroNF} encontrada na sessão ativa`)
                   break
                 }
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar nas sessões ativas, tentando relatórios:', error)
      }
      
      // SEGUNDA TENTATIVA: Se não encontrou nas sessões, buscar nos relatórios finalizados
      if (!notaEncontrada) {
        console.log('🔍 NF não encontrada nas sessões ativas, buscando nos relatórios finalizados...')
        
        try {
          const { data: relatoriosData, error: relatoriosError } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('relatorios')
              .select('*')
              .eq('area', 'recebimento')
              .eq('data', data)
              .eq('turno', turno)
              .eq('status', 'finalizado')
          })
          
          if (!relatoriosError && relatoriosData && relatoriosData.length > 0) {
            console.log(`📋 Encontrados ${relatoriosData.length} relatórios finalizados de recebimento`)
            
            // Procurar pela NF em todos os relatórios
            for (const relatorio of relatoriosData) {
              if (relatorio.notas && Array.isArray(relatorio.notas)) {
                console.log(`📋 Verificando relatório: ${relatorio.nome} (${relatorio.notas.length} NFs)`)
                
                // Procurar por diferentes formatos da NF
                const nota = relatorio.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                if (nota) {
                  notaEncontrada = nota
                  console.log(`✅ NF ${numeroNF} encontrada no relatório finalizado: ${relatorio.nome}`)
                  break
                }
              }
            }
          } else if (relatoriosError) {
            console.warn('⚠️ Erro ao buscar relatórios:', relatoriosError)
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar nos relatórios:', error)
        }
      }
      
      // TERCEIRA TENTATIVA: Buscar em relatórios de outros dias (últimos 7 dias)
      if (!notaEncontrada) {
        console.log('🔍 NF não encontrada nos relatórios do dia, buscando em relatórios dos últimos 7 dias...')
        
        try {
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
              .limit(50) // Limitar a 50 relatórios para performance
          })
          
          if (!relatoriosAntigosError && relatoriosAntigosData && relatoriosAntigosData.length > 0) {
            console.log(`📋 Verificando ${relatoriosAntigosData.length} relatórios dos últimos 7 dias`)
            
            // Procurar pela NF em todos os relatórios antigos
            for (const relatorio of relatoriosAntigosData) {
              if (relatorio.notas && Array.isArray(relatorio.notas)) {
                // Procurar por diferentes formatos da NF
                const nota = relatorio.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                if (nota) {
                  notaEncontrada = nota
                  console.log(`✅ NF ${numeroNF} encontrada no relatório antigo: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
                  break
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar relatórios antigos:', error)
        }
      }
      
      if (notaEncontrada) {
        console.log(`✅ NF ${numeroNF} validada com sucesso para embalagem`)
        return { 
          valido: true, 
          nota: notaEncontrada 
        }
      } else {
        console.log(`❌ NF ${numeroNF} não encontrada em nenhum lugar`)
        return { 
          valido: false, 
          erro: `NF ${numeroNF} não foi bipada no Recebimento. Verifique se a NF foi processada e o relatório foi finalizado.` 
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao validar NF para embalagem:', error)
      return { 
        valido: false, 
        erro: `Erro interno ao validar NF: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }
}

// Função para migrar dados do localStorage para o banco
export const migrateFromLocalStorage = async () => {
  try {
    console.log('🔄 Iniciando migração do localStorage para o banco...')

    // Verificar se há dados para migrar
    const hasData = Array.from({ length: localStorage.length }, (_, i) => {
      const key = localStorage.key(i)
      return key && (
        key.startsWith('recebimento_') ||
        key.startsWith('embalagem_') ||
        key === 'sistema_session' ||
        key === 'relatorios_custos' ||
        key === 'profarma_carros_embalagem'
      )
    }).some(Boolean)

    if (!hasData) {
      console.log('ℹ️ Nenhum dado encontrado no localStorage para migrar')
      return
    }

    // Migrar sessões
    const sessionData = localStorage.getItem('sistema_session')
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        await SessionService.saveSession(session)
        console.log('✅ Sessão migrada com sucesso')
      } catch (error) {
        console.warn('⚠️ Erro ao migrar sessão:', error)
        // Continuar com outras migrações
      }
    }

    // Migrar notas de recebimento
    let recebimentoCount = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('recebimento_')) {
        try {
          const notas = JSON.parse(localStorage.getItem(key) || '[]')
          if (notas.length > 0) {
            await RecebimentoService.saveNotas(key, notas)
            recebimentoCount++
            console.log(`✅ Notas de recebimento migradas: ${key}`)
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao migrar notas de recebimento ${key}:`, error)
          // Continuar com outras migrações
        }
      }
    }
    console.log(`📊 Total de sessões de recebimento migradas: ${recebimentoCount}`)

    // Migrar carros de embalagem
    const carrosData = localStorage.getItem('profarma_carros_embalagem')
    if (carrosData) {
      try {
        const carros = JSON.parse(carrosData)
        if (carros.length > 0) {
          await EmbalagemService.saveCarrosFinalizados(carros)
          console.log('✅ Carros de embalagem migrados com sucesso')
        }
      } catch (error) {
        console.warn('⚠️ Erro ao migrar carros de embalagem:', error)
        // Continuar com outras migrações
      }
    }

    // Migrar relatórios
    const relatoriosData = localStorage.getItem('relatorios_custos')
    if (relatoriosData) {
      try {
        const relatorios = JSON.parse(relatoriosData)
        let relatoriosCount = 0
        for (const relatorio of relatorios) {
          try {
            await RelatoriosService.saveRelatorio(relatorio)
            relatoriosCount++
          } catch (error) {
            console.warn(`⚠️ Erro ao migrar relatório ${relatorio.id}:`, error)
            // Continuar com outros relatórios
          }
        }
        console.log(`📊 Total de relatórios migrados: ${relatoriosCount}`)
      } catch (error) {
        console.warn('⚠️ Erro ao migrar relatórios:', error)
        // Continuar com outras migrações
      }
    }

    console.log('✅ Migração concluída com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    throw error
  }
}

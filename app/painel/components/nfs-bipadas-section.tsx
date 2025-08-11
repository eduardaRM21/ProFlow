"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
  Truck,
  Clock,
  Search,
  Play,
  Camera,
  CameraOff,
  Scan,
  Plus,
  HelpCircle,
  MessageSquare,
} from "lucide-react"
import BarcodeScanner from "./barcode-scanner"
import ChatModal from "./chat-modal"
import { useNotasBipadas } from "@/lib/notas-bipadas-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { config, debugConfig } from '@/lib/config'
import { getSupabase } from '@/lib/supabase-client'

import ConfirmacaoModal from "./confirmacao-modal"

// Inicializar configuração
debugConfig()

interface NFBipada {
  id: string
  codigoCompleto: string
  codigo: string
  numeroNF: string
  volume: number
  codigoDestino: string
  nomeFornecedor: string
  destinoFinal: string
  tipo: string
  timestamp: string
  status: "valida" | "formato_incorreto" | "destino_divergente" | "duplicada" | "volume_invalido" | "invalida"
  erro?: string
}

interface Carro {
  id: string
  nome: string
  destinoFinal: string
  nfs: NFBipada[]
  statusCarro: StatusCarro
  dataInicio: string
  ativo: boolean
}

interface SessionData {
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
  isAdmin?: boolean
}

interface NFsBipadasSectionProps {
  sessionData: SessionData
}

type StatusCarro = "aguardando_colagem" | "em_conferencia" | "liberado" | "embalando" | "em_producao"

export default function NFsBipadasSection({ sessionData }: NFsBipadasSectionProps) {
  const { toast } = useToast()
  const notasBipadasService = useNotasBipadas()
  const [carros, setCarros] = useState<Carro[]>([])
  const [carroAtivo, setCarroAtivo] = useState<Carro | null>(null)
  const [codigoInput, setCodigoInput] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const inputRef = useRef<HTMLInputElement>(null)
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [modalNovoCarroAberto, setModalNovoCarroAberto] = useState(false)
  const [nomeNovoCarro, setNomeNovoCarro] = useState("")
  const [ajudaVisivel, setAjudaVisivel] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)
  const [notasDuplicadas, setNotasDuplicadas] = useState<Array<{numeroNF: string, carros: string[]}>>([])
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [notaAtual, setNotaAtual] = useState<NFBipada | null>(null)

  const conversaId = `${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`

  // Função para verificar se é administrador
  const isAdmin = () => {
    // Lista de administradores (por nome de usuário)
    const admins = ["admin", "administrador", "supervisor", "gerente"]
    return sessionData.colaboradores.some(colaborador => 
      admins.includes(colaborador.toLowerCase())
    ) || sessionData.isAdmin === true
  }

  // Atualizar sessionData para incluir isAdmin
  const sessionDataWithAdmin = { ...sessionData, isAdmin: isAdmin() }

  const verificarMensagensNaoLidas = async () => {
    try {
      const { data } = await getSupabase()
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .eq('remetente_tipo', 'admin')
        .eq('lida', false)
      
      if (data) {
        setMensagensNaoLidas(data.length)
      }
    } catch (error) {
      console.error('Erro ao verificar mensagens não lidas:', error)
    }
  }

  const abrirChat = () => {
    setChatAberto(true)
    setMensagensNaoLidas(0) // Zerar contador ao abrir
  }

  useEffect(() => {
    const chaveStorage = `profarma_carros_${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`
    const dadosSalvos = localStorage.getItem(chaveStorage)

    if (dadosSalvos) {
      const dados = JSON.parse(dadosSalvos)
      const carrosCarregados = dados.carros || []
      setCarros(carrosCarregados)

      // Definir carro ativo (último ativo ou primeiro da lista)
      const carroAtivoSalvo = carrosCarregados.find((c: Carro) => c.ativo) || carrosCarregados[0]
      if (carroAtivoSalvo) {
        setCarroAtivo(carroAtivoSalvo)
      } else {
        // Criar primeiro carro automaticamente
        criarPrimeiroCarro()
      }
    } else {
      // Criar primeiro carro automaticamente
      criarPrimeiroCarro()
    }

    // Focar no input automaticamente
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [sessionData])

  useEffect(() => {
    // Verificar mensagens não lidas
    verificarMensagensNaoLidas()
    // Verificar notas duplicadas
    verificarNotasDuplicadas()

    // Polling para verificar novas mensagens
    const interval = setInterval(() => {
      verificarMensagensNaoLidas()
    }, 3000)
    return () => clearInterval(interval)
  }, [conversaId])

  const verificarNotasDuplicadas = () => {
    const todasNotas: {[key: string]: string[]} = {}
    
    // Buscar em todos os carros do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i)
      if (chave && chave.startsWith("profarma_sessao_")) {
        try {
          const sessao = JSON.parse(localStorage.getItem(chave) || "{}")
          if (sessao.nfs && Array.isArray(sessao.nfs)) {
            sessao.nfs.forEach((nf: any) => {
              if (nf.numeroNF) {
                if (!todasNotas[nf.numeroNF]) {
                  todasNotas[nf.numeroNF] = []
                }
                todasNotas[nf.numeroNF].push(chave)
              }
            })
          }
        } catch (error) {
          console.error("Erro ao processar sessão:", error)
        }
      }
    }

    // Buscar em carros finalizados
    const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem")
    if (carrosEmbalagem) {
      try {
        const carros = JSON.parse(carrosEmbalagem)
        carros.forEach((carro: any) => {
          if (carro.nfs && Array.isArray(carro.nfs)) {
            carro.nfs.forEach((nf: any) => {
              if (nf.numeroNF) {
                if (!todasNotas[nf.numeroNF]) {
                  todasNotas[nf.numeroNF] = []
                }
                todasNotas[nf.numeroNF].push(`carro_${carro.id}`)
              }
            })
          }
        })
      } catch (error) {
        console.error("Erro ao processar carros de embalagem:", error)
      }
    }

    // Identificar duplicatas
    const duplicatas = Object.entries(todasNotas)
      .filter(([numeroNF, carros]) => carros.length > 1)
      .map(([numeroNF, carros]) => ({
        numeroNF,
        carros: carros as string[]
      }))

    setNotasDuplicadas(duplicatas)
  }

  // Função de debug para verificar dados no localStorage
  const debugLocalStorage = () => {
    console.log("🔍 DEBUG: Verificando localStorage")
    console.log("📊 Total de chaves:", localStorage.length)
    
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i)
      if (chave && chave.startsWith("recebimento_")) {
        console.log("📁 Chave de recebimento encontrada:", chave)
        try {
          const dados = JSON.parse(localStorage.getItem(chave) || "[]")
          console.log("📋 Dados:", dados)
          if (Array.isArray(dados)) {
            console.log("📋 NFs no recebimento:", dados.map((n: any) => n.numeroNF))
          }
        } catch (error) {
          console.error("❌ Erro ao ler dados:", error)
        }
      }
    }
    
    // Teste específico da validação
    console.log("🧪 TESTE: Verificando validação com NF de teste")
    const resultado = verificarNFNoRecebimento("123456")
    console.log("🧪 Resultado do teste:", resultado)
    
    // Criar dados de teste se não existirem
    if (localStorage.length === 0 || !Array.from({length: localStorage.length}, (_, i) => localStorage.key(i)).some(key => key?.startsWith("recebimento_"))) {
      console.log("🧪 Criando dados de teste...")
      const dadosTeste = [
        {
          id: "1",
          codigoCompleto: "2024-01-01|123456|10|SP01|FORNECEDOR TESTE|CLIENTE TESTE|CARGA",
          data: "2024-01-01",
          numeroNF: "123456",
          volumes: 10,
          destino: "SP01",
          fornecedor: "FORNECEDOR TESTE",
          clienteDestino: "CLIENTE TESTE",
          tipoCarga: "CARGA",
          timestamp: new Date().toISOString(),
          status: "ok"
        }
      ]
      localStorage.setItem("recebimento_teste_01-01-2024_A", JSON.stringify(dadosTeste))
      console.log("✅ Dados de teste criados")
    }
  }

  // Função auxiliar para testar validação
  const verificarNFNoRecebimento = async (numeroNF: string): Promise<boolean> => {
    console.log("🔍 Verificando NF no recebimento:", numeroNF)
    
    try {
      // 1. Primeiro, tentar validar usando o banco de dados (método principal)
      console.log("🔍 Tentando validar NF no banco:", numeroNF, sessionData.data, sessionData.turno)
      
      const validacao = await notasBipadasService.validarNFRecebimento(
        numeroNF, 
        sessionData.data, 
        sessionData.turno
      );
      
      console.log("📋 Resultado da validação:", validacao)
      
      if (validacao.valida) {
        console.log("✅ NF validada no banco de dados:", numeroNF);
        return true;
      }
      
      console.log("❌ NF não validada no banco:", validacao.motivo);
      
      // 2. Fallback: verificar em sessões ativas de recebimento (localStorage)
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i)
        if (chave && chave.startsWith("recebimento_")) {
          console.log("📁 Verificando chave de recebimento ativo:", chave)
          try {
            const notasRecebimento = JSON.parse(localStorage.getItem(chave) || "[]")
            console.log("📋 Notas encontradas:", notasRecebimento.length)
            console.log("📋 NFs:", notasRecebimento.map((n: any) => n.numeroNF))
            
            const notaEncontrada = notasRecebimento.find((nota: any) => nota.numeroNF === numeroNF)
            if (notaEncontrada) {
              console.log("✅ NF encontrada no recebimento ativo (localStorage):", numeroNF)
              return true // NF encontrada no recebimento
            }
          } catch (error) {
            console.error("❌ Erro ao verificar recebimento ativo:", error)
          }
        }
      }
      
      // 3. Fallback: verificar em relatórios finalizados (localStorage)
      const chaveRelatorios = "relatorios_custos"
      const relatoriosExistentes = localStorage.getItem(chaveRelatorios)
      if (relatoriosExistentes) {
        console.log("📁 Verificando relatórios finalizados...")
        try {
          const relatorios = JSON.parse(relatoriosExistentes)
          console.log("📋 Total de relatórios:", relatorios.length)
          
          for (const relatorio of relatorios) {
            if (relatorio.notas && Array.isArray(relatorio.notas)) {
              console.log("📋 Verificando relatório:", relatorio.nome)
              console.log("📋 NFs no relatório:", relatorio.notas.map((n: any) => n.numeroNF))
              
              const notaEncontrada = relatorio.notas.find((nota: any) => nota.numeroNF === numeroNF)
              if (notaEncontrada) {
                console.log("✅ NF encontrada em relatório finalizado (localStorage):", numeroNF)
                console.log("📋 Relatório:", relatorio.nome)
                return true // NF encontrada em relatório finalizado
              }
            }
          }
        } catch (error) {
          console.error("❌ Erro ao verificar relatórios:", error)
        }
      }
      
      console.log("❌ NF NÃO encontrada em nenhum lugar:", numeroNF)
      return false // NF não encontrada
      
    } catch (error) {
      console.error("❌ Erro na validação principal:", error)
      console.error("❌ Tipo do erro:", typeof error)
      console.error("❌ Mensagem do erro:", error instanceof Error ? error.message : 'Erro sem mensagem')
      console.error("❌ Stack do erro:", error instanceof Error ? error.stack : 'Sem stack')
      
      // Em caso de erro no banco, usar apenas localStorage como fallback
      console.log("⚠️ Usando fallback localStorage devido a erro no banco")
      
      // Verificar localStorage como fallback
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i)
        if (chave && chave.startsWith("recebimento_")) {
          try {
            const notasRecebimento = JSON.parse(localStorage.getItem(chave) || "[]")
            const notaEncontrada = notasRecebimento.find((nota: any) => nota.numeroNF === numeroNF)
            if (notaEncontrada) {
              console.log("✅ NF encontrada no recebimento ativo (fallback):", numeroNF)
              return true
            }
          } catch (error) {
            console.error("❌ Erro ao verificar recebimento ativo (fallback):", error)
          }
        }
      }
      
      return false
    }
  }

  const criarPrimeiroCarro = () => {
    const primeiroCarro: Carro = {
      id: `carro_1_${Date.now()}`,
      nome: "Carro 1",
      destinoFinal: "",
      nfs: [],
      statusCarro: "aguardando_colagem",
      dataInicio: new Date().toISOString(),
      ativo: true,
    }

    setCarros([primeiroCarro])
    setCarroAtivo(primeiroCarro)
  }

  useEffect(() => {
    if (carros.length > 0) {
      const chaveStorage = `profarma_carros_${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`
      const dados = {
        carros,
        ultimaAtualizacao: new Date().toISOString(),
      }
      localStorage.setItem(chaveStorage, JSON.stringify(dados))
    }
  }, [carros, sessionData])

  const criarNovoCarro = () => {
    if (!nomeNovoCarro.trim()) {
      alert("Nome do carro é obrigatório!")
      return
    }

    // Verificar se já existe um carro com esse nome
    if (carros.some((c) => c.nome.toLowerCase() === nomeNovoCarro.trim().toLowerCase())) {
      alert("Já existe um carro com esse nome!")
      return
    }

    const novoCarro: Carro = {
      id: `carro_${carros.length + 1}_${Date.now()}`,
      nome: nomeNovoCarro.trim(),
      destinoFinal: "",
      nfs: [],
      statusCarro: "aguardando_colagem",
      dataInicio: new Date().toISOString(),
      ativo: false,
    }

    // Desativar carro atual e ativar o novo
    const carrosAtualizados = carros.map((c) => ({ ...c, ativo: false }))
    carrosAtualizados.push({ ...novoCarro, ativo: true })

    setCarros(carrosAtualizados)
    setCarroAtivo(novoCarro)
    setModalNovoCarroAberto(false)
    setNomeNovoCarro("")

    // Focar no input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  const trocarCarro = (carroId: string) => {
    const carro = carros.find((c) => c.id === carroId)
    if (carro) {
      // Desativar todos os carros e ativar o selecionado
      const carrosAtualizados = carros.map((c) => ({
        ...c,
        ativo: c.id === carroId,
      }))

      setCarros(carrosAtualizados)
      setCarroAtivo(carro)

      // Focar no input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const validarCodigo = async (codigo: string): Promise<{ valido: boolean; nf?: NFBipada; erro?: string }> => {
    if (!carroAtivo) {
      return { valido: false, erro: "Nenhum carro ativo selecionado" }
    }

    // Verificar se tem 7 partes separadas por |
    const partes = codigo.split("|")

    if (partes.length !== 7) {
      return {
        valido: false,
        erro: `Código deve ter 7 partes separadas por "|". Encontradas: ${partes.length}`,
      }
    }

    const [codigoParte, numeroNF, volumeStr, codigoDestino, nomeFornecedor, destinoFinal, tipo] = partes

    // Validar se volume é numérico
    const volume = Number.parseInt(volumeStr)
    if (isNaN(volume) || volume <= 0) {
      return {
        valido: false,
        erro: `Volume deve ser um número válido maior que 0. Recebido: "${volumeStr}"`,
      }
    }

    // Verificar duplicidade no carro ativo
    const jaBipada = carroAtivo.nfs.find((nf) => nf.codigoCompleto === codigo)
    if (jaBipada) {
      return {
        valido: false,
        erro: `NF já foi bipada neste carro em ${new Date(jaBipada.timestamp).toLocaleString("pt-BR")}`,
      }
    }

    // Verificar se a NF foi bipada no recebimento
    const nfNoRecebimento = await verificarNFNoRecebimento(numeroNF)
    
    if (!nfNoRecebimento) {
      return {
        valido: false,
        erro: `NF ${numeroNF} não foi bipada no setor de recebimento ou não está em nenhum relatório finalizado. É necessário bipar a NF primeiro no recebimento antes de processá-la na embalagem.`,
      }
    }

    // Verificar coerência do destino final no carro ativo
    const nfsDoLote = carroAtivo.nfs.filter((nf) => nf.status === "valida")
    let statusValidacao: NFBipada["status"] = "valida"
    let erro: string | undefined

    if (nfsDoLote.length > 0) {
      const destinosExistentes = [...new Set(nfsDoLote.map((nf) => nf.destinoFinal))]
      if (!destinosExistentes.includes(destinoFinal)) {
        statusValidacao = "destino_divergente"
        erro = `Destino "${destinoFinal}" diverge dos destinos do carro: ${destinosExistentes.join(", ")}`
      }
    }

    const nf: NFBipada = {
      id: Date.now().toString(),
      codigoCompleto: codigo,
      codigo: codigoParte,
      numeroNF,
      volume,
      codigoDestino,
      nomeFornecedor,
      destinoFinal,
      tipo,
      timestamp: new Date().toISOString(),
      status: statusValidacao,
      erro,
    }

    return { valido: true, nf }
  }

  const handleBipagem = async () => {
    if (!codigoInput.trim() || !carroAtivo) return

    if (!podeEditar()) {
      alert("Este carro está embalado e só pode ser editado por administradores!")
      return
    }

    const resultado = await validarCodigo(codigoInput.trim())

    if (resultado.valido && resultado.nf) {
      // Salvar nota bipada na tabela centralizada
      try {
        const notaBipada = {
          numero_nf: resultado.nf.numeroNF,
          codigo_completo: resultado.nf.codigoCompleto,
          area_origem: 'embalagem' as const,
          session_id: `embalagem_${sessionData.data}_${sessionData.turno}`,
          colaboradores: sessionData.colaboradores,
          data: sessionData.data,
          turno: sessionData.turno,
          volumes: resultado.nf.volume,
          destino: resultado.nf.destinoFinal,
          fornecedor: resultado.nf.nomeFornecedor,
          cliente_destino: resultado.nf.destinoFinal,
          tipo_carga: resultado.nf.tipo,
          status: 'bipada',
          observacoes: `NF bipada no carro: ${carroAtivo?.nome || 'Sem nome'}`
        };

        await notasBipadasService.salvarNotaBipada(notaBipada);
        console.log('✅ Nota bipada salva na tabela centralizada');
      } catch (error) {
        console.error('❌ Erro ao salvar nota bipada na tabela centralizada:', error);
        // Continuar com o processo mesmo se falhar ao salvar na tabela centralizada
      }

      // Atualizar o carro ativo
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo?.id) {
          const nfsAtualizadas = [resultado.nf!, ...c.nfs]
          const destinoAtualizado =
            nfsAtualizadas.filter((nf) => nf.status === "valida").length > 0
              ? [...new Set(nfsAtualizadas.filter((nf) => nf.status === "valida").map((nf) => nf.destinoFinal))].join(
                  ", ",
                )
              : ""

          return {
            ...c,
            nfs: nfsAtualizadas,
            destinoFinal: destinoAtualizado,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroAtualizado = carrosAtualizados.find((c) => c.id === carroAtivo?.id)
      if (carroAtualizado) setCarroAtivo(carroAtualizado)
      setCodigoInput("")

      // Manter foco no input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } else {
      // Adicionar NF inválida ao carro ativo
      const nfInvalida: NFBipada = {
        id: Date.now().toString(),
        codigoCompleto: codigoInput.trim(),
        codigo: "",
        numeroNF: "",
        volume: 0,
        codigoDestino: "",
        nomeFornecedor: "",
        destinoFinal: "",
        tipo: "",
        timestamp: new Date().toISOString(),
        status: "invalida",
        erro: resultado.erro,
      }

      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo?.id) {
          return {
            ...c,
            nfs: [nfInvalida, ...c.nfs],
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroAtualizado2 = carrosAtualizados.find((c) => c.id === carroAtivo?.id)
      if (carroAtualizado2) setCarroAtivo(carroAtualizado2)
      setCodigoInput("")

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBipagem()
    }
  }

  const removerNF = (id: string) => {
    if (!carroAtivo) return

    if (!podeEditar()) {
      alert("Este carro está embalado e só pode ser editado por administradores!")
      return
    }

    const carrosAtualizados = carros.map((c) => {
      if (c.id === carroAtivo.id) {
        return {
          ...c,
          nfs: c.nfs.filter((nf) => nf.id !== id),
        }
      }
      return c
    })

    setCarros(carrosAtualizados)
    if (carroAtivo) {
      setCarroAtivo(carrosAtualizados.find((c) => c.id === carroAtivo.id)!)
    }
  }

  const handleCodigoEscaneado = async (codigo: string) => {
    setCodigoInput(codigo)
    setScannerAtivo(false)
    const resultado = await validarCodigo(codigo.trim())

    if (resultado.valido && resultado.nf && carroAtivo) {
      // Salvar nota bipada na tabela centralizada
      try {
        const notaBipada = {
          numero_nf: resultado.nf.numeroNF,
          codigo_completo: resultado.nf.codigoCompleto,
          area_origem: 'embalagem' as const,
          session_id: `embalagem_${sessionData.data}_${sessionData.turno}`,
          colaboradores: sessionData.colaboradores,
          data: sessionData.data,
          turno: sessionData.turno,
          volumes: resultado.nf.volume,
          destino: resultado.nf.destinoFinal,
          fornecedor: resultado.nf.nomeFornecedor,
          cliente_destino: resultado.nf.destinoFinal,
          tipo_carga: resultado.nf.tipo,
          status: 'bipada',
          observacoes: `NF bipada no carro: ${carroAtivo?.nome || 'Sem nome'}`
        };

        await notasBipadasService.salvarNotaBipada(notaBipada);
        console.log('✅ Nota bipada salva na tabela centralizada');
      } catch (error) {
        console.error('❌ Erro ao salvar nota bipada na tabela centralizada:', error);
        // Continuar com o processo mesmo se falhar ao salvar na tabela centralizada
      }

      // Atualizar o carro ativo
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo?.id) {
          const nfsAtualizadas = [resultado.nf!, ...c.nfs]
          const destinoAtualizado =
            nfsAtualizadas.filter((nf) => nf.status === "valida").length > 0
              ? [...new Set(nfsAtualizadas.filter((nf) => nf.status === "valida").map((nf) => nf.destinoFinal))].join(
                  ", ",
                )
              : ""

          return {
            ...c,
            nfs: nfsAtualizadas,
            destinoFinal: destinoAtualizado,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroAtualizado = carrosAtualizados.find((c) => c.id === carroAtivo?.id)
      if (carroAtualizado) setCarroAtivo(carroAtualizado)
      setCodigoInput("")
    } else {
      // Adicionar NF inválida ao carro ativo
      if (carroAtivo) {
        const nfInvalida: NFBipada = {
          id: Date.now().toString(),
          codigoCompleto: codigo.trim(),
          codigo: "",
          numeroNF: "",
          volume: 0,
          codigoDestino: "",
          nomeFornecedor: "",
          destinoFinal: "",
          tipo: "",
          timestamp: new Date().toISOString(),
          status: "invalida",
          erro: resultado.erro,
        }

        const carrosAtualizados = carros.map((c) => {
          if (c.id === carroAtivo.id) {
            return {
              ...c,
              nfs: [nfInvalida, ...c.nfs],
            }
          }
          return c
        })

        setCarros(carrosAtualizados)
        const carroAtualizado2 = carrosAtualizados.find((c) => c.id === carroAtivo.id)
        if (carroAtualizado2) setCarroAtivo(carroAtualizado2)
      }
      setCodigoInput("")
    }
    
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const getStatusIcon = (status: NFBipada["status"]) => {
    switch (status) {
      case "valida":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "destino_divergente":
      case "formato_incorreto":
      case "volume_invalido":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "duplicada":
      case "invalida":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusColor = (status: NFBipada["status"]) => {
    switch (status) {
      case "valida":
        return "border-l-green-500 bg-green-50"
      case "destino_divergente":
      case "formato_incorreto":
      case "volume_invalido":
        return "border-l-yellow-500 bg-yellow-50"
      case "duplicada":
      case "invalida":
        return "border-l-red-500 bg-red-50"
      default:
        return "border-l-red-500 bg-red-50"
    }
  }

  const getStatusCarroLabel = (status: StatusCarro) => {
    switch (status) {
      case "aguardando_colagem":
        return "Bipagem"
      case "em_conferencia":
        return "Em Conferência"
      case "liberado":
        return "Liberado"
      case "embalando":
        return "Embalando"
      case "em_producao":
        return "Concluído"
    }
  }

  const getStatusCarroColor = (status: StatusCarro) => {
    switch (status) {
      case "aguardando_colagem":
        return "bg-gray-100 text-gray-800"
      case "em_conferencia":
        return "bg-blue-100 text-blue-800"
      case "liberado":
        return "bg-green-100 text-green-800"
      case "embalando":
        return "bg-orange-100 text-orange-800"
      case "em_producao":
        return "bg-purple-100 text-purple-800"
    }
  }

  const nfsValidas = carroAtivo?.nfs.filter((nf) => nf.status === "valida") || []
  const totalVolumes = nfsValidas.reduce((sum, nf) => sum + nf.volume, 0)
  const destinosUnicos = [...new Set(nfsValidas.map((nf) => nf.destinoFinal))].filter(Boolean)
  const nfsFiltradas =
    filtroStatus === "todos" ? carroAtivo?.nfs || [] : carroAtivo?.nfs.filter((nf) => nf.status === filtroStatus) || []

  const temDivergencias = () => {
    if (!carroAtivo) return false
    
    const nfsInvalidas = carroAtivo.nfs.filter(nf => 
      nf.status === "destino_divergente" || 
      nf.status === "invalida" || 
      nf.status === "formato_incorreto" ||
      nf.status === "duplicada" ||
      nf.status === "volume_invalido"
    )
    
    return nfsInvalidas.length > 0
  }

  const carroFinalizadoPronto = () => {
    if (!carroAtivo) return false
    const isLiberado = carroAtivo.statusCarro === "liberado"
    const hasNfs = nfsValidas.length > 0
    const semDivergencias = !temDivergencias()
    
    console.log("carroFinalizadoPronto debug:", {
      carroId: carroAtivo.id,
      status: carroAtivo.statusCarro,
      isLiberado,
      hasNfs,
      nfsValidas: nfsValidas.length,
      semDivergencias,
      resultado: isLiberado && hasNfs && semDivergencias
    })
    
    return isLiberado && hasNfs && semDivergencias
  }

  const podeEditar = () => {
    if (!carroAtivo) return false
    
    // Se for admin, pode editar qualquer carro
    if (isAdmin()) return true
    
    // Usuários normais podem editar apenas carros não embalados/embalando
    return carroAtivo.statusCarro !== "em_producao" && carroAtivo.statusCarro !== "embalando"
  }

  const podeDesembalar = () => {
    if (!carroAtivo) return false
    return isAdmin() && (carroAtivo.statusCarro === "em_producao" || carroAtivo.statusCarro === "embalando")
  }

  const finalizarBipagem = () => {
    if (!carroAtivo || nfsValidas.length === 0) {
      alert("Não há NFs válidas para finalizar neste carro!")
      return
    }

    if (temDivergencias()) {
      alert("Não é possível finalizar a bipagem. Existem divergências que precisam ser corrigidas primeiro.")
      return
    }

    const confirmacao = confirm(
      `Confirma a finalização da bipagem do ${carroAtivo.nome}?\n\n` +
        `NFs válidas: ${nfsValidas.length}\n` +
        `Total de volumes: ${totalVolumes}\n` +
        `Destinos: ${destinosUnicos.join(", ")}\n\n` +
        `Após confirmar, o carro ficará pronto para embalar.`,
    )

    if (confirmacao) {
      // Alterar status do carro ativo para "liberado"
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo.id) {
          return {
            ...c,
            statusCarro: "liberado" as StatusCarro,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      const carroFinalizado = carrosAtualizados.find((c) => c.id === carroAtivo.id)!
      setCarroAtivo(carroFinalizado)

      console.log("Após finalizar bipagem:", {
        carroId: carroFinalizado.id,
        nome: carroFinalizado.nome,
        status: carroFinalizado.statusCarro,
        nfsValidas: carroFinalizado.nfs.filter(nf => nf.status === "valida").length
      })

      alert(`${carroFinalizado.nome} finalizado com sucesso! Agora você pode embalar o carro.`)
    }
  }

  const embalarCarro = () => {
    if (!carroAtivo || !carroFinalizadoPronto()) {
      alert("Carro não está pronto para embalar!")
      return
    }

    const confirmacao = confirm(
      `Confirma o início do embalamento do ${carroAtivo.nome}?\n\n` +
        `NFs válidas: ${nfsValidas.length}\n` +
        `Total de volumes: ${totalVolumes}\n` +
        `Destinos: ${destinosUnicos.join(", ")}\n\n` +
        `Após confirmar, o carro será enviado para a seção "Carros Produzidos" onde você poderá finalizar o embalamento.`,
    )

    if (confirmacao) {
      // Alterar status do carro ativo para "embalando"
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo.id) {
          return {
            ...c,
            statusCarro: "embalando" as StatusCarro,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      setCarroAtivo(carrosAtualizados.find((c) => c.id === carroAtivo.id)!)

      // Salvar na lista de carros para embalagem
      salvarCarroParaEmbalagem()

      alert(`${carroAtivo.nome} enviado para embalagem!\n\nVá para a seção "Carros Produzidos" para finalizar o embalamento e informar a quantidade de paletes.`)
      
      // Criar novo carro automaticamente após embalar
      criarNovoCarroAutomatico()
    }
  }

  const desembalarCarro = () => {
    if (!carroAtivo || !podeDesembalar()) {
      alert("Apenas administradores podem desembalar carros!")
      return
    }

    const confirmacao = confirm(
      `ATENÇÃO: Confirma o DESEMBALAMENTO do ${carroAtivo.nome}?\n\n` +
        `Esta ação irá reverter o carro para status "Liberado" e permitir edições novamente.\n\n` +
        `NFs válidas: ${nfsValidas.length}\n` +
        `Total de volumes: ${totalVolumes}\n` +
        `Destinos: ${destinosUnicos.join(", ")}`,
    )

    if (confirmacao) {
      // Alterar status do carro para "liberado"
      const carrosAtualizados = carros.map((c) => {
        if (c.id === carroAtivo.id) {
          return {
            ...c,
            statusCarro: "liberado" as StatusCarro,
          }
        }
        return c
      })

      setCarros(carrosAtualizados)
      setCarroAtivo(carrosAtualizados.find((c) => c.id === carroAtivo.id)!)

      alert(`${carroAtivo.nome} desembalado com sucesso! Agora pode ser editado novamente.`)
    }
  }

  const criarNovoCarroAutomatico = () => {
    // Contar apenas carros que não estão em embalagem
    const carrosDisponiveis = carros.filter((carro) => 
      carro.statusCarro !== "embalando" && carro.statusCarro !== "em_producao"
    )
    const proximoNumero = carrosDisponiveis.length + 1
    const nomeNovoCarro = `Carro ${proximoNumero}`

    const novoCarro: Carro = {
      id: `carro_${proximoNumero}_${Date.now()}`,
      nome: nomeNovoCarro,
      destinoFinal: "",
      nfs: [],
      statusCarro: "aguardando_colagem",
      dataInicio: new Date().toISOString(),
      ativo: true,
    }

    // Desativar carro atual e adicionar o novo
    const carrosAtualizados = carros.map((c) => ({ ...c, ativo: false }))
    carrosAtualizados.push(novoCarro)

    setCarros(carrosAtualizados)
    setCarroAtivo(novoCarro)

    // Focar no input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  const salvarCarroParaEmbalagem = () => {
    if (!carroAtivo) return

    const carroParaEmbalagem = {
      id: `${carroAtivo.id}_${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`,
      nomeCarro: carroAtivo.nome,
      colaboradores: sessionData.colaboradores,
      data: sessionData.data,
      turno: sessionData.turno,
      destinoFinal: destinosUnicos.join(", "),
      quantidadeNFs: nfsValidas.length,
      totalVolumes,
      dataInicioEmbalagem: new Date().toISOString(),
      nfs: nfsValidas.map((nf) => ({
        id: nf.id,
        numeroNF: nf.numeroNF,
        volume: nf.volume,
        fornecedor: nf.nomeFornecedor,
        codigo: nf.codigo,
        codigoDestino: nf.codigoDestino,
        destinoFinal: nf.destinoFinal,
        tipo: nf.tipo,
        codigoCompleto: nf.codigoCompleto,
        timestamp: nf.timestamp,
      })),
      status: "embalando",
      estimativaPallets: Math.ceil(totalVolumes / 100),
      palletesReais: null,
      dataFinalizacao: null,
    }

    // Salvar na lista de carros para embalagem
    const chaveCarrosEmbalagem = "profarma_carros_embalagem"
    const carrosExistentes = localStorage.getItem(chaveCarrosEmbalagem)
    const carros = carrosExistentes ? JSON.parse(carrosExistentes) : []

    // Verificar se já existe
    const carroExistente = carros.findIndex((c: any) => c.id === carroParaEmbalagem.id)

    if (carroExistente !== -1) {
      carros[carroExistente] = carroParaEmbalagem
    } else {
      carros.push(carroParaEmbalagem)
    }

    // Ordenar por data de início da embalagem
    carros.sort((a: any, b: any) => new Date(b.dataInicioEmbalagem).getTime() - new Date(a.dataInicioEmbalagem).getTime())

    localStorage.setItem(chaveCarrosEmbalagem, JSON.stringify(carros))
  }

  const confirmarBipagem = async () => {
    if (!notaAtual) return

    try {
      // Prepare data for database
      const notaData = {
        numero_nf: notaAtual.numeroNF,
        codigo_completo: notaAtual.codigoCompleto,
        area_origem: 'embalagem' as const,
        session_id: `embalagem_${sessionData.data}_${sessionData.turno}`,
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        volumes: notaAtual.volume || 1,
        destino: notaAtual.destinoFinal || 'N/A',
        fornecedor: notaAtual.nomeFornecedor || 'N/A',
        cliente_destino: notaAtual.destinoFinal || 'N/A',
        tipo_carga: notaAtual.tipo || 'N/A',
        status: 'bipada',
        timestamp_bipagem: new Date().toISOString(),
      }

      console.log('📝 Dados da nota para salvar:', notaData)

      // Save to notas_bipadas table
      await notasBipadasService.salvarNotaBipada(notaData)

      // Update carros state
      setCarros(prev => prev.map(carro => 
        carro.nome === notaAtual.codigoDestino
          ? { ...carro, nfs: [...carro.nfs, notaAtual] }
          : carro
      ))

      toast({
        title: "NF Adicionada",
        description: `NF ${notaAtual.numeroNF} adicionada ao carro ${notaAtual.codigoDestino}`,
      })

      setModalConfirmacao(false)
      setNotaAtual(null)
    } catch (error) {
      console.error('❌ Erro detalhado ao salvar NF:', error)
      toast({
        title: "Erro",
        description: `Erro ao salvar NF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com informações do carro */}
      <Card className="border-green-200">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col space-y-2">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <span className="text-sm sm:text-base lg:text-lg truncate">Bipagem de Notas Fiscais</span>
            </CardTitle>
            {carroAtivo && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-gray-600 bg-green-50 p-2 rounded-lg">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="font-medium truncate">{carroAtivo.nome}</span>
                </div>
                <Badge className={`text-xs self-start sm:self-center flex-shrink-0 ${getStatusCarroColor(carroAtivo.statusCarro)}`}>
                  {getStatusCarroLabel(carroAtivo.statusCarro)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{carroAtivo?.nfs.length || 0}</div>
              <div className="text-xs text-gray-600 leading-tight">Total Bipadas</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-emerald-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">{nfsValidas.length}</div>
              <div className="text-xs text-gray-600 leading-tight">NFs Válidas</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-teal-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600">{totalVolumes}</div>
              <div className="text-xs text-gray-600 leading-tight">Total Volumes</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{destinosUnicos.length}</div>
              <div className="text-xs text-gray-600 leading-tight">Destinos</div>
            </div>
          </div>

          {destinosUnicos.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <Label className="text-xs sm:text-sm font-medium text-gray-700">Destinos do Lote:</Label>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                {destinosUnicos.map((destino, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs truncate max-w-[120px] sm:max-w-none">
                    {destino}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Alerta de Validação de Recebimento */}
          <div className="mb-3 sm:mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-blue-800">
                Validação de Recebimento
              </span>
            </div>
            <div className="text-xs text-blue-700">
              <p className="mb-1">
                <strong>Importante:</strong> As notas só podem ser bipadas aqui se já foram processadas no setor de recebimento.
              </p>
              <p className="text-blue-600">
                O sistema verifica tanto sessões ativas quanto relatórios finalizados do recebimento.
              </p>
            </div>
          </div>

          {/* Alerta de Notas Duplicadas */}
          {notasDuplicadas.length > 0 && (
            <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  ⚠️ {notasDuplicadas.length} nota(s) duplicada(s) detectada(s)
                </span>
              </div>
              <div className="text-xs text-red-700">
                <p className="mb-2">As seguintes notas fiscais aparecem em múltiplos carros:</p>
                <div className="space-y-1">
                  {notasDuplicadas.slice(0, 3).map((duplicata, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="font-mono bg-red-100 px-2 py-1 rounded">
                        {duplicata.numeroNF}
                      </span>
                      <span>em {duplicata.carros.length} carro(s)</span>
                    </div>
                  ))}
                  {notasDuplicadas.length > 3 && (
                    <p className="text-red-600 font-medium">
                      +{notasDuplicadas.length - 3} mais...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              
            </div>
          </div>
          {/* Botões de Ação Principais */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={finalizarBipagem}
              disabled={nfsValidas.length === 0 || carroAtivo?.statusCarro === "em_producao" || temDivergencias() || !podeEditar()}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 flex-1 sm:flex-none"
              size="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Finalizar Bipagem</span>
              <span className="sm:hidden">Finalizar</span>
              <span className="ml-1">({nfsValidas.length})</span>
            </Button>

            <Button
              onClick={embalarCarro}
              disabled={!carroFinalizadoPronto() || carroAtivo?.statusCarro === "em_producao" || carroAtivo?.statusCarro === "embalando"}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400 flex-1 sm:flex-none"
              size="default"
            >
              <Package className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Embalar Carro</span>
              <span className="sm:hidden">Embalar</span>
            </Button>

            {podeDesembalar() && (
              <Button
                onClick={desembalarCarro}
                className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                size="default"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Desembalar (Admin)</span>
                <span className="sm:hidden">Desembalar</span>
              </Button>
            )}
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {carroAtivo?.statusCarro === "embalando" && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                <Package className="h-3 w-3 mr-1" />
                Em Embalagem
              </Badge>
            )}

            {carroAtivo?.statusCarro === "em_producao" && (
              <Badge className="bg-purple-100 text-purple-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Carro Concluído
              </Badge>
            )}

            {temDivergencias() && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Divergências Encontradas</span>
                <span className="sm:hidden">Divergências</span>
              </Badge>
            )}

            {carroFinalizadoPronto() && carroAtivo?.statusCarro !== "em_producao" && carroAtivo?.statusCarro !== "embalando" && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Pronto para Embalar</span>
                <span className="sm:hidden">Pronto</span>
              </Badge>
            )}

            {carroAtivo?.statusCarro === "liberado" && !carroFinalizadoPronto() && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Verificar Divergências</span>
                <span className="sm:hidden">Verificar</span>
              </Badge>
            )}

            {!podeEditar() && !isAdmin() && (
              <Badge className="bg-gray-100 text-gray-800 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Somente Leitura</span>
                <span className="sm:hidden">Bloqueado</span>
              </Badge>
            )}

            {isAdmin() && (
              <Badge className="bg-purple-100 text-purple-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Administrador</span>
                <span className="sm:hidden">Admin</span>
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Carros */}
      <Card className="border-blue-200">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-base lg:text-lg truncate">Gerenciar Carros</span>
            </CardTitle>
            <Button 
              onClick={() => setModalNovoCarroAberto(true)} 
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo Carro</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {carros
                .filter((carro) => carro.statusCarro !== "embalando" && carro.statusCarro !== "em_producao")
                .map((carro) => {
                  const nfsValidasCarro = carro.nfs.filter((nf) => nf.status === "valida")
                  const volumesCarro = nfsValidasCarro.reduce((sum, nf) => sum + nf.volume, 0)

                  return (
                    <div
                      key={carro.id}
                      onClick={() => trocarCarro(carro.id)}
                      className={`p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        carro.ativo
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-25"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                        <span className="font-medium text-gray-900 text-sm truncate flex-1">{carro.nome}</span>
                        {carro.ativo && <Badge className="bg-blue-100 text-blue-800 text-xs self-start sm:self-center flex-shrink-0">Ativo</Badge>}
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          <span>NFs: {nfsValidasCarro.length}</span>
                          <span>•</span>
                          <span>Vols: {volumesCarro}</span>
                        </div>
                        <div className="truncate text-xs">{carro.destinoFinal || "Sem destino definido"}</div>
                        <div>
                          <Badge className={`text-xs ${getStatusCarroColor(carro.statusCarro)}`}>
                            {getStatusCarroLabel(carro.statusCarro)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Mensagem quando não há carros disponíveis para gerenciar */}
            {carros.filter((carro) => carro.statusCarro !== "embalando" && carro.statusCarro !== "em_producao").length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Nenhum carro disponível</h3>
                <p className="text-sm">
                  Todos os carros estão em embalagem ou foram finalizados. 
                  <br />
                  Eles aparecem na seção "Carros Produzidos".
                </p>
              </div>
            )}

            {carroAtivo && (
              <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-2 sm:p-3 rounded-lg">
                <div className="flex flex-wrap gap-1 items-center">
                  <span><strong>Carro Ativo:</strong> {carroAtivo.nome}</span>
                  <span className="hidden sm:inline">•</span>
                  <span><strong>NFs:</strong> {nfsValidas.length}</span>
                  <span className="hidden sm:inline">•</span>
                  <span><strong>Volumes:</strong> {totalVolumes}</span>
                </div>
                {destinosUnicos.length > 0 && (
                  <div className="mt-1 sm:mt-0 sm:inline">
                    <span className="hidden sm:inline"> • </span>
                    <strong>Destinos:</strong> 
                    <span className="truncate ml-1">{destinosUnicos.join(", ")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para Novo Carro */}
      <Dialog open={modalNovoCarroAberto} onOpenChange={setModalNovoCarroAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Criar Novo Carro</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nomeCarro">Nome do Carro *</Label>
              <Input
                id="nomeCarro"
                placeholder="Ex: Carro 2, Carro SP, Carro RJ..."
                value={nomeNovoCarro}
                onChange={(e) => setNomeNovoCarro(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    criarNovoCarro()
                  }
                }}
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>• Cada carro pode ter destinos diferentes</p>
              <p>• Você pode alternar entre carros a qualquer momento</p>
              <p>• O novo carro será ativado automaticamente</p>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={criarNovoCarro}
                disabled={!nomeNovoCarro.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Carro
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalNovoCarroAberto(false)
                  setNomeNovoCarro("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campo de bipagem */}
      <Card className="border-green-200">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
            <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <span className="text-sm sm:text-base lg:text-lg truncate">Bipar Código de Barras</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {scannerAtivo ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base sm:text-lg font-medium">Scanner de Código de Barras</h3>
                <Button
                  variant="outline"
                  onClick={() => setScannerAtivo(false)}
                  className="text-red-600 hover:text-red-700 w-full sm:w-auto"
                >
                  <CameraOff className="h-4 w-4 mr-2" />
                  Fechar Scanner
                </Button>
              </div>
              
              {/* Scanner de códigos de barras */}
              <BarcodeScanner
                onScan={handleCodigoEscaneado}
                onError={(error: string) => {
                  console.error("Erro no scanner:", error)
                  alert("Erro no Scanner: " + error)
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    ref={inputRef}
                    placeholder={podeEditar() ? "Digite ou escaneie o código de barras..." : "Carro embalado - Somente leitura"}
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!podeEditar()}
                    className="text-sm sm:text-base h-11 font-mono disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setScannerAtivo(true)} 
                    disabled={!podeEditar()}
                    className="h-11 flex-1 sm:flex-none sm:px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                    title={!podeEditar() ? "Carro embalado - Apenas admins podem editar" : "Abrir scanner"}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Scanner</span>
                    <span className="sm:hidden">Scan</span>
                  </Button>
                  <Button
                    onClick={handleBipagem}
                    disabled={!codigoInput.trim() || !podeEditar()}
                    className="h-11 flex-1 sm:flex-none sm:px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    title={!podeEditar() ? "Carro embalado - Apenas admins podem editar" : "Bipar código"}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Bipar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {podeEditar() 
                  ? "Digite manualmente, use o scanner ou pressione Enter para bipar. ⚠️ Notas devem ser bipadas primeiro no recebimento."
                  : "Carro embalado - Apenas administradores podem fazer alterações"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de NFs */}
      <Card className="border-green-200">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <CardTitle className="text-sm sm:text-base lg:text-lg truncate">Lista de NFs Bipadas</CardTitle>
            <div className="flex items-center space-x-2">
              <Label className="text-xs sm:text-sm hidden sm:inline">Filtrar:</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="valida">✅ Válidas</SelectItem>
                  <SelectItem value="destino_divergente">⚠️ Destino Divergente</SelectItem>
                  <SelectItem value="invalida">❌ Inválidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {nfsFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filtroStatus === "todos"
                ? "Nenhuma NF bipada ainda. Use o campo acima para começar a bipar."
                : "Nenhuma NF encontrada com o filtro selecionado."}
            </div>
          ) : (
            <div className="space-y-3">
              {nfsFiltradas.map((nf) => (
                <div key={nf.id} className={`p-3 sm:p-4 border-l-4 rounded-r-lg ${getStatusColor(nf.status)}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(nf.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {nf.status === "invalida" ? (
                          <div>
                            <div className="font-mono text-xs sm:text-sm text-gray-600 break-all">{nf.codigoCompleto}</div>
                            <div className="text-red-600 text-xs sm:text-sm mt-1">❌ {nf.erro}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">NF: {nf.numeroNF}</div>
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                <Badge variant="outline" className="bg-white text-xs">
                                  Vol: {nf.volume}
                                </Badge>
                                <Badge variant="outline" className="bg-white text-xs truncate max-w-[120px] sm:max-w-none">
                                  {nf.destinoFinal}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                              <div className="truncate">
                                <strong>Fornecedor:</strong> {nf.nomeFornecedor}
                              </div>
                              <div>
                                <strong>Código:</strong> {nf.codigo} | <strong>Tipo:</strong> {nf.tipo}
                              </div>
                              <div className="font-mono text-xs text-gray-500 break-all">{nf.codigoCompleto}</div>
                            </div>
                            {nf.erro && <div className="text-yellow-600 text-xs sm:text-sm mt-2">⚠️ {nf.erro}</div>}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(nf.timestamp).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removerNF(nf.id)}
                      disabled={!podeEditar()}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white self-start sm:self-center flex-shrink-0"
                      title={!podeEditar() ? "Carro embalado - Apenas admins podem editar" : "Remover NF"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

                {/* Botões de Ajuda e Chat Flutuantes */}
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col space-y-2 sm:space-y-3 z-50">

            
            {/* Botão Chat */}
            <button
              onClick={abrirChat}
              className="relative bg-green-600 hover:bg-green-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110"
              title="Chat Interno"
            >
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
              {mensagensNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-xs font-bold">
                  {mensagensNaoLidas}
                </span>
              )}
            </button>
            
            {/* Botão Ajuda */}
            <button
              onClick={() => setAjudaVisivel(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110"
              title="Ajuda"
            >
              <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

      {/* Modal de Ajuda */}
      <Dialog open={ajudaVisivel} onOpenChange={setAjudaVisivel}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              <span>Central de Ajuda - Sistema de Bipagem</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seção: Como usar */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Como Usar o Sistema</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-900">1. Bipar Código de Barras</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use o botão "Scanner" para ativar a câmera ou digite manualmente o código no formato:<br/>
                    <code className="bg-gray-100 px-1 rounded">codigo|nf|volume|destino|fornecedor|destino_final|tipo</code>
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-gray-900">⚠️ IMPORTANTE: Validação de Recebimento</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>As notas só podem ser bipadas na embalagem se já foram bipadas no setor de recebimento.</strong><br/>
                    Se uma NF não for aceita, verifique se ela foi processada primeiro no recebimento.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-900">2. Gerenciar Carros</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Crie novos carros clicando em "Novo Carro" e alterne entre eles conforme necessário. 
                    Cada carro pode ter destinos diferentes.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-gray-900">3. Embalar Carro</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Quando terminar a bipagem, clique em "Embalar Carro" para enviar 
                    para a seção "Carros Produzidos" onde você poderá finalizar o embalamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção: Status das NFs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Status das NFs</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <span className="font-medium">Verde - Válida:</span>
                    <span className="text-sm text-gray-600 ml-2">NF bipada com sucesso</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <span className="font-medium">Amarelo - Atenção:</span>
                    <span className="text-sm text-gray-600 ml-2">Destino divergente do lote</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <span className="font-medium">Vermelho - Erro:</span>
                    <span className="text-sm text-gray-600 ml-2">Código inválido ou duplicado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Atalhos */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">⌨️ Atalhos de Teclado</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">Bipar código:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Enter</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">Focar no campo de bipagem:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">Automático</code>
                </div>
              </div>
            </div>

            {/* Seção: Validação de Recebimento */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🔒 Validação de Recebimento</h3>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ Regra Obrigatória</h4>
                  <p className="text-sm text-red-700">
                    <strong>Todas as notas fiscais devem ser bipadas primeiro no setor de recebimento antes de serem processadas na embalagem.</strong>
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2">ℹ️ Como Funciona</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• O sistema verifica se a NF foi bipada no recebimento (sessões ativas)</li>
                    <li>• Também verifica se a NF está em relatórios finalizados</li>
                    <li>• Se não encontrar em nenhum lugar, a NF será rejeitada</li>
                    <li>• Esta validação garante o controle de qualidade do processo</li>
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2">✅ Fluxo Correto</h4>
                  <ol className="text-sm text-green-700 space-y-1">
                    <li>1. Bipar NF no setor de recebimento</li>
                    <li>2. Processar divergências se necessário</li>
                    <li>3. Finalizar relatório de recebimento</li>
                    <li>4. Bipar NF no setor de embalagem</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Seção: Fluxo dos Carros */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🚚 Fluxo dos Carros</h3>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2">📋 Gerenciar Carros</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Carros em bipagem (aguardando_colagem, liberado)</li>
                    <li>• Carros em conferência (em_conferencia)</li>
                    <li>• Carros disponíveis para edição</li>
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <h4 className="font-medium text-orange-800 mb-2">📦 Carros Produzidos</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Carros em embalagem (embalando)</li>
                    <li>• Carros finalizados (em_producao)</li>
                    <li>• Carros prontos para finalização</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Seção: Dicas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Dicas Importantes</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• O sistema mantém foco automático no campo de bipagem</li>
                <li>• Você pode trabalhar em dupla ou trio adicionando colaboradores no login</li>
                <li>• Filtre as NFs por status para visualizar apenas o que precisa</li>
                <li>• Carros em embalagem saem da seção "Gerenciar Carros"</li>
                <li>• Use o scanner para maior velocidade e precisão</li>
                <li>• <strong>Lembre-se: Sempre bipar primeiro no recebimento!</strong></li>
              </ul>
            </div>
              
            {/* Botão fechar */}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setAjudaVisivel(false)} className="bg-blue-600 hover:bg-blue-700">
                Fechar Ajuda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal do Chat */}
      <ChatModal isOpen={chatAberto} onClose={() => setChatAberto(false)} sessionData={sessionData} />

      <ConfirmacaoModal
        isOpen={modalConfirmacao}
        onClose={() => setModalConfirmacao(false)}
        nf={notaAtual}
        carroNome={notaAtual?.codigoDestino || ""}
        onConfirm={confirmarBipagem}
      />
    </div>
  )
}

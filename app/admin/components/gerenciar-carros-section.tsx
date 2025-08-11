"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Truck,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  Package,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Hash,
  Copy,
  Search,
  Filter,
  Send,
} from "lucide-react"

interface Carro {
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
  nfs: Array<{
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
  }>
  estimativaPallets: number
}

interface CarroLancamento {
  id: string
  nomeCarro?: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataFinalizacao: string
  nfs: Array<{
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
  }>
  status: "aguardando_lancamento" | "em_lancamento" | "lancado" | "erro_lancamento"
  estimativaPallets: number
  observacoes?: string
  dataLancamento?: string
  numeroLancamento?: string
  responsavelLancamento?: string
}

export default function GerenciarCarrosSection() {
  const [carros, setCarros] = useState<Carro[]>([])
  const [carrosLancamento, setCarrosLancamento] = useState<CarroLancamento[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [filtroBusca, setFiltroBusca] = useState("")
  const [carroSelecionado, setCarroSelecionado] = useState<Carro | null>(null)
  const [carroLancamentoSelecionado, setCarroLancamentoSelecionado] = useState<CarroLancamento | null>(null)
  const [modalDetalhes, setModalDetalhes] = useState(false)
  const [carroParaExcluir, setCarroParaExcluir] = useState<Carro | null>(null)
  
  // Estados para lançamento
  const [modalLancamento, setModalLancamento] = useState(false)
  const [observacoes, setObservacoes] = useState("")
  const [numeroLancamento, setNumeroLancamento] = useState("")
  const [processandoLancamento, setProcessandoLancamento] = useState(false)

  useEffect(() => {
    carregarCarros()
    carregarCarrosLancamento()
    // Polling para atualizações
    const interval = setInterval(() => {
      carregarCarros()
      carregarCarrosLancamento()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const carregarCarros = () => {
    const chaveCarros = "profarma_carros_embalagem"
    const carrosSalvos = localStorage.getItem(chaveCarros)

    if (carrosSalvos) {
      const carrosArray = JSON.parse(carrosSalvos)
      setCarros(carrosArray)
    }
  }

  const carregarCarrosLancamento = () => {
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosSalvos = localStorage.getItem(chaveCarrosLancamento)

    if (carrosSalvos) {
      const carrosArray = JSON.parse(carrosSalvos)
      setCarrosLancamento(carrosArray)
    }
  }

  const excluirCarro = (carro: Carro) => {
    const chaveCarros = "profarma_carros_embalagem"
    const carrosExistentes = localStorage.getItem(chaveCarros)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carrosFiltrados = carrosArray.filter((c: Carro) => c.id !== carro.id)
    localStorage.setItem(chaveCarros, JSON.stringify(carrosFiltrados))
    setCarros(carrosFiltrados)
    setCarroParaExcluir(null)
  }

  const iniciarLancamento = (carro: CarroLancamento) => {
    setCarroLancamentoSelecionado(carro)
    setObservacoes(carro.observacoes || "")
    setNumeroLancamento(carro.numeroLancamento || "")
    setModalLancamento(true)
  }

  const processarLancamento = async () => {
    if (!carroLancamentoSelecionado || !numeroLancamento.trim()) {
      alert("Número do lançamento é obrigatório!")
      return
    }

    setProcessandoLancamento(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Atualizar status do carro
    const carroAtualizado: CarroLancamento = {
      ...carroLancamentoSelecionado,
      status: "lancado",
      observacoes: observacoes.trim(),
      numeroLancamento: numeroLancamento.trim(),
      dataLancamento: new Date().toISOString(),
      responsavelLancamento: "Administrador",
    }

    // Salvar no localStorage
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosExistentes = localStorage.getItem(chaveCarrosLancamento)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: CarroLancamento) => c.id === carroLancamentoSelecionado.id)
    if (carroIndex !== -1) {
      carrosArray[carroIndex] = carroAtualizado
      localStorage.setItem(chaveCarrosLancamento, JSON.stringify(carrosArray))
      setCarrosLancamento(carrosArray)
    }

    setProcessandoLancamento(false)
    setModalLancamento(false)
    setCarroLancamentoSelecionado(null)
    setObservacoes("")
    setNumeroLancamento("")

    alert(`Lançamento realizado com sucesso!\nNúmero: ${numeroLancamento.trim()}`)
  }

  const alterarStatusCarro = (carroId: string, novoStatus: CarroLancamento["status"]) => {
    const chaveCarrosLancamento = "profarma_carros_lancamento"
    const carrosExistentes = localStorage.getItem(chaveCarrosLancamento)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: CarroLancamento) => c.id === carroId)
    if (carroIndex !== -1) {
      carrosArray[carroIndex].status = novoStatus
      localStorage.setItem(chaveCarrosLancamento, JSON.stringify(carrosArray))
      setCarrosLancamento(carrosArray)
    }
  }

  const getStatusIcon = (status: Carro["statusCarro"] | CarroLancamento["status"]) => {
    switch (status) {
      case "ativo":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "embalando":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "em_producao":
        return <Package className="h-4 w-4 text-purple-600" />
      case "finalizado":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "divergencia_lancamento":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "aguardando_lancamento":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "em_lancamento":
        return <AlertTriangle className="h-4 w-4 text-blue-600" />
      case "lancado":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "erro_lancamento":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: Carro["statusCarro"] | CarroLancamento["status"]) => {
    switch (status) {
      case "ativo":
        return "bg-blue-100 text-blue-800"
      case "embalando":
        return "bg-orange-100 text-orange-800"
      case "em_producao":
        return "bg-purple-100 text-purple-800"
      case "finalizado":
        return "bg-green-100 text-green-800"
      case "divergencia_lancamento":
        return "bg-red-100 text-red-800"
      case "aguardando_lancamento":
        return "bg-orange-100 text-orange-800"
      case "em_lancamento":
        return "bg-blue-100 text-blue-800"
      case "lancado":
        return "bg-green-100 text-green-800"
      case "erro_lancamento":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: Carro["statusCarro"] | CarroLancamento["status"]) => {
    switch (status) {
      case "ativo":
        return "Ativo"
      case "embalando":
        return "Embalando"
      case "em_producao":
        return "Em Produção"
      case "finalizado":
        return "Finalizado"
      case "divergencia_lancamento":
        return "Divergência"
      case "aguardando_lancamento":
        return "Aguardando Lançamento"
      case "em_lancamento":
        return "Em Lançamento"
      case "lancado":
        return "Lançado"
      case "erro_lancamento":
        return "Erro no Lançamento"
      default:
        return status
    }
  }

  const getTurnoLabel = (turno: string) => {
    switch (turno) {
      case "A":
        return "Manhã"
      case "B":
        return "Tarde"
      case "C":
        return "Noite"
      default:
        return turno
    }
  }

  const copiarNFsParaSAP = (nfs: Array<{ numeroNF: string }>) => {
    // Manter o formato original das NFs com zeros à esquerda
    const nfsTexto = nfs.map((nf) => nf.numeroNF.toString()).join("\n")

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(nfsTexto)
        .then(() => {
          alert(
            `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`,
          )
        })
        .catch(() => {
          const textArea = document.createElement("textarea")
          textArea.value = nfsTexto
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          alert(
            `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`,
          )
        })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = nfsTexto
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      alert(
        `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`,
      )
    }
  }

  const copiarVolumesParaSAP = (nfs: Array<{ volume: number }>) => {
    const volumesTexto = nfs.map((nf) => nf.volume.toString()).join("\n")

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(volumesTexto)
        .then(() => {
          alert(
            `${nfs.length} volumes copiados para a área de transferência!\n\nPronto para colar no SAP.`,
          )
        })
        .catch(() => {
          const textArea = document.createElement("textarea")
          textArea.value = volumesTexto
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
          alert(
            `${nfs.length} volumes copiados para a área de transferência!\n\nPronto para colar no SAP.`,
          )
        })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = volumesTexto
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      alert(
        `${nfs.length} volumes copiados para a área de transferência!\n\nPronto para colar no SAP.`,
      )
    }
  }

  const excluirNotaIndividual = (carroId: string, notaId: string) => {
    const chaveCarros = "profarma_carros_embalagem"
    const carrosExistentes = localStorage.getItem(chaveCarros)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: Carro) => c.id === carroId)
    if (carroIndex !== -1) {
      const carro = carrosArray[carroIndex]
      const notaRemovida = carro.nfs.find((nf: any) => nf.id === notaId)
      
      // Remover a nota
      carro.nfs = carro.nfs.filter((nf: any) => nf.id !== notaId)
      
      // Recalcular totais
      carro.quantidadeNFs = carro.nfs.length
      carro.totalVolumes = carro.nfs.reduce((sum: number, nf: any) => sum + nf.volume, 0)
      
      localStorage.setItem(chaveCarros, JSON.stringify(carrosArray))
      setCarros(carrosArray)
      
      alert(`Nota ${notaRemovida?.numeroNF} removida com sucesso!`)
    }
  }

  const alterarStatusCarroEmbalagem = (carroId: string, novoStatus: Carro["statusCarro"]) => {
    const chaveCarros = "profarma_carros_embalagem"
    const carrosExistentes = localStorage.getItem(chaveCarros)
    const carrosArray = carrosExistentes ? JSON.parse(carrosExistentes) : []

    const carroIndex = carrosArray.findIndex((c: Carro) => c.id === carroId)
    if (carroIndex !== -1) {
      carrosArray[carroIndex].statusCarro = novoStatus
      localStorage.setItem(chaveCarros, JSON.stringify(carrosArray))
      setCarros(carrosArray)
    }
  }

  // Combinar todos os carros para estatísticas
  const todosCarros = [...carros, ...carrosLancamento]
  
  // Filtrar carros
  const carrosFiltrados = carros.filter((carro) => {
    const matchStatus = filtroStatus === "todos" || carro.statusCarro === filtroStatus
    const matchBusca = filtroBusca === "" || 
      carro.nomeCarro.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      carro.colaboradores.some(col => col.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      carro.destinoFinal.toLowerCase().includes(filtroBusca.toLowerCase())
    
    return matchStatus && matchBusca
  })

  const carrosLancamentoFiltrados = carrosLancamento.filter((carro) => {
    const matchStatus = filtroStatus === "todos" || carro.status === filtroStatus
    const matchBusca = filtroBusca === "" || 
      (carro.nomeCarro && carro.nomeCarro.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      carro.colaboradores.some(col => col.toLowerCase().includes(filtroBusca.toLowerCase())) ||
      carro.destinoFinal.toLowerCase().includes(filtroBusca.toLowerCase())
    
    return matchStatus && matchBusca
  })

  const estatisticas = {
    total: todosCarros.length,
    ativos: carros.filter((c) => c.statusCarro === "ativo").length,
    embalando: carros.filter((c) => c.statusCarro === "embalando").length,
    divergencia: carros.filter((c) => c.statusCarro === "divergencia_lancamento").length,
    emProducao: carros.filter((c) => c.statusCarro === "em_producao").length,
    aguardandoLancamento: carrosLancamento.filter((c) => c.status === "aguardando_lancamento").length,
    emLancamento: carrosLancamento.filter((c) => c.status === "em_lancamento").length,
    lancados: carrosLancamento.filter((c) => c.status === "lancado").length,
    totalNFs: todosCarros.reduce((sum, c) => sum + c.quantidadeNFs, 0),
    totalVolumes: todosCarros.reduce((sum, c) => sum + c.totalVolumes, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-blue-600" />
            <span>Gerenciar Carros e Lançamentos - Área Administrativa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{estatisticas.ativos + estatisticas.embalando + estatisticas.emProducao}</div>
              <div className="text-sm text-gray-600">Em Andamento</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{estatisticas.aguardandoLancamento + estatisticas.emLancamento}</div>
              <div className="text-sm text-gray-600">Aguardando Lançamento</div>
            </div>
            <div className="text-center p-3 bg-teal-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">{estatisticas.lancados}</div>
              <div className="text-sm text-gray-600">Lançados</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{estatisticas.totalNFs}</div>
              <div className="text-sm text-gray-600">Total NFs</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por carro, colaborador ou destino..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativo">🟢 Ativos</SelectItem>
                  <SelectItem value="em_producao">🟣 Em Produção</SelectItem>
                  <SelectItem value="divergencia_lancamento">🟠 Divergência</SelectItem>
                  <SelectItem value="aguardando_lancamento">⏳ Aguardando Lançamento</SelectItem>
                  <SelectItem value="lancado">✅ Lançados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção: Carros em Andamento */}
      {carrosFiltrados.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Carros em Andamento ({carrosFiltrados.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {carrosFiltrados.map((carro) => (
                <Card key={carro.id} className="border-green-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-gray-900">
                          {carro.nomeCarro}
                        </span>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(carro.statusCarro)}`}>
                        {getStatusIcon(carro.statusCarro)}
                        <span className="ml-1">{getStatusLabel(carro.statusCarro)}</span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {carro.colaboradores.length === 1
                          ? carro.colaboradores[0]
                          : `${carro.colaboradores.join(" + ")} (Dupla)`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {carro.data} • Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Destino:</span>
                      <span>{carro.destinoFinal}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{carro.quantidadeNFs}</div>
                        <div className="text-xs text-gray-500">NFs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{carro.totalVolumes}</div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{carro.estimativaPallets}</div>
                        <div className="text-xs text-gray-500">Pallets</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Criado em: {new Date(carro.dataCriacao).toLocaleString("pt-BR")}
                    </div>

                    <div className="flex space-x-2 justify-center items-center">
                      {/* Select para Status */}
                      <div className="flex items-center space-x-2">
                        <Label className="text-xs font-medium">Status:</Label>
                        <Select 
                          value={carro.statusCarro} 
                          onValueChange={(value) => alterarStatusCarroEmbalagem(carro.id, value as Carro["statusCarro"])}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs text-left">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">🟢 Ativo</SelectItem>
                            <SelectItem value="em_producao">🟣 Em Produção</SelectItem>
                            <SelectItem value="divergencia_lancamento">🟠 Divergência</SelectItem>
                            <SelectItem value="finalizado">✅ Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCarroSelecionado(carro)}
                          >
                            <Eye className="h-4 w-4" />
                          Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-5 w-5 text-green-600" />
                              <span>
                                Detalhes do {carro.nomeCarro} - {carro.colaboradores.join(" + ")}
                              </span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="text-sm text-gray-600">Status</div>
                                <Badge className={`${getStatusColor(carro.statusCarro)}`}>
                                  {getStatusLabel(carro.statusCarro)}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Data</div>
                                <div className="font-medium">{carro.data}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Destino</div>
                                <div className="font-medium">{carro.destinoFinal}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Criado</div>
                                <div className="font-medium text-xs">
                                  {new Date(carro.dataCriacao).toLocaleString("pt-BR")}
                                </div>
                              </div>
                            </div>

                            <ScrollArea className="h-96">
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-medium text-gray-700">
                                  <div>NF</div>
                                  <div>Código</div>
                                  <div>Fornecedor</div>
                                  <div>Destino</div>
                                  <div>Volume</div>
                                  <div>Status</div>
                                  <div>Ações</div>
                                </div>
                                {carro.nfs.map((nf, index) => (
                                  <div
                                    key={nf.id}
                                    className={`px-4 py-2 grid grid-cols-7 gap-4 text-sm ${
                                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }`}
                                  >
                                    <div className="font-medium">{nf.numeroNF}</div>
                                    <div className="font-mono text-xs">{nf.codigo}</div>
                                    <div className="truncate" title={nf.fornecedor}>
                                      {nf.fornecedor}
                                    </div>
                                    <div className="text-xs">{nf.destinoFinal}</div>
                                    <div className="text-center">{nf.volume}</div>
                                    <div className="text-xs">
                                      <Badge variant={nf.status === "valida" ? "default" : "destructive"}>
                                        {nf.status}
                                      </Badge>
                                    </div>
                                    <div className="flex space-x-1">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar Exclusão da Nota</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir a nota {nf.numeroNF}?
                                              <br />
                                              <br />
                                              <strong>Atenção:</strong> Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => excluirNotaIndividual(carro.id, nf.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Excluir Nota
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                                <div className="bg-green-50 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-bold text-green-800">
                                  <div className="col-span-5">Total do Carro:</div>
                                  <div className="text-center">{carro.totalVolumes}</div>
                                  <div></div>
                                </div>
                              </div>
                            </ScrollArea>

                            {/* Botões de Ação */}
                            <div className="flex space-x-2 pt-4 border-t">
                              <Button
                                onClick={() => copiarNFsParaSAP(carro.nfs)}
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar NFs
                              </Button>
                              <Button
                                onClick={() => copiarVolumesParaSAP(carro.nfs)}
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Volumes
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        onClick={() => copiarNFsParaSAP(carro.nfs)}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar NFs
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setCarroParaExcluir(carro)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o carro "{carroParaExcluir?.nomeCarro}"?
                              <br />
                              <br />
                              <strong>Atenção:</strong> Esta ação não pode ser desfeita e todos os dados do carro serão perdidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => carroParaExcluir && excluirCarro(carroParaExcluir)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir Carro
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção: Carros para Lançamento */}
      {carrosLancamentoFiltrados.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span>Carros para Lançamento ({carrosLancamentoFiltrados.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {carrosLancamentoFiltrados.map((carro) => (
                <Card key={carro.id} className="border-purple-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">
                          {carro.nomeCarro && `${carro.nomeCarro} - `}
                          {carro.colaboradores.length === 1
                            ? carro.colaboradores[0]
                            : `${carro.colaboradores.join(" + ")} (Dupla)`}
                        </span>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(carro.status)}`}>
                        {getStatusIcon(carro.status)}
                        <span className="ml-1">{getStatusLabel(carro.status)}</span>
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {carro.data} • Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Destino:</span>
                      <span>{carro.destinoFinal}</span>
                    </div>

                    {carro.numeroLancamento && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">Lançamento:</span>
                        <span className="font-mono">{carro.numeroLancamento}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{carro.quantidadeNFs}</div>
                        <div className="text-xs text-gray-500">NFs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{carro.totalVolumes}</div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{carro.estimativaPallets}</div>
                        <div className="text-xs text-gray-500">Pallets</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Finalizado em: {new Date(carro.dataFinalizacao).toLocaleString("pt-BR")}
                    </div>

                    <div className="flex space-x-2">
                      {carro.status === "aguardando_lancamento" && (
                        <Button
                          onClick={() => iniciarLancamento(carro)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          size="sm"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Fazer Lançamento
                        </Button>
                      )}

                      {carro.status === "em_lancamento" && (
                        <div className="flex space-x-2 w-full">
                          <Button onClick={() => iniciarLancamento(carro)} variant="outline" className="flex-1" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Continuar
                          </Button>
                          <Button
                            onClick={() => alterarStatusCarro(carro.id, "aguardando_lancamento")}
                            variant="outline"
                            size="sm"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver NFs
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-5 w-5 text-purple-600" />
                              <span>
                                NFs do {carro.nomeCarro || "Carro"} - {carro.colaboradores.join(" + ")}
                              </span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="text-sm text-gray-600">Status</div>
                                <Badge className={`${getStatusColor(carro.status)}`}>{getStatusLabel(carro.status)}</Badge>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Data</div>
                                <div className="font-medium">{carro.data}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Destino</div>
                                <div className="font-medium">{carro.destinoFinal}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Finalizado</div>
                                <div className="font-medium text-xs">
                                  {new Date(carro.dataFinalizacao).toLocaleString("pt-BR")}
                                </div>
                              </div>
                            </div>

                            <ScrollArea className="h-96">
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                                  <div>NF</div>
                                  <div>Código</div>
                                  <div>Fornecedor</div>
                                  <div>Destino</div>
                                  <div>Volume</div>
                                  <div>Tipo</div>
                                </div>
                                {carro.nfs.map((nf, index) => (
                                  <div
                                    key={nf.id}
                                    className={`px-4 py-2 grid grid-cols-6 gap-4 text-sm ${
                                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }`}
                                  >
                                    <div className="font-medium">{nf.numeroNF}</div>
                                    <div className="font-mono text-xs">{nf.codigo}</div>
                                    <div className="truncate" title={nf.fornecedor}>
                                      {nf.fornecedor}
                                    </div>
                                    <div className="text-xs">{nf.destinoFinal}</div>
                                    <div className="text-center">{nf.volume}</div>
                                    <div className="text-xs">{nf.tipo}</div>
                                  </div>
                                ))}
                                <div className="bg-purple-50 px-4 py-2 grid grid-cols-6 gap-4 text-sm font-bold text-purple-800">
                                  <div className="col-span-4">Total do Carro:</div>
                                  <div className="text-center">{carro.totalVolumes}</div>
                                  <div></div>
                                </div>
                              </div>
                            </ScrollArea>

                            {/* Botões de Ação */}
                            <div className="flex space-x-2 pt-4 border-t">
                              <Button
                                onClick={() => copiarNFsParaSAP(carro.nfs)}
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar NFs
                              </Button>
                              <Button
                                onClick={() => copiarVolumesParaSAP(carro.nfs)}
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Volumes
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        onClick={() => copiarNFsParaSAP(carro.nfs)}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar NFs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há carros */}
      {carrosFiltrados.length === 0 && carrosLancamentoFiltrados.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="text-center py-8 text-gray-500">
            {todosCarros.length === 0
              ? "Nenhum carro criado ainda."
              : "Nenhum carro encontrado com os filtros selecionados."}
          </CardContent>
        </Card>
      )}

      {/* Modal de Lançamento */}
      <Dialog open={modalLancamento} onOpenChange={setModalLancamento}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-purple-600" />
              <span>
                Fazer Lançamento - {carroLancamentoSelecionado?.nomeCarro || "Carro"} (
                {carroLancamentoSelecionado?.colaboradores.join(" + ")})
              </span>
            </DialogTitle>
          </DialogHeader>

          {carroLancamentoSelecionado && (
            <div className="space-y-6">
              {/* Resumo do Carro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Data</div>
                  <div className="font-medium">{carroLancamentoSelecionado.data}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Turno</div>
                  <div className="font-medium">
                    {carroLancamentoSelecionado.turno} - {getTurnoLabel(carroLancamentoSelecionado.turno)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">NFs</div>
                  <div className="font-medium">{carroLancamentoSelecionado.quantidadeNFs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Volumes</div>
                  <div className="font-medium">{carroLancamentoSelecionado.totalVolumes}</div>
                </div>
              </div>

              {/* Campos do Lançamento */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="numeroLancamento">Número do Lançamento *</Label>
                  <Input
                    id="numeroLancamento"
                    placeholder="Ex: LAN-2024-001234"
                    value={numeroLancamento}
                    onChange={(e) => setNumeroLancamento(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações sobre o lançamento (opcional)..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-4">
                <Button
                  onClick={processarLancamento}
                  disabled={!numeroLancamento.trim() || processandoLancamento}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {processandoLancamento ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar Lançamento
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setModalLancamento(false)} disabled={processandoLancamento}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 
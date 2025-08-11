"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { FileText, Search, CalendarIcon, Eye, Package, CheckCircle, AlertTriangle, Filter, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRelatorios } from "@/hooks/use-database"
import type { NotaFiscal, Relatorio } from "@/lib/database-service"

interface RelatoriosModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RelatoriosModal({ isOpen, onClose }: RelatoriosModalProps) {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<Relatorio[]>([])
  const [filtroTexto, setFiltroTexto] = useState("")
  const [dataFiltro, setDataFiltro] = useState<Date>()
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Hook do banco de dados
  const { getRelatoriosRecebimento } = useRelatorios()

  useEffect(() => {
    if (isOpen) {
      // Usar setTimeout para não bloquear a renderização inicial do modal
      const timer = setTimeout(() => {
        carregarRelatorios()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    // Debounce para evitar re-renderizações excessivas
    const timer = setTimeout(() => {
      aplicarFiltros()
    }, 150)
    return () => clearTimeout(timer)
  }, [relatorios, filtroTexto, dataFiltro])

  const carregarRelatorios = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (carregando) return
    
    setCarregando(true)
    setErro(null)

    // 1) Carregar imediatamente do localStorage (síncrono, sem await)
    try {
      const locais: Relatorio[] = (() => {
        const local1 = localStorage.getItem('relatorios_local')
        const local2 = localStorage.getItem('relatorios_custos')
        const arr1: Relatorio[] = local1 ? JSON.parse(local1) : []
        const arr2: Relatorio[] = local2 ? JSON.parse(local2) : []
        const merged = [...arr1, ...arr2]
        const uniqueById = Array.from(new Map(merged.map((r) => [r.id, r])).values()) as Relatorio[]
        const recebimento = uniqueById.filter((rel) => rel.area === 'recebimento')
        
        if (recebimento.length > 0) {
          setRelatorios(recebimento)
          setCarregando(false) // Liberar UI imediatamente
        }
        return recebimento
      })()
    } catch (e) {
      console.warn('⚠️ Erro ao carregar dados locais:', e)
    }

    // 2) Atualizar do banco em background (não bloquear UI)
    setTimeout(async () => {
      try {
        console.log('🔍 Atualizando relatórios do banco...')
        const timeoutMs = 5000 // Reduzido para 5s
        const timeoutPromise = new Promise<Relatorio[]>((_, reject) =>
          setTimeout(() => reject(new Error('timeout_db_relatorios')), timeoutMs)
        )
        
        const todosRelatorios = await Promise.race([getRelatoriosRecebimento(), timeoutPromise])
        const relatoriosRecebimento = todosRelatorios as Relatorio[]
        
        console.log('✅ Relatórios atualizados:', relatoriosRecebimento.length)
        setRelatorios(relatoriosRecebimento)
      } catch (error: any) {
        console.error('❌ Erro ao atualizar do banco:', error)
        if (error?.message !== 'timeout_db_relatorios') {
          setErro('Erro ao atualizar relatórios')
        }
      } finally {
        setCarregando(false)
      }
    }, 50) // Pequeno delay para não bloquear renderização
  }, [carregando, getRelatoriosRecebimento])

  const aplicarFiltros = () => {
    // Usar useMemo seria melhor, mas mantendo compatibilidade
    let relatoriosFiltrados = [...relatorios]

    // Filtro por texto (otimizado)
    if (filtroTexto.trim()) {
      const termo = filtroTexto.toLowerCase().trim()
      relatoriosFiltrados = relatoriosFiltrados.filter((rel) => {
        const nomeMatch = rel.nome.toLowerCase().includes(termo)
        const colabMatch = Array.isArray(rel.colaboradores) && 
          rel.colaboradores.some(colab => colab.toLowerCase().includes(termo))
        return nomeMatch || colabMatch
      })
    }

    // Filtro por data
    if (dataFiltro) {
      const dataFormatada = format(dataFiltro, "dd/MM/yyyy")
      relatoriosFiltrados = relatoriosFiltrados.filter((rel) => rel.data === dataFormatada)
    }

    // Ordenar (otimizado - evitar recálculos desnecessários)
    if (relatoriosFiltrados.length > 1) {
      relatoriosFiltrados.sort((a, b) => {
        const timeA = new Date(a.dataFinalizacao).getTime()
        const timeB = new Date(b.dataFinalizacao).getTime()
        return timeB - timeA
      })
    }

    setRelatoriosFiltrados(relatoriosFiltrados)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lancado":
        return "bg-green-100 text-green-800"
      case "em_lancamento":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-orange-100 text-orange-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "lancado":
        return "Lançado"
      case "em_lancamento":
        return "Em Lançamento"
      default:
        return "Finalizado"
    }
  }

  return (
    <>
      <Dialog open={isOpen && !relatorioSelecionado} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Relatórios de Recebimento</span>
              {carregando && relatoriosFiltrados.length > 0 && (
                <span className="ml-2 inline-flex items-center text-xs text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Atualizando...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-700">Filtros de Busca</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 text-sm">Buscar por nome ou colaboradores</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome da transportadora ou colaboradores..."
                      value={filtroTexto}
                      onChange={(e) => setFiltroTexto(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 text-sm">Filtrar por data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFiltro ? format(dataFiltro, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dataFiltro} onSelect={setDataFiltro} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    setFiltroTexto("")
                    setDataFiltro(undefined)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Limpar Filtros
                </Button>
                <Button
                  onClick={carregarRelatorios}
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center"
                  disabled={carregando}
                >
                  <Loader2 className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
                  Recarregar
                </Button>
                <div className="text-sm text-gray-600">
                  Mostrando {relatoriosFiltrados.length} de {relatorios.length} relatórios
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
              <Card className="border-blue-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{relatorios.length}</div>
                  <div className="text-xs text-gray-600 leading-tight">Total Relatórios</div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                    {relatorios.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
                  </div>
                  <div className="text-xs text-gray-600 leading-tight">Total Notas</div>
                </CardContent>
              </Card>
              <Card className="border-purple-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                    {relatorios.reduce((sum, rel) => sum + (rel.somaVolumes || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-600 leading-tight">Total Volumes</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                    {relatorios.reduce(
                      (sum, rel) => sum + rel.notas.filter((n) => n.status === "divergencia").length,
                      0,
                    )}
                  </div>
                  <div className="text-xs text-gray-600 leading-tight">Divergências</div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Relatórios */}
            <ScrollArea className="h-96">
              {carregando && relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <p className="text-gray-500 mt-2">Carregando relatórios...</p>
                </div>
              ) : erro ? (
                <div className="text-center py-8 text-red-500">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-300" />
                  <h3 className="text-lg font-medium mb-2">Erro ao carregar relatórios</h3>
                  <p>{erro}</p>
                </div>
              ) : relatoriosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
                  <p>Tente ajustar os filtros de busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {relatoriosFiltrados.map((relatorio) => (
                    <Card key={relatorio.id} className="border-blue-200 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-gray-900 text-sm">{relatorio.nome}</span>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(relatorio.status)}`}>
                            {getStatusLabel(relatorio.status)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 text-xs">Colaboradores</div>
                            <div className="font-medium">{Array.isArray(relatorio.colaboradores) ? relatorio.colaboradores.join(', ') : relatorio.colaboradores as any}</div>
                          </div>
                          <div>
                            <div className="text-gray-600 text-xs">Data/Turno</div>
                            <div className="font-medium">
                              {relatorio.data} - {relatorio.turno}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 py-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{relatorio.quantidadeNotas}</div>
                            <div className="text-xs text-gray-500">Notas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {relatorio.somaVolumes || 0}
                            </div>
                            <div className="text-xs text-gray-500">Volumes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {relatorio.notas.filter((n) => n.status === "divergencia").length}
                            </div>
                            <div className="text-xs text-gray-500">Divergências</div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Finalizado em: {new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}
                        </div>

                        <Button
                          onClick={() => setRelatorioSelecionado(relatorio)}
                          variant="outline"
                          className="w-full bg-transparent"
                          size="sm"
                        >
                          <Eye className="h-3 w-3" />
                          Ver Detalhes
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Relatório */}
      {relatorioSelecionado && (
        <Dialog open={!!relatorioSelecionado} onOpenChange={() => setRelatorioSelecionado(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span>{relatorioSelecionado.nome} - Detalhes</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Resumo do Relatório */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Transportadora</div>
                  <div className="font-medium">{relatorioSelecionado.nome}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">colaboradores</div>
                  <div className="font-medium">{relatorioSelecionado.colaboradores}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Data/Turno</div>
                  <div className="font-medium">
                    {relatorioSelecionado.data} - {relatorioSelecionado.turno}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={getStatusColor(relatorioSelecionado.status)}>
                    {getStatusLabel(relatorioSelecionado.status)}
                  </Badge>
                </div>
              </div>

              {/* Tabela de Notas */}
              <ScrollArea className="h-96">
  <div className="border rounded-lg overflow-x-auto">
    <div className="min-w-max">
      <div className="bg-gray-50 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-medium text-gray-700">
        <div>NF</div>
        <div>Volumes</div>
        <div>Destino</div>
        <div>Fornecedor</div>
        <div>Cliente</div>
        <div>Status</div>
        <div>Divergência</div>
      </div>
      {relatorioSelecionado.notas.map((nota, index) => (
        <div
          key={nota.id}
          className={`px-4 py-2 grid grid-cols-7 gap-4 text-sm ${
            index % 2 === 0 ? "bg-white" : "bg-gray-50"
          }`}
        >
          <div className="font-medium">{nota.numeroNF}</div>
          <div className="font-mono">
            {nota.divergencia?.volumesInformados || nota.volumes}
            {nota.divergencia?.volumesInformados !== nota.volumes && (
              <span className="text-orange-600 text-xs ml-1">(era {nota.volumes})</span>
            )}
          </div>
          <div className="text-xs">{nota.destino}</div>
          <div className="text-xs truncate" title={nota.fornecedor}>{nota.fornecedor}</div>
          <div className="text-xs truncate" title={nota.clienteDestino}>{nota.clienteDestino}</div>
          <div className="flex items-center">
            {nota.status === "ok" ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="text-xs">OK</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="text-xs">Div.</span>
              </div>
            )}
          </div>
          <div className="text-xs">
            {nota.divergencia && (
              <span
                className="text-orange-600"
                title={nota.divergencia ? `${nota.divergencia.volumesInformados} vol. - ${nota.divergencia.observacoes}` : ''}
              >
                {nota.divergencia ? `${nota.divergencia.volumesInformados} vol. - ${nota.divergencia.observacoes}` : ''}
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="bg-blue-50 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-bold text-blue-800">
        <div className="col-span-4">Total:</div>
        <div className="text-center">
          {relatorioSelecionado.notas.reduce(
            (sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes),
            0,
          )}
        </div>
        <div className="col-span-2"></div>
      </div>
    </div>
  </div>
</ScrollArea>

              <div className="flex justify-end">
                <Button onClick={() => setRelatorioSelecionado(null)} variant="outline">
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

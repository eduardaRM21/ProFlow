"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Package,
  LogOut,
  Camera,
  CameraOff,
  Scan,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Eye,
} from "lucide-react"
import BarcodeScanner from "./components/barcode-scanner"
import ConfirmacaoModal from "./components/confirmacao-modal"
import DivergenciaModal from "./components/divergencia-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import RelatoriosModal from "./components/relatorios-modal"
import { useSession, useRecebimento, useRelatorios, useConnectivity } from "@/hooks/use-database"
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring"
import { useNotasBipadas } from "@/lib/notas-bipadas-service"
import type { SessionData, NotaFiscal, Relatorio } from "@/lib/database-service"
import { LocalAuthService } from "@/lib/local-auth-service"

const TIPOS_DIVERGENCIA = [
  { codigo: "0063", descricao: "Avaria transportadora" },
  { codigo: "0065", descricao: "Defeito de fabricação" },
  { codigo: "0068", descricao: "Falta transportadora" },
  { codigo: "0083", descricao: "Falta fornecedor" },
  { codigo: "0084", descricao: "Valid. próxima/venc." },
  { codigo: "A84", descricao: "Vencidos filial" },
  { codigo: "M80", descricao: "Devolução fornecedor" },
  { codigo: "M90", descricao: "Bloqueio controlados" },
  { codigo: "M84", descricao: "Vencidos filial" },
  { codigo: "0000", descricao: "Sem divergência" },
  { codigo: "M86", descricao: "Avaria / falta transferência" },
  { codigo: "0001", descricao: "Sobra" },
  { codigo: "L062", descricao: "Falta/Avaria" },
  { codigo: "L063", descricao: "Avaria Locafarma" },
  { codigo: "L068", descricao: "Falta Locafarma" },
]

export default function RecebimentoPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [codigoInput, setCodigoInput] = useState("")
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [modalDivergencia, setModalDivergencia] = useState(false)
  const [notaAtual, setNotaAtual] = useState<NotaFiscal | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Hooks do banco de dados
  const { getSession } = useSession()
  const { saveRelatorio, getRelatorios } = useRelatorios()
  const { isFullyConnected } = useConnectivity()
  const { addRealtimeEvent } = useRealtimeMonitoring()
  const notasBipadasService = useNotasBipadas()

  // Estados para o modal de finalização
  const [modalFinalizacao, setModalFinalizacao] = useState(false)
  const [nomeTransportadora, setNomeTransportadora] = useState("")
  const [modalRelatorios, setModalRelatorios] = useState(false)

  // Lógica de sessão e carregamento inicial
  useEffect(() => {
    const verificarSessao = async () => {
      try {
        const session = await getSession("current")
        if (!session || session.area !== "recebimento") {
          router.push("/")
          return
        }
        setSessionData(session)
      } catch (error) {
        console.error("Erro ao verificar sessão:", error)
        router.push("/")
      }
    }
    verificarSessao()
  }, [router, getSession])
  
  // O hook `useRecebimento` deve ser chamado após `sessionData` ser definido.
  const chaveNotas = sessionData
    ? `recebimento_${sessionData.colaboradores.join('_')}_${sessionData.data}_${sessionData.turno}`
    : ''
  const { notas, saveNotas, clearNotas } = useRecebimento(chaveNotas)

  const validarCodigo = async (codigo: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> => {
    const partes = codigo.split("|")
    if (partes.length !== 7) {
      return { valido: false, erro: `Código deve ter 7 partes. Encontradas: ${partes.length}` }
    }
    const [data, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes
    const volumes = parseInt(volumesStr, 10)

    if (isNaN(volumes) || volumes <= 0) {
      return { valido: false, erro: `Volumes deve ser um número válido maior que 0. Recebido: "${volumesStr}"` }
    }

    if (notas.find((nota) => nota.numeroNF === numeroNF)) {
      return { valido: false, erro: `NF ${numeroNF} já foi bipada nesta sessão.` }
    }

    // Acessar relatórios diretamente do `useRelatorios`
    const relatoriosExistentes = await getRelatorios() as Relatorio[]
    const relatorioComNota = relatoriosExistentes.find((rel) => rel.notas.some((nota) => nota.numeroNF === numeroNF))

    if (relatorioComNota) {
      return {
        valido: false,
        erro: `NF ${numeroNF} já utilizada no relatório "${relatorioComNota.nome}" por ${relatorioComNota.colaboradores.join(", ")}`,
      }
    }

    const nota: NotaFiscal = {
      id: `${Date.now()}-${numeroNF}`,
      codigoCompleto: codigo,
      data,
      numeroNF,
      volumes,
      destino,
      fornecedor,
      clienteDestino,
      tipoCarga,
      timestamp: new Date().toISOString(),
      status: "ok",
    }
    return { valido: true, nota }
  }

  const handleBipagem = async () => {
    if (!codigoInput.trim()) return

    const resultado = await validarCodigo(codigoInput.trim())

    if (resultado.valido && resultado.nota) {
      setNotaAtual(resultado.nota)
      setModalConfirmacao(true)
      setCodigoInput("")
    } else {
      alert(`Erro na bipagem: ${resultado.erro}`)
      setCodigoInput("")
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleCodigoEscaneado = async (codigo: string) => {
    setCodigoInput(codigo)
    setScannerAtivo(false)
    const resultado = await validarCodigo(codigo.trim())

    if (resultado.valido && resultado.nota) {
      setNotaAtual(resultado.nota)
      setModalConfirmacao(true)
      setCodigoInput("")
    } else {
      alert(`Erro na bipagem: ${resultado.erro}`)
      setCodigoInput("")
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const confirmarNota = async () => {
    if (!notaAtual) return
    
    // Salvar nota bipada na tabela centralizada
    try {
      const notaBipada = {
        numero_nf: notaAtual.numeroNF,
        codigo_completo: notaAtual.codigoCompleto,
        area_origem: 'recebimento' as const,
        session_id: `recebimento_${sessionData?.data}_${sessionData?.turno}`,
        colaboradores: sessionData?.colaboradores || [],
        data: sessionData?.data || new Date().toISOString().split('T')[0],
        turno: sessionData?.turno || '',
        volumes: notaAtual.volumes,
        destino: notaAtual.destinoFinal,
        fornecedor: notaAtual.fornecedor,
        cliente_destino: notaAtual.destinoFinal,
        tipo_carga: notaAtual.tipo,
        status: 'bipada',
        observacoes: 'NF recebida no setor de Recebimento'
      };

      await notasBipadasService.salvarNotaBipada(notaBipada);
      console.log('✅ Nota bipada salva na tabela centralizada');
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada na tabela centralizada:', error);
      // Continuar com o processo mesmo se falhar ao salvar na tabela centralizada
    }
    
    const notasAtualizadas = [notaAtual, ...notas]
    saveNotas(chaveNotas, notasAtualizadas)
    
    // Disparar evento em tempo real
    addRealtimeEvent({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sector: 'recebimento',
      type: 'nf_scanned',
      message: `NF ${notaAtual.numeroNF} recebida`,
      data: { numeroNF: notaAtual.numeroNF, fornecedor: notaAtual.fornecedor, volumes: notaAtual.volumes }
    });
    
    setModalConfirmacao(false)
    setNotaAtual(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const abrirDivergencia = () => {
    setModalConfirmacao(false)
    setModalDivergencia(true)
  }

  const confirmarDivergencia = async (tipoDivergencia: string, volumesInformados: number) => {
    if (!notaAtual) return
    const tipoObj = TIPOS_DIVERGENCIA.find((t) => t.codigo === tipoDivergencia)
    const notaComDivergencia: NotaFiscal = {
      ...notaAtual,
      status: "divergencia",
      divergencia: {
        observacoes: `${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`,
        volumesInformados,
      },
    }
    
    // Salvar nota bipada na tabela centralizada
    try {
      const notaBipada = {
        numero_nf: notaAtual.numeroNF,
        codigo_completo: notaAtual.codigoCompleto,
        area_origem: 'recebimento' as const,
        session_id: `recebimento_${sessionData?.data}_${sessionData?.turno}`,
        colaboradores: sessionData?.colaboradores || [],
        data: sessionData?.data || new Date().toISOString().split('T')[0],
        turno: sessionData?.turno || '',
        volumes: notaAtual.volumes,
        destino: notaAtual.destinoFinal,
        fornecedor: notaAtual.fornecedor,
        cliente_destino: notaAtual.destinoFinal,
        tipo_carga: notaAtual.tipo,
        status: 'divergencia',
        observacoes: `NF recebida com divergência: ${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`
      };

      await notasBipadasService.salvarNotaBipada(notaBipada);
      console.log('✅ Nota bipada com divergência salva na tabela centralizada');
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada com divergência na tabela centralizada:', error);
      // Continuar com o processo mesmo se falhar ao salvar na tabela centralizada
    }
    
    const notasAtualizadas = [notaComDivergencia, ...notas]
    saveNotas(chaveNotas, notasAtualizadas)
    
    // Disparar evento em tempo real
    addRealtimeEvent({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sector: 'recebimento',
      type: 'nf_scanned',
      message: `NF ${notaAtual.numeroNF} recebida com divergência`,
      data: { numeroNF: notaAtual.numeroNF, fornecedor: notaAtual.fornecedor, volumes: notaAtual.volumes, divergencia: tipoDivergencia }
    });
    
    setModalDivergencia(false)
    setNotaAtual(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const finalizarRelatorio = () => {
    if (notas.length === 0) {
      alert("Não há notas para finalizar o relatório!")
      return
    }
    setModalFinalizacao(true)
  }

  const confirmarFinalizacao = async () => {
    if (!nomeTransportadora.trim()) {
      alert("Nome da transportadora é obrigatório!")
      return
    }
    if (!sessionData) {
      alert("Erro de sessão. Faça o login novamente.")
      return
    }

    try {
      const somaVolumes = notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)
      const relatorio: Relatorio = {
        id: `REL_${Date.now()}`,
        nome: nomeTransportadora.trim(),
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        area: "recebimento",
        quantidadeNotas: notas.length,
        somaVolumes: somaVolumes,
        notas: notas,
        dataFinalizacao: new Date().toISOString(),
        status: "finalizado",
      }

      await saveRelatorio(relatorio)
      console.log('✅ Relatório processado (db/local)')
      
      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'recebimento',
        type: 'relatorio_finalized',
        message: `Relatório finalizado para ${nomeTransportadora.trim()}`,
        data: { transportadora: nomeTransportadora.trim(), quantidadeNotas: notas.length, somaVolumes }
      });
      
      alert(`Relatório "${nomeTransportadora.trim()}" finalizado com sucesso!`)

      await clearNotas(chaveNotas)
      setModalFinalizacao(false)
      setNomeTransportadora("")
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      alert('Erro ao salvar relatório. Tente novamente.')
    }
  }

  const handleLogout = () => {
    LocalAuthService.logout()
    router.push("/")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBipagem()
    }
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">Recebimento</h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block">Sistema de Recebimento de Notas Fiscais</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 sm:flex-none">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="font-medium truncate text-xs sm:text-sm">{sessionData.colaboradores}</span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{sessionData.data}</span>
                  </div>
                  <Badge className="text-xs bg-blue-100 text-blue-800">Turno {sessionData.turno}</Badge>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent hover:bg-blue-50 border-blue-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Indicadores de Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          
          
          {/* Total de Notas */}
          <Card className="border-blue-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{notas.length}</div>
              <div className="text-xs text-gray-600 leading-tight">Total de Notas</div>
            </CardContent>
          </Card>
          
          {/* Notas OK */}
          <Card className="border-green-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{notas.filter((n) => n.status === "ok").length}</div>
              <div className="text-xs text-gray-600 leading-tight">Notas OK</div>
            </CardContent>
          </Card>
          
          {/* Com Divergência */}
          <Card className="border-orange-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {notas.filter((n) => n.status === "divergencia").length}
              </div>
              <div className="text-xs text-gray-600 leading-tight">Com Divergência</div>
            </CardContent>
          </Card>
        {/* Total de Volumes */}
        <Card className="border-blue-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)}</div>
              <div className="text-xs text-gray-600 leading-tight">Total de Volumes</div>
            </CardContent>
          </Card>

        </div>

        {/* Campo de bipagem */}
        <Card className="border-blue-200 mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Scan className="h-5 w-5 text-blue-600" />
              <span>Bipar Código de Barras</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scannerAtivo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Scanner de Código de Barras</h3>
                  <Button
                    variant="outline"
                    onClick={() => setScannerAtivo(false)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <CameraOff className="h-4 w-4 mr-2" />
                    Fechar Scanner
                  </Button>
                </div>
                <BarcodeScanner
                  onScan={handleCodigoEscaneado}
                  onError={(error) => {
                    console.error("Erro no scanner:", error)
                    alert("Erro ao acessar a câmera. Verifique as permissões.")
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Digite ou escaneie o código (formato: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga)"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="text-base h-12 font-mono"
                    />
                  </div>
                  <Button onClick={() => setScannerAtivo(true)} className="h-12 px-4 bg-blue-600 hover:bg-blue-700">
                    <Camera className="h-4 w-4 mr-2" />
                    Scanner
                  </Button>
                  <Button
                    onClick={handleBipagem}
                    disabled={!codigoInput.trim()}
                    className="h-12 px-6 bg-green-600 hover:bg-green-700"
                  >
                    Bipar
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Formato: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão Finalizar */}
        <div className="mb-5 flex flex-col sm:flex-row space-x-0 sm:space-x-4">
          <Button
            onClick={finalizarRelatorio}
            disabled={notas.length === 0}
            className="mb-3 bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            <FileText className="h-6 w-6 " />
            Finalizar Relatório ({notas.length} notas)
          </Button>

          <Button
            onClick={() => setModalRelatorios(true)}
            variant="outline"
            className="mb-3 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            size="sm"
          >
            <Eye className="h-6 w-6 " />
            Ver Relatórios Liberados
          </Button>
        </div>

        {/* Lista de notas */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Notas Bipadas</CardTitle>
          </CardHeader>
          <CardContent>
            {notas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma nota bipada ainda. Use o campo acima para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {notas.map((nota) => (
                  <div
                    key={nota.id}
                    className={`p-4 border-l-4 rounded-r-lg ${
                      nota.status === "ok" ? "border-l-green-500 bg-green-50" : "border-l-orange-500 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {nota.status === "ok" ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="font-semibold text-gray-900">NF: {nota.numeroNF}</div>
                            <Badge variant="outline" className="bg-white">
                              Vol: {nota.divergencia?.volumesInformados || nota.volumes}
                            </Badge>
                            <Badge variant="outline" className="bg-white">
                              {nota.destino}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <strong>Fornecedor:</strong> {nota.fornecedor} | <strong>Cliente:</strong>{" "}
                              {nota.clienteDestino}
                            </div>
                            <div>
                              <strong>Tipo:</strong> {nota.tipoCarga} | <strong>Data:</strong> {nota.data}
                            </div>
                            {nota.divergencia && (
                              <div className="text-orange-600 font-medium">
                                🔸 {nota.divergencia.observacoes}
                                {nota.divergencia.volumesInformados !== nota.volumes && (
                                  <span>
                                    {" "}
                                    (Volumes alterados: {nota.volumes} → {nota.divergencia.volumesInformados})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(nota.timestamp).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modais */}
      {notaAtual && (
        <>
          <ConfirmacaoModal
            isOpen={modalConfirmacao}
            nota={notaAtual}
            onConfirmar={confirmarNota}
            onAlterar={abrirDivergencia}
            onClose={() => {
              setModalConfirmacao(false)
              setNotaAtual(null)
            }}
          />
          <DivergenciaModal
            isOpen={modalDivergencia}
            nota={notaAtual}
            tiposDivergencia={TIPOS_DIVERGENCIA}
            onConfirmar={confirmarDivergencia}
            onClose={() => {
              setModalDivergencia(false)
              setNotaAtual(null)
            }}
          />
        </>
      )}
      {modalFinalizacao && (
        <Dialog open={modalFinalizacao} onOpenChange={setModalFinalizacao}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <span>Finalizar Relatório</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Resumo do Relatório</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total de Notas</div>
                    <div className="font-bold text-blue-600">{notas.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total de Volumes</div>
                    <div className="font-bold text-green-600">
                      {notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Notas OK</div>
                    <div className="font-bold text-green-600">{notas.filter((n) => n.status === "ok").length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Divergências</div>
                    <div className="font-bold text-orange-600">
                      {notas.filter((n) => n.status === "divergencia").length}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="transportadora">Nome da Transportadora *</Label>
                <Input
                  id="transportadora"
                  placeholder="Ex: Ativa, Mira, Real94, etc."
                  value={nomeTransportadora}
                  onChange={(e) => setNomeTransportadora(e.target.value)}
                  className="text-base"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      confirmarFinalizacao()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Este será o nome do relatório na área de Custos</p>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={confirmarFinalizacao}
                  disabled={!nomeTransportadora.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalizar Relatório
                </Button>
                <Button
                  onClick={() => {
                    setModalFinalizacao(false)
                    setNomeTransportadora("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Modal de Relatórios */}
      <RelatoriosModal isOpen={modalRelatorios} onClose={() => setModalRelatorios(false)} />
    </div>
  )
}
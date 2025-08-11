"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  MapPin,
  Barcode,
  FileText,
  Play,
  Square,
  RotateCcw,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useSession, useInventario } from "@/hooks/use-database";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { BarcodeScanner } from "./components/barcode-scanner";
import { RelatorioModal } from "./components/relatorio-modal";

interface ItemInventario {
  id: string;
  codigoCompleto: string;
  data: string;
  numeroNF: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  clienteDestino: string;
  tipoCarga: string;
  quantidade: number;
  rua: string;
  timestamp: string;
}

interface RelatorioInventario {
  id: string;
  rua: string;
  data: string;
  turno: string;
  colaborador: string;
  itens: ItemInventario[];
  totalItens: number;
  tempoInicio: string;
  tempoFim: string;
}

export default function InventarioPage() {
  const [rua, setRua] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [itensInventario, setItensInventario] = useState<ItemInventario[]>([]);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  const router = useRouter();
  const { getSession, logout } = useSession();
  const { saveInventario, getInventario, saveRelatorio } = useInventario();
  const { addRealtimeEvent } = useRealtimeMonitoring();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await getSession("current");
        if (!sessionData) {
          router.push("/");
          return;
        }
        setSession(sessionData);

        // Carregar inventário salvo
        const inventarioSalvo = await getInventario(sessionData.id);
        if (inventarioSalvo.length > 0) {
          setItensInventario(inventarioSalvo);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
        router.push("/");
      }
    };

    loadSession();
  }, [getSession, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleIniciarBipagem = () => {
    if (!rua) {
      alert("Por favor, selecione uma rua antes de iniciar a bipagem.");
      return;
    }
    setIsScanning(true);
    console.log("🚀 Iniciando bipagem para rua:", rua);
  };

  const handleFinalizarRelatorio = () => {
    if (itensInventario.length === 0) {
      alert("Não há itens no inventário para gerar relatório.");
      return;
    }
    setShowRelatorio(true);
  };

  const handleNovaRua = () => {
    if (itensInventario.length > 0) {
      const confirmar = confirm(
        "Existem itens no inventário atual. Deseja realmente limpar e começar uma nova rua?"
      );
      if (!confirmar) return;
    }
    
    setItensInventario([]);
    setRua("");
    setIsScanning(false);
    console.log("🔄 Iniciando nova rua");
  };

  const handleBarcodeScanned = async (codigo: string) => {
    if (!rua || !session) return;

    setIsLoading(true);
    
    try {
      // Simular busca de produto (em produção, isso viria do banco)
      const produto = await buscarProduto(codigo);
      
      if (produto) {
        const novoItem: ItemInventario = {
          id: Date.now().toString(),
          codigoCompleto: codigo,
          data: produto.data,
          numeroNF: produto.numeroNF,
          volumes: produto.volumes,
          destino: produto.destino,
          fornecedor: produto.fornecedor,
          clienteDestino: produto.clienteDestino,
          tipoCarga: produto.tipoCarga,
          quantidade: 1,
          rua: rua,
          timestamp: new Date().toISOString(),
        };

        // Verificar se o item já existe
        const itemExistente = itensInventario.find(item => item.codigoCompleto === codigo);
        let itensAtualizados: ItemInventario[];
        
        if (itemExistente) {
          // Incrementar quantidade
          itensAtualizados = itensInventario.map(item =>
            item.codigoCompleto === codigo
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          );
          setItensInventario(itensAtualizados);
          console.log("➕ Quantidade incrementada:", produto.numeroNF);
        } else {
          // Adicionar novo item
          itensAtualizados = [...itensInventario, novoItem];
          setItensInventario(itensAtualizados);
          console.log("✅ Item adicionado:", produto.numeroNF);
        }

        // Salvar no localStorage
        await saveInventario(session.id, itensAtualizados);
        
        // Disparar evento em tempo real
        addRealtimeEvent({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sector: 'inventario',
          type: 'inventory_updated',
          message: `NF ${produto.numeroNF} escaneada na rua ${rua}`,
          data: { numeroNF: produto.numeroNF, rua, fornecedor: produto.fornecedor, clienteDestino: produto.clienteDestino }
        });
      } else {
        alert(`Código inválido: ${codigo}\n\nFormato esperado: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga\n\nExemplo: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD`);
      }
    } catch (error) {
      console.error("Erro ao processar código:", error);
      alert("Erro ao processar código de barras");
    } finally {
      setIsLoading(false);
    }
  };

  const buscarProduto = async (codigo: string) => {
    // Validar formato do código: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga
    const partes = codigo.split("|");
    
    if (partes.length !== 7) {
      return null; // Formato inválido
    }

    const [data, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes;
    const volumes = parseInt(volumesStr, 10);

    if (isNaN(volumes) || volumes <= 0) {
      return null; // Volumes inválidos
    }

    // Retornar objeto com as informações extraídas
    return {
      codigoCompleto: codigo,
      data,
      numeroNF,
      volumes,
      destino,
      fornecedor,
      clienteDestino,
      tipoCarga
    };
  };

  const handleGerarRelatorio = async (relatorio: RelatorioInventario) => {
    try {
      await saveRelatorio(relatorio);
      console.log("📊 Relatório salvo:", relatorio.rua);
      
      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'inventario',
        type: 'relatorio_finalized',
        message: `Relatório finalizado para rua ${relatorio.rua}`,
        data: { rua: relatorio.rua, totalItens: relatorio.totalItens, colaborador: relatorio.colaborador }
      });
      
      // Limpar inventário após salvar relatório
      setItensInventario([]);
      setRua("");
      setIsScanning(false);
      setShowRelatorio(false);
      
      alert("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar relatório:", error);
      alert("Erro ao salvar relatório");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventário</h1>
              <p className="text-gray-600">
                {session.colaboradores?.join(", ")} - {session.data} - Turno {session.turno}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controle */}
        <div className="lg:col-span-1 space-y-6">
          {/* Seleção de Rua */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <span>Seleção de Rua</span>
              </CardTitle>
              <CardDescription>
                Escolha a rua para iniciar o inventário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rua">Rua *</Label>
                <Input
                  id="rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Digite a rua (ex: Corredor B12)"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleIniciarBipagem}
                  disabled={!rua || isScanning}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Bipagem
                </Button>

                <Button
                  onClick={handleFinalizarRelatorio}
                  disabled={itensInventario.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalizar Relatório
                </Button>

                <Button
                  onClick={handleNovaRua}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Nova Rua
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Estatísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Rua Atual:</span>
                <span className="font-medium">{rua || "Não selecionada"}</span>
              </div>
                             <div className="flex justify-between">
                 <span className="text-gray-600">Notas Fiscais:</span>
                 <span className="font-medium">{itensInventario.length}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-600">Total de Volumes:</span>
                 <span className="font-medium">
                   {itensInventario.reduce((total, item) => total + (item.volumes * item.quantidade), 0)}
                 </span>
               </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${isScanning ? 'text-green-600' : 'text-gray-600'}`}>
                  {isScanning ? 'Escaneando' : 'Aguardando'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área de Bipagem */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner */}
          {isScanning && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Barcode className="h-5 w-5 text-blue-600" />
                  <span>Scanner de Código de Barras</span>
                </CardTitle>
                <CardDescription>
                  Escaneie os produtos da rua: {rua}
                  <br />
                  <span className="text-xs text-gray-500">
                    Formato: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Lista de Itens */}
          <Card>
            <CardHeader>
                             <CardTitle className="flex items-center space-x-2">
                 <Package className="h-5 w-5 text-orange-600" />
                 <span>Notas Fiscais do Inventário</span>
                 {itensInventario.length > 0 && (
                   <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                     {itensInventario.length}
                   </span>
                 )}
               </CardTitle>
              <CardDescription>
                Notas fiscais escaneadas na rua atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itensInventario.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma nota fiscal escaneada ainda</p>
                  <p className="text-sm">Inicie a bipagem para começar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {itensInventario.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">NF: {item.numeroNF}</p>
                        <p className="text-sm text-gray-600">
                          {item.fornecedor} → {item.clienteDestino}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.destino} | {item.tipoCarga} | {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          Qtd: {item.quantidade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Relatório */}
      {showRelatorio && (
        <RelatorioModal
          rua={rua}
          itens={itensInventario}
          session={session}
          onClose={() => setShowRelatorio(false)}
          onSave={handleGerarRelatorio}
        />
      )}
    </div>
  );
}

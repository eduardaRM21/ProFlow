"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  Calendar,
  MapPin,
  Eye,
  Filter,
  Copy,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import ChatModal from "./chat-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auiidcxarcjjxvyswwhf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'
const supabase = createClient(supabaseUrl, supabaseKey)

const copiarNFsParaSAP = (nfs: Array<{ numeroNF: string }>) => {
  // Manter o formato original das NFs com zeros à esquerda
  const nfsTexto = nfs.map((nf) => nf.numeroNF.toString()).join("\n");

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(nfsTexto)
      .then(() => {
        alert(
          `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
        );
      })
      .catch(() => {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement("textarea");
        textArea.value = nfsTexto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
        );
      });
  } else {
    // Fallback para navegadores muito antigos
    const textArea = document.createElement("textarea");
    textArea.value = nfsTexto;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert(
      `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
    );
  }
};

interface CarroProduzido {
  id: string;
  colaboradores: string[];
  data: string;
  turno: string;
  destinoFinal: string;
  quantidadeNFs: number;
  totalVolumes: number;
  dataProducao: string;
  nfs: Array<{
    id: string;
    numeroNF: string;
    volume: number;
    fornecedor: string;
    codigo: string;
  }>;
  estimativaPallets: number;
  status?: string;
  palletesReais?: number;
  dataInicioEmbalagem?: string;
  dataFinalizacao?: string;
}

interface SessionData {
  colaboradores: string[];
  data: string;
  turno: string;
  loginTime: string;
}

interface CarrosProduzidosSectionProps {
  sessionData: SessionData;
}

export default function CarrosProduzidosSection({
  sessionData,
}: CarrosProduzidosSectionProps) {
  const [carros, setCarros] = useState<CarroProduzido[]>([]);
  const [filtroDestino, setFiltroDestino] = useState<string>("todos");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [ajudaVisivel, setAjudaVisivel] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [modalPallets, setModalPallets] = useState<{
    aberto: boolean;
    carroId: string;
    nomeCarro: string;
  }>({ aberto: false, carroId: "", nomeCarro: "" });
  const [quantidadePallets, setQuantidadePallets] = useState("");

  const { addRealtimeEvent } = useRealtimeMonitoring();

  const conversaId = `${sessionData.colaboradores.join("_")}_${
    sessionData.data
  }_${sessionData.turno}`;

  const verificarMensagensNaoLidas = async () => {
    try {
      const { data } = await supabase
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
  };

  const abrirChat = () => {
    setChatAberto(true);
    setMensagensNaoLidas(0);
  };

  const finalizarEmbalagem = () => {
    if (
      !quantidadePallets.trim() ||
      isNaN(Number(quantidadePallets)) ||
      Number(quantidadePallets) <= 0
    ) {
      alert("Por favor, informe uma quantidade válida de pallets!");
      return;
    }

    const pallets = Number(quantidadePallets);

    // Atualizar o carro na lista de embalagem
    const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem");
    if (carrosEmbalagem) {
      const carros = JSON.parse(carrosEmbalagem);
      const carroIndex = carros.findIndex(
        (c: any) => c.id === modalPallets.carroId
      );

      if (carroIndex !== -1) {
        carros[carroIndex] = {
          ...carros[carroIndex],
          status: "concluido",
          palletesReais: pallets,
          dataFinalizacao: new Date().toISOString(),
        };

        localStorage.setItem(
          "profarma_carros_embalagem",
          JSON.stringify(carros)
        );

        // Disparar evento em tempo real
        addRealtimeEvent({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sector: 'embalagem',
          type: 'carro_created',
          message: `Carro ${modalPallets.nomeCarro} finalizado`,
          data: { nomeCarro: modalPallets.nomeCarro, pallets, carroId: modalPallets.carroId }
        });

        // Recarregar a lista
        carregarCarrosProduzidos();

        // Fechar modal
        setModalPallets({ aberto: false, carroId: "", nomeCarro: "" });
        setQuantidadePallets("");

        alert(
          `${modalPallets.nomeCarro} finalizado com sucesso!\nPallets informados: ${pallets}`
        );
      }
    }
  };

  const abrirModalPallets = (carroId: string, nomeCarro: string) => {
    setModalPallets({ aberto: true, carroId, nomeCarro });
    setQuantidadePallets("");
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "embalando":
        return "Embalando";
      case "concluido":
        return "Concluído";
      default:
        return "Finalizado";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "embalando":
        return "bg-orange-100 text-orange-800";
      case "concluido":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  useEffect(() => {
    carregarCarrosProduzidos();
  }, []);

  useEffect(() => {
    verificarMensagensNaoLidas();
    const interval = setInterval(() => {
      verificarMensagensNaoLidas();
    }, 3000);
    return () => clearInterval(interval);
  }, [conversaId]);

  const carregarCarrosProduzidos = () => {
    // Buscar todos os carros produzidos no localStorage
    const carrosEncontrados: CarroProduzido[] = [];

    // Buscar carros em embalagem
    const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem");
    if (carrosEmbalagem) {
      try {
        const carros = JSON.parse(carrosEmbalagem);
        carros.forEach((carro: any) => {
          const carroFormatado: CarroProduzido = {
            id: carro.id,
            colaboradores: carro.colaboradores,
            data: carro.data,
            turno: carro.turno,
            destinoFinal: carro.destinoFinal,
            quantidadeNFs: carro.quantidadeNFs,
            totalVolumes: carro.totalVolumes,
            dataProducao: carro.dataInicioEmbalagem,
            nfs: carro.nfs,
            estimativaPallets: carro.estimativaPallets,
            status: carro.status,
            palletesReais: carro.palletesReais,
            dataInicioEmbalagem: carro.dataInicioEmbalagem,
            dataFinalizacao: carro.dataFinalizacao,
          };
          carrosEncontrados.push(carroFormatado);
        });
      } catch (error) {
        console.error("Erro ao processar carros em embalagem:", error);
      }
    }

    // Iterar por todas as chaves do localStorage para encontrar sessões finalizadas antigas
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave?.startsWith("profarma_nfs_")) {
        const dados = localStorage.getItem(chave);
        if (dados) {
          try {
            const sessao = JSON.parse(dados);

            // Verificar se o carro foi finalizado (tem status "liberado" ou "em_producao")
            if (
              sessao.statusCarro === "liberado" ||
              sessao.statusCarro === "em_producao"
            ) {
              const nfsValidas =
                sessao.nfs?.filter((nf: any) => nf.status === "valida") || [];

              if (nfsValidas.length > 0) {
                // Extrair informações da chave (formato: profarma_nfs_colaborador_data_turno)
                const partesChave = chave.split("_");
                const colaboradoresStr = partesChave.slice(2, -2).join("_");
                const data = partesChave[partesChave.length - 2];
                const turno = partesChave[partesChave.length - 1];

                const destinosUnicos = [
                  ...new Set(nfsValidas.map((nf: any) => nf.destinoFinal)),
                ];
                const totalVolumes = nfsValidas.reduce(
                  (sum: number, nf: any) => sum + nf.volume,
                  0
                );

                const carro: CarroProduzido = {
                  id: chave,
                  colaboradores: colaboradoresStr
                    .split("+")
                    .map((c) => c.trim()),
                  data,
                  turno,
                  destinoFinal: destinosUnicos.join(", "),
                  quantidadeNFs: nfsValidas.length,
                  totalVolumes,
                  dataProducao:
                    sessao.ultimaAtualizacao || new Date().toISOString(),
                  nfs: nfsValidas.map((nf: any) => ({
                    id: nf.id,
                    numeroNF: nf.numeroNF,
                    volume: nf.volume,
                    fornecedor: nf.nomeFornecedor,
                    codigo: nf.codigo,
                  })),
                  estimativaPallets: Math.ceil(totalVolumes / 100), // Estimativa: 100 volumes por pallet
                  status:
                    sessao.statusCarro === "em_producao"
                      ? "concluido"
                      : "liberado",
                };

                carrosEncontrados.push(carro);
              }
            }
          } catch (error) {
            console.error("Erro ao processar dados do localStorage:", error);
          }
        }
      }
    }

    // Ordenar por data de produção (mais recente primeiro)
    carrosEncontrados.sort(
      (a, b) =>
        new Date(b.dataProducao).getTime() - new Date(a.dataProducao).getTime()
    );

    setCarros(carrosEncontrados);
  };

  const getTurnoLabel = (turno: string) => {
    switch (turno) {
      case "A":
        return "Manhã";
      case "B":
        return "Tarde";
      case "C":
        return "Noite";
      default:
        return turno;
    }
  };

  const getTurnoColor = (turno: string) => {
    switch (turno) {
      case "A":
        return "bg-yellow-100 text-yellow-800";
      case "B":
        return "bg-orange-100 text-orange-800";
      case "C":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filtrar carros
  const carrosFiltrados = carros.filter((carro) => {
    const filtroDestinoOk =
      filtroDestino === "todos" || carro.destinoFinal.includes(filtroDestino);
    const filtroColaboradorOk =
      filtroColaborador === "todos" ||
      carro.colaboradores.some((col) =>
        col.toLowerCase().includes(filtroColaborador.toLowerCase())
      );

    return filtroDestinoOk && filtroColaboradorOk;
  });

  // Obter listas únicas para filtros
  const destinosUnicos = [
    ...new Set(carros.flatMap((c) => c.destinoFinal.split(", "))),
  ];
  const colaboradoresUnicos = [
    ...new Set(carros.flatMap((c) => c.colaboradores)),
  ];

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" />
            <span className="text-sm sm:text-base lg:text-lg truncate">
              Carros Produzidos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.length}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total de Carros
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + c.quantidadeNFs, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total de NFs
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + c.totalVolumes, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Volumes
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + (c.palletesReais || 0), 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Qtdd Pallets
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Filtros:</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs sm:text-sm text-gray-600 min-w-0 flex-shrink-0">
                  Destino:
                </span>
                <Select value={filtroDestino} onValueChange={setFiltroDestino}>
                  <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {destinosUnicos.map((destino) => (
                      <SelectItem key={destino} value={destino}>
                        {destino}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs sm:text-sm text-gray-600 min-w-0 flex-shrink-0">
                  Colaborador:
                </span>
                <Select
                  value={filtroColaborador}
                  onValueChange={setFiltroColaborador}
                >
                  <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {colaboradoresUnicos.map((colaborador) => (
                      <SelectItem key={colaborador} value={colaborador}>
                        {colaborador}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={carregarCarrosProduzidos}
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Atualizar Lista</span>
                <span className="sm:hidden">Atualizar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de carros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {carrosFiltrados.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8 text-gray-500 text-sm">
              {carros.length === 0
                ? "Nenhum carro produzido ainda."
                : "Nenhum carro encontrado com os filtros selecionados."}
            </CardContent>
          </Card>
        ) : (
          carrosFiltrados.map((carro) => (
            <Card
              key={carro.id}
              className="border-emerald-200 hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {carro.colaboradores.length === 1
                        ? carro.colaboradores[0]
                        : `${carro.colaboradores.join(" + ")} (Dupla)`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Badge
                      className={`text-xs ${getStatusColor(carro.status)}`}
                    >
                      {getStatusLabel(carro.status)}
                    </Badge>
                    <Badge className={`text-xs ${getTurnoColor(carro.turno)}`}>
                      <span className="hidden sm:inline">Turno </span>
                      {carro.turno}
                      <span className="hidden sm:inline">
                        {" "}
                        - {getTurnoLabel(carro.turno)}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{carro.data}</span>
                  <span>•</span>
                  <span>
                    {new Date(carro.dataProducao).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Destino:</span>
                  <span>{carro.destinoFinal}</span>
                </div>

                <div className="grid grid-cols-4 gap-4 py-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">
                      {carro.quantidadeNFs}
                    </div>
                    <div className="text-xs text-gray-500">NFs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {carro.totalVolumes}
                    </div>
                    <div className="text-xs text-gray-500">Volumes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {carro.palletesReais !== null &&
                      carro.palletesReais !== undefined
                        ? carro.palletesReais
                        : carro.estimativaPallets}
                    </div>
                    <div className="text-xs text-gray-500">
                      {carro.palletesReais !== null &&
                      carro.palletesReais !== undefined
                        ? "Pallets Reais"
                        : "Estimativa"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {carro.estimativaPallets}
                    </div>
                    <div className="text-xs text-gray-500">Est. Pallets</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver NFs do Carro
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Package className="h-5 w-5 text-emerald-600" />
                          <span>
                            NFs do Carro - {carro.colaboradores.join(" + ")}
                          </span>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600">Data</div>
                            <div className="font-medium">{carro.data}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Turno</div>
                            <div className="font-medium">
                              Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Destino</div>
                            <div className="font-medium">
                              {carro.destinoFinal}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">
                              Produzido em
                            </div>
                            <div className="font-medium text-xs">
                              {new Date(carro.dataProducao).toLocaleString(
                                "pt-BR"
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">
                            Lista de NFs ({carro.quantidadeNFs} itens)
                          </h4>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                  <th className="px-4 py-2">NF</th>
                                  <th className="px-4 py-2">Código</th>
                                  <th className="px-4 py-2">Forn</th>
                                  <th className="px-4 py-2 text-center">
                                    Volume
                                  </th>
                                  <th className="px-4 py-2 text-center">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {carro.nfs.map((nf, index) => (
                                  <tr
                                    key={nf.id}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50"
                                    }
                                  >
                                    <td className="px-4 py-2 font-medium">
                                      {nf.numeroNF}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      {nf.codigo}
                                    </td>
                                    <td
                                      className="px-4 py-2 truncate max-w-[120px]"
                                      title={nf.fornecedor}
                                    >
                                      {nf.fornecedor}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {nf.volume}
                                    </td>
                                    <td className="px-4 py-2 text-center font-semibold">
                                      {nf.volume}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-emerald-100 text-emerald-800 font-bold">
                                  <td
                                    className="px-4 py-2 text-right"
                                    colSpan={4}
                                  >
                                    Total do Carro:
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {carro.totalVolumes}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {carro.status === "embalando" && (
                    <Button
                      onClick={() =>
                        abrirModalPallets(
                          carro.id,
                          `${carro.colaboradores.join(" + ")}`
                        )
                      }
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Botões de Ajuda e Chat Flutuantes */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
        {/* Botão Chat */}
        <button
          onClick={abrirChat}
          className="relative bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
          title="Chat Interno"
        >
          <MessageSquare className="h-6 w-6" />
          {mensagensNaoLidas > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
              {mensagensNaoLidas}
            </span>
          )}
        </button>

        {/* Botão Ajuda */}
        <button
          onClick={() => setAjudaVisivel(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
          title="Ajuda"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      </div>

      {/* Modal de Ajuda */}
      <Dialog open={ajudaVisivel} onOpenChange={setAjudaVisivel}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              <span>Central de Ajuda - Carros Produzidos</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🚛 Como Usar esta Seção
              </h3>
              <div className="space-y-3">
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    1. Visualizar Carros Finalizados
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta seção mostra todos os carros que foram embalados e
                    estão prontos para entrega.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    2. Filtros Disponíveis
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use os filtros por destino e colaborador para encontrar
                    carros específicos rapidamente.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    3. Detalhes do Carro
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em "Ver NFs do Carro" para visualizar todas as notas
                    fiscais incluídas no carro.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    4. Copiar NFs para SAP
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use o botão "Copiar NFs" para copiar a lista de números das
                    notas fiscais e colar diretamente no SAP.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📊 Informações Exibidas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <h4 className="font-medium text-emerald-900">
                    Total de Carros
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Quantidade total de carros produzidos
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900">Total de NFs</h4>
                  <p className="text-xs text-green-700">
                    Soma de todas as notas fiscais
                  </p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg">
                  <h4 className="font-medium text-teal-900">
                    Total de Volumes
                  </h4>
                  <p className="text-xs text-teal-700">
                    Soma de todos os volumes bipados
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900">
                    Pallets Estimados
                  </h4>
                  <p className="text-xs text-blue-700">
                    Estimativa baseada em 100 volumes por pallet
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Dicas Importantes
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  • Os carros são ordenados por data de produção (mais recentes
                  primeiro)
                </p>
                <p>
                  • Use o botão "Atualizar Lista" para recarregar os dados se
                  necessário
                </p>
                <p>
                  • A função "Copiar NFs" mantém o formato original com zeros à
                  esquerda
                </p>
                <p>
                  • Cada carro mostra o colaborador responsável e o turno de
                  produção
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Quantidade de Pallets */}
      <Dialog
        open={modalPallets.aberto}
        onOpenChange={(open) =>
          !open &&
          setModalPallets({ aberto: false, carroId: "", nomeCarro: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-green-600" />
              <span>Finalizar Embalagem - {modalPallets.nomeCarro}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="quantidadePallets">
                Quantidade Real de Pallets *
              </Label>
              <Input
                id="quantidadePallets"
                type="number"
                min="1"
                placeholder="Ex: 3"
                value={quantidadePallets}
                onChange={(e) => setQuantidadePallets(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    finalizarEmbalagem();
                  }
                }}
                className="mt-1"
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>• Informe a quantidade real de pallets que foram utilizados</p>
              <p>• Esta informação será registrada para controle</p>
              <p>• Após confirmar, o carro será marcado como concluído</p>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={finalizarEmbalagem}
                disabled={!quantidadePallets.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar Embalagem
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalPallets({
                    aberto: false,
                    carroId: "",
                    nomeCarro: "",
                  });
                  setQuantidadePallets("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatAberto}
        onClose={() => setChatAberto(false)}
        sessionData={sessionData}
      />
    </div>
  );
}

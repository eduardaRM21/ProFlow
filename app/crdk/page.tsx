"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Package,
  Truck,
  Calculator,
  BarChart3,
  Users,
  LogOut,
  CalendarIcon,
  FileText,
  RotateCcw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useCRDKDatabase, CRDKSectorData } from "@/lib/crdk-database-service";

interface SessionData {
  colaborador: string;
  data: string;
  turno: string;
  area: string;
  loginTime: string;
}

interface NotaFiscalRecebimento {
  id: string;
  codigoCompleto: string;
  data: string;
  numeroNF: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  clienteDestino: string;
  tipoCarga: string;
  timestamp: string;
  status: "ok" | "divergencia";
  divergencia?: {
    tipo: string;
    descricao: string;
    volumesInformados: number;
  };
}

interface CarroEmbalagem {
  id: string;
  nome: string;
  destinoFinal: string;
  nfs: Array<{
    id: string;
    numeroNF: string;
    volume: number;
    fornecedor: string;
    codigo: string;
  }>;
  statusCarro:
    | "aguardando_colagem"
    | "em_conferencia"
    | "liberado"
    | "em_producao";
  dataInicio: string;
  ativo: boolean;
}

interface RelatorioCustos {
  id: string;
  nome: string; // Transportadora name
  colaborador: string[]; // Can be multiple for embalagem
  data: string;
  turno: string;
  area: string;
  quantidadeNotas: number;
  somaVolumes: number;
  notas: NotaFiscalRecebimento[]; // Re-using NotaFiscalRecebimento for consistency
  dataFinalizacao: string;
  status:
    | "aguardando_lancamento"
    | "em_lancamento"
    | "lancado"
    | "erro_lancamento";
  observacoes?: string;
  dataLancamento?: string;
  numeroLancamento?: string;
  responsavelLancamento?: string;
}

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

export default function CRDKPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [recebimentoStats, setRecebimentoStats] = useState({
    totalNFs: 0,
    totalVolumes: 0,
    totalDivergencias: 0,
    totalRelatorios: 0,
  });
  const [embalagemStats, setEmbalagemStats] = useState({
    totalCarros: 0,
    carrosEmProducao: 0,
    totalNFs: 0,
    totalVolumes: 0,
  });
  const [custosStats, setCustosStats] = useState({
    totalRelatorios: 0,
    aguardandoLancamento: 0,
    emLancamento: 0,
    lancados: 0,
    totalNFs: 0,
    totalVolumes: 0,
  });
  const [inventarioStats, setInventarioStats] = useState({
    totalNFs: 0,
    totalVolumes: 0,
    totalRuas: 0,
    ruasAtivas: 0,
  });

  // Chart Data States
  const [recebimentoChartData, setRecebimentoChartData] = useState<any[]>([]);
  const [embalagemChartData, setEmbalagemChartData] = useState<any[]>([]);
  const [custosChartData, setCustosChartData] = useState<any[]>([]);
  const [inventarioChartData, setInventarioChartData] = useState<any[]>([]);

  // Date Filter States
  const [startDate, setStartDate] = useState<Date | undefined>(
    subDays(new Date(), 7)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Modal States
  const [showInventarioModal, setShowInventarioModal] = useState(false);
  const [inventarioDetalhado, setInventarioDetalhado] = useState<
    ItemInventario[]
  >([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState<
    ItemInventario[]
  >([]);

  // CRDK Database States
  const [crossSectorData, setCrossSectorData] = useState<CRDKSectorData | null>(null);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [sectorEfficiency, setSectorEfficiency] = useState<any[]>([]);
  const [crossSectorInsights, setCrossSectorInsights] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  // Real-time monitoring hook
  const {
    initialize,
    cleanup,
    loadAllSectorData,
    getSectorEfficiency,
    getCrossSectorInsights,
    getConnectionStatus
  } = useCRDKDatabase()

  // Função para carregar dados iniciais
  const loadInitialData = useCallback(async () => {
    try {
      // Timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar dados')), 15000); // 15 segundos
      });
      
      // Carregar dados com timeout
      try {
        const sectorDataPromise = loadAllSectorData();
        const sectorData = await Promise.race([sectorDataPromise, timeoutPromise]) as CRDKSectorData;
        
        try {
          setCrossSectorData(sectorData)
        } catch (dataError) {
          console.error('❌ Erro ao definir dados do setor:', dataError)
          setCrossSectorData(null)
        }
        
        // Preparar dados para gráficos
        try {
          const chartData = prepareChartData(sectorData)
          setChartData(chartData)
        } catch (chartError) {
          console.error('❌ Erro ao preparar dados dos gráficos:', chartError)
          setChartData([])
        }
        
        // Carregar eficiência e insights
        try {
          const efficiency = await getSectorEfficiency()
          setSectorEfficiency(efficiency)
        } catch (efficiencyError) {
          console.error('❌ Erro ao carregar eficiência:', efficiencyError)
          setSectorEfficiency([])
        }
        
        try {
          const insights = await getCrossSectorInsights()
          setCrossSectorInsights(insights)
        } catch (insightsError) {
          console.error('❌ Erro ao carregar insights:', insightsError)
          setCrossSectorInsights(['Dados temporariamente indisponíveis'])
        }
        
        // Carregar dados locais para estatísticas
        try {
          loadRecebimentoData();
          loadEmbalagemData();
          loadInventarioData();
          loadCustosData();
        } catch (localError) {
          console.error('❌ Erro ao carregar dados locais:', localError);
        }
        
        console.log('✅ Dados iniciais carregados com sucesso')
      } catch (timeoutError) {
        throw timeoutError; // Re-throw para ser capturado pelo catch externo
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error)
      
      // Em caso de erro, definir dados padrão
      setCrossSectorData({
        recebimento: { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0, lastUpdate: '', nfsRecebidas: [] },
        embalagem: { totalCarros: 0, carrosEmProducao: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', carrosAtivos: [] },
        inventario: { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0, lastUpdate: '', itensInventario: [] },
        custos: { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', relatorios: [] }
      });
      
      setChartData([]);
      setSectorEfficiency([]);
      setCrossSectorInsights(['Dados temporariamente indisponíveis']);
      
      // Mesmo com erro, tentar carregar dados locais
      try {
        loadRecebimentoData();
        loadEmbalagemData();
        loadInventarioData();
        loadCustosData();
      } catch (localError) {
        console.error('❌ Erro ao carregar dados locais:', localError);
      }
    }
  }, [loadAllSectorData, getSectorEfficiency, getCrossSectorInsights])

  // Função para lidar com eventos realtime
  const handleRealtimeEvent = useCallback((event: Event) => {
    try {
      const realtimeEvent = (event as CustomEvent).detail
      console.log('🔄 Evento realtime recebido:', realtimeEvent)
      
      // Adicionar evento à lista
      setRealtimeEvents((prev: any[]) => [realtimeEvent, ...prev.slice(0, 9)])
      
      // Recarregar dados do setor afetado
      loadInitialData()
    } catch (error) {
      console.error('❌ Erro ao processar evento realtime:', error)
    }
  }, [loadInitialData])

  // Carregar dados da sessão
  useEffect(() => {
    const loadSessionData = () => {
      try {
        const session = localStorage.getItem("sistema_session");
        if (session) {
          const sessionData = JSON.parse(session);
          setSessionData(sessionData);
        } else {
          // Se não há sessão, redirecionar para login
          router.push("/");
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados da sessão:', error);
        router.push("/");
      }
    };

    loadSessionData();
  }, [router]);

    useEffect(() => {
    const initializeCRDK = async () => {
      try {
        setIsLoading(true);
        
        // Timeout mais agressivo para evitar travamento
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao inicializar CRDK')), 5000); // 5 segundos
        });
        
        // Inicializar serviço de banco de dados com timeout
        let isConnected = false;
        try {
          const initPromise = initialize();
          isConnected = await Promise.race([initPromise, timeoutPromise]) as boolean;
          console.log('🔌 Status da conexão CRDK:', isConnected ? 'Conectado' : 'Local')
        } catch (initError) {
          console.warn('⚠️ Falha na inicialização do banco, usando modo local:', initError)
          isConnected = false;
        }
        
        // Carregar dados iniciais com timeout separado
        try {
          const dataTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao carregar dados')), 8000); // 8 segundos
          });
          
          const dataPromise = loadInitialData();
          await Promise.race([dataPromise, dataTimeoutPromise]);
        } catch (dataError) {
          console.warn('⚠️ Falha ao carregar dados, usando dados padrão:', dataError)
          // Definir dados padrão em caso de falha
          setCrossSectorData({
            recebimento: { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0, lastUpdate: '', nfsRecebidas: [] },
            embalagem: { totalCarros: 0, carrosEmProducao: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', carrosAtivos: [] },
            inventario: { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0, lastUpdate: '', itensInventario: [] },
            custos: { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', relatorios: [] }
          });
          setChartData([]);
          setSectorEfficiency([]);
          setCrossSectorInsights(['Dados temporariamente indisponíveis']);
        }
        
        // Configurar listener para eventos realtime
        if (typeof window !== 'undefined') {
          window.addEventListener('crdk-realtime-event', handleRealtimeEvent as EventListener)
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Erro crítico ao inicializar CRDK:', error)
        setIsLoading(false);
        
        // Em caso de erro crítico, definir dados padrão e continuar
        setCrossSectorData({
          recebimento: { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0, lastUpdate: '', nfsRecebidas: [] },
          embalagem: { totalCarros: 0, carrosEmProducao: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', carrosAtivos: [] },
          inventario: { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0, lastUpdate: '', itensInventario: [] },
          custos: { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', relatorios: [] }
        });
        setChartData([]);
        setSectorEfficiency([]);
        setCrossSectorInsights(['Sistema em modo de emergência']);
      }
    }

    // Só inicializar CRDK se houver sessionData
    if (sessionData) {
      initializeCRDK()
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('crdk-realtime-event', handleRealtimeEvent as EventListener)
      }
      cleanup()
    }
  }, [sessionData, initialize, cleanup, loadInitialData, handleRealtimeEvent])

  // Timeout de segurança adicional para evitar travamento indefinido
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Timeout de segurança ativado - forçando carregamento')
        setIsLoading(false);
        // Definir dados padrão se ainda estiver carregando
        if (!crossSectorData) {
          setCrossSectorData({
            recebimento: { totalNFs: 0, totalVolumes: 0, totalDivergencias: 0, totalRelatorios: 0, lastUpdate: '', nfsRecebidas: [] },
            embalagem: { totalCarros: 0, carrosEmProducao: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', carrosAtivos: [] },
            inventario: { totalNFs: 0, totalVolumes: 0, totalRuas: 0, ruasAtivas: 0, lastUpdate: '', itensInventario: [] },
            custos: { totalRelatorios: 0, aguardandoLancamento: 0, emLancamento: 0, lancados: 0, totalNFs: 0, totalVolumes: 0, lastUpdate: '', relatorios: [] }
          });
          setChartData([]);
          setSectorEfficiency([]);
          setCrossSectorInsights(['Sistema carregado em modo de emergência']);
        }
      }
    }, 15000); // 15 segundos de timeout de segurança

    return () => clearTimeout(safetyTimeout);
  }, [isLoading, crossSectorData]);



  // Função para preparar dados dos gráficos
  const prepareChartData = (sectorData: CRDKSectorData | null) => {
    if (!sectorData) {
      return [
        { name: 'Recebimento', NFs: 0, Volumes: 0, fill: '#3b82f6' },
        { name: 'Embalagem', NFs: 0, Volumes: 0, fill: '#10b981' },
        { name: 'Inventário', NFs: 0, Volumes: 0, fill: '#f59e0b' },
        { name: 'Custos', NFs: 0, Volumes: 0, fill: '#ef4444' }
      ]
    }
    
    return [
      {
        name: 'Recebimento',
        NFs: sectorData.recebimento.totalNFs,
        Volumes: sectorData.recebimento.totalVolumes,
        fill: '#3b82f6'
      },
      {
        name: 'Embalagem',
        NFs: sectorData.embalagem.totalNFs,
        Volumes: sectorData.embalagem.totalVolumes,
        fill: '#10b981'
      },
      {
        name: 'Inventário',
        NFs: sectorData.inventario.totalNFs,
        Volumes: sectorData.inventario.totalVolumes,
        fill: '#f59e0b'
      },
      {
        name: 'Custos',
        NFs: sectorData.custos.totalNFs,
        Volumes: sectorData.custos.totalVolumes,
        fill: '#ef4444'
      }
    ]
  }

  const loadRecebimentoData = () => {
    let totalNFs = 0;
    let totalVolumes = 0;
    let totalDivergencias = 0;
    let totalRelatorios = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("recebimento_")) {
        try {
          const notas: NotaFiscalRecebimento[] = JSON.parse(
            localStorage.getItem(key) || "[]"
          );
          totalNFs += notas.length;
          totalVolumes += notas.reduce(
            (sum, nota) =>
              sum + (nota.divergencia?.volumesInformados || nota.volumes),
            0
          );
          totalDivergencias += notas.filter(
            (n) => n.status === "divergencia"
          ).length;
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e);
        }
      }
    }

    const relatoriosCustos = JSON.parse(
      localStorage.getItem("relatorios_custos") || "[]"
    ) as RelatorioCustos[];
    totalRelatorios = relatoriosCustos.filter(
      (rel) => rel.area === "recebimento"
    ).length;

    setRecebimentoStats({
      totalNFs,
      totalVolumes,
      totalDivergencias,
      totalRelatorios,
    });
  };

  const loadEmbalagemData = () => {
    let totalCarros = 0;
    let carrosEmProducao = 0;
    let totalNFs = 0;
    let totalVolumes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("profarma_carros_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          const carros: CarroEmbalagem[] = data.carros || [];

          carros.forEach((carro) => {
            totalCarros++;
            if (carro.statusCarro === "em_producao") {
              carrosEmProducao++;
            }
            const nfsValidas = carro.nfs.filter(
              (nf: any) => nf.status === "valida"
            );
            totalNFs += nfsValidas.length;
            totalVolumes += nfsValidas.reduce(
              (sum: number, nf: any) => sum + nf.volume,
              0
            );
          });
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e);
        }
      }
    }
    setEmbalagemStats({
      totalCarros,
      carrosEmProducao,
      totalNFs,
      totalVolumes,
    });
  };

  const loadInventarioData = () => {
    let totalNFs = 0;
    let totalVolumes = 0;
    let totalRuas = 0;
    let ruasAtivas = 0;
    const ruasUnicas = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("inventario_")) {
        try {
          const itens: ItemInventario[] = JSON.parse(
            localStorage.getItem(key) || "[]"
          );
          totalNFs += itens.length;
          totalVolumes += itens.reduce(
            (sum, item) => sum + item.volumes * item.quantidade,
            0
          );

          itens.forEach((item) => {
            if (item.rua) {
              ruasUnicas.add(item.rua);
            }
          });
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e);
        }
      }
    }

    totalRuas = ruasUnicas.size;
    ruasAtivas = totalRuas; // For now, consider all ruas as active

    setInventarioStats({ totalNFs, totalVolumes, totalRuas, ruasAtivas });
  };

  const loadInventarioDetalhado = () => {
    const todosItens: ItemInventario[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("inventario_")) {
        try {
          const itens: ItemInventario[] = JSON.parse(
            localStorage.getItem(key) || "[]"
          );
          todosItens.push(...itens);
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e);
        }
      }
    }

    // Ordenar por timestamp mais recente
    const itensOrdenados = todosItens.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setInventarioDetalhado(itensOrdenados);
    setInventarioFiltrado(itensOrdenados);
  };

  const loadCustosData = () => {
    const relatorios: RelatorioCustos[] = JSON.parse(
      localStorage.getItem("relatorios_custos") || "[]"
    );
    const aguardandoLancamento = relatorios.filter(
      (r) => r.status === "aguardando_lancamento"
    ).length;
    const emLancamento = relatorios.filter(
      (r) => r.status === "em_lancamento"
    ).length;
    const lancados = relatorios.filter((r) => r.status === "lancado").length;
    const totalNFs = relatorios.reduce((sum, r) => sum + r.quantidadeNotas, 0);
    const totalVolumes = relatorios.reduce((sum, r) => sum + r.somaVolumes, 0);

    setCustosStats({
      totalRelatorios: relatorios.length,
      aguardandoLancamento,
      emLancamento,
      lancados,
      totalNFs,
      totalVolumes,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("sistema_session");
    router.push("/");
  };

  if (!sessionData || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Carregando Torre de Controle CRDK...</div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-yellow-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Torre de Controle CRDK
                </h1>
                <p className="text-sm text-gray-500">
                  Visão Geral e Produtividade dos Setores
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{sessionData.data}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Tempo Real</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent hover:bg-indigo-50 border-indigo-200"
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Visão Geral dos Setores
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          {/* Card Recebimento */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                <span>Setor de Recebimento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalNFs}
                  </div>
                  <div className="text-sm text-gray-600">NFs Bipadas</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Totais</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalDivergencias}
                  </div>
                  <div className="text-sm text-gray-600">Divergências</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalRelatorios}
                </div>
                  <div className="text-sm text-gray-600">
                    Relatórios Finalizados
              </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Embalagem */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Truck className="h-5 w-5 text-green-600" />
                <span>Setor de Embalagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2  gap-2">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalNFs}
                </div>
                  <div className="text-sm text-gray-600">NFs Embaladas</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Embalados</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalCarros}
              </div>
                  <div className="text-sm text-gray-600">Total de Carros</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.carrosEmProducao}
                  </div>
                  <div className="text-sm text-gray-600">
                    Carros em Produção
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Custos */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Calculator className="h-5 w-5 text-purple-600" />
                <span>Setor de Custos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.totalRelatorios}
                </div>
                  <div className="text-sm text-gray-600">
                    Total de Lançamentos
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.aguardandoLancamento}
                  </div>
                  <div className="text-sm text-gray-600">Aguardando</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.emLancamento}
                  </div>
                  <div className="text-sm text-gray-600">Em Lançamento</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.lancados}
                  </div>
                  <div className="text-sm text-gray-600">Lançados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Inventário */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Package className="h-5 w-5 text-orange-600" />
                <span>Setor de Inventário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalNFs}
                  </div>
                  <div className="text-sm text-gray-600">NFs Bipadas</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Totais</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalRuas}
                  </div>
                  <div className="text-sm text-gray-600">Ruas Ativas</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.ruasAtivas}
                  </div>
                  <div className="text-sm text-gray-600">Ruas em Uso</div>
                </div>
        </div>

              {/* Botão para Relatório Completo */}
              <Button
                onClick={() => {
                  loadInventarioDetalhado();
                  setShowInventarioModal(true);
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver Relatório Completo
              </Button>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Produtividade e Acompanhamento
        </h2>

        <Card className="border-indigo-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span>Gráficos de Produtividade</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <span className="text-sm font-medium text-gray-700">
                Período:
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal bg-transparent"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Data Inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => setStartDate(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <span>até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal bg-transparent"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Data Final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => setEndDate(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => {
                  setStartDate(subDays(new Date(), 7));
                  setEndDate(new Date());
                }}
              >
                Últimos 7 Dias
              </Button>
              <Button
                onClick={() => {
                  setStartDate(subDays(new Date(), 30));
                  setEndDate(new Date());
                }}
              >
                Últimos 30 Dias
              </Button>
            </div>

            {recebimentoChartData.length > 0 ? (
              <div className="space-y-8">
                {/* Gráfico de Recebimento */}
                <div className="h-[300px]">
                  <h3 className="text-lg font-semibold text-blue-700 mb-4">
                    Recebimento: NFs e Volumes Bipados
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={recebimentoChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="NFs"
                        stroke="#2563eb"
                        activeDot={{ r: 8 }}
                        name="NFs Bipadas"
                      />
                      <Line
                        type="monotone"
                        dataKey="Volumes"
                        stroke="#16a34a"
                        name="Volumes Bipados"
                      />
                      <Line
                        type="monotone"
                        dataKey="Divergências"
                        stroke="#ea580c"
                        name="Divergências"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Embalagem */}
                <div className="h-[300px]">
                  <h3 className="text-lg font-semibold text-green-700 mb-4">
                    Embalagem: Carros, NFs e Volumes Embalados
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={embalagemChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="Carros"
                        fill="#16a34a"
                        name="Carros Embalados"
                      />
                      <Bar dataKey="NFs" fill="#22c55e" name="NFs Embaladas" />
                      <Bar
                        dataKey="Volumes"
                        fill="#4ade80"
                        name="Volumes Embalados"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Custos */}
                <div className="h-[300px]">
                  <h3 className="text-lg font-semibold text-purple-700 mb-4">
                    Custos: Lançamentos, NFs e Volumes Lançados
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={custosChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Lançados"
                        stroke="#9333ea"
                        activeDot={{ r: 8 }}
                        name="Relatórios Lançados"
                      />
                      <Line
                        type="monotone"
                        dataKey="NFs"
                        stroke="#a855f7"
                        name="NFs Lançadas"
                      />
                      <Line
                        type="monotone"
                        dataKey="Volumes"
                        stroke="#c084fc"
                        name="Volumes Lançados"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Inventário */}
                <div className="h-[300px]">
                  <h3 className="text-lg font-semibold text-orange-700 mb-4">
                    Inventário: NFs e Volumes Bipados
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={inventarioChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="NFs" fill="#ea580c" name="NFs Bipadas" />
                      <Bar
                        dataKey="Volumes"
                        fill="#f97316"
                        name="Volumes Bipados"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum dado de produtividade disponível para o período
                  selecionado.
                </h3>
                <p>
                  Certifique-se de que há dados lançados nos setores de
                  Recebimento, Embalagem e Custos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cross-Sector Correlation Section */}
        <Card className="border-indigo-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span>Correlação Entre Setores</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {recebimentoStats.totalNFs}
                </div>
                <div className="text-sm text-gray-600">NFs Recebidas</div>
                <div className="text-xs text-blue-500 mt-1">
                  Setor Recebimento
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {embalagemStats.totalNFs}
                </div>
                <div className="text-sm text-gray-600">NFs Embaladas</div>
                <div className="text-xs text-green-500 mt-1">
                  Setor Embalagem
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {custosStats.totalNFs}
                </div>
                <div className="text-sm text-gray-600">NFs Lançadas</div>
                <div className="text-xs text-purple-500 mt-1">Setor Custos</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  {inventarioStats.totalNFs}
                </div>
                <div className="text-sm text-gray-600">NFs Inventariadas</div>
                <div className="text-xs text-orange-500 mt-1">
                  Setor Inventário
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-800 mb-2">
                Fluxo de Dados em Tempo Real:
              </h4>
              <div className="text-sm text-indigo-700 space-y-1">
                <p>
                  • <strong>Recebimento → Custos:</strong> NFs recebidas são
                  processadas pelo setor de Custos
                </p>
                <p>
                  • <strong>Recebimento → Embalagem:</strong> NFs recebidas são
                  embaladas pelo setor de Embalagem
                </p>
                <p>
                  • <strong>Recebimento → Inventário:</strong> Dados consolidados do que foi recebido e não foi embalado pelo setor de Embalagem
                </p>
                <p>
                  • <strong>Monitoramento:</strong> CRDK acompanha todo o fluxo
                  em tempo real
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Events Section */}
        <Card className="border-green-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Eventos em Tempo Real</span>
              <Badge className="bg-green-100 text-green-800">
                {getConnectionStatus() ? "Conectado" : "Desconectado"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {realtimeEvents.length > 0 ? (
                realtimeEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()} -
                        Setor: {event.sector}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>Nenhum evento em tempo real disponível</p>
                  <p className="text-xs">
                    Os eventos aparecerão conforme as atividades dos setores
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sector Efficiency Metrics */}
        <Card className="border-yellow-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <span>Métricas de Eficiência dos Setores</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sectorEfficiency.map((item, index) => {
                const getColor = (sector: string) => {
                  switch (sector) {
                    case 'Recebimento': return 'blue';
                    case 'Embalagem': return 'green';
                    case 'Inventário': return 'yellow';
                    case 'Custos': return 'purple';
                    default: return 'gray';
                  }
                };
                
                const color = getColor(item.sector);
                const bgColor = `bg-${color}-50`;
                const borderColor = `border-${color}-200`;
                const textColor = `text-${color}-600`;
                const accentColor = `text-${color}-500`;
                
                return (
                  <div key={index} className={`text-center p-4 ${bgColor} rounded-lg border ${borderColor}`}>
                    <div className={`text-2xl font-bold ${textColor}`}>
                      {item.efficiency.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.sector}
                    </div>
                    <div className={`text-xs ${accentColor} mt-1`}>
                      {item.metric}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cross-Sector Insights */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">
                Insights de Correlação:
              </h4>
              <div className="space-y-2">
                {crossSectorInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 rounded bg-blue-100 border border-blue-200"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">
                      {insight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-sm text-gray-600">
          <p>
            <strong>Observação:</strong> Os dados exibidos nesta Torre de
            Controle são agregados do armazenamento local (localStorage) do seu
            navegador. Para uma visão em tempo real e compartilhada entre
            múltiplos usuários, seria necessária a integração com um banco de
            dados centralizado.
          </p>
          <Button
                            onClick={loadInitialData}
            variant="outline"
            className="mt-4 bg-transparent"
          >
            Atualizar Dados Manualmente
          </Button>
        </div>

        {/* Modal do Inventário */}
        {showInventarioModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-orange-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Relatório Completo do Inventário
                    </h2>
                    <p className="text-gray-600">
                      Todas as notas fiscais bipadas em todas as ruas
                    </p>
    </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInventarioModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Estatísticas Resumidas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {inventarioFiltrado.length}
                    </div>
                    <div className="text-sm text-gray-600">Total de NFs</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {inventarioFiltrado.reduce(
                        (sum, item) => sum + item.volumes * item.quantidade,
                        0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Total de Volumes
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(inventarioFiltrado.map((item) => item.rua)).size}
                    </div>
                    <div className="text-sm text-gray-600">Ruas Únicas</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {
                        new Set(
                          inventarioFiltrado.map((item) => item.fornecedor)
                        ).size
                      }
                    </div>
                    <div className="text-sm text-gray-600">Fornecedores</div>
                  </div>
                </div>

                {/* Filtros */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Filtros
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rua
                      </label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        onChange={(e) => {
                          const rua = e.target.value;
                          if (rua === "todas") {
                            setInventarioFiltrado(inventarioDetalhado);
                          } else {
                            const itensFiltrados = inventarioDetalhado.filter(
                              (item) => item.rua === rua
                            );
                            setInventarioFiltrado(itensFiltrados);
                          }
                        }}
                      >
                        <option value="todas">Todas as Ruas</option>
                        {Array.from(
                          new Set(inventarioDetalhado.map((item) => item.rua))
                        ).map((rua) => (
                          <option key={rua} value={rua}>
                            {rua}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fornecedor
                      </label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        onChange={(e) => {
                          const fornecedor = e.target.value;
                          if (fornecedor === "todos") {
                            setInventarioFiltrado(inventarioDetalhado);
                          } else {
                            const itensFiltrados = inventarioDetalhado.filter(
                              (item) => item.fornecedor === fornecedor
                            );
                            setInventarioFiltrado(itensFiltrados);
                          }
                        }}
                      >
                        <option value="todos">Todos os Fornecedores</option>
                        {Array.from(
                          new Set(
                            inventarioDetalhado.map((item) => item.fornecedor)
                          )
                        ).map((fornecedor) => (
                          <option key={fornecedor} value={fornecedor}>
                            {fornecedor}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente Destino
                      </label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        onChange={(e) => {
                          const cliente = e.target.value;
                          if (cliente === "todos") {
                            setInventarioFiltrado(inventarioDetalhado);
                          } else {
                            const itensFiltrados = inventarioDetalhado.filter(
                              (item) => item.clienteDestino === cliente
                            );
                            setInventarioFiltrado(itensFiltrados);
                          }
                        }}
                      >
                        <option value="todos">Todos os Clientes</option>
                        {Array.from(
                          new Set(
                            inventarioDetalhado.map(
                              (item) => item.clienteDestino
                            )
                          )
                        ).map((cliente) => (
                          <option key={cliente} value={cliente}>
                            {cliente}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          NF
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fornecedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente Destino
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rua
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volumes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qtd
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destino
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventarioFiltrado.length > 0 ? (
                        inventarioFiltrado.map((item, index) => (
                          <tr
                            key={item.id}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.numeroNF}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.fornecedor}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.clienteDestino}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {item.rua}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.volumes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item.quantidade}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.destino}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            Nenhum item de inventário encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Total de itens:{" "}
                    <span className="font-medium">
                      {inventarioFiltrado.length}
                    </span>
                  </div>
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadInventarioDetalhado();
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                    <Button
                      onClick={() => {
                        // Função para exportar para CSV
                        const csvContent = [
                          [
                            "NF",
                            "Fornecedor",
                            "Cliente Destino",
                            "Rua",
                            "Volumes",
                            "Quantidade",
                            "Destino",
                            "Data/Hora",
                          ],
                          ...inventarioFiltrado.map((item) => [
                            item.numeroNF,
                            item.fornecedor,
                            item.clienteDestino,
                            item.rua,
                            item.volumes.toString(),
                            item.quantidade.toString(),
                            item.destino,
                            new Date(item.timestamp).toLocaleString("pt-BR"),
                          ]),
                        ]
                          .map((row) => row.join(","))
                          .join("\n");

                        const blob = new Blob([csvContent], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const link = document.createElement("a");
                        const url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.setAttribute(
                          "download",
                          `inventario_completo_${
                            new Date().toISOString().split("T")[0]
                          }.csv`
                        );
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

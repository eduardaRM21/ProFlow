"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Package,
  Truck,
  BarChart3,
  Calendar,
  Users,
  MessageCircle,
  HelpCircle,
  Activity,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Atualizar a importação para incluir o novo componente
import NFsBipadasSection from "./components/nfs-bipadas-section";
import CarrosProduzidosSection from "./components/carros-produzidos-section";
import ChatModal from "./components/chat-modal";

// Adicionar a importação do novo componente de ajuda
import AjudaSection from "./components/ajuda-section";
import { useSession } from "@/hooks/use-database";
import type { SessionData } from "@/lib/database-service";

export default function PainelPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [stats, setStats] = useState({
    nfsBipadas: 0,
    carrosProduzidos: 0,
    relatoriosGerados: 0,
  });
  const router = useRouter();

  // Hook do banco de dados
  const { getSession } = useSession();

  useEffect(() => {
    const verificarSessao = async () => {
      try {
        // Obter sessão do banco de dados
        const session = await getSession("current")
        
        if (!session) {
          // Fallback temporário para localStorage
          const sessionLocal = localStorage.getItem("sistema_session")
          if (!sessionLocal) {
            router.push("/")
            return
          }
          
          const sessionObj = JSON.parse(sessionLocal)
          setSessionData(sessionObj)
        } else {
          setSessionData(session)
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error)
        console.log("⚠️ Usando fallback para localStorage")
        
        // Fallback temporário
        const sessionLocal = localStorage.getItem("sistema_session")
        if (!sessionLocal) {
          router.push("/")
          return
        }
        
        const sessionObj = JSON.parse(sessionLocal)
        setSessionData(sessionObj)
      }
    }

    verificarSessao()
  }, [router, getSession])

  const handleLogout = () => {
    localStorage.removeItem("sistema_session");
    router.push("/");
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

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            {/* Logo e Título */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">
                  Profarma Distribuição
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block">
                  Sistema de Bipagem
                </p>
              </div>
            </div>

            {/* Informações do Usuário e Sair */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 sm:flex-none">
                {/* Colaborador */}
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span className="font-medium truncate text-xs sm:text-sm">
                    {sessionData.colaboradores.length === 1
                      ? sessionData.colaboradores[0]
                      : `${sessionData.colaboradores.join(" + ")} (Dupla)`}
                  </span>
                </div>

                {/* Data */}
                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{sessionData.data}</span>
                </div>

                {/* Turno */}
                <Badge
                  className={`text-xs px-1.5 sm:px-2.5 py-0.5 ${getTurnoColor(
                    sessionData.turno
                  )}`}
                >
                  <span className="sm:inline">Turno&nbsp;</span>
                  {sessionData.turno}
                  <span className="sm:inline">
                    {" "}
                    &nbsp;- {getTurnoLabel(sessionData.turno)}
                  </span>
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 bg-transparent hover:bg-green-50 border-green-200 px-2 sm:px-4 flex-shrink-0 text-xs sm:text-sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {!activeSection ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 sm:p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs sm:text-sm">
                      NFs Bipadas
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {stats.nfsBipadas}
                    </p>
                  </div>
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm">
                      Carros Prontos
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {stats.carrosProduzidos}
                    </p>
                  </div>
                  <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
                </div>
              </div>
            </div>
            {/* Cards de Ações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Bipagem de NFs */}
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-green-400 hover:-translate-y-1 bg-gradient-to-br from-white to-green-50">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="p-3 sm:p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors duration-300 group-hover:scale-110 transform">
                      <Package className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 group-hover:text-green-700" />
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-green-800">
                    Bipagem de NFs
                  </CardTitle>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                    Bipar códigos de barras das notas fiscais e acompanhar o
                    progresso
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 mb-3 sm:mb-4">
                    <span>Hoje: {stats.nfsBipadas} NFs</span>
                    <span className="text-green-600 font-medium">↗ +3</span>
                  </div>
                  <Button
                    className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold bg-green-600 hover:bg-green-700 group-hover:bg-green-700 transition-all duration-300"
                    onClick={() => setActiveSection("nfs")}
                  >
                    Iniciar Bipagem
                  </Button>
                </CardContent>
              </Card>

              {/* Card 2: Carros Produzidos */}
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-400 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="p-3 sm:p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300 group-hover:scale-110 transform">
                      <Truck className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 group-hover:text-blue-700" />
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-800">
                    Carros Produzidos
                  </CardTitle>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pronto
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                    Visualizar carros finalizados, status de entrega e
                    informações detalhadas
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 mb-3 sm:mb-4">
                    <span>Carros: {stats.carrosProduzidos}</span>
                    <span className="text-blue-600 font-medium">100%</span>
                  </div>
                  <Button
                    className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700 transition-all duration-300"
                    onClick={() => setActiveSection("carros")}
                  >
                    Ver Carros
                  </Button>
                </CardContent>
              </Card>

              {/* Card 3: Central de Ajuda */}
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-400 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50 md:col-span-2 lg:col-span-1">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="p-3 sm:p-4 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors duration-300 group-hover:scale-110 transform">
                      <HelpCircle className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600 group-hover:text-purple-700" />
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-purple-800">
                    Central de Ajuda
                  </CardTitle>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Suporte
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                    Dúvidas sobre o sistema? Acesse nossa central de ajuda com
                    chat em tempo real
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 mb-3 sm:mb-4">
                    <span>Suporte 24h</span>
                    <span className="text-purple-600 font-medium">Online</span>
                  </div>
                  <Button
                    className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold bg-purple-600 hover:bg-purple-700 group-hover:bg-purple-700 transition-all duration-300"
                    onClick={() => setActiveSection("ajuda")}
                  >
                    Acessar Ajuda
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <Button
              variant="outline"
              onClick={() => setActiveSection(null)}
              className="mb-2 sm:mb-3 text-sm sm:text-base"
            >
              ← Voltar ao Menu Principal
            </Button>

            {/* Substituir a função NFsBipadasSection existente por: */}
            {activeSection === "nfs" && (
              <NFsBipadasSection sessionData={sessionData} />
            )}
            {activeSection === "carros" && (
              <CarrosProduzidosSection sessionData={sessionData} />
            )}
            {activeSection === "ajuda" && (
              <AjudaSection sessionData={sessionData} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

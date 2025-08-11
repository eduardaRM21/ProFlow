"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Phone, Mail, HelpCircle, ExternalLink, Clock, MessageSquare } from "lucide-react"
import ChatModal from "./chat-modal"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auiidcxarcjjxvyswwhf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'
const supabase = createClient(supabaseUrl, supabaseKey)

interface SessionData {
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
}

interface AjudaSectionProps {
  sessionData: SessionData
}

export default function AjudaSection({ sessionData }: AjudaSectionProps) {
  const [chatAberto, setChatAberto] = useState(false)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)

  const conversaId = `${sessionData.colaboradores.join("_")}_${sessionData.data}_${sessionData.turno}`

  useEffect(() => {
    // Verificar mensagens não lidas
    verificarMensagensNaoLidas()

    // Polling para verificar novas mensagens
    const interval = setInterval(() => {
      verificarMensagensNaoLidas()
    }, 3000)
    return () => clearInterval(interval)
  }, [conversaId])

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
  }

  const abrirChat = () => {
    setChatAberto(true)
    setMensagensNaoLidas(0) // Zerar contador ao abrir
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <span>Central de Ajuda</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Precisa de ajuda? Entre em contato conosco através dos canais abaixo. Nossa equipe está pronta para auxiliar
            você com qualquer dúvida sobre o sistema de bipagem.
          </p>
        </CardContent>
      </Card>

      {/* Canais de Contato */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Chat Interno */}
        <Card className="border-blue-200 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span>Chat Coletivo</span>
              {mensagensNaoLidas > 0 && (
                <Badge className="bg-red-500 text-white text-xs sm:text-sm ml-2">
                  {mensagensNaoLidas}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 pt-0">
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Chat coletivo com todos os administradores do sistema. Mensagens em tempo real e histórico completo.
            </p>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="break-words">Disponível 24h • Resposta imediata</span>
            </div>
            <Button 
              onClick={abrirChat} 
              className="w-full bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base"
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
              Abrir Chat Coletivo
              {mensagensNaoLidas > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">
                  {mensagensNaoLidas}
                </Badge>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Rápido */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0" />
            <span>Perguntas Frequentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 pt-0">
          <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">
              Como bipar um código de barras?
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Use o botão "Scanner" para ativar a câmera ou digite manualmente o código no formato:
              codigo|nf|volume|destino|fornecedor|destino_final|tipo
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">
              O que significam as cores das NFs?
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              ✅ Verde: NF válida | ⚠️ Amarelo: Destino divergente | ❌ Vermelho: Erro de leitura
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">
              Como alterar o status do carro?
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              No painel de bipagem, use o seletor "Status do Carro" para alterar entre: Aguardando Colagem, Em
              Conferência, Liberado ou Em Produção.
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-3 sm:pl-4">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">
              Posso trabalhar em dupla?
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Sim! Na tela de login, use o botão "Adicionar" para incluir até 3 colaboradores na mesma sessão.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal do Chat */}
      <ChatModal isOpen={chatAberto} onClose={() => setChatAberto(false)} sessionData={sessionData} />
    </div>
  )
}

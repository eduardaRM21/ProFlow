"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, MessageCircle, User, Clock, CheckCircle2 } from "lucide-react"
import { createClient } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'

interface ChatMessage {
  id: string
  remetente_id: string
  remetente_nome: string
  remetente_tipo: "colaborador" | "admin"
  mensagem: string
  timestamp: string
  lida: boolean
}

interface SessionData {
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  sessionData: SessionData
}

const supabaseUrl = 'https://auiidcxarcjjxvyswwhf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function ChatModal({ isOpen, onClose, sessionData }: ChatModalProps) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [novaMensagem, setNovaMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [ultimoIdMensagem, setUltimoIdMensagem] = useState<string | null>(null)

  // ID único da conversa baseado nos colaboradores, data e turno
  const conversaId = `chat_coletivo_${sessionData.data}_${sessionData.turno}`

  useEffect(() => {
    let polling: NodeJS.Timeout | null = null
    const buscarMensagens = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .order('timestamp', { ascending: true })
      if (data) {
        // Detectar nova mensagem do admin
        const novaMsg = data[data.length - 1]
        const abaVisivel = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
        if (
          mensagens.length > 0 &&
          novaMsg &&
          novaMsg.remetente_tipo === 'admin' &&
          (!isOpen || !abaVisivel) &&
          (!mensagens.find((m) => m.id === novaMsg.id))
        ) {
          toast({
            title: 'Nova mensagem do suporte',
            description: novaMsg.mensagem,
          })
        }
        setMensagens(data)
      }
    }
    polling = setInterval(buscarMensagens, 2000)
    buscarMensagens()
    return () => {
      if (polling) clearInterval(polling)
    }
  }, [conversaId, isOpen])

  useEffect(() => {
    // Scroll automático para a última mensagem
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [mensagens])

  const carregarMensagens = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
      .order('timestamp', { ascending: true })
    if (!error && data) {
      setMensagens(data)
    }
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || enviando) return
    setEnviando(true)
    setErroEnvio(null)
    const mensagem = {
      id: crypto.randomUUID(),
      remetente_id: conversaId,
      remetente_nome: sessionData.colaboradores.join(' + '),
      remetente_tipo: 'colaborador',
      destinatario_id: 'admin', // Mensagem sempre enviada para o admin
      mensagem: novaMensagem.trim(),
      timestamp: new Date().toISOString(),
      lida: false,
    }
    const { error } = await supabase.from('messages').insert([mensagem])
    if (!error) {
      // Salvar também no localStorage para o admin
      const mensagemParaLocalStorage = {
        id: mensagem.id,
        remetenteId: mensagem.remetente_id,
        remetenteNome: mensagem.remetente_nome,
        remetenteTipo: mensagem.remetente_tipo,
        destinatarioId: mensagem.destinatario_id,
        mensagem: mensagem.mensagem,
        timestamp: mensagem.timestamp,
        lida: mensagem.lida,
      }
      
      // Salvar na lista geral de conversas para o admin
      salvarNaListaGeral(mensagemParaLocalStorage)
      
      // Salvar na conversa específica
      const chaveStorage = `profarma_chat_${conversaId}`
      const mensagensExistentes = localStorage.getItem(chaveStorage)
      const mensagensArray = mensagensExistentes ? JSON.parse(mensagensExistentes) : []
      mensagensArray.push(mensagemParaLocalStorage)
      localStorage.setItem(chaveStorage, JSON.stringify(mensagensArray))
      
      setNovaMensagem("")
      carregarMensagens()
    } else {
      setErroEnvio('Erro ao enviar mensagem: ' + error.message)
      alert('Erro ao enviar mensagem: ' + error.message)
    }
    setEnviando(false)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  const salvarNaListaGeral = (mensagem: ChatMessage) => {
    // Lista geral de conversas para o admin
    const chaveListaGeral = "profarma_conversas_admin"
    const conversasExistentes = localStorage.getItem(chaveListaGeral)
    const conversas = conversasExistentes ? JSON.parse(conversasExistentes) : []

    // Verificar se já existe uma conversa para este grupo
    const conversaExistente = conversas.find((c: any) => c.id === conversaId)

    if (conversaExistente) {
      // Atualizar conversa existente
      conversaExistente.ultimaMensagem = mensagem.mensagem
      conversaExistente.ultimoTimestamp = mensagem.timestamp
      conversaExistente.mensagensNaoLidas = (conversaExistente.mensagensNaoLidas || 0) + 1
    } else {
      // Criar nova conversa
      const novaConversa = {
        id: conversaId,
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        ultimaMensagem: mensagem.mensagem,
        ultimoTimestamp: mensagem.timestamp,
        mensagensNaoLidas: 1,
      }
      conversas.push(novaConversa)
    }

    // Ordenar por timestamp mais recente
    conversas.sort((a: any, b: any) => new Date(b.ultimoTimestamp).getTime() - new Date(a.ultimoTimestamp).getTime())

    localStorage.setItem(chaveListaGeral, JSON.stringify(conversas))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const formatarHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatarData = (timestamp: string) => {
    const data = new Date(timestamp)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)

    if (data.toDateString() === hoje.toDateString()) {
      return "Hoje"
    } else if (data.toDateString() === ontem.toDateString()) {
      return "Ontem"
    } else {
      return data.toLocaleDateString("pt-BR")
    }
  }

  // Agrupar mensagens por data
  const mensagensAgrupadas = mensagens.reduce((grupos: any, mensagem) => {
    const data = formatarData(mensagem.timestamp)
    if (!grupos[data]) {
      grupos[data] = []
    }
    grupos[data].push(mensagem)
    return grupos
  }, {})

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] h-[80vh] sm:h-[600px] flex flex-col p-0 mx-auto">
        <DialogHeader className="p-3 sm:p-4 border-b bg-green-50 flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <span>Chat Coletivo de Suporte</span>
          </DialogTitle>
          <div className="text-xs sm:text-sm text-gray-600 break-words">
            {sessionData.colaboradores.join(" + ")} • {sessionData.data} • Turno {sessionData.turno}
          </div>
        </DialogHeader>

        {/* Área de mensagens */}
        <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollAreaRef}>
          {Object.keys(mensagensAgrupadas).length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">Nenhuma mensagem ainda.</p>
              <p className="text-xs sm:text-sm">Envie uma mensagem para iniciar a conversa!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(mensagensAgrupadas).map(([data, mensagensData]: [string, any]) => (
                <div key={data}>
                  {/* Separador de data */}
                  <div className="flex items-center justify-center my-3 sm:my-4">
                    <div className="bg-gray-100 text-gray-600 text-xs px-2 sm:px-3 py-1 rounded-full">
                      {data}
                    </div>
                  </div>

                  {/* Mensagens do dia */}
                  <div className="space-y-2 sm:space-y-3">
                    {mensagensData.map((mensagem: ChatMessage) => (
                      <div
                        key={mensagem.id}
                        className={`flex ${mensagem.remetente_tipo === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-2 sm:px-3 py-2 shadow-sm
                            ${mensagem.remetente_tipo === 'admin'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-green-600 text-white'}
                          `}
                        >
                          {mensagem.remetente_tipo === 'admin' && (
                            <div className="flex items-center space-x-1 mb-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="text-xs font-medium">Administrador</span>
                            </div>
                          )}
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                            {mensagem.mensagem}
                          </p>
                          <div
                            className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
                              mensagem.remetente_tipo === 'admin' ? 'text-blue-700' : 'text-green-100'
                            }`}
                          >
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{formatarHora(mensagem.timestamp)}</span>
                            {mensagem.remetente_tipo === 'colaborador' && mensagem.lida && (
                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Campo de envio */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              placeholder="Digite sua mensagem..."
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={enviando}
              className="flex-1 text-sm sm:text-base"
            />
            <Button
              onClick={enviarMensagem}
              disabled={!novaMensagem.trim() || enviando}
              className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              size="sm"
            >
              {enviando ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Pressione Enter para enviar</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

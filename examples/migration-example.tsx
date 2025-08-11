"use client"

import { useEffect, useState } from 'react'
import { useSession, useRecebimento } from '@/hooks/use-database'

// Exemplo de como migrar um componente existente
export default function MigrationExample() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Usar os hooks de banco de dados
  const { getSession, saveSession } = useSession()
  const { getNotas, saveNotas } = useRecebimento()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar sessão
      const sessionId = 'session_exemplo_01-01-2024_A'
      const session = await getSession(sessionId)
      setSessionData(session)

      // Carregar notas
      const notasData = await getNotas(sessionId)
      setNotas(notasData)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNota = async (novaNota: any) => {
    try {
      const sessionId = 'session_exemplo_01-01-2024_A'
      const notasAtualizadas = [...notas, novaNota]
      
      // Salvar no banco de dados (ou localStorage, dependendo da configuração)
      await saveNotas(sessionId, notasAtualizadas)
      setNotas(notasAtualizadas)

      console.log('Nota salva com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Exemplo de Migração</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Sessão:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Notas ({notas.length}):</h3>
          <div className="space-y-2">
            {notas.map((nota, index) => (
              <div key={index} className="bg-blue-50 p-2 rounded">
                <strong>NF:</strong> {nota.numeroNF} | 
                <strong>Volumes:</strong> {nota.volumes}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleSaveNota({
            id: Date.now().toString(),
            numeroNF: `NF${Date.now()}`,
            volumes: Math.floor(Math.random() * 10) + 1,
            timestamp: new Date().toISOString()
          })}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Adicionar Nota de Teste
        </button>
      </div>
    </div>
  )
}

// Exemplo de como seria ANTES da migração (com localStorage)
export function ComponenteAntes() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [notas, setNotas] = useState<any[]>([])

  useEffect(() => {
    // Carregar dados do localStorage
    const session = localStorage.getItem('sistema_session')
    if (session) {
      setSessionData(JSON.parse(session))
    }

    const notasData = localStorage.getItem('recebimento_exemplo_01-01-2024_A')
    if (notasData) {
      setNotas(JSON.parse(notasData))
    }
  }, [])

  const handleSaveNota = (novaNota: any) => {
    const notasAtualizadas = [...notas, novaNota]
    setNotas(notasAtualizadas)
    
    // Salvar no localStorage
    localStorage.setItem('recebimento_exemplo_01-01-2024_A', JSON.stringify(notasAtualizadas))
  }

  return (
    <div>
      {/* Interface similar */}
    </div>
  )
}

// Exemplo de como seria DEPOIS da migração (com hooks)
export function ComponenteDepois() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Usar hooks de banco de dados
  const { getSession, saveSession } = useSession()
  const { getNotas, saveNotas } = useRecebimento()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar dados do banco
      const session = await getSession('session_id')
      setSessionData(session)

      const notasData = await getNotas('session_id')
      setNotas(notasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNota = async (novaNota: any) => {
    try {
      const notasAtualizadas = [...notas, novaNota]
      setNotas(notasAtualizadas)
      
      // Salvar no banco
      await saveNotas('session_id', notasAtualizadas)
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      {/* Interface similar */}
    </div>
  )
}

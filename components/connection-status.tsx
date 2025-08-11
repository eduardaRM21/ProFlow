"use client"

import { useConnectivity } from '@/hooks/use-database'
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ConnectionStatus() {
  const { isConnected, isFullyConnected, connectionHealth } = useConnectivity()

  if (isConnected === null) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
        Verificando conexão...
      </Badge>
    )
  }

  if (isFullyConnected) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Conectado
      </Badge>
    )
  }

  if (isConnected) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Conexão instável
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      <WifiOff className="h-3 w-3 mr-1" />
      Sem conexão
    </Badge>
  )
}

export function ConnectionStatusDetailed() {
  const { isConnected, isFullyConnected, connectionHealth } = useConnectivity()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Status da Conexão:</span>
        <ConnectionStatus />
      </div>
      
      {connectionHealth && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Circuit Breaker: {connectionHealth.circuitBreakerState}</div>
          <div>Cliente Supabase: {connectionHealth.supabaseInstance ? 'Ativo' : 'Inativo'}</div>
        </div>
      )}
      
      {!isFullyConnected && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Algumas funcionalidades podem estar limitadas. Os dados estão sendo salvos localmente.
        </div>
      )}
    </div>
  )
}

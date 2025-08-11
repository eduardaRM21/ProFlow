import React from 'react'
import { Wifi, WifiOff, Database, Server, AlertTriangle } from 'lucide-react'
import { Badge } from './badge'

interface ConnectivityStatusProps {
  isOnline: boolean
  isSupabaseConnected: boolean
  className?: string
}

export const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({
  isOnline,
  isSupabaseConnected,
  className = ''
}) => {
  const isFullyConnected = isOnline && isSupabaseConnected

  if (isFullyConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Wifi className="h-4 w-4 text-green-600" />
        <Database className="h-4 w-4 text-green-600" />
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          Conectado
        </Badge>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}
      {isSupabaseConnected ? (
        <Database className="h-4 w-4 text-green-600" />
      ) : (
        <Server className="h-4 w-4 text-red-600" />
      )}
      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
        {!isOnline ? 'Sem Internet' : 'Banco Offline'}
      </Badge>
    </div>
  )
}

export const ConnectivityAlert: React.FC<ConnectivityStatusProps> = ({
  isOnline,
  isSupabaseConnected
}) => {
  const isFullyConnected = isOnline && isSupabaseConnected

  if (isFullyConnected) {
    return null
  }

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <div className="text-sm text-yellow-800">
          <strong>Modo Offline:</strong> Os dados estão sendo salvos localmente. 
          {!isOnline && ' Verifique sua conexão com a internet.'}
          {isOnline && !isSupabaseConnected && ' Tentando reconectar com o banco de dados...'}
        </div>
      </div>
    </div>
  )
}

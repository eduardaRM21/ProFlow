import React from 'react'
import { HardDrive, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from './badge'
import { LocalAuthService } from '@/lib/local-auth-service'

interface AuthStatusProps {
  area: string
  className?: string
}

export const AuthStatus: React.FC<AuthStatusProps> = ({
  area,
  className = ''
}) => {
  const isLocalAuth = LocalAuthService.isLocalAuthArea(area)
  const isDatabaseAuth = LocalAuthService.isDatabaseAuthArea(area)
  const hasActiveSession = LocalAuthService.hasActiveSession()

  if (isLocalAuth) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <HardDrive className="h-4 w-4 text-green-600" />
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          Autenticação Local
        </Badge>
        {hasActiveSession && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </div>
    )
  }

  if (isDatabaseAuth) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Database className="h-4 w-4 text-blue-600" />
        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
          Autenticação no Banco
        </Badge>
        {hasActiveSession && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <AlertCircle className="h-4 w-4 text-gray-600" />
      <Badge variant="outline" className="text-gray-600">
        Área não configurada
      </Badge>
    </div>
  )
}

export const AuthInfo: React.FC<AuthStatusProps> = ({
  area
}) => {
  const isLocalAuth = LocalAuthService.isLocalAuthArea(area)
  const isDatabaseAuth = LocalAuthService.isDatabaseAuthArea(area)

  if (isLocalAuth) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <HardDrive className="h-5 w-5 text-green-600" />
          <div className="text-sm text-green-800">
            <strong>Autenticação Local:</strong> Dados salvos no dispositivo. 
            Login rápido e funcionamento offline.
          </div>
        </div>
      </div>
    )
  }

  if (isDatabaseAuth) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-600" />
          <div className="text-sm text-blue-800">
            <strong>Autenticação no Banco:</strong> Dados sincronizados com o servidor. 
            Requer conexão com a internet.
          </div>
        </div>
      </div>
    )
  }

  return null
}

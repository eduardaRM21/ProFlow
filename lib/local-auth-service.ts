import type { SessionData } from './database-service'

// Serviço de autenticação local para setores operacionais
export class LocalAuthService {
  private static readonly SESSION_KEY = 'sistema_session'
  private static readonly LOCAL_USERS_KEY = 'local_users'

  // Usuários locais para recebimento e embalagem
  private static readonly LOCAL_USERS = [
    { nome: 'João Silva', area: 'recebimento' },
    { nome: 'Maria Santos', area: 'recebimento' },
    { nome: 'Pedro Costa', area: 'recebimento' },
    { nome: 'Ana Oliveira', area: 'embalagem' },
    { nome: 'Carlos Lima', area: 'embalagem' },
    { nome: 'Lucia Ferreira', area: 'embalagem' },
  ]

  // Inicializar usuários locais se não existirem
  static initializeLocalUsers() {
    if (!localStorage.getItem(this.LOCAL_USERS_KEY)) {
      localStorage.setItem(this.LOCAL_USERS_KEY, JSON.stringify(this.LOCAL_USERS))
    }
  }

  // Verificar se uma área usa autenticação local
  static isLocalAuthArea(area: string): boolean {
    return ['recebimento', 'embalagem', 'inventario'].includes(area)
  }

  // Verificar se uma área usa autenticação no banco
  static isDatabaseAuthArea(area: string): boolean {
    return ['custos', 'crdk'].includes(area)
  }

  // Salvar sessão local
  static saveLocalSession(sessionData: SessionData): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
      console.log('💾 Sessão salva localmente:', sessionData.area)
    } catch (error) {
      console.error('❌ Erro ao salvar sessão local:', error)
      throw error
    }
  }

  // Carregar sessão local
  static getLocalSession(): SessionData | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session = JSON.parse(sessionData)
      console.log('✅ Sessão carregada localmente:', session.area)
      return session
    } catch (error) {
      console.error('❌ Erro ao carregar sessão local:', error)
      return null
    }
  }

  // Deletar sessão local
  static deleteLocalSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
      console.log('🗑️ Sessão local deletada')
    } catch (error) {
      console.error('❌ Erro ao deletar sessão local:', error)
    }
  }

  // Verificar se há sessão ativa
  static hasActiveSession(): boolean {
    const session = this.getLocalSession()
    return session !== null
  }

  // Validar sessão local
  static validateLocalSession(): SessionData | null {
    const session = this.getLocalSession()
    if (!session) return null

    // Verificar se a sessão não expirou (24 horas)
    const loginTime = new Date(session.loginTime)
    const now = new Date()
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      console.log('⏰ Sessão local expirada, removendo...')
      this.deleteLocalSession()
      return null
    }

    return session
  }

  // Verificar se o usuário tem permissão para a área
  static hasPermissionForArea(area: string): boolean {
    const session = this.getLocalSession()
    if (!session) return false

    return session.area === area
  }

  // Logout local
  static logout(): void {
    this.deleteLocalSession()
    console.log('👋 Logout local realizado')
  }

  // Migrar dados do localStorage para o banco (quando necessário)
  static async migrateToDatabase(sessionData: SessionData): Promise<void> {
    // Esta função será chamada quando o sistema quiser sincronizar dados locais
    // Por enquanto, apenas log para debug
    console.log('🔄 Dados locais prontos para migração:', sessionData)
  }

  // Obter estatísticas de uso local
  static getLocalStats() {
    const session = this.getLocalSession()
    return {
      hasActiveSession: !!session,
      currentArea: session?.area || null,
      loginTime: session?.loginTime || null,
      colaboradores: session?.colaboradores || []
    }
  }
}

// Inicializar usuários locais quando o módulo for carregado
if (typeof window !== 'undefined') {
  LocalAuthService.initializeLocalUsers()
}

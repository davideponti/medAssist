import 'server-only'

type SecurityEvent = {
  type: 'auth_success' | 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_access' | 'permission_denied'
  userId?: string
  email?: string
  ip: string
  userAgent?: string
  action: string
  resource?: string
  metadata?: Record<string, any>
  timestamp: Date
}

class SecurityLogger {
  private logs: SecurityEvent[] = []
  private maxLogs = 10000 // Keep last 10k events in memory

  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const logEntry: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    }

    this.logs.push(logEntry)
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console logging for development
    console.log(`[SECURITY] ${event.type.toUpperCase()}: ${event.action}`, {
      userId: event.userId,
      ip: event.ip,
      timestamp: logEntry.timestamp.toISOString(),
      ...event.metadata,
    })

    // In production, you'd send to external service
    // this.sendToExternalService(logEntry)
  }

  getRecentLogs(minutes: number = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.logs.filter(log => log.timestamp >= cutoff)
  }

  getFailedLogins(minutes: number = 60): number {
    return this.getRecentLogs(minutes)
      .filter(log => log.type === 'auth_failure' && log.action.includes('login'))
      .length
  }

  getSuspiciousActivity(minutes: number = 60): SecurityEvent[] {
    return this.getRecentLogs(minutes)
      .filter(log => log.type === 'suspicious_activity' || log.type === 'rate_limit')
  }

  private async sendToExternalService(log: SecurityEvent): Promise<void> {
    // Integration with services like:
    // - Datadog
    // - Sentry
    // - ELK Stack
    // - Custom webhook
    // 
    // Example:
    // await fetch('https://your-logging-service.com/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(log)
    // })
  }
}

export const securityLogger = new SecurityLogger()

// Helper functions for common events
export const logAuthSuccess = (userId: string, email: string, ip: string, userAgent?: string) => {
  securityLogger.log({
    type: 'auth_success',
    userId,
    email,
    ip,
    userAgent,
    action: 'user_login',
  })
}

export const logAuthFailure = (email: string, ip: string, reason: string, userAgent?: string) => {
  securityLogger.log({
    type: 'auth_failure',
    email,
    ip,
    userAgent,
    action: 'login_failed',
    metadata: { reason },
  })
}

export const logRateLimit = (key: string, ip: string, limit: number) => {
  securityLogger.log({
    type: 'rate_limit',
    ip,
    action: 'rate_limit_exceeded',
    metadata: { key, limit },
  })
}

export const logSuspiciousActivity = (userId: string, ip: string, activity: string, metadata?: Record<string, any>) => {
  securityLogger.log({
    type: 'suspicious_activity',
    userId,
    ip,
    action: activity,
    metadata,
  })
}

export const logDataAccess = (userId: string, ip: string, resource: string, action: string) => {
  securityLogger.log({
    type: 'data_access',
    userId,
    ip,
    action,
    resource,
  })
}

export const logPermissionDenied = (userId: string, ip: string, resource: string, action: string) => {
  securityLogger.log({
    type: 'permission_denied',
    userId,
    ip,
    action,
    resource,
  })
}

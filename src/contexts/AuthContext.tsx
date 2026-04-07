'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type User = {
  id: string
  email: string
  name?: string
}

type Doctor = {
  id: string
  email: string
  name: string
  specialization: string
  clinic?: string
  address?: string
  phone?: string
  /** Iscrizione all'Ordine dei Medici (Italia) */
  albo_registration?: string | null
  /** Codice fiscale medico */
  fiscal_code?: string | null
}

type AuthContextType = {
  user: User | null
  doctor: Doctor | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<Doctor>) => Promise<void>
}

type SignupData = {
  email: string
  password: string
  name: string
  specialization: string
  clinic?: string
  address?: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const fetchOpts: RequestInit = { credentials: 'include' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', fetchOpts)

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setDoctor(data.doctor)
      } else {
        setUser(null)
        setDoctor(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      ...fetchOpts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setUser(data.user)
    setDoctor(data.doctor)
  }

  const signup = async (data: SignupData) => {
    const response = await fetch('/api/auth/signup', {
      ...fetchOpts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      const msg = error.error || 'Signup failed'
      const detail = error.details ? ` (${error.details})` : ''
      throw new Error(`${msg}${detail}`)
    }

    await login(data.email, data.password)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { ...fetchOpts, method: 'POST' })
    setUser(null)
    setDoctor(null)
  }

  const updateProfile = async (data: Partial<Doctor>) => {
    const response = await fetch('/api/doctor/profile', {
      ...fetchOpts,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Update failed')
    }

    const updatedDoctor = await response.json()
    setDoctor(updatedDoctor)
  }

  return (
    <AuthContext.Provider
      value={{ user, doctor, loading, login, signup, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

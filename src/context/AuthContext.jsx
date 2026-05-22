import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncToSupabase, syncFromSupabase } from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        syncFromSupabase(session.user.id).catch(err =>
          console.error('Sync iniziale da Supabase fallita:', err)
        )
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      if (event === 'SIGNED_IN' && newUser) {
        // Migra progressi locali su Supabase, poi scarica tutto
        await syncToSupabase(newUser.id)
        await syncFromSupabase(newUser.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Crea il profilo direttamente — senza trigger sul DB
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email })
      if (profileError) throw profileError
    }

    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

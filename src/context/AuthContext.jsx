import { createContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncToSupabase, syncFromSupabase, setClearChannel } from '../utils/storage'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef(null)
  const realtimeChannelRef = useRef(null)

  function subscribeRealtime(userId) {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }
    const handler = () => {
      syncFromSupabase(userId).catch(err =>
        console.error('[realtime] sync fallita:', err)
      )
    }
    const channel = supabase
      .channel(`user-data-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, handler)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, handler)
      .on('broadcast', { event: 'progress-cleared' }, () => {
        syncFromSupabase(userId).catch(err =>
          console.error('[broadcast] sync dopo clear fallita:', err)
        )
      })
      .subscribe()
    realtimeChannelRef.current = channel
    setClearChannel(channel)
  }

  function unsubscribeRealtime() {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    setClearChannel(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      userRef.current = u
      setLoading(false)
      if (u) {
        syncFromSupabase(u.id).catch(err =>
          console.error('Sync iniziale da Supabase fallita:', err)
        )
        subscribeRealtime(u.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      userRef.current = newUser

      if (event === 'SIGNED_IN' && newUser) {
        syncToSupabase(newUser.id)
          .then(() => syncFromSupabase(newUser.id))
          .catch(err => console.error('Sync post-login:', err))
        subscribeRealtime(newUser.id)
      }

      if (event === 'SIGNED_OUT') {
        unsubscribeRealtime()
      }
    })

    function handleVisibility() {
      if (document.visibilityState === 'visible' && userRef.current) {
        syncFromSupabase(userRef.current.id).catch(err =>
          console.error('Sync al ritorno in primo piano fallita:', err)
        )
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribeRealtime()
    }
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
    setUser(null)
    const { error } = await supabase.auth.signOut()
    if (error) console.error('signOut Supabase:', error)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}


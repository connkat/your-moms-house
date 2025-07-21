import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export type User = {
  id: string
  email: string
}

export type Item = {
  id: number
  name: string
  total_count: number
  created_at: string
}

export type UserItem = {
  id: number
  user_id: string
  item_id: number
  count: number
  created_at: string
}

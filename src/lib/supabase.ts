import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export type Profile = {
  id: string
  name: string | null
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  email: string
  profile?: Profile
}

export type Category = {
  id: number
  name: string
  created_at: string
  items?: Item[]
}

export type Item = {
  id: number
  name: string
  description?: string
  total_count: number
  created_at: string
  categories?: Category[]
}

export type UserItem = {
  id: number
  user_id: string
  item_id: number
  count: number
  created_at: string
}

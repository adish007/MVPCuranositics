import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://hoywliekcyjadvabnhbw.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhveXdsaWVrY3lqYWR2YWJuaGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2Mjc4NTIsImV4cCI6MjA2ODIwMzg1Mn0._S77qKuFfWoGuB67xNp8C2Cqs7cU4Gr8y_JWqgnKzzk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


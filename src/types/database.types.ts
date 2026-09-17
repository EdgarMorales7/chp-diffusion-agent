export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      group_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          facebook_url: string
          category_id: string | null
          location: string | null
          description: string | null
          approximate_member_count: number | null
          opportunity_score: number | null
          relevance_score: number | null
          activity_level: string | null
          advertising_allowed: boolean | null
          advertising_frequency: string | null
          approval_required: boolean | null
          preferred_day: string | null
          preferred_time: string | null
          status: string | null
          notes: string | null
          last_checked_at: string | null
          last_published_at: string | null
          next_allowed_publication_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          facebook_url: string
          category_id?: string | null
          location?: string | null
          description?: string | null
          approximate_member_count?: number | null
          opportunity_score?: number | null
          relevance_score?: number | null
          activity_level?: string | null
          advertising_allowed?: boolean | null
          advertising_frequency?: string | null
          approval_required?: boolean | null
          preferred_day?: string | null
          preferred_time?: string | null
          status?: string | null
          notes?: string | null
          last_checked_at?: string | null
          last_published_at?: string | null
          next_allowed_publication_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          facebook_url?: string
          category_id?: string | null
          location?: string | null
          description?: string | null
          approximate_member_count?: number | null
          opportunity_score?: number | null
          relevance_score?: number | null
          activity_level?: string | null
          advertising_allowed?: boolean | null
          advertising_frequency?: string | null
          approval_required?: boolean | null
          preferred_day?: string | null
          preferred_time?: string | null
          status?: string | null
          notes?: string | null
          last_checked_at?: string | null
          last_published_at?: string | null
          next_allowed_publication_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      group_rules: {
        Row: {
          id: string
          group_id: string | null
          rule_type: string
          description: string | null
          status: string | null
          value: string | null
          source: string | null
          evidence: string | null
          verification_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          rule_type: string
          description?: string | null
          status?: string | null
          value?: string | null
          source?: string | null
          evidence?: string | null
          verification_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          rule_type?: string
          description?: string | null
          status?: string | null
          value?: string | null
          source?: string | null
          evidence?: string | null
          verification_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}

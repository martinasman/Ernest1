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
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          business_type: string | null
          business_description: string | null
          target_market: string | null
          country_code: string
          ai_context: Json
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          business_type?: string | null
          business_description?: string | null
          target_market?: string | null
          country_code?: string
          ai_context?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          business_type?: string | null
          business_description?: string | null
          target_market?: string | null
          country_code?: string
          ai_context?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          workspace_id: string
          name: string
          tagline: string | null
          colors: Json
          fonts: Json
          logo_url: string | null
          favicon_url: string | null
          tone_of_voice: string
          brand_values: string[] | null
          writing_guidelines: string | null
          border_radius: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          tagline?: string | null
          colors?: Json
          fonts?: Json
          logo_url?: string | null
          favicon_url?: string | null
          tone_of_voice?: string
          brand_values?: string[] | null
          writing_guidelines?: string | null
          border_radius?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          tagline?: string | null
          colors?: Json
          fonts?: Json
          logo_url?: string | null
          favicon_url?: string | null
          tone_of_voice?: string
          brand_values?: string[] | null
          writing_guidelines?: string | null
          border_radius?: string
          created_at?: string
          updated_at?: string
        }
      }
      overviews: {
        Row: {
          id: string
          workspace_id: string
          problems: string[] | null
          existing_alternatives: string | null
          solutions: string[] | null
          unique_value_proposition: string | null
          high_level_concept: string | null
          unfair_advantage: string | null
          customer_segments: Json
          early_adopters: string | null
          channels: string[] | null
          revenue_streams: Json
          key_metrics: string[] | null
          key_resources: string[] | null
          key_activities: string[] | null
          key_partners: string[] | null
          cost_structure: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          problems?: string[] | null
          existing_alternatives?: string | null
          solutions?: string[] | null
          unique_value_proposition?: string | null
          high_level_concept?: string | null
          unfair_advantage?: string | null
          customer_segments?: Json
          early_adopters?: string | null
          channels?: string[] | null
          revenue_streams?: Json
          key_metrics?: string[] | null
          key_resources?: string[] | null
          key_activities?: string[] | null
          key_partners?: string[] | null
          cost_structure?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          problems?: string[] | null
          existing_alternatives?: string | null
          solutions?: string[] | null
          unique_value_proposition?: string | null
          high_level_concept?: string | null
          unfair_advantage?: string | null
          customer_segments?: Json
          early_adopters?: string | null
          channels?: string[] | null
          revenue_streams?: Json
          key_metrics?: string[] | null
          key_resources?: string[] | null
          key_activities?: string[] | null
          key_partners?: string[] | null
          cost_structure?: Json
          created_at?: string
          updated_at?: string
        }
      }
      internal_tools: {
        Row: {
          id: string
          workspace_id: string
          name: string
          slug: string
          description: string | null
          icon: string
          schema_definition: Json
          ui_definition: Json
          connections: Json
          tool_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          slug: string
          description?: string | null
          icon?: string
          schema_definition: Json
          ui_definition: Json
          connections?: Json
          tool_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string
          schema_definition?: Json
          ui_definition?: Json
          connections?: Json
          tool_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      internal_tool_records: {
        Row: {
          id: string
          tool_id: string
          workspace_id: string
          data: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tool_id: string
          workspace_id: string
          data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tool_id?: string
          workspace_id?: string
          data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          workspace_id: string
          context_type: string | null
          context_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          context_type?: string | null
          context_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          context_type?: string | null
          context_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          workspace_id: string
          role: string
          content: string
          tool_calls: Json | null
          tool_results: Json | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          workspace_id: string
          role: string
          content: string
          tool_calls?: Json | null
          tool_results?: Json | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          workspace_id?: string
          role?: string
          content?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}

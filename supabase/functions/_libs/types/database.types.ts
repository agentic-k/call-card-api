export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          attendees: Json | null
          calendar_id: string
          callcard_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          etag: string | null
          html_link: string | null
          id: string
          last_modified: string | null
          raw_event_data: Json | null
          start_time: string | null
          status: string | null
          template_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          calendar_id: string
          callcard_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          etag?: string | null
          html_link?: string | null
          id: string
          last_modified?: string | null
          raw_event_data?: Json | null
          start_time?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: Json | null
          calendar_id?: string
          callcard_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          etag?: string | null
          html_link?: string | null
          id?: string
          last_modified?: string | null
          raw_event_data?: Json | null
          start_time?: string | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_callcard_id_fkey"
            columns: ["callcard_id"]
            isOneToOne: false
            referencedRelation: "callcard"
            referencedColumns: ["callcard_id"]
          },
          {
            foreignKeyName: "calendar_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      callcard: {
        Row: {
          calendar_event_id: string | null
          callcard_id: string
          callcard_name: string
          company_employee_count: number | null
          company_funding_stage: string | null
          company_name: string | null
          company_valuation: number | null
          created_at: string
          key_opportunity: string | null
          person_name: string
          person_title: string | null
          talk_about: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          callcard_id?: string
          callcard_name: string
          company_employee_count?: number | null
          company_funding_stage?: string | null
          company_name?: string | null
          company_valuation?: number | null
          created_at?: string
          key_opportunity?: string | null
          person_name: string
          person_title?: string | null
          talk_about?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_event_id?: string | null
          callcard_id?: string
          callcard_name?: string
          company_employee_count?: number | null
          company_funding_stage?: string | null
          company_name?: string | null
          company_valuation?: number | null
          created_at?: string
          key_opportunity?: string | null
          person_name?: string
          person_title?: string | null
          talk_about?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "callcard_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callcard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_data: Json | null
          company_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          personal_context: string | null
          sales_framework: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          company_data?: Json | null
          company_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          personal_context?: string | null
          sales_framework?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          company_data?: Json | null
          company_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          personal_context?: string | null
          sales_framework?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          error_message: string | null
          is_default_template: boolean
          sales_framework: Json | null
          status: Database["public"]["Enums"]["template_status"]
          template_id: string
          template_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          is_default_template?: boolean
          sales_framework?: Json | null
          status?: Database["public"]["Enums"]["template_status"]
          template_id?: string
          template_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          is_default_template?: boolean
          sales_framework?: Json | null
          status?: Database["public"]["Enums"]["template_status"]
          template_id?: string
          template_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_tokens: {
        Row: {
          access_token_expires_at: string | null
          created_at: string
          google_access_token: string | null
          google_refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_expires_at?: string | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_expires_at?: string | null
          created_at?: string
          google_access_token?: string | null
          google_refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_google_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_channels: {
        Row: {
          channel_id: string
          created_at: string
          expiration_timestamp: string
          last_sync_token: string | null
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          expiration_timestamp: string
          last_sync_token?: string | null
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          expiration_timestamp?: string
          last_sync_token?: string | null
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      template_status:
        | "DRAFT"
        | "AGENT_ASSISTANCE_REQUESTED"
        | "AGENT_CALL_SCHEDULED"
        | "IN_REVIEW"
        | "ACTIVE"
        | "ARCHIVED"
        | "ERROR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      template_status: [
        "DRAFT",
        "AGENT_ASSISTANCE_REQUESTED",
        "AGENT_CALL_SCHEDULED",
        "IN_REVIEW",
        "ACTIVE",
        "ARCHIVED",
        "ERROR",
      ],
    },
  },
} as const


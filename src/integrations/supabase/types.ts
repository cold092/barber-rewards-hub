export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          color: string
          column_id: string
          created_at: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          color?: string
          column_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          color?: string
          column_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          event_data: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id: string
          referral_id: string
        }
        Insert: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          referral_id: string
        }
        Update: {
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          admin_note: string | null
          approved_by: string | null
          created_at: string
          description: string
          id: string
          organization_id: string
          points: number
          profile_id: string
          referral_id: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          approved_by?: string | null
          created_at?: string
          description: string
          id?: string
          organization_id: string
          points: number
          profile_id: string
          referral_id?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          points?: number
          profile_id?: string
          referral_id?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          client_since: string | null
          contact_tag: string | null
          converted_plan_id: string | null
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          created_by_role: Database["public"]["Enums"]["app_role"] | null
          follow_up_date: string | null
          follow_up_note: string | null
          id: string
          is_client: boolean
          is_qualified: boolean | null
          lead_name: string
          lead_phone: string
          lead_points: number
          notes: string | null
          organization_id: string | null
          referred_by_lead_id: string | null
          referrer_id: string
          referrer_name: string
          status: Database["public"]["Enums"]["referral_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          client_since?: string | null
          contact_tag?: string | null
          converted_plan_id?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_role?: Database["public"]["Enums"]["app_role"] | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          id?: string
          is_client?: boolean
          is_qualified?: boolean | null
          lead_name?: string
          lead_phone?: string
          lead_points?: number
          notes?: string | null
          organization_id?: string | null
          referred_by_lead_id?: string | null
          referrer_id: string
          referrer_name?: string
          status?: Database["public"]["Enums"]["referral_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          client_since?: string | null
          contact_tag?: string | null
          converted_plan_id?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_role?: Database["public"]["Enums"]["app_role"] | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          id?: string
          is_client?: boolean
          is_qualified?: boolean | null
          lead_name?: string
          lead_phone?: string
          lead_points?: number
          notes?: string | null
          organization_id?: string | null
          referred_by_lead_id?: string | null
          referrer_id?: string
          referrer_name?: string
          status?: Database["public"]["Enums"]["referral_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          organization_id: string
          points_cost: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          points_cost: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string
          points_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_client_redemption: {
        Args: { _admin_note?: string; _redemption_id: string }
        Returns: undefined
      }
      approve_redemption: {
        Args: { _admin_note?: string; _redemption_id: string }
        Returns: undefined
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_client_redemption: {
        Args: { _admin_note?: string; _redemption_id: string }
        Returns: undefined
      }
      reject_redemption: {
        Args: { _admin_note?: string; _redemption_id: string }
        Returns: undefined
      }
      update_profile_points: {
        Args: {
          _lifetime_delta: number
          _profile_id: string
          _wallet_delta: number
        }
        Returns: undefined
      }
      update_referral_lead_points: {
        Args: { _points_delta: number; _referral_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "barber" | "client"
      lead_event_type:
        | "status_change"
        | "tag_change"
        | "qualification_change"
        | "note_added"
        | "whatsapp_contact"
        | "conversion"
        | "created"
      redemption_status: "pending" | "approved" | "rejected"
      referral_status: "new" | "contacted" | "converted" | "cliente" | "client"
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
  public: {
    Enums: {
      app_role: ["owner", "admin", "barber", "client"],
      lead_event_type: [
        "status_change",
        "tag_change",
        "qualification_change",
        "note_added",
        "whatsapp_contact",
        "conversion",
        "created",
      ],
      redemption_status: ["pending", "approved", "rejected"],
      referral_status: ["new", "contacted", "converted", "cliente", "client"],
    },
  },
} as const

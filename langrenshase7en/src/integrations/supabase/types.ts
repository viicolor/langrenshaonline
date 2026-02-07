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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      ai_configs: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string
          endpoint: string | null
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          provider: string
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          provider: string
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          provider?: string
        }
        Relationships: []
      }
      board_roles: {
        Row: {
          board_id: string
          card_id: string | null
          count: number
          id: string
          role_type: string
        }
        Insert: {
          board_id: string
          card_id?: string | null
          count: number
          id?: string
          role_type: string
        }
        Update: {
          board_id?: string
          card_id?: string | null
          count?: number
          id?: string
          role_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_roles_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_roles_backup: {
        Row: {
          board_id: string | null
          count: number | null
          id: string | null
          role_type: string | null
        }
        Insert: {
          board_id?: string | null
          count?: number | null
          id?: string | null
          role_type?: string | null
        }
        Update: {
          board_id?: string | null
          count?: number | null
          id?: string | null
          role_type?: string | null
        }
        Relationships: []
      }
      boards: {
        Row: {
          board_alias: string | null
          character_config: Json | null
          create_by: string | null
          created_at: string
          description: string | null
          difficult: number | null
          global_config_ids: string | null
          id: string
          is_default: boolean | null
          is_delete: number | null
          name: string
          player_count: number
          player_num: number | null
          process_ids: string | null
          recommend: number | null
          status: number | null
          update_by: string | null
        }
        Insert: {
          board_alias?: string | null
          character_config?: Json | null
          create_by?: string | null
          created_at?: string
          description?: string | null
          difficult?: number | null
          global_config_ids?: string | null
          id?: string
          is_default?: boolean | null
          is_delete?: number | null
          name: string
          player_count: number
          player_num?: number | null
          process_ids?: string | null
          recommend?: number | null
          status?: number | null
          update_by?: string | null
        }
        Update: {
          board_alias?: string | null
          character_config?: Json | null
          create_by?: string | null
          created_at?: string
          description?: string | null
          difficult?: number | null
          global_config_ids?: string | null
          id?: string
          is_default?: boolean | null
          is_delete?: number | null
          name?: string
          player_count?: number
          player_num?: number | null
          process_ids?: string | null
          recommend?: number | null
          status?: number | null
          update_by?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          camp: string | null
          card_alias: string | null
          card_name: string
          card_type: string
          character_config: Json | null
          create_by: string | null
          create_time: string
          desc: string | null
          difficult: number | null
          id: string
          is_active: number | null
          is_delete: number | null
          recommend: number | null
          role_type: string
          skill_description: string | null
          skill_icon: string | null
          skill_id: string | null
          update_by: string | null
          update_time: string
        }
        Insert: {
          camp?: string | null
          card_alias?: string | null
          card_name: string
          card_type: string
          character_config?: Json | null
          create_by?: string | null
          create_time?: string
          desc?: string | null
          difficult?: number | null
          id?: string
          is_active?: number | null
          is_delete?: number | null
          recommend?: number | null
          role_type: string
          skill_description?: string | null
          skill_icon?: string | null
          skill_id?: string | null
          update_by?: string | null
          update_time?: string
        }
        Update: {
          camp?: string | null
          card_alias?: string | null
          card_name?: string
          card_type?: string
          character_config?: Json | null
          create_by?: string | null
          create_time?: string
          desc?: string | null
          difficult?: number | null
          id?: string
          is_active?: number | null
          is_delete?: number | null
          recommend?: number | null
          role_type?: string
          skill_description?: string | null
          skill_icon?: string | null
          skill_id?: string | null
          update_by?: string | null
          update_time?: string
        }
        Relationships: []
      }
      config_log: {
        Row: {
          id: string
          ip: string | null
          new_config: string
          old_config: string | null
          operate_by: string
          operate_desc: string | null
          operate_object: string
          operate_object_id: string
          operate_result: number
          operate_time: string
          operate_type: number
        }
        Insert: {
          id?: string
          ip?: string | null
          new_config: string
          old_config?: string | null
          operate_by: string
          operate_desc?: string | null
          operate_object: string
          operate_object_id: string
          operate_result?: number
          operate_time?: string
          operate_type: number
        }
        Update: {
          id?: string
          ip?: string | null
          new_config?: string
          old_config?: string | null
          operate_by?: string
          operate_desc?: string | null
          operate_object?: string
          operate_object_id?: string
          operate_result?: number
          operate_time?: string
          operate_type?: number
        }
        Relationships: []
      }
      game_records: {
        Row: {
          board_id: string | null
          current_phase: string | null
          current_round: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          night_step: number | null
          phase_ends_at: string | null
          phase_started_at: string | null
          room_id: string
          started_at: string | null
          winner_team: string | null
        }
        Insert: {
          board_id?: string | null
          current_phase?: string | null
          current_round?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          night_step?: number | null
          phase_ends_at?: string | null
          phase_started_at?: string | null
          room_id: string
          started_at?: string | null
          winner_team?: string | null
        }
        Update: {
          board_id?: string | null
          current_phase?: string | null
          current_round?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          night_step?: number | null
          phase_ends_at?: string | null
          phase_started_at?: string | null
          room_id?: string
          started_at?: string | null
          winner_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_records_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_records_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_actions: {
        Row: {
          id: string
          game_record_id: string
          player_id: string
          action_type: string
          target_id: string | null
          round: number
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          game_record_id: string
          player_id: string
          action_type: string
          target_id?: string | null
          round?: number
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          game_record_id?: string
          player_id?: string
          action_type?: string
          target_id?: string | null
          round?: number
          data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_actions_game_record_id_fkey"
            columns: ["game_record_id"]
            isOneToOne: false
            referencedRelation: "game_records"
            referencedColumns: ["id"]
          },
        ]
      }
      global_configs: {
        Row: {
          config_code: string
          config_name: string
          config_type: string
          config_value: Json
          create_by: string | null
          create_time: string
          description: string | null
          env_type: number
          id: string
          is_active: number | null
          is_default: number | null
          is_delete: number | null
          update_by: string | null
          update_time: string
        }
        Insert: {
          config_code: string
          config_name: string
          config_type: string
          config_value: Json
          create_by?: string | null
          create_time?: string
          description?: string | null
          env_type?: number
          id?: string
          is_active?: number | null
          is_default?: number | null
          is_delete?: number | null
          update_by?: string | null
          update_time?: string
        }
        Update: {
          config_code?: string
          config_name?: string
          config_type?: string
          config_value?: Json
          create_by?: string | null
          create_time?: string
          description?: string | null
          env_type?: number
          id?: string
          is_active?: number | null
          is_default?: number | null
          is_delete?: number | null
          update_by?: string | null
          update_time?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          create_by: string | null
          create_time: string
          description: string | null
          id: string
          is_active: number | null
          is_default: number | null
          is_delete: number | null
          phase_config: Json
          process_code: string
          process_name: string
          process_type: string
          update_by: string | null
          update_time: string
        }
        Insert: {
          create_by?: string | null
          create_time?: string
          description?: string | null
          id?: string
          is_active?: number | null
          is_default?: number | null
          is_delete?: number | null
          phase_config: Json
          process_code: string
          process_name: string
          process_type: string
          update_by?: string | null
          update_time?: string
        }
        Update: {
          create_by?: string | null
          create_time?: string
          description?: string | null
          id?: string
          is_active?: number | null
          is_default?: number | null
          is_delete?: number | null
          phase_config?: Json
          process_code?: string
          process_name?: string
          process_type?: string
          update_by?: string | null
          update_time?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          created_at: string
          game_record_id: string | null
          id: string
          message: string
          phase: string | null
          room_id: string
          round_number: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          game_record_id?: string | null
          id?: string
          message: string
          phase?: string | null
          room_id: string
          round_number?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          game_record_id?: string | null
          id?: string
          message?: string
          phase?: string | null
          room_id?: string
          round_number?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_game_record_id_fkey"
            columns: ["game_record_id"]
            isOneToOne: false
            referencedRelation: "game_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          ai_config_id: string | null
          created_at: string
          id: string
          is_ai: boolean | null
          is_alive: boolean | null
          is_host: boolean | null
          is_ready: boolean | null
          player_avatar: string | null
          player_name: string
          role: string | null
          room_id: string
          seat_number: number | null
          user_id: string | null
        }
        Insert: {
          ai_config_id?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean | null
          is_alive?: boolean | null
          is_host?: boolean | null
          is_ready?: boolean | null
          player_avatar?: string | null
          player_name: string
          role?: string | null
          room_id: string
          seat_number?: number | null
          user_id?: string | null
        }
        Update: {
          ai_config_id?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean | null
          is_alive?: boolean | null
          is_host?: boolean | null
          is_ready?: boolean | null
          player_avatar?: string | null
          player_name?: string
          role?: string | null
          room_id?: string
          seat_number?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_players_ai_config_id_fkey"
            columns: ["ai_config_id"]
            isOneToOne: false
            referencedRelation: "ai_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          ai_player_count: number | null
          allow_ai_players: boolean | null
          board_id: string | null
          created_at: string
          host_id: string
          id: string
          max_players: number | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_player_count?: number | null
          allow_ai_players?: boolean | null
          board_id?: string | null
          created_at?: string
          host_id: string
          id?: string
          max_players?: number | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_player_count?: number | null
          allow_ai_players?: boolean | null
          board_id?: string | null
          created_at?: string
          host_id?: string
          id?: string
          max_players?: number | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          create_by: string | null
          create_time: string
          description: string | null
          id: string
          rule_key: string
          rule_type: string
          rule_value: Json
          update_by: string | null
          update_time: string
        }
        Insert: {
          create_by?: string | null
          create_time?: string
          description?: string | null
          id?: string
          rule_key: string
          rule_type: string
          rule_value: Json
          update_by?: string | null
          update_time?: string
        }
        Update: {
          create_by?: string | null
          create_time?: string
          description?: string | null
          id?: string
          rule_key?: string
          rule_type?: string
          rule_value?: Json
          update_by?: string | null
          update_time?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          cooldown: number | null
          create_by: string | null
          create_time: string
          effect_description: string | null
          effect_params: Json
          id: string
          is_active: number | null
          is_delete: number | null
          skill_code: string
          skill_name: string
          skill_type: string
          trigger_conditions: Json | null
          trigger_phase: string | null
          update_by: string | null
          update_time: string
          usage_limit: number | null
        }
        Insert: {
          cooldown?: number | null
          create_by?: string | null
          create_time?: string
          effect_description?: string | null
          effect_params: Json
          id?: string
          is_active?: number | null
          is_delete?: number | null
          skill_code: string
          skill_name: string
          skill_type: string
          trigger_conditions?: Json | null
          trigger_phase?: string | null
          update_by?: string | null
          update_time?: string
          usage_limit?: number | null
        }
        Update: {
          cooldown?: number | null
          create_by?: string | null
          create_time?: string
          effect_description?: string | null
          effect_params?: Json
          id?: string
          is_active?: number | null
          is_delete?: number | null
          skill_code?: string
          skill_name?: string
          skill_type?: string
          trigger_conditions?: Json | null
          trigger_phase?: string | null
          update_by?: string | null
          update_time?: string
          usage_limit?: number | null
        }
        Relationships: []
      }
      spectator_records: {
        Row: {
          game_record_id: string
          id: string
          joined_at: string
          perspective_type: string
          target_id: string | null
          user_id: string | null
        }
        Insert: {
          game_record_id: string
          id?: string
          joined_at?: string
          perspective_type: string
          target_id?: string | null
          user_id?: string | null
        }
        Update: {
          game_record_id?: string
          id?: string
          joined_at?: string
          perspective_type?: string
          target_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spectator_records_game_record_id_fkey"
            columns: ["game_record_id"]
            isOneToOne: false
            referencedRelation: "game_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectator_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_admin: boolean | null
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean | null
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean | null
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

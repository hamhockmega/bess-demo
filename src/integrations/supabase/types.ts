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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      market_metric_points: {
        Row: {
          created_at: string
          id: number
          interval_index: number
          metric_group: string
          metric_name: string
          node_name: string | null
          region_name: string | null
          remark: string | null
          scenario_date: string
          source_stage: string
          unit: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          interval_index: number
          metric_group: string
          metric_name: string
          node_name?: string | null
          region_name?: string | null
          remark?: string | null
          scenario_date: string
          source_stage: string
          unit: string
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          interval_index?: number
          metric_group?: string
          metric_name?: string
          node_name?: string | null
          region_name?: string | null
          remark?: string | null
          scenario_date?: string
          source_stage?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      market_scenarios: {
        Row: {
          actual_award_signal: boolean | null
          actual_load: number | null
          created_at: string
          front_node_price: number
          id: number
          interval_index: number
          remark: string | null
          scenario_date: string
          user_settlement_price: number
        }
        Insert: {
          actual_award_signal?: boolean | null
          actual_load?: number | null
          created_at?: string
          front_node_price: number
          id?: number
          interval_index: number
          remark?: string | null
          scenario_date: string
          user_settlement_price: number
        }
        Update: {
          actual_award_signal?: boolean | null
          actual_load?: number | null
          created_at?: string
          front_node_price?: number
          id?: number
          interval_index?: number
          remark?: string | null
          scenario_date?: string
          user_settlement_price?: number
        }
        Relationships: []
      }
      strategy_schedule_points: {
        Row: {
          benchmark_price: number | null
          charge_bid_price: number | null
          created_at: string
          discharge_bid_price: number | null
          expected_energy_mwh: number | null
          expected_soc_after: number | null
          hour_index: number | null
          id: number
          interval_index: number
          note: string | null
          strategy_id: number
          target_action: string
          target_power_mw: number
        }
        Insert: {
          benchmark_price?: number | null
          charge_bid_price?: number | null
          created_at?: string
          discharge_bid_price?: number | null
          expected_energy_mwh?: number | null
          expected_soc_after?: number | null
          hour_index?: number | null
          id?: number
          interval_index: number
          note?: string | null
          strategy_id: number
          target_action: string
          target_power_mw?: number
        }
        Update: {
          benchmark_price?: number | null
          charge_bid_price?: number | null
          created_at?: string
          discharge_bid_price?: number | null
          expected_energy_mwh?: number | null
          expected_soc_after?: number | null
          hour_index?: number | null
          id?: number
          interval_index?: number
          note?: string | null
          strategy_id?: number
          target_action?: string
          target_power_mw?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_schedule_points_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_segments: {
        Row: {
          created_at: string
          direction: string
          end_power: number | null
          id: number
          offer_price: number
          segment_no: number
          start_power: number | null
          strategy_id: number
        }
        Insert: {
          created_at?: string
          direction: string
          end_power?: number | null
          id?: number
          offer_price: number
          segment_no: number
          start_power?: number | null
          strategy_id: number
        }
        Update: {
          created_at?: string
          direction?: string
          end_power?: number | null
          id?: number
          offer_price?: number
          segment_no?: number
          start_power?: number | null
          strategy_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_segments_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_snapshots: {
        Row: {
          capacity: number
          charge_power_limit: number
          charge_price_trigger: number
          charging_efficiency: number
          created_at: string
          discharge_power_limit: number
          discharge_price_trigger: number
          discharging_efficiency: number
          expected_award_probability: number | null
          expected_profit: number | null
          generated_at: string | null
          id: number
          initial_soc: number
          notes: string | null
          other_costs: number
          soc_max: number
          soc_min: number
          strategy_date: string
          strategy_name: string
          strategy_source_type: string
        }
        Insert: {
          capacity: number
          charge_power_limit: number
          charge_price_trigger: number
          charging_efficiency: number
          created_at?: string
          discharge_power_limit: number
          discharge_price_trigger: number
          discharging_efficiency: number
          expected_award_probability?: number | null
          expected_profit?: number | null
          generated_at?: string | null
          id?: number
          initial_soc: number
          notes?: string | null
          other_costs?: number
          soc_max: number
          soc_min: number
          strategy_date: string
          strategy_name: string
          strategy_source_type: string
        }
        Update: {
          capacity?: number
          charge_power_limit?: number
          charge_price_trigger?: number
          charging_efficiency?: number
          created_at?: string
          discharge_power_limit?: number
          discharge_price_trigger?: number
          discharging_efficiency?: number
          expected_award_probability?: number | null
          expected_profit?: number | null
          generated_at?: string | null
          id?: number
          initial_soc?: number
          notes?: string | null
          other_costs?: number
          soc_max?: number
          soc_min?: number
          strategy_date?: string
          strategy_name?: string
          strategy_source_type?: string
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
  public: {
    Enums: {},
  },
} as const

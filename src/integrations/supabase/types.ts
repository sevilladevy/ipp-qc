export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      defect_types: {
        Row: {
          created_at: string;
          deskripsi: string | null;
          id: number;
          is_active: boolean;
          kategori_defect: string | null;
          kode_defect: string;
          nama_defect: string;
          updated_at: string;
          urutan: number | null;
        };
        Insert: {
          created_at?: string;
          deskripsi?: string | null;
          id?: number;
          is_active?: boolean;
          kategori_defect?: string | null;
          kode_defect: string;
          nama_defect: string;
          updated_at?: string;
          urutan?: number | null;
        };
        Update: {
          created_at?: string;
          deskripsi?: string | null;
          id?: number;
          is_active?: boolean;
          kategori_defect?: string | null;
          kode_defect?: string;
          nama_defect?: string;
          updated_at?: string;
          urutan?: number | null;
        };
        Relationships: [];
      };
      inspection_defect_details: {
        Row: {
          bending: number;
          black_dot: number;
          bubble: number;
          burn_mark: number;
          burry: number;
          crack: number;
          created_at: string;
          deform: number;
          dented: number;
          dirty: number;
          double_inject: number;
          ejector_mark: number;
          extra_defects: Json;
          filter_bolong_rusak: number;
          flash: number;
          flow_mark: number;
          gap: number;
          gas_mark: number;
          gate_hole: number;
          gate_long: number;
          id: string;
          kontaminasi: number;
          lipat: number;
          over_cut: number;
          report_id: string;
          scratch: number;
          shinning: number;
          short_shot: number;
          silver: number;
          sink_mark: number;
          start_up_setting_alarm: number;
          under_cut: number;
          weld_line: number;
        };
        Insert: {
          bending?: number;
          black_dot?: number;
          bubble?: number;
          burn_mark?: number;
          burry?: number;
          crack?: number;
          created_at?: string;
          deform?: number;
          dented?: number;
          dirty?: number;
          double_inject?: number;
          ejector_mark?: number;
          extra_defects?: Json;
          filter_bolong_rusak?: number;
          flash?: number;
          flow_mark?: number;
          gap?: number;
          gas_mark?: number;
          gate_hole?: number;
          gate_long?: number;
          id?: string;
          kontaminasi?: number;
          lipat?: number;
          over_cut?: number;
          report_id: string;
          scratch?: number;
          shinning?: number;
          short_shot?: number;
          silver?: number;
          sink_mark?: number;
          start_up_setting_alarm?: number;
          under_cut?: number;
          weld_line?: number;
        };
        Update: {
          bending?: number;
          black_dot?: number;
          bubble?: number;
          burn_mark?: number;
          burry?: number;
          crack?: number;
          created_at?: string;
          deform?: number;
          dented?: number;
          dirty?: number;
          double_inject?: number;
          ejector_mark?: number;
          extra_defects?: Json;
          filter_bolong_rusak?: number;
          flash?: number;
          flow_mark?: number;
          gap?: number;
          gas_mark?: number;
          gate_hole?: number;
          gate_long?: number;
          id?: string;
          kontaminasi?: number;
          lipat?: number;
          over_cut?: number;
          report_id?: string;
          scratch?: number;
          shinning?: number;
          short_shot?: number;
          silver?: number;
          sink_mark?: number;
          start_up_setting_alarm?: number;
          under_cut?: number;
          weld_line?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_defect_details_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "inspection_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      inspection_reports: {
        Row: {
          actual_cycle_time: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          jam_mulai: string;
          jam_selesai: string;
          no_meja: number;
          lot_no: string | null;
          part_name: string;
          part_no: string;
          qty_check: number;
          report_date: string;
          shift: Database["public"]["Enums"]["inspection_shift"];
          total_ng: number;
          total_ok: number | null;
          updated_at: string;
        };
        Insert: {
          actual_cycle_time?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          jam_mulai: string;
          jam_selesai: string;
          no_meja: number;
          lot_no?: string | null;
          part_name: string;
          part_no: string;
          qty_check?: number;
          report_date: string;
          shift: Database["public"]["Enums"]["inspection_shift"];
          total_ng?: number;
          total_ok?: number | null;
          updated_at?: string;
        };
        Update: {
          actual_cycle_time?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          jam_mulai?: string;
          jam_selesai?: string;
          no_meja?: number;
          part_name?: string;
          part_no?: string;
          qty_check?: number;
          report_date?: string;
          shift?: Database["public"]["Enums"]["inspection_shift"];
          total_ng?: number;
          total_ok?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inspection_table_default_parts: {
        Row: {
          created_at: string;
          id: string;
          no_meja: number;
          part_no: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          no_meja: number;
          part_no: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          no_meja?: number;
          part_no?: string;
        };
        Relationships: [];
      };
      inspection_tables: {
        Row: {
          created_at: string;
          id: number;
          nama_meja: string | null;
          no_meja: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          nama_meja?: string | null;
          no_meja?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          nama_meja?: string | null;
          no_meja?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          created_at: string;
          customer: string | null;
          id: string;
          is_active: boolean;
          kategori: string | null;
          part_name: string;
          part_no: string;
          standard_cycle_time: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer?: string | null;
          id?: string;
          is_active?: boolean;
          kategori?: string | null;
          part_name: string;
          part_no: string;
          standard_cycle_time?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer?: string | null;
          id?: string;
          is_active?: boolean;
          kategori?: string | null;
          part_name?: string;
          part_no?: string;
          standard_cycle_time?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      ca_actions: {
        Row: {
          action_type: string;
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string;
          deadline: string | null;
          description: string;
          effectiveness_note: string | null;
          effectiveness_rating: number | null;
          id: string;
          nc_id: string;
          priority: Database["public"]["Enums"]["ca_priority"];
        };
        Insert: {
          action_type: string;
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          description: string;
          effectiveness_note?: string | null;
          effectiveness_rating?: number | null;
          id?: string;
          nc_id: string;
          priority?: Database["public"]["Enums"]["ca_priority"];
        };
        Update: {
          action_type?: string;
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          effectiveness_note?: string | null;
          effectiveness_rating?: number | null;
          id?: string;
          nc_id?: string;
          priority?: Database["public"]["Enums"]["ca_priority"];
        };
        Relationships: [];
      };
      audit_schedules: {
        Row: {
          area: string | null;
          audit_team: string[] | null;
          audit_type: Database["public"]["Enums"]["audit_type"];
          checklist: Json | null;
          completed_date: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          lead_auditor: string | null;
          notes: string | null;
          planned_date: string;
          scope: string;
          status: Database["public"]["Enums"]["audit_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          audit_team?: string[] | null;
          audit_type?: Database["public"]["Enums"]["audit_type"];
          checklist?: Json | null;
          completed_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_auditor?: string | null;
          notes?: string | null;
          planned_date: string;
          scope: string;
          status?: Database["public"]["Enums"]["audit_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          audit_team?: string[] | null;
          audit_type?: Database["public"]["Enums"]["audit_type"];
          checklist?: Json | null;
          completed_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_auditor?: string | null;
          notes?: string | null;
          planned_date?: string;
          scope?: string;
          status?: Database["public"]["Enums"]["audit_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_findings: {
        Row: {
          audit_id: string;
          clause: string | null;
          corrected_at: string | null;
          created_at: string;
          finding: string;
          id: string;
          objective_evidence: string | null;
          severity: Database["public"]["Enums"]["audit_finding_severity"];
        };
        Insert: {
          audit_id: string;
          clause?: string | null;
          corrected_at?: string | null;
          created_at?: string;
          finding: string;
          id?: string;
          objective_evidence?: string | null;
          severity?: Database["public"]["Enums"]["audit_finding_severity"];
        };
        Update: {
          audit_id?: string;
          clause?: string | null;
          corrected_at?: string | null;
          created_at?: string;
          finding?: string;
          id?: string;
          objective_evidence?: string | null;
          severity?: Database["public"]["Enums"]["audit_finding_severity"];
        };
        Relationships: [];
      };
      improvements: {
        Row: {
          actual_result: string | null;
          assigned_to: string | null;
          category: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deadline: string | null;
          description: string;
          expected_benefit: string | null;
          id: string;
          lesson_learned: string | null;
          priority: Database["public"]["Enums"]["ca_priority"];
          source: string;
          source_id: string | null;
          status: Database["public"]["Enums"]["improvement_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          actual_result?: string | null;
          assigned_to?: string | null;
          category: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description: string;
          expected_benefit?: string | null;
          id?: string;
          lesson_learned?: string | null;
          priority?: Database["public"]["Enums"]["ca_priority"];
          source?: string;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["improvement_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          actual_result?: string | null;
          assigned_to?: string | null;
          category?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string;
          expected_benefit?: string | null;
          id?: string;
          lesson_learned?: string | null;
          priority?: Database["public"]["Enums"]["ca_priority"];
          source?: string;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["improvement_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      management_reviews: {
        Row: {
          action_items: Json | null;
          agenda: string;
          attendees: Json | null;
          created_at: string;
          created_by: string | null;
          decisions: Json | null;
          id: string;
          minutes: string | null;
          period_from: string;
          period_to: string;
          review_date: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          action_items?: Json | null;
          agenda: string;
          attendees?: Json | null;
          created_at?: string;
          created_by?: string | null;
          decisions?: Json | null;
          id?: string;
          minutes?: string | null;
          period_from: string;
          period_to: string;
          review_date: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          action_items?: Json | null;
          agenda?: string;
          attendees?: Json | null;
          created_at?: string;
          created_by?: string | null;
          decisions?: Json | null;
          id?: string;
          minutes?: string | null;
          period_from?: string;
          period_to?: string;
          review_date?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      non_conformities: {
        Row: {
          assigned_to: string | null;
          closure_note: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by: string | null;
          deadline: string | null;
          description: string;
          id: string;
          nc_number: string;
          preventive_action: string | null;
          root_cause: string | null;
          root_cause_category: string | null;
          severity: Database["public"]["Enums"]["audit_finding_severity"];
          source: string;
          source_id: string | null;
          status: Database["public"]["Enums"]["nc_status"];
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          closure_note?: string | null;
          corrective_action?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description: string;
          id?: string;
          nc_number: string;
          preventive_action?: string | null;
          root_cause?: string | null;
          root_cause_category?: string | null;
          severity?: Database["public"]["Enums"]["audit_finding_severity"];
          source?: string;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["nc_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          closure_note?: string | null;
          corrective_action?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string;
          id?: string;
          nc_number?: string;
          preventive_action?: string | null;
          root_cause?: string | null;
          root_cause_category?: string | null;
          severity?: Database["public"]["Enums"]["audit_finding_severity"];
          source?: string;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["nc_status"];
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "inspector" | "supervisor";
      inspection_shift: "A" | "B" | "C";
      audit_finding_severity: "minor" | "major" | "critical" | "observation";
      audit_type: "internal" | "external" | "supplier";
      audit_status: "planned" | "in_progress" | "completed" | "overdue";
      improvement_status: "proposed" | "approved" | "in_progress" | "completed" | "cancelled";
      nc_status: "open" | "in_progress" | "verified" | "closed";
      ca_priority: "low" | "medium" | "high" | "critical";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["inspector", "supervisor"],
      inspection_shift: ["A", "B", "C"],
      audit_finding_severity: ["minor", "major", "critical", "observation"],
      audit_type: ["internal", "external", "supplier"],
      audit_status: ["planned", "in_progress", "completed", "overdue"],
      improvement_status: ["proposed", "approved", "in_progress", "completed", "cancelled"],
      nc_status: ["open", "in_progress", "verified", "closed"],
      ca_priority: ["low", "medium", "high", "critical"],
    },
  },
} as const;

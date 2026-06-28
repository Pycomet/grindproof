export type Database = {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: "active" | "completed";
          priority: "high" | "medium" | "low";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: "active" | "completed";
          priority?: "high" | "medium" | "low";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: "active" | "completed";
          priority?: "high" | "medium" | "low";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          last_reengaged_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          last_reengaged_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          last_reengaged_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          start_time: string | null;
          end_time: string | null;
          status: "pending" | "completed" | "skipped";
          priority: "high" | "medium" | "low";
          tags: string[] | null;
          recurrence_rule: string | null;
          reflection: string | null;
          carry_over_count: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          status?: "pending" | "completed" | "skipped";
          priority?: "high" | "medium" | "low";
          tags?: string[] | null;
          recurrence_rule?: string | null;
          reflection?: string | null;
          carry_over_count?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          status?: "pending" | "completed" | "skipped";
          priority?: "high" | "medium" | "low";
          tags?: string[] | null;
          recurrence_rule?: string | null;
          reflection?: string | null;
          carry_over_count?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_checks: {
        Row: {
          id: string;
          user_id: string;
          type: "morning" | "evening";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "morning" | "evening";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "morning" | "evening";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_checks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      coach_memory: {
        Row: {
          id: string;
          user_id: string;
          category:
            | "commitment"
            | "recommendation"
            | "pattern"
            | "observation"
            | "excuse_flagged";
          content: string;
          source: "coach_inline" | "pattern_engine" | "weekly_roast";
          severity: "info" | "warning" | "critical" | null;
          related_to: Record<string, unknown> | null;
          pattern_key: string | null;
          status:
            | "active"
            | "fulfilled"
            | "broken"
            | "expired"
            | "superseded";
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category:
            | "commitment"
            | "recommendation"
            | "pattern"
            | "observation"
            | "excuse_flagged";
          content: string;
          source: "coach_inline" | "pattern_engine" | "weekly_roast";
          severity?: "info" | "warning" | "critical" | null;
          related_to?: Record<string, unknown> | null;
          pattern_key?: string | null;
          status?:
            | "active"
            | "fulfilled"
            | "broken"
            | "expired"
            | "superseded";
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?:
            | "commitment"
            | "recommendation"
            | "pattern"
            | "observation"
            | "excuse_flagged";
          content?: string;
          source?: "coach_inline" | "pattern_engine" | "weekly_roast";
          severity?: "info" | "warning" | "critical" | null;
          related_to?: Record<string, unknown> | null;
          pattern_key?: string | null;
          status?:
            | "active"
            | "fulfilled"
            | "broken"
            | "expired"
            | "superseded";
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_memory_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh_key: string;
          auth_key: string;
          user_agent: string | null;
          device_name: string | null;
          last_successful_push: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh_key: string;
          auth_key: string;
          user_agent?: string | null;
          device_name?: string | null;
          last_successful_push?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh_key?: string;
          auth_key?: string;
          user_agent?: string | null;
          device_name?: string | null;
          last_successful_push?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_settings: {
        Row: {
          id: string;
          user_id: string;
          morning_check_enabled: boolean;
          morning_check_time: string;
          evening_check_enabled: boolean;
          evening_check_time: string;
          email_notifications_enabled: boolean;
          push_notifications_enabled: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          morning_check_enabled?: boolean;
          morning_check_time?: string;
          evening_check_enabled?: boolean;
          evening_check_time?: string;
          email_notifications_enabled?: boolean;
          push_notifications_enabled?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          morning_check_enabled?: boolean;
          morning_check_time?: string;
          evening_check_enabled?: boolean;
          evening_check_time?: string;
          email_notifications_enabled?: boolean;
          push_notifications_enabled?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          sent_date: string;
          variant: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          sent_date: string;
          variant?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          sent_date?: string;
          variant?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_roasts: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          week_end: string;
          roast_data: Record<string, unknown>;
          task_stats: Record<string, unknown> | null;
          delivered_via: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          week_end: string;
          roast_data: Record<string, unknown>;
          task_stats?: Record<string, unknown> | null;
          delivered_via?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          week_end?: string;
          roast_data?: Record<string, unknown>;
          task_stats?: Record<string, unknown> | null;
          delivered_via?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_roasts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          messages: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages?: unknown[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: unknown[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      accountability_snapshots: {
        Row: {
          id: string;
          user_id: string;
          local_date: string;
          score: number;
          streak: number;
          weighted_completion: number;
          consistency_rate: number;
          discipline_score: number;
          velocity_bonus: number;
          streak_bonus: number;
          active: boolean;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          local_date: string;
          score: number;
          streak: number;
          weighted_completion: number;
          consistency_rate: number;
          discipline_score: number;
          velocity_bonus: number;
          streak_bonus: number;
          active: boolean;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          local_date?: string;
          score?: number;
          streak?: number;
          weighted_completion?: number;
          consistency_rate?: number;
          discipline_score?: number;
          velocity_bonus?: number;
          streak_bonus?: number;
          active?: boolean;
          computed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accountability_snapshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      score_events: {
        Row: {
          id: string;
          user_id: string;
          occurred_at: string;
          score_before: number | null;
          score_after: number;
          reason: string;
          related_task_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          occurred_at?: string;
          score_before?: number | null;
          score_after: number;
          reason: string;
          related_task_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          occurred_at?: string;
          score_before?: number | null;
          score_after?: number;
          reason?: string;
          related_task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "score_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_related_task_id_fkey";
            columns: ["related_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      carry_over_tasks: {
        Args: {
          p_task_ids: string[];
          p_new_due: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Database = {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          status: "active" | "completed" | "paused";
          github_repos: string[] | null;
          priority: "high" | "medium" | "low";
          time_horizon: "daily" | "weekly" | "monthly" | "annual" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused";
          github_repos?: string[] | null;
          priority?: "high" | "medium" | "low";
          time_horizon?: "daily" | "weekly" | "monthly" | "annual" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused";
          github_repos?: string[] | null;
          priority?: "high" | "medium" | "low";
          time_horizon?: "daily" | "weekly" | "monthly" | "annual" | null;
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
      routines: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          frequency: "daily" | "weekly" | "custom";
          days_of_week: number[] | null;
          time_of_day: string | null;
          is_active: boolean;
          goal_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          frequency?: "daily" | "weekly" | "custom";
          days_of_week?: number[] | null;
          time_of_day?: string | null;
          is_active?: boolean;
          goal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          frequency?: "daily" | "weekly" | "custom";
          days_of_week?: number[] | null;
          time_of_day?: string | null;
          is_active?: boolean;
          goal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          profile_pic_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          profile_pic_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          profile_pic_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          user_id: string;
          service_type: string;
          credentials: Record<string, unknown>;
          status: "connected" | "disconnected" | "error";
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_type: string;
          credentials: Record<string, unknown>;
          status?: "connected" | "disconnected" | "error";
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_type?: string;
          credentials?: Record<string, unknown>;
          status?: "connected" | "disconnected" | "error";
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          reminders: unknown;
          status: "pending" | "completed" | "skipped";
          priority: "high" | "medium" | "low";
          completion_proof: string | null;
          tags: string[] | null;
          google_calendar_event_id: string | null;
          is_synced_with_calendar: boolean;
          recurrence_pattern: unknown;
          recurrence_rule: string | null;
          recurring_event_id: string | null;
          parent_task_id: string | null;
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
          reminders?: unknown;
          status?: "pending" | "completed" | "skipped";
          priority?: "high" | "medium" | "low";
          completion_proof?: string | null;
          tags?: string[] | null;
          google_calendar_event_id?: string | null;
          is_synced_with_calendar?: boolean;
          recurrence_pattern?: unknown;
          recurrence_rule?: string | null;
          recurring_event_id?: string | null;
          parent_task_id?: string | null;
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
          reminders?: unknown;
          status?: "pending" | "completed" | "skipped";
          priority?: "high" | "medium" | "low";
          completion_proof?: string | null;
          tags?: string[] | null;
          google_calendar_event_id?: string | null;
          is_synced_with_calendar?: boolean;
          recurrence_pattern?: unknown;
          recurrence_rule?: string | null;
          recurring_event_id?: string | null;
          parent_task_id?: string | null;
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
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey";
            columns: ["parent_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
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
      accountability_scores: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          alignment_score: number;
          completed_tasks: number;
          total_tasks: number;
          roast_metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          alignment_score: number;
          completed_tasks: number;
          total_tasks: number;
          roast_metadata?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          alignment_score?: number;
          completed_tasks?: number;
          total_tasks?: number;
          roast_metadata?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accountability_scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};


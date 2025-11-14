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


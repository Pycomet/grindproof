export type Database = {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          status: "active" | "completed" | "paused";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          target_date?: string | null;
          status?: "active" | "completed" | "paused";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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


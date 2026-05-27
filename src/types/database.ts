export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role_in_company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role_in_company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role_in_company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mind_maps: {
        Row: {
          id: string;
          user_id: string;
          client_id: string | null;
          title: string;
          description: string | null;
          root_node_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id?: string | null;
          title: string;
          description?: string | null;
          root_node_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string | null;
          title?: string;
          description?: string | null;
          root_node_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nodes: {
        Row: {
          id: string;
          mind_map_id: string;
          parent_node_id: string | null;
          label: string;
          subtitle: string | null;
          notes: string | null;
          image_suggestion: string | null;
          pos_x: number;
          pos_y: number;
          color: string | null;
          width: number | null;
          height: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mind_map_id: string;
          parent_node_id?: string | null;
          label?: string;
          subtitle?: string | null;
          notes?: string | null;
          image_suggestion?: string | null;
          pos_x?: number;
          pos_y?: number;
          color?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mind_map_id?: string;
          parent_node_id?: string | null;
          label?: string;
          subtitle?: string | null;
          notes?: string | null;
          image_suggestion?: string | null;
          pos_x?: number;
          pos_y?: number;
          color?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      edges: {
        Row: {
          id: string;
          mind_map_id: string;
          source_node_id: string;
          target_node_id: string;
          label: string | null;
          edge_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mind_map_id: string;
          source_node_id: string;
          target_node_id: string;
          label?: string | null;
          edge_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mind_map_id?: string;
          source_node_id?: string;
          target_node_id?: string;
          label?: string | null;
          edge_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          node_id: string;
          mind_map_id: string;
          user_id: string;
          storage_bucket: string;
          storage_path: string;
          media_type: "image" | "video";
          mime_type: string;
          file_size_bytes: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          preview_image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          node_id: string;
          mind_map_id: string;
          user_id: string;
          storage_bucket?: string;
          storage_path: string;
          media_type: "image" | "video";
          mime_type: string;
          file_size_bytes: number;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          preview_image_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          node_id?: string;
          mind_map_id?: string;
          user_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          media_type?: "image" | "video";
          mime_type?: string;
          file_size_bytes?: number;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          preview_image_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          client_id: string | null;
          mind_map_id: string | null;
          title: string;
          description: string | null;
          status: "todo" | "in_progress" | "done";
          priority: "low" | "medium" | "high";
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id?: string | null;
          mind_map_id?: string | null;
          title: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done";
          priority?: "low" | "medium" | "high";
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string | null;
          mind_map_id?: string | null;
          title?: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done";
          priority?: "low" | "medium" | "high";
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      brand_kits: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          brand_voice: string | null;
          target_audience: string | null;
          visual_references: string | null;
          hashtags: string | null;
          dos: string | null;
          donts: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          user_id: string;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          brand_voice?: string | null;
          target_audience?: string | null;
          visual_references?: string | null;
          hashtags?: string | null;
          dos?: string | null;
          donts?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          user_id?: string;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          brand_voice?: string | null;
          target_audience?: string | null;
          visual_references?: string | null;
          hashtags?: string | null;
          dos?: string | null;
          donts?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

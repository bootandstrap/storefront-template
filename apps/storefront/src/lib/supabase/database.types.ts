export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      abandoned_cart_notifications: {
        Row: {
          cart_id: string
          converted_at: string | null
          created_at: string | null
          id: string
          notification_type: string
          opened_at: string | null
          sent_at: string | null
        }
        Insert: {
          cart_id: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          notification_type?: string
          opened_at?: string | null
          sent_at?: string | null
        }
        Update: {
          cart_id?: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          notification_type?: string
          opened_at?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_cart_notifications_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      account_holder: {
        Row: {
          created_at: string
          data: Json
          deleted_at: string | null
          email: string | null
          external_id: string
          id: string
          metadata: Json | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          email?: string | null
          external_id: string
          id: string
          metadata?: Json | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          deleted_at?: string | null
          email?: string | null
          external_id?: string
          id?: string
          metadata?: Json | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_daily_summary: {
        Row: {
          count: number
          created_at: string | null
          date: string
          event_type: string
          id: string
          metadata: Json | null
          module_id: string | null
          revenue_cents: number | null
          tenant_id: string | null
          unique_users: number | null
        }
        Insert: {
          count?: number
          created_at?: string | null
          date: string
          event_type: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          revenue_cents?: number | null
          tenant_id?: string | null
          unique_users?: number | null
        }
        Update: {
          count?: number
          created_at?: string | null
          date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          revenue_cents?: number | null
          tenant_id?: string | null
          unique_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_summary_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          module_id: string | null
          order_id: string | null
          page_url: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          tenant_id: string | null
          tier_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          module_id?: string | null
          order_id?: string | null
          page_url?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          tier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          module_id?: string | null
          order_id?: string | null
          page_url?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          tenant_id?: string | null
          tier_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "module_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          last_used_at: string | null
          redacted: string
          revoked_at: string | null
          revoked_by: string | null
          salt: string
          title: string
          token: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id: string
          last_used_at?: string | null
          redacted: string
          revoked_at?: string | null
          revoked_by?: string | null
          salt: string
          title: string
          token: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          last_used_at?: string | null
          redacted?: string
          revoked_at?: string | null
          revoked_by?: string | null
          salt?: string
          title?: string
          token?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_method_buy_rules: {
        Row: {
          application_method_id: string
          promotion_rule_id: string
        }
        Insert: {
          application_method_id: string
          promotion_rule_id: string
        }
        Update: {
          application_method_id?: string
          promotion_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_method_buy_rules_application_method_id_foreign"
            columns: ["application_method_id"]
            isOneToOne: false
            referencedRelation: "promotion_application_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_method_buy_rules_promotion_rule_id_foreign"
            columns: ["promotion_rule_id"]
            isOneToOne: false
            referencedRelation: "promotion_rule"
            referencedColumns: ["id"]
          },
        ]
      }
      application_method_target_rules: {
        Row: {
          application_method_id: string
          promotion_rule_id: string
        }
        Insert: {
          application_method_id: string
          promotion_rule_id: string
        }
        Update: {
          application_method_id?: string
          promotion_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_method_target_rules_application_method_id_foreign"
            columns: ["application_method_id"]
            isOneToOne: false
            referencedRelation: "promotion_application_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_method_target_rules_promotion_rule_id_foreign"
            columns: ["promotion_rule_id"]
            isOneToOne: false
            referencedRelation: "promotion_rule"
            referencedColumns: ["id"]
          },
        ]
      }
      async_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          depends_on_job_id: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          started_at: string | null
          status: string
          tenant_id: string | null
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          depends_on_job_id?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          depends_on_job_id?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "async_jobs_depends_on_job_id_fkey"
            columns: ["depends_on_job_id"]
            isOneToOne: false
            referencedRelation: "async_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "async_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_identity: {
        Row: {
          app_metadata: Json | null
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          app_metadata?: Json | null
          created_at?: string
          deleted_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          app_metadata?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_execution: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          error_message: string | null
          event_payload: Json | null
          id: string
          result_data: Json | null
          rule_id: string
          status: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_payload?: Json | null
          id: string
          result_data?: Json | null
          rule_id: string
          status?: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_payload?: Json | null
          id?: string
          result_data?: Json | null
          rule_id?: string
          status?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_rule: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json | null
          created_at: string
          deleted_at: string | null
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          priority: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config: Json
          action_type?: string
          conditions?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          execution_count?: number
          id: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          priority?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          priority?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      capability_overrides: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          key: string
          override_type: string
          reason: string | null
          tenant_id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          key: string
          override_type?: string
          reason?: string | null
          tenant_id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          key?: string
          override_type?: string
          reason?: string | null
          tenant_id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "capability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capture: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          payment_id: string
          raw_amount: Json
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          payment_id: string
          raw_amount: Json
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string
          raw_amount?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_payment_id_foreign"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
        ]
      }
      cart: {
        Row: {
          billing_address_id: string | null
          completed_at: string | null
          created_at: string
          currency_code: string
          customer_id: string | null
          deleted_at: string | null
          email: string | null
          id: string
          locale: string | null
          metadata: Json | null
          region_id: string | null
          sales_channel_id: string | null
          shipping_address_id: string | null
          updated_at: string
        }
        Insert: {
          billing_address_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency_code: string
          customer_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id: string
          locale?: string | null
          metadata?: Json | null
          region_id?: string | null
          sales_channel_id?: string | null
          shipping_address_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_address_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          locale?: string | null
          metadata?: Json | null
          region_id?: string | null
          sales_channel_id?: string | null
          shipping_address_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_billing_address_id_foreign"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "cart_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_shipping_address_id_foreign"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "cart_address"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_address: {
        Row: {
          address_1: string | null
          address_2: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          applied_rule_id: string | null
          cart_id: string
          created_at: string | null
          discount_cents: number
          id: string
          metadata: Json | null
          module_id: string
          quantity: number
          tier_id: string | null
          unit_price_cents: number
          updated_at: string | null
        }
        Insert: {
          applied_rule_id?: string | null
          cart_id: string
          created_at?: string | null
          discount_cents?: number
          id?: string
          metadata?: Json | null
          module_id: string
          quantity?: number
          tier_id?: string | null
          unit_price_cents: number
          updated_at?: string | null
        }
        Update: {
          applied_rule_id?: string | null
          cart_id?: string
          created_at?: string | null
          discount_cents?: number
          id?: string
          metadata?: Json | null
          module_id?: string
          quantity?: number
          tier_id?: string | null
          unit_price_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_applied_rule_id_fkey"
            columns: ["applied_rule_id"]
            isOneToOne: false
            referencedRelation: "module_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_line_item: {
        Row: {
          cart_id: string
          compare_at_unit_price: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_custom_price: boolean
          is_discountable: boolean
          is_giftcard: boolean
          is_tax_inclusive: boolean
          metadata: Json | null
          product_collection: string | null
          product_description: string | null
          product_handle: string | null
          product_id: string | null
          product_subtitle: string | null
          product_title: string | null
          product_type: string | null
          product_type_id: string | null
          quantity: number
          raw_compare_at_unit_price: Json | null
          raw_unit_price: Json
          requires_shipping: boolean
          subtitle: string | null
          thumbnail: string | null
          title: string
          unit_price: number
          updated_at: string
          variant_barcode: string | null
          variant_id: string | null
          variant_option_values: Json | null
          variant_sku: string | null
          variant_title: string | null
        }
        Insert: {
          cart_id: string
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id: string
          is_custom_price?: boolean
          is_discountable?: boolean
          is_giftcard?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          product_collection?: string | null
          product_description?: string | null
          product_handle?: string | null
          product_id?: string | null
          product_subtitle?: string | null
          product_title?: string | null
          product_type?: string | null
          product_type_id?: string | null
          quantity: number
          raw_compare_at_unit_price?: Json | null
          raw_unit_price: Json
          requires_shipping?: boolean
          subtitle?: string | null
          thumbnail?: string | null
          title: string
          unit_price: number
          updated_at?: string
          variant_barcode?: string | null
          variant_id?: string | null
          variant_option_values?: Json | null
          variant_sku?: string | null
          variant_title?: string | null
        }
        Update: {
          cart_id?: string
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_custom_price?: boolean
          is_discountable?: boolean
          is_giftcard?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          product_collection?: string | null
          product_description?: string | null
          product_handle?: string | null
          product_id?: string | null
          product_subtitle?: string | null
          product_title?: string | null
          product_type?: string | null
          product_type_id?: string | null
          quantity?: number
          raw_compare_at_unit_price?: Json | null
          raw_unit_price?: Json
          requires_shipping?: boolean
          subtitle?: string | null
          thumbnail?: string | null
          title?: string
          unit_price?: number
          updated_at?: string
          variant_barcode?: string | null
          variant_id?: string | null
          variant_option_values?: Json | null
          variant_sku?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_line_item_cart_id_foreign"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_line_item_adjustment: {
        Row: {
          amount: number
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_tax_inclusive: boolean
          item_id: string | null
          metadata: Json | null
          promotion_id: string | null
          provider_id: string | null
          raw_amount: Json
          updated_at: string
        }
        Insert: {
          amount: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          is_tax_inclusive?: boolean
          item_id?: string | null
          metadata?: Json | null
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount: Json
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_tax_inclusive?: boolean
          item_id?: string | null
          metadata?: Json | null
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_line_item_adjustment_item_id_foreign"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cart_line_item"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_line_item_tax_line: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          item_id: string | null
          metadata: Json | null
          provider_id: string | null
          rate: number
          tax_rate_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          item_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
          rate: number
          tax_rate_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          metadata?: Json | null
          provider_id?: string | null
          rate?: number
          tax_rate_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_line_item_tax_line_item_id_foreign"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cart_line_item"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_payment_collection: {
        Row: {
          cart_id: string
          created_at: string
          deleted_at: string | null
          id: string
          payment_collection_id: string
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          payment_collection_id: string
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payment_collection_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_promotion: {
        Row: {
          cart_id: string
          created_at: string
          deleted_at: string | null
          id: string
          promotion_id: string
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          promotion_id: string
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          promotion_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          guest_token: string | null
          id: string
          merged_into: string | null
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          guest_token?: string | null
          id?: string
          merged_into?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          guest_token?: string | null
          id?: string
          merged_into?: string | null
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_sessions_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "cart_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_shipping_method: {
        Row: {
          amount: number
          cart_id: string
          created_at: string
          data: Json | null
          deleted_at: string | null
          description: Json | null
          id: string
          is_tax_inclusive: boolean
          metadata: Json | null
          name: string
          raw_amount: Json
          shipping_option_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cart_id: string
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          description?: Json | null
          id: string
          is_tax_inclusive?: boolean
          metadata?: Json | null
          name: string
          raw_amount: Json
          shipping_option_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cart_id?: string
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          description?: Json | null
          id?: string
          is_tax_inclusive?: boolean
          metadata?: Json | null
          name?: string
          raw_amount?: Json
          shipping_option_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_shipping_method_cart_id_foreign"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_shipping_method_adjustment: {
        Row: {
          amount: number
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          promotion_id: string | null
          provider_id: string | null
          raw_amount: Json
          shipping_method_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          metadata?: Json | null
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount: Json
          shipping_method_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount?: Json
          shipping_method_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_shipping_method_adjustment_shipping_method_id_foreign"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "cart_shipping_method"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_shipping_method_tax_line: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          provider_id: string | null
          rate: number
          shipping_method_id: string | null
          tax_rate_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          metadata?: Json | null
          provider_id?: string | null
          rate: number
          shipping_method_id?: string | null
          tax_rate_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          rate?: number
          shipping_method_id?: string | null
          tax_rate_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_shipping_method_tax_line_shipping_method_id_foreign"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "cart_shipping_method"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_daily_stats: {
        Row: {
          date: string
          total_cost: number | null
          total_messages: number | null
          total_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          date: string
          total_cost?: number | null
          total_messages?: number | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          date?: string
          total_cost?: number | null
          total_messages?: number | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          completion_tokens: number | null
          cost: number | null
          created_at: string | null
          id: string
          locale: string | null
          model: string
          prompt_tokens: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string
          locale?: string | null
          model: string
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string
          locale?: string | null
          model?: string
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          tenant_id: string | null
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_usage: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          accent_color: string | null
          active_currencies: string[]
          active_languages: string[]
          business_name: string
          capacity_auto_upgrade_interest: boolean | null
          capacity_critical_threshold_pct: number | null
          capacity_warning_threshold_pct: number | null
          carousel_speed: number
          chatbot_auto_open_delay: number | null
          chatbot_knowledge_scope: string | null
          chatbot_name: string | null
          chatbot_tone: string | null
          chatbot_welcome_message: string | null
          color_preset: string
          created_at: string | null
          crm_auto_tag_customers: boolean | null
          crm_export_format: string | null
          crm_new_customer_tag: string | null
          crm_notify_new_contact: boolean | null
          currency: string
          currency_symbol: string
          custom_email_domain: string | null
          custom_email_domain_id: string | null
          custom_email_domain_status: string | null
          default_country_prefix: string
          default_currency: string
          delivery_fee: number | null
          email_abandoned_cart_delay: string | null
          email_api_key: string | null
          email_configured: boolean | null
          email_footer_text: string | null
          email_from: string | null
          email_provider: string | null
          email_reply_to: string | null
          email_sender_name: string | null
          enable_online_payments: boolean
          enable_whatsapp_checkout: boolean
          favicon_url: string | null
          footer_description: string | null
          free_delivery_threshold: number | null
          free_shipping_threshold: number | null
          hero_image: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          language: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          medusa_admin_email: string | null
          medusa_admin_password: string | null
          medusa_publishable_key: string | null
          medusa_secret_id: string | null
          medusa_url: string | null
          meta_description: string | null
          meta_title: string | null
          min_order_amount: number | null
          notes: string | null
          onboarding_completed: boolean
          order_confirmation_email: string | null
          panel_language: string | null
          pos_default_payment_method: string | null
          pos_enable_tips: boolean | null
          pos_receipt_footer: string | null
          pos_receipt_header: string | null
          pos_sound_enabled: boolean | null
          pos_tax_display: string | null
          pos_tip_percentages: string | null
          primary_color: string | null
          sales_business_hours_display: string | null
          sales_highlight_free_shipping: boolean | null
          sales_preferred_contact: string | null
          sales_whatsapp_greeting: string | null
          secondary_color: string | null
          seed_categories: number | null
          seed_customers: number | null
          seed_orders: number | null
          seed_products: number | null
          seed_status: string | null
          seed_template: string | null
          seeded_at: string | null
          sentry_dsn: string | null
          show_carousel: boolean
          social_facebook: string | null
          social_instagram: string | null
          stock_management_mode: string | null
          stock_mode: string | null
          storefront_language: string | null
          stripe_webhook_endpoint_id: string | null
          stripe_webhook_signing_secret: string | null
          surface_color: string | null
          tax_display_mode: string | null
          tenant_id: string | null
          text_color: string | null
          theme_mode: string
          timezone: string | null
          traffic_alert_email: string | null
          traffic_alert_threshold_pct: number | null
          updated_at: string | null
          webhook_notification_email: string | null
          whatsapp_number: string
        }
        Insert: {
          accent_color?: string | null
          active_currencies?: string[]
          active_languages?: string[]
          business_name?: string
          capacity_auto_upgrade_interest?: boolean | null
          capacity_critical_threshold_pct?: number | null
          capacity_warning_threshold_pct?: number | null
          carousel_speed?: number
          chatbot_auto_open_delay?: number | null
          chatbot_knowledge_scope?: string | null
          chatbot_name?: string | null
          chatbot_tone?: string | null
          chatbot_welcome_message?: string | null
          color_preset?: string
          created_at?: string | null
          crm_auto_tag_customers?: boolean | null
          crm_export_format?: string | null
          crm_new_customer_tag?: string | null
          crm_notify_new_contact?: boolean | null
          currency?: string
          currency_symbol?: string
          custom_email_domain?: string | null
          custom_email_domain_id?: string | null
          custom_email_domain_status?: string | null
          default_country_prefix?: string
          default_currency?: string
          delivery_fee?: number | null
          email_abandoned_cart_delay?: string | null
          email_api_key?: string | null
          email_configured?: boolean | null
          email_footer_text?: string | null
          email_from?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          enable_online_payments?: boolean
          enable_whatsapp_checkout?: boolean
          favicon_url?: string | null
          footer_description?: string | null
          free_delivery_threshold?: number | null
          free_shipping_threshold?: number | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          medusa_admin_email?: string | null
          medusa_admin_password?: string | null
          medusa_publishable_key?: string | null
          medusa_secret_id?: string | null
          medusa_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number | null
          notes?: string | null
          onboarding_completed?: boolean
          order_confirmation_email?: string | null
          panel_language?: string | null
          pos_default_payment_method?: string | null
          pos_enable_tips?: boolean | null
          pos_receipt_footer?: string | null
          pos_receipt_header?: string | null
          pos_sound_enabled?: boolean | null
          pos_tax_display?: string | null
          pos_tip_percentages?: string | null
          primary_color?: string | null
          sales_business_hours_display?: string | null
          sales_highlight_free_shipping?: boolean | null
          sales_preferred_contact?: string | null
          sales_whatsapp_greeting?: string | null
          secondary_color?: string | null
          seed_categories?: number | null
          seed_customers?: number | null
          seed_orders?: number | null
          seed_products?: number | null
          seed_status?: string | null
          seed_template?: string | null
          seeded_at?: string | null
          sentry_dsn?: string | null
          show_carousel?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          stock_management_mode?: string | null
          stock_mode?: string | null
          storefront_language?: string | null
          stripe_webhook_endpoint_id?: string | null
          stripe_webhook_signing_secret?: string | null
          surface_color?: string | null
          tax_display_mode?: string | null
          tenant_id?: string | null
          text_color?: string | null
          theme_mode?: string
          timezone?: string | null
          traffic_alert_email?: string | null
          traffic_alert_threshold_pct?: number | null
          updated_at?: string | null
          webhook_notification_email?: string | null
          whatsapp_number?: string
        }
        Update: {
          accent_color?: string | null
          active_currencies?: string[]
          active_languages?: string[]
          business_name?: string
          capacity_auto_upgrade_interest?: boolean | null
          capacity_critical_threshold_pct?: number | null
          capacity_warning_threshold_pct?: number | null
          carousel_speed?: number
          chatbot_auto_open_delay?: number | null
          chatbot_knowledge_scope?: string | null
          chatbot_name?: string | null
          chatbot_tone?: string | null
          chatbot_welcome_message?: string | null
          color_preset?: string
          created_at?: string | null
          crm_auto_tag_customers?: boolean | null
          crm_export_format?: string | null
          crm_new_customer_tag?: string | null
          crm_notify_new_contact?: boolean | null
          currency?: string
          currency_symbol?: string
          custom_email_domain?: string | null
          custom_email_domain_id?: string | null
          custom_email_domain_status?: string | null
          default_country_prefix?: string
          default_currency?: string
          delivery_fee?: number | null
          email_abandoned_cart_delay?: string | null
          email_api_key?: string | null
          email_configured?: boolean | null
          email_footer_text?: string | null
          email_from?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          enable_online_payments?: boolean
          enable_whatsapp_checkout?: boolean
          favicon_url?: string | null
          footer_description?: string | null
          free_delivery_threshold?: number | null
          free_shipping_threshold?: number | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          medusa_admin_email?: string | null
          medusa_admin_password?: string | null
          medusa_publishable_key?: string | null
          medusa_secret_id?: string | null
          medusa_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number | null
          notes?: string | null
          onboarding_completed?: boolean
          order_confirmation_email?: string | null
          panel_language?: string | null
          pos_default_payment_method?: string | null
          pos_enable_tips?: boolean | null
          pos_receipt_footer?: string | null
          pos_receipt_header?: string | null
          pos_sound_enabled?: boolean | null
          pos_tax_display?: string | null
          pos_tip_percentages?: string | null
          primary_color?: string | null
          sales_business_hours_display?: string | null
          sales_highlight_free_shipping?: boolean | null
          sales_preferred_contact?: string | null
          sales_whatsapp_greeting?: string | null
          secondary_color?: string | null
          seed_categories?: number | null
          seed_customers?: number | null
          seed_orders?: number | null
          seed_products?: number | null
          seed_status?: string | null
          seed_template?: string | null
          seeded_at?: string | null
          sentry_dsn?: string | null
          show_carousel?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          stock_management_mode?: string | null
          stock_mode?: string | null
          storefront_language?: string | null
          stripe_webhook_endpoint_id?: string | null
          stripe_webhook_signing_secret?: string | null
          surface_color?: string | null
          tax_display_mode?: string | null
          tenant_id?: string | null
          text_color?: string | null
          theme_mode?: string
          timezone?: string | null
          traffic_alert_email?: string | null
          traffic_alert_threshold_pct?: number | null
          updated_at?: string | null
          webhook_notification_email?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_line: {
        Row: {
          amount: number
          cart_id: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          raw_amount: Json
          reference: string | null
          reference_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cart_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          raw_amount: Json
          reference?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cart_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          raw_amount?: Json
          reference?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_line_cart_id_foreign"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact: {
        Row: {
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          last_interaction_at: string | null
          lifetime_value: number
          notes: string | null
          order_count: number
          phone: string | null
          source: string
          stage: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_interaction_at?: string | null
          lifetime_value?: number
          notes?: string | null
          order_count?: number
          phone?: string | null
          source?: string
          stage?: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_interaction_at?: string | null
          lifetime_value?: number
          notes?: string | null
          order_count?: number
          phone?: string | null
          source?: string
          stage?: string
          tags?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_interaction: {
        Row: {
          contact_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          initiated_by: string
          operator_name: string | null
          reference_id: string | null
          reference_type: string | null
          summary: string
          type: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          initiated_by?: string
          operator_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          summary: string
          type?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          initiated_by?: string
          operator_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          summary?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_segment: {
        Row: {
          color: string
          contact_count: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          last_evaluated_at: string | null
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          color?: string
          contact_count?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          is_system?: boolean
          last_evaluated_at?: string | null
          name: string
          rules: Json
          updated_at?: string
        }
        Update: {
          color?: string
          contact_count?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          last_evaluated_at?: string | null
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      currency: {
        Row: {
          code: string
          created_at: string
          decimal_digits: number
          deleted_at: string | null
          name: string
          raw_rounding: Json
          rounding: number
          symbol: string
          symbol_native: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_digits?: number
          deleted_at?: string | null
          name: string
          raw_rounding: Json
          rounding?: number
          symbol: string
          symbol_native: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_digits?: number
          deleted_at?: string | null
          name?: string
          raw_rounding?: Json
          rounding?: number
          symbol?: string
          symbol_native?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          has_account: boolean
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          has_account?: boolean
          id: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          has_account?: boolean
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_account_holder: {
        Row: {
          account_holder_id: string
          created_at: string
          customer_id: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_holder_id: string
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_holder_id?: string
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_address: {
        Row: {
          address_1: string | null
          address_2: string | null
          address_name: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          first_name: string | null
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          last_name: string | null
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          address_name?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          first_name?: string | null
          id: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          address_name?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_address_customer_id_foreign"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_customer_crmmodule_crm_contact: {
        Row: {
          created_at: string
          crm_contact_id: string
          customer_id: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_contact_id: string
          customer_id: string
          deleted_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_contact_id?: string
          customer_id?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_group: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_group_customer: {
        Row: {
          created_at: string
          created_by: string | null
          customer_group_id: string
          customer_id: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_group_id: string
          customer_id: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_group_id?: string
          customer_id?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_group_customer_customer_group_id_foreign"
            columns: ["customer_group_id"]
            isOneToOne: false
            referencedRelation: "customer_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_group_customer_customer_id_foreign"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_paying_customer: boolean | null
          language: string | null
          notes: string | null
          phone: string | null
          plan_status: string | null
          privacy_accepted_at: string | null
          privacy_version: string | null
          role: string | null
          setup_fee_status: string | null
          site_url: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_paying_customer?: boolean | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          plan_status?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          role?: string | null
          setup_fee_status?: string | null
          site_url?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_paying_customer?: boolean | null
          language?: string | null
          notes?: string | null
          phone?: string | null
          plan_status?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          role?: string | null
          setup_fee_status?: string | null
          site_url?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      email_automation_config: {
        Row: {
          abandoned_cart_delay_hours: number | null
          abandoned_cart_enabled: boolean | null
          created_at: string | null
          id: string
          review_request_delay_days: number | null
          review_request_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          abandoned_cart_delay_hours?: number | null
          abandoned_cart_enabled?: boolean | null
          created_at?: string | null
          id?: string
          review_request_delay_days?: number | null
          review_request_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          abandoned_cart_delay_hours?: number | null
          abandoned_cart_enabled?: boolean | null
          created_at?: string | null
          id?: string
          review_request_delay_days?: number | null
          review_request_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign: {
        Row: {
          bounce_count: number
          click_count: number
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          open_count: number
          recipient_count: number
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          bounce_count?: number
          click_count?: number
          created_at?: string
          deleted_at?: string | null
          id: string
          name: string
          open_count?: number
          recipient_count?: number
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          bounce_count?: number
          click_count?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          open_count?: number
          recipient_count?: number
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          email_type: string
          error_detail: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          provider: string | null
          recipient: string
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          tenant_id: string
        }
        Insert: {
          email_type: string
          error_detail?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient: string
          resend_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          tenant_id: string
        }
        Update: {
          email_type?: string
          error_detail?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string | null
          recipient?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string | null
          id: string
          send_abandoned_cart: boolean | null
          send_low_stock_alert: boolean | null
          send_order_cancelled: boolean | null
          send_order_confirmation: boolean | null
          send_order_delivered: boolean | null
          send_order_shipped: boolean | null
          send_payment_failed: boolean | null
          send_refund_processed: boolean | null
          send_review_request: boolean | null
          send_welcome: boolean | null
          template_design: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          send_abandoned_cart?: boolean | null
          send_low_stock_alert?: boolean | null
          send_order_cancelled?: boolean | null
          send_order_confirmation?: boolean | null
          send_order_delivered?: boolean | null
          send_order_shipped?: boolean | null
          send_payment_failed?: boolean | null
          send_refund_processed?: boolean | null
          send_review_request?: boolean | null
          send_welcome?: boolean | null
          template_design?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          send_abandoned_cart?: boolean | null
          send_low_stock_alert?: boolean | null
          send_order_cancelled?: boolean | null
          send_order_confirmation?: boolean | null
          send_order_delivered?: boolean | null
          send_order_shipped?: boolean | null
          send_payment_failed?: boolean | null
          send_refund_processed?: boolean | null
          send_review_request?: boolean | null
          send_welcome?: boolean | null
          template_design?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          deleted_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          id: string
          opened_at?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_template: {
        Row: {
          created_at: string
          deleted_at: string | null
          html_body: string
          id: string
          is_system: boolean
          name: string
          preview_text: string | null
          subject_template: string
          text_body: string | null
          type: string
          updated_at: string
          variables_schema: Json | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          html_body: string
          id: string
          is_system?: boolean
          name: string
          preview_text?: string | null
          subject_template: string
          text_body?: string | null
          type?: string
          updated_at?: string
          variables_schema?: Json | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          html_body?: string
          id?: string
          is_system?: boolean
          name?: string
          preview_text?: string | null
          subject_template?: string
          text_body?: string | null
          type?: string
          updated_at?: string
          variables_schema?: Json | null
        }
        Relationships: []
      }
      entitlement_log: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          origin: string
          payload: Json
          resolved_by: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          origin?: string
          payload?: Json
          resolved_by?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          origin?: string
          payload?: Json
          resolved_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enable_2fa: boolean | null
          enable_abandoned_cart_emails: boolean
          enable_address_management: boolean
          enable_admin_api: boolean
          enable_analytics: boolean
          enable_apple_oauth: boolean | null
          enable_auth_advanced: boolean | null
          enable_automations: boolean | null
          enable_backups: boolean | null
          enable_bank_transfer: boolean
          enable_carousel: boolean
          enable_cash_on_delivery: boolean
          enable_chatbot: boolean
          enable_cms_pages: boolean
          enable_cookie_consent: boolean
          enable_crm: boolean | null
          enable_crm_contacts: boolean | null
          enable_crm_export: boolean
          enable_crm_interactions: boolean | null
          enable_crm_segmentation: boolean
          enable_crm_segments: boolean | null
          enable_custom_webhooks: boolean | null
          enable_customer_accounts: boolean
          enable_ecommerce: boolean
          enable_email_auth: boolean
          enable_email_campaigns: boolean
          enable_email_notifications: boolean
          enable_email_segmentation: boolean | null
          enable_email_templates: boolean
          enable_facebook_oauth: boolean | null
          enable_google_auth: boolean
          enable_google_oauth: boolean | null
          enable_guest_checkout: boolean
          enable_kiosk_analytics: boolean | null
          enable_kiosk_idle_timer: boolean | null
          enable_kiosk_remote_management: boolean | null
          enable_live_chat: boolean
          enable_magic_link: boolean | null
          enable_maintenance_mode: boolean
          enable_manual_backup: boolean | null
          enable_multi_currency: boolean
          enable_multi_language: boolean
          enable_newsletter: boolean
          enable_online_payments: boolean
          enable_order_notes: boolean
          enable_order_tracking: boolean
          enable_owner_panel: boolean
          enable_pos: boolean
          enable_pos_customer_search: boolean
          enable_pos_keyboard_shortcuts: boolean
          enable_pos_kiosk: boolean
          enable_pos_line_discounts: boolean
          enable_pos_multi_device: boolean
          enable_pos_offline_cart: boolean
          enable_pos_quick_sale: boolean
          enable_pos_shifts: boolean
          enable_pos_thermal_printer: boolean
          enable_product_badges: boolean
          enable_product_comparisons: boolean
          enable_product_search: boolean
          enable_promotions: boolean
          enable_related_products: boolean
          enable_reservation_checkout: boolean | null
          enable_review_request_emails: boolean | null
          enable_reviews: boolean
          enable_sales_channels: boolean | null
          enable_self_service_returns: boolean
          enable_seo: boolean | null
          enable_seo_tools: boolean | null
          enable_social_links: boolean
          enable_social_media: boolean | null
          enable_social_sharing: boolean | null
          enable_stock_notifications: boolean
          enable_traffic_analytics: boolean
          enable_traffic_autoscale: boolean
          enable_traffic_expansion: boolean
          enable_transactional_emails: boolean | null
          enable_user_registration: boolean
          enable_whatsapp_checkout: boolean
          enable_whatsapp_contact: boolean
          enable_wishlist: boolean
          id: string
          owner_advanced_modules_enabled: boolean
          owner_lite_enabled: boolean
          require_auth_to_order: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_2fa?: boolean | null
          enable_abandoned_cart_emails?: boolean
          enable_address_management?: boolean
          enable_admin_api?: boolean
          enable_analytics?: boolean
          enable_apple_oauth?: boolean | null
          enable_auth_advanced?: boolean | null
          enable_automations?: boolean | null
          enable_backups?: boolean | null
          enable_bank_transfer?: boolean
          enable_carousel?: boolean
          enable_cash_on_delivery?: boolean
          enable_chatbot?: boolean
          enable_cms_pages?: boolean
          enable_cookie_consent?: boolean
          enable_crm?: boolean | null
          enable_crm_contacts?: boolean | null
          enable_crm_export?: boolean
          enable_crm_interactions?: boolean | null
          enable_crm_segmentation?: boolean
          enable_crm_segments?: boolean | null
          enable_custom_webhooks?: boolean | null
          enable_customer_accounts?: boolean
          enable_ecommerce?: boolean
          enable_email_auth?: boolean
          enable_email_campaigns?: boolean
          enable_email_notifications?: boolean
          enable_email_segmentation?: boolean | null
          enable_email_templates?: boolean
          enable_facebook_oauth?: boolean | null
          enable_google_auth?: boolean
          enable_google_oauth?: boolean | null
          enable_guest_checkout?: boolean
          enable_kiosk_analytics?: boolean | null
          enable_kiosk_idle_timer?: boolean | null
          enable_kiosk_remote_management?: boolean | null
          enable_live_chat?: boolean
          enable_magic_link?: boolean | null
          enable_maintenance_mode?: boolean
          enable_manual_backup?: boolean | null
          enable_multi_currency?: boolean
          enable_multi_language?: boolean
          enable_newsletter?: boolean
          enable_online_payments?: boolean
          enable_order_notes?: boolean
          enable_order_tracking?: boolean
          enable_owner_panel?: boolean
          enable_pos?: boolean
          enable_pos_customer_search?: boolean
          enable_pos_keyboard_shortcuts?: boolean
          enable_pos_kiosk?: boolean
          enable_pos_line_discounts?: boolean
          enable_pos_multi_device?: boolean
          enable_pos_offline_cart?: boolean
          enable_pos_quick_sale?: boolean
          enable_pos_shifts?: boolean
          enable_pos_thermal_printer?: boolean
          enable_product_badges?: boolean
          enable_product_comparisons?: boolean
          enable_product_search?: boolean
          enable_promotions?: boolean
          enable_related_products?: boolean
          enable_reservation_checkout?: boolean | null
          enable_review_request_emails?: boolean | null
          enable_reviews?: boolean
          enable_sales_channels?: boolean | null
          enable_self_service_returns?: boolean
          enable_seo?: boolean | null
          enable_seo_tools?: boolean | null
          enable_social_links?: boolean
          enable_social_media?: boolean | null
          enable_social_sharing?: boolean | null
          enable_stock_notifications?: boolean
          enable_traffic_analytics?: boolean
          enable_traffic_autoscale?: boolean
          enable_traffic_expansion?: boolean
          enable_transactional_emails?: boolean | null
          enable_user_registration?: boolean
          enable_whatsapp_checkout?: boolean
          enable_whatsapp_contact?: boolean
          enable_wishlist?: boolean
          id?: string
          owner_advanced_modules_enabled?: boolean
          owner_lite_enabled?: boolean
          require_auth_to_order?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_2fa?: boolean | null
          enable_abandoned_cart_emails?: boolean
          enable_address_management?: boolean
          enable_admin_api?: boolean
          enable_analytics?: boolean
          enable_apple_oauth?: boolean | null
          enable_auth_advanced?: boolean | null
          enable_automations?: boolean | null
          enable_backups?: boolean | null
          enable_bank_transfer?: boolean
          enable_carousel?: boolean
          enable_cash_on_delivery?: boolean
          enable_chatbot?: boolean
          enable_cms_pages?: boolean
          enable_cookie_consent?: boolean
          enable_crm?: boolean | null
          enable_crm_contacts?: boolean | null
          enable_crm_export?: boolean
          enable_crm_interactions?: boolean | null
          enable_crm_segmentation?: boolean
          enable_crm_segments?: boolean | null
          enable_custom_webhooks?: boolean | null
          enable_customer_accounts?: boolean
          enable_ecommerce?: boolean
          enable_email_auth?: boolean
          enable_email_campaigns?: boolean
          enable_email_notifications?: boolean
          enable_email_segmentation?: boolean | null
          enable_email_templates?: boolean
          enable_facebook_oauth?: boolean | null
          enable_google_auth?: boolean
          enable_google_oauth?: boolean | null
          enable_guest_checkout?: boolean
          enable_kiosk_analytics?: boolean | null
          enable_kiosk_idle_timer?: boolean | null
          enable_kiosk_remote_management?: boolean | null
          enable_live_chat?: boolean
          enable_magic_link?: boolean | null
          enable_maintenance_mode?: boolean
          enable_manual_backup?: boolean | null
          enable_multi_currency?: boolean
          enable_multi_language?: boolean
          enable_newsletter?: boolean
          enable_online_payments?: boolean
          enable_order_notes?: boolean
          enable_order_tracking?: boolean
          enable_owner_panel?: boolean
          enable_pos?: boolean
          enable_pos_customer_search?: boolean
          enable_pos_keyboard_shortcuts?: boolean
          enable_pos_kiosk?: boolean
          enable_pos_line_discounts?: boolean
          enable_pos_multi_device?: boolean
          enable_pos_offline_cart?: boolean
          enable_pos_quick_sale?: boolean
          enable_pos_shifts?: boolean
          enable_pos_thermal_printer?: boolean
          enable_product_badges?: boolean
          enable_product_comparisons?: boolean
          enable_product_search?: boolean
          enable_promotions?: boolean
          enable_related_products?: boolean
          enable_reservation_checkout?: boolean | null
          enable_review_request_emails?: boolean | null
          enable_reviews?: boolean
          enable_sales_channels?: boolean | null
          enable_self_service_returns?: boolean
          enable_seo?: boolean | null
          enable_seo_tools?: boolean | null
          enable_social_links?: boolean
          enable_social_media?: boolean | null
          enable_social_sharing?: boolean | null
          enable_stock_notifications?: boolean
          enable_traffic_analytics?: boolean
          enable_traffic_autoscale?: boolean
          enable_traffic_expansion?: boolean
          enable_transactional_emails?: boolean | null
          enable_user_registration?: boolean
          enable_whatsapp_checkout?: boolean
          enable_whatsapp_contact?: boolean
          enable_wishlist?: boolean
          id?: string
          owner_advanced_modules_enabled?: boolean
          owner_lite_enabled?: boolean
          require_auth_to_order?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flag_definitions: {
        Row: {
          category: string
          conflicts: string[] | null
          created_at: string | null
          deps: string[] | null
          description: string | null
          group_color: string
          group_label: string
          is_active: boolean | null
          key: string
          label: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          conflicts?: string[] | null
          created_at?: string | null
          deps?: string[] | null
          description?: string | null
          group_color?: string
          group_label: string
          is_active?: boolean | null
          key: string
          label: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          conflicts?: string[] | null
          created_at?: string | null
          deps?: string[] | null
          description?: string | null
          group_color?: string
          group_label?: string
          is_active?: boolean | null
          key?: string
          label?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fulfillment: {
        Row: {
          canceled_at: string | null
          created_at: string
          created_by: string | null
          data: Json | null
          deleted_at: string | null
          delivered_at: string | null
          delivery_address_id: string | null
          id: string
          location_id: string
          marked_shipped_by: string | null
          metadata: Json | null
          packed_at: string | null
          provider_id: string | null
          requires_shipping: boolean
          shipped_at: string | null
          shipping_option_id: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          id: string
          location_id: string
          marked_shipped_by?: string | null
          metadata?: Json | null
          packed_at?: string | null
          provider_id?: string | null
          requires_shipping?: boolean
          shipped_at?: string | null
          shipping_option_id?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          id?: string
          location_id?: string
          marked_shipped_by?: string | null
          metadata?: Json | null
          packed_at?: string | null
          provider_id?: string | null
          requires_shipping?: boolean
          shipped_at?: string | null
          shipping_option_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_delivery_address_id_foreign"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_provider_id_foreign"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_provider"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_shipping_option_id_foreign"
            columns: ["shipping_option_id"]
            isOneToOne: false
            referencedRelation: "shipping_option"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_address: {
        Row: {
          address_1: string | null
          address_2: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fulfillment_item: {
        Row: {
          barcode: string
          created_at: string
          deleted_at: string | null
          fulfillment_id: string
          id: string
          inventory_item_id: string | null
          line_item_id: string | null
          quantity: number
          raw_quantity: Json
          sku: string
          title: string
          updated_at: string
        }
        Insert: {
          barcode: string
          created_at?: string
          deleted_at?: string | null
          fulfillment_id: string
          id: string
          inventory_item_id?: string | null
          line_item_id?: string | null
          quantity: number
          raw_quantity: Json
          sku: string
          title: string
          updated_at?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          deleted_at?: string | null
          fulfillment_id?: string
          id?: string
          inventory_item_id?: string | null
          line_item_id?: string | null
          quantity?: number
          raw_quantity?: Json
          sku?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_item_fulfillment_id_foreign"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillment"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_label: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_id: string
          id: string
          label_url: string
          tracking_number: string
          tracking_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id: string
          id: string
          label_url: string
          tracking_number: string
          tracking_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id?: string
          id?: string
          label_url?: string
          tracking_number?: string
          tracking_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_label_fulfillment_id_foreign"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillment"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_provider: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      fulfillment_set: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      geo_zone: {
        Row: {
          city: string | null
          country_code: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          postal_expression: Json | null
          province_code: string | null
          service_zone_id: string
          type: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country_code: string
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          postal_expression?: Json | null
          province_code?: string | null
          service_zone_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          postal_expression?: Json | null
          province_code?: string | null
          service_zone_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_zone_service_zone_id_foreign"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zone"
            referencedColumns: ["id"]
          },
        ]
      }
      health_snapshots: {
        Row: {
          created_at: string | null
          critical: number
          degraded: number
          healthy: number
          id: string
          snapshot_data: Json
          tenant_scores: Json
          total_tenants: number
        }
        Insert: {
          created_at?: string | null
          critical?: number
          degraded?: number
          healthy?: number
          id?: string
          snapshot_data: Json
          tenant_scores: Json
          total_tenants?: number
        }
        Update: {
          created_at?: string | null
          critical?: number
          degraded?: number
          healthy?: number
          id?: string
          snapshot_data?: Json
          tenant_scores?: Json
          total_tenants?: number
        }
        Relationships: []
      }
      image: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          product_id: string
          rank: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          product_id: string
          rank?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          rank?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_product_id_foreign"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          height: number | null
          hs_code: string | null
          id: string
          length: number | null
          material: string | null
          metadata: Json | null
          mid_code: string | null
          origin_country: string | null
          requires_shipping: boolean
          sku: string | null
          thumbnail: string | null
          title: string | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          height?: number | null
          hs_code?: string | null
          id: string
          length?: number | null
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          requires_shipping?: boolean
          sku?: string | null
          thumbnail?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          height?: number | null
          hs_code?: string | null
          id?: string
          length?: number | null
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          requires_shipping?: boolean
          sku?: string | null
          thumbnail?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      inventory_level: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          incoming_quantity: number
          inventory_item_id: string
          location_id: string
          metadata: Json | null
          raw_incoming_quantity: Json | null
          raw_reserved_quantity: Json | null
          raw_stocked_quantity: Json | null
          reserved_quantity: number
          stocked_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          incoming_quantity?: number
          inventory_item_id: string
          location_id: string
          metadata?: Json | null
          raw_incoming_quantity?: Json | null
          raw_reserved_quantity?: Json | null
          raw_stocked_quantity?: Json | null
          reserved_quantity?: number
          stocked_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          incoming_quantity?: number
          inventory_item_id?: string
          location_id?: string
          metadata?: Json | null
          raw_incoming_quantity?: Json | null
          raw_reserved_quantity?: Json | null
          raw_stocked_quantity?: Json | null
          reserved_quantity?: number
          stocked_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_level_inventory_item_id_foreign"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_item"
            referencedColumns: ["id"]
          },
        ]
      }
      invite: {
        Row: {
          accepted: boolean
          created_at: string
          deleted_at: string | null
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          token: string
          updated_at: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          deleted_at?: string | null
          email: string
          expires_at: string
          id: string
          metadata?: Json | null
          token: string
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          deleted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          consent_locale: string | null
          created_at: string | null
          email: string | null
          id: string
          ip_hash: string | null
          landing_path: string | null
          message: string | null
          name: string | null
          notes: string | null
          phone: string | null
          privacy_version: string | null
          referrer_host: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company?: string | null
          consent_locale?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          privacy_version?: string | null
          referrer_host?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string | null
          consent_locale?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          message?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          privacy_version?: string | null
          referrer_host?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      limit_definitions: {
        Row: {
          category: string
          created_at: string
          default_value: number
          description: string | null
          display_name: string
          id: string
          limit_key: string
          metadata: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_value?: number
          description?: string | null
          display_name: string
          id?: string
          limit_key: string
          metadata?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_value?: number
          description?: string | null
          display_name?: string
          id?: string
          limit_key?: string
          metadata?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      link_module_migrations: {
        Row: {
          created_at: string | null
          id: number
          link_descriptor: Json
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          link_descriptor?: Json
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          link_descriptor?: Json
          table_name?: string
        }
        Relationships: []
      }
      location_fulfillment_provider: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_provider_id: string
          id: string
          stock_location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_provider_id: string
          id: string
          stock_location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_provider_id?: string
          id?: string
          stock_location_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_fulfillment_set: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_set_id: string
          id: string
          stock_location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_set_id: string
          id: string
          stock_location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_set_id?: string
          id?: string
          stock_location_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mikro_orm_migrations: {
        Row: {
          executed_at: string | null
          id: number
          name: string | null
        }
        Insert: {
          executed_at?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          executed_at?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      module_categories: {
        Row: {
          color: string
          created_at: string
          gradient: string
          icon: string
          id: string
          is_active: boolean
          key: string
          label_de: string
          label_en: string
          label_es: string
          label_fr: string
          label_it: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          label_de?: string
          label_en?: string
          label_es: string
          label_fr?: string
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          label_de?: string
          label_en?: string
          label_es?: string
          label_fr?: string
          label_it?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      module_content: {
        Row: {
          content: Json
          content_type: string
          created_at: string | null
          id: string
          locale: string
          module_key: string
          tier_key: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json
          content_type: string
          created_at?: string | null
          id?: string
          locale: string
          module_key: string
          tier_key?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string | null
          id?: string
          locale?: string
          module_key?: string
          tier_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_flag_map: {
        Row: {
          created_at: string | null
          flags: Json
          id: string
          limits: Json
          module_key: string
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flags?: Json
          id?: string
          limits?: Json
          module_key: string
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flags?: Json
          id?: string
          limits?: Json
          module_key?: string
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_flag_map_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      module_order_items: {
        Row: {
          activated_at: string | null
          applied_rule: Json | null
          billing_interval: string | null
          created_at: string | null
          discount_cents: number
          id: string
          is_activated: boolean | null
          metadata: Json | null
          module_icon: string | null
          module_id: string
          module_key: string
          module_name: string
          order_id: string
          subscription_type: string | null
          tax_cents: number
          tier_id: string | null
          tier_name: string | null
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          activated_at?: string | null
          applied_rule?: Json | null
          billing_interval?: string | null
          created_at?: string | null
          discount_cents?: number
          id?: string
          is_activated?: boolean | null
          metadata?: Json | null
          module_icon?: string | null
          module_id: string
          module_key: string
          module_name: string
          order_id: string
          subscription_type?: string | null
          tax_cents?: number
          tier_id?: string | null
          tier_name?: string | null
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          activated_at?: string | null
          applied_rule?: Json | null
          billing_interval?: string | null
          created_at?: string | null
          discount_cents?: number
          id?: string
          is_activated?: boolean | null
          metadata?: Json | null
          module_icon?: string | null
          module_id?: string
          module_key?: string
          module_name?: string
          order_id?: string
          subscription_type?: string | null
          tax_cents?: number
          tier_id?: string | null
          tier_name?: string | null
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_order_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "module_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_order_items_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      module_order_payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          method: string | null
          order_id: string
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          order_id: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          order_id?: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "module_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      module_orders: {
        Row: {
          activated_at: string | null
          billing_info: Json | null
          canceled_at: string | null
          coupon_code: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_cents: number
          id: string
          idempotency_key: string | null
          internal_notes: string | null
          metadata: Json | null
          order_number: string | null
          paid_at: string | null
          placed_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          subtotal_cents: number
          tax_cents: number
          tenant_id: string | null
          total_cents: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          billing_info?: Json | null
          canceled_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_cents?: number
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          metadata?: Json | null
          order_number?: string | null
          paid_at?: string | null
          placed_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tenant_id?: string | null
          total_cents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          billing_info?: Json | null
          canceled_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_cents?: number
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          metadata?: Json | null
          order_number?: string | null
          paid_at?: string | null
          placed_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tenant_id?: string | null
          total_cents?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_reviews: {
        Row: {
          admin_response: string | null
          admin_response_at: string | null
          admin_response_by: string | null
          content: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          module_id: string
          order_item_id: string | null
          rating: number
          reported_count: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          admin_response_at?: string | null
          admin_response_by?: string | null
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          module_id: string
          order_item_id?: string | null
          rating: number
          reported_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          admin_response_at?: string | null
          admin_response_by?: string | null
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          module_id?: string
          order_item_id?: string | null
          rating?: number
          reported_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_reviews_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "module_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      module_rules: {
        Row: {
          conditions: Json | null
          created_at: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_type: string
          source_module_id: string
          source_tier_id: string | null
          target_module_id: string
          target_tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_type: string
          source_module_id: string
          source_tier_id?: string | null
          target_module_id: string
          target_tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_type?: string
          source_module_id?: string
          source_tier_id?: string | null
          target_module_id?: string
          target_tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_rules_source_module_id_fkey"
            columns: ["source_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_rules_source_tier_id_fkey"
            columns: ["source_tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_rules_target_module_id_fkey"
            columns: ["target_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_rules_target_tier_id_fkey"
            columns: ["target_tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      module_tier_prices: {
        Row: {
          amount: number
          auto_calculated: boolean | null
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          stripe_price_id: string | null
          tier_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          auto_calculated?: boolean | null
          created_at?: string | null
          currency: string
          id?: string
          is_active?: boolean | null
          stripe_price_id?: string | null
          tier_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_calculated?: boolean | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          stripe_price_id?: string | null
          tier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_tier_prices_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      module_tiers: {
        Row: {
          benefits: Json | null
          created_at: string | null
          description: string | null
          description_de: string | null
          description_en: string | null
          description_fr: string | null
          description_it: string | null
          features: Json | null
          flag_effects: Json | null
          id: string
          is_recommended: boolean | null
          key: string | null
          limit_effects: Json | null
          limits: Json | null
          module_id: string | null
          price: number
          sort_order: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          tagline: string | null
          tier_name: string
          tier_name_de: string | null
          tier_name_en: string | null
          tier_name_fr: string | null
          tier_name_it: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          features?: Json | null
          flag_effects?: Json | null
          id?: string
          is_recommended?: boolean | null
          key?: string | null
          limit_effects?: Json | null
          limits?: Json | null
          module_id?: string | null
          price: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          tier_name: string
          tier_name_de?: string | null
          tier_name_en?: string | null
          tier_name_fr?: string | null
          tier_name_it?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          features?: Json | null
          flag_effects?: Json | null
          id?: string
          is_recommended?: boolean | null
          key?: string | null
          limit_effects?: Json | null
          limits?: Json | null
          module_id?: string | null
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          tier_name?: string
          tier_name_de?: string | null
          tier_name_en?: string | null
          tier_name_fr?: string | null
          tier_name_it?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_tiers_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_wishlists: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_wishlists_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          benefits: Json | null
          category: string
          color_gradient: string | null
          created_at: string | null
          description: string | null
          description_de: string | null
          description_en: string | null
          description_fr: string | null
          description_it: string | null
          emoji: string | null
          features: Json | null
          flag_effects: Json | null
          has_free_tier: boolean | null
          icon: string | null
          icon_color: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          is_purchasable: boolean | null
          is_visible: boolean | null
          key: string
          limit_effects: Json | null
          long_description: string | null
          long_description_de: string | null
          long_description_en: string | null
          long_description_fr: string | null
          long_description_it: string | null
          name: string
          name_de: string | null
          name_en: string | null
          name_fr: string | null
          name_it: string | null
          payment_type: string | null
          pricing_model: string | null
          requires: Json | null
          slug: string
          sort_order: number | null
          status: string | null
          stripe_product_id: string | null
          tagline: string | null
          tagline_de: string | null
          tagline_en: string | null
          tagline_fr: string | null
          tagline_it: string | null
          text_color: string | null
        }
        Insert: {
          benefits?: Json | null
          category: string
          color_gradient?: string | null
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          emoji?: string | null
          features?: Json | null
          flag_effects?: Json | null
          has_free_tier?: boolean | null
          icon?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_visible?: boolean | null
          key: string
          limit_effects?: Json | null
          long_description?: string | null
          long_description_de?: string | null
          long_description_en?: string | null
          long_description_fr?: string | null
          long_description_it?: string | null
          name: string
          name_de?: string | null
          name_en?: string | null
          name_fr?: string | null
          name_it?: string | null
          payment_type?: string | null
          pricing_model?: string | null
          requires?: Json | null
          slug: string
          sort_order?: number | null
          status?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          tagline_de?: string | null
          tagline_en?: string | null
          tagline_fr?: string | null
          tagline_it?: string | null
          text_color?: string | null
        }
        Update: {
          benefits?: Json | null
          category?: string
          color_gradient?: string | null
          created_at?: string | null
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          emoji?: string | null
          features?: Json | null
          flag_effects?: Json | null
          has_free_tier?: boolean | null
          icon?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_visible?: boolean | null
          key?: string
          limit_effects?: Json | null
          long_description?: string | null
          long_description_de?: string | null
          long_description_en?: string | null
          long_description_fr?: string | null
          long_description_it?: string | null
          name?: string
          name_de?: string | null
          name_en?: string | null
          name_fr?: string | null
          name_it?: string | null
          payment_type?: string | null
          pricing_model?: string | null
          requires?: Json | null
          slug?: string
          sort_order?: number | null
          status?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          tagline_de?: string | null
          tagline_en?: string | null
          tagline_fr?: string | null
          tagline_it?: string | null
          text_color?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          source: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notification: {
        Row: {
          channel: string
          created_at: string
          data: Json | null
          deleted_at: string | null
          external_id: string | null
          from: string | null
          id: string
          idempotency_key: string | null
          original_notification_id: string | null
          provider_data: Json | null
          provider_id: string | null
          receiver_id: string | null
          resource_id: string | null
          resource_type: string | null
          status: string
          template: string | null
          to: string
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          external_id?: string | null
          from?: string | null
          id: string
          idempotency_key?: string | null
          original_notification_id?: string | null
          provider_data?: Json | null
          provider_id?: string | null
          receiver_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          template?: string | null
          to: string
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          external_id?: string | null
          from?: string | null
          id?: string
          idempotency_key?: string | null
          original_notification_id?: string | null
          provider_data?: Json | null
          provider_id?: string | null
          receiver_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          template?: string | null
          to?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_provider_id_foreign"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "notification_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_provider: {
        Row: {
          channels: string[]
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          is_enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          deleted_at?: string | null
          handle: string
          id: string
          is_enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          deleted_at?: string | null
          handle?: string
          id?: string
          is_enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order: {
        Row: {
          billing_address_id: string | null
          canceled_at: string | null
          created_at: string
          currency_code: string
          custom_display_id: string | null
          customer_id: string | null
          deleted_at: string | null
          display_id: number | null
          email: string | null
          id: string
          is_draft_order: boolean
          locale: string | null
          metadata: Json | null
          no_notification: boolean | null
          region_id: string | null
          sales_channel_id: string | null
          shipping_address_id: string | null
          status: Database["public"]["Enums"]["order_status_enum"]
          updated_at: string
          version: number
        }
        Insert: {
          billing_address_id?: string | null
          canceled_at?: string | null
          created_at?: string
          currency_code: string
          custom_display_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          display_id?: number | null
          email?: string | null
          id: string
          is_draft_order?: boolean
          locale?: string | null
          metadata?: Json | null
          no_notification?: boolean | null
          region_id?: string | null
          sales_channel_id?: string | null
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          updated_at?: string
          version?: number
        }
        Update: {
          billing_address_id?: string | null
          canceled_at?: string | null
          created_at?: string
          currency_code?: string
          custom_display_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          display_id?: number | null
          email?: string | null
          id?: string
          is_draft_order?: boolean
          locale?: string | null
          metadata?: Json | null
          no_notification?: boolean | null
          region_id?: string | null
          sales_channel_id?: string | null
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_billing_address_id_foreign"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "order_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipping_address_id_foreign"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "order_address"
            referencedColumns: ["id"]
          },
        ]
      }
      order_address: {
        Row: {
          address_1: string | null
          address_2: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_cart: {
        Row: {
          cart_id: string
          created_at: string
          deleted_at: string | null
          id: string
          order_id: string
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          order_id: string
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_change: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          carry_over_promotions: boolean | null
          change_type: string | null
          claim_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          declined_at: string | null
          declined_by: string | null
          declined_reason: string | null
          deleted_at: string | null
          description: string | null
          exchange_id: string | null
          id: string
          internal_note: string | null
          metadata: Json | null
          order_id: string
          requested_at: string | null
          requested_by: string | null
          return_id: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          carry_over_promotions?: boolean | null
          change_type?: string | null
          claim_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          declined_by?: string | null
          declined_reason?: string | null
          deleted_at?: string | null
          description?: string | null
          exchange_id?: string | null
          id: string
          internal_note?: string | null
          metadata?: Json | null
          order_id: string
          requested_at?: string | null
          requested_by?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
          version: number
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          carry_over_promotions?: boolean | null
          change_type?: string | null
          claim_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          declined_by?: string | null
          declined_reason?: string | null
          deleted_at?: string | null
          description?: string | null
          exchange_id?: string | null
          id?: string
          internal_note?: string | null
          metadata?: Json | null
          order_id?: string
          requested_at?: string | null
          requested_by?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_change_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_change_action: {
        Row: {
          action: string
          amount: number | null
          applied: boolean
          claim_id: string | null
          created_at: string
          deleted_at: string | null
          details: Json | null
          exchange_id: string | null
          id: string
          internal_note: string | null
          order_change_id: string | null
          order_id: string | null
          ordering: number
          raw_amount: Json | null
          reference: string | null
          reference_id: string | null
          return_id: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          action: string
          amount?: number | null
          applied?: boolean
          claim_id?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: Json | null
          exchange_id?: string | null
          id: string
          internal_note?: string | null
          order_change_id?: string | null
          order_id?: string | null
          ordering?: number
          raw_amount?: Json | null
          reference?: string | null
          reference_id?: string | null
          return_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          action?: string
          amount?: number | null
          applied?: boolean
          claim_id?: string | null
          created_at?: string
          deleted_at?: string | null
          details?: Json | null
          exchange_id?: string | null
          id?: string
          internal_note?: string | null
          order_change_id?: string | null
          order_id?: string | null
          ordering?: number
          raw_amount?: Json | null
          reference?: string | null
          reference_id?: string | null
          return_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_change_action_order_change_id_foreign"
            columns: ["order_change_id"]
            isOneToOne: false
            referencedRelation: "order_change"
            referencedColumns: ["id"]
          },
        ]
      }
      order_claim: {
        Row: {
          canceled_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_id: number
          id: string
          metadata: Json | null
          no_notification: boolean | null
          order_id: string
          order_version: number
          raw_refund_amount: Json | null
          refund_amount: number | null
          return_id: string | null
          type: Database["public"]["Enums"]["order_claim_type_enum"]
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_id?: number
          id: string
          metadata?: Json | null
          no_notification?: boolean | null
          order_id: string
          order_version: number
          raw_refund_amount?: Json | null
          refund_amount?: number | null
          return_id?: string | null
          type: Database["public"]["Enums"]["order_claim_type_enum"]
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_id?: number
          id?: string
          metadata?: Json | null
          no_notification?: boolean | null
          order_id?: string
          order_version?: number
          raw_refund_amount?: Json | null
          refund_amount?: number | null
          return_id?: string | null
          type?: Database["public"]["Enums"]["order_claim_type_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      order_claim_item: {
        Row: {
          claim_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_additional_item: boolean
          item_id: string
          metadata: Json | null
          note: string | null
          quantity: number
          raw_quantity: Json
          reason: Database["public"]["Enums"]["claim_reason_enum"] | null
          updated_at: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          is_additional_item?: boolean
          item_id: string
          metadata?: Json | null
          note?: string | null
          quantity: number
          raw_quantity: Json
          reason?: Database["public"]["Enums"]["claim_reason_enum"] | null
          updated_at?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_additional_item?: boolean
          item_id?: string
          metadata?: Json | null
          note?: string | null
          quantity?: number
          raw_quantity?: Json
          reason?: Database["public"]["Enums"]["claim_reason_enum"] | null
          updated_at?: string
        }
        Relationships: []
      }
      order_claim_item_image: {
        Row: {
          claim_item_id: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          updated_at: string
          url: string
        }
        Insert: {
          claim_item_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string
          url: string
        }
        Update: {
          claim_item_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      order_credit_line: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          raw_amount: Json
          reference: string | null
          reference_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          order_id: string
          raw_amount: Json
          reference?: string | null
          reference_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          raw_amount?: Json
          reference?: string | null
          reference_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_credit_line_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_exchange: {
        Row: {
          allow_backorder: boolean
          canceled_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          difference_due: number | null
          display_id: number
          id: string
          metadata: Json | null
          no_notification: boolean | null
          order_id: string
          order_version: number
          raw_difference_due: Json | null
          return_id: string | null
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difference_due?: number | null
          display_id?: number
          id: string
          metadata?: Json | null
          no_notification?: boolean | null
          order_id: string
          order_version: number
          raw_difference_due?: Json | null
          return_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          difference_due?: number | null
          display_id?: number
          id?: string
          metadata?: Json | null
          no_notification?: boolean | null
          order_id?: string
          order_version?: number
          raw_difference_due?: Json | null
          return_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_exchange_item: {
        Row: {
          created_at: string
          deleted_at: string | null
          exchange_id: string
          id: string
          item_id: string
          metadata: Json | null
          note: string | null
          quantity: number
          raw_quantity: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          exchange_id: string
          id: string
          item_id: string
          metadata?: Json | null
          note?: string | null
          quantity: number
          raw_quantity: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          exchange_id?: string
          id?: string
          item_id?: string
          metadata?: Json | null
          note?: string | null
          quantity?: number
          raw_quantity?: Json
          updated_at?: string
        }
        Relationships: []
      }
      order_fulfillment: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_id: string
          id: string
          order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id: string
          id: string
          order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id?: string
          id?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_item: {
        Row: {
          compare_at_unit_price: number | null
          created_at: string
          deleted_at: string | null
          delivered_quantity: number
          fulfilled_quantity: number
          id: string
          item_id: string
          metadata: Json | null
          order_id: string
          quantity: number
          raw_compare_at_unit_price: Json | null
          raw_delivered_quantity: Json
          raw_fulfilled_quantity: Json
          raw_quantity: Json
          raw_return_dismissed_quantity: Json
          raw_return_received_quantity: Json
          raw_return_requested_quantity: Json
          raw_shipped_quantity: Json
          raw_unit_price: Json | null
          raw_written_off_quantity: Json
          return_dismissed_quantity: number
          return_received_quantity: number
          return_requested_quantity: number
          shipped_quantity: number
          unit_price: number | null
          updated_at: string
          version: number
          written_off_quantity: number
        }
        Insert: {
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          delivered_quantity?: number
          fulfilled_quantity: number
          id: string
          item_id: string
          metadata?: Json | null
          order_id: string
          quantity: number
          raw_compare_at_unit_price?: Json | null
          raw_delivered_quantity?: Json
          raw_fulfilled_quantity?: Json
          raw_quantity: Json
          raw_return_dismissed_quantity?: Json
          raw_return_received_quantity?: Json
          raw_return_requested_quantity?: Json
          raw_shipped_quantity?: Json
          raw_unit_price?: Json | null
          raw_written_off_quantity?: Json
          return_dismissed_quantity: number
          return_received_quantity: number
          return_requested_quantity: number
          shipped_quantity: number
          unit_price?: number | null
          updated_at?: string
          version: number
          written_off_quantity: number
        }
        Update: {
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          delivered_quantity?: number
          fulfilled_quantity?: number
          id?: string
          item_id?: string
          metadata?: Json | null
          order_id?: string
          quantity?: number
          raw_compare_at_unit_price?: Json | null
          raw_delivered_quantity?: Json
          raw_fulfilled_quantity?: Json
          raw_quantity?: Json
          raw_return_dismissed_quantity?: Json
          raw_return_received_quantity?: Json
          raw_return_requested_quantity?: Json
          raw_shipped_quantity?: Json
          raw_unit_price?: Json | null
          raw_written_off_quantity?: Json
          return_dismissed_quantity?: number
          return_received_quantity?: number
          return_requested_quantity?: number
          shipped_quantity?: number
          unit_price?: number | null
          updated_at?: string
          version?: number
          written_off_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_item_id_foreign"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "order_line_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_item: {
        Row: {
          compare_at_unit_price: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_custom_price: boolean
          is_discountable: boolean
          is_giftcard: boolean
          is_tax_inclusive: boolean
          metadata: Json | null
          product_collection: string | null
          product_description: string | null
          product_handle: string | null
          product_id: string | null
          product_subtitle: string | null
          product_title: string | null
          product_type: string | null
          product_type_id: string | null
          raw_compare_at_unit_price: Json | null
          raw_unit_price: Json
          requires_shipping: boolean
          subtitle: string | null
          thumbnail: string | null
          title: string
          totals_id: string | null
          unit_price: number
          updated_at: string
          variant_barcode: string | null
          variant_id: string | null
          variant_option_values: Json | null
          variant_sku: string | null
          variant_title: string | null
        }
        Insert: {
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id: string
          is_custom_price?: boolean
          is_discountable?: boolean
          is_giftcard?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          product_collection?: string | null
          product_description?: string | null
          product_handle?: string | null
          product_id?: string | null
          product_subtitle?: string | null
          product_title?: string | null
          product_type?: string | null
          product_type_id?: string | null
          raw_compare_at_unit_price?: Json | null
          raw_unit_price: Json
          requires_shipping?: boolean
          subtitle?: string | null
          thumbnail?: string | null
          title: string
          totals_id?: string | null
          unit_price: number
          updated_at?: string
          variant_barcode?: string | null
          variant_id?: string | null
          variant_option_values?: Json | null
          variant_sku?: string | null
          variant_title?: string | null
        }
        Update: {
          compare_at_unit_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_custom_price?: boolean
          is_discountable?: boolean
          is_giftcard?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          product_collection?: string | null
          product_description?: string | null
          product_handle?: string | null
          product_id?: string | null
          product_subtitle?: string | null
          product_title?: string | null
          product_type?: string | null
          product_type_id?: string | null
          raw_compare_at_unit_price?: Json | null
          raw_unit_price?: Json
          requires_shipping?: boolean
          subtitle?: string | null
          thumbnail?: string | null
          title?: string
          totals_id?: string | null
          unit_price?: number
          updated_at?: string
          variant_barcode?: string | null
          variant_id?: string | null
          variant_option_values?: Json | null
          variant_sku?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_line_item_totals_id_foreign"
            columns: ["totals_id"]
            isOneToOne: false
            referencedRelation: "order_item"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_item_adjustment: {
        Row: {
          amount: number
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_tax_inclusive: boolean
          item_id: string
          promotion_id: string | null
          provider_id: string | null
          raw_amount: Json
          updated_at: string
          version: number
        }
        Insert: {
          amount: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          is_tax_inclusive?: boolean
          item_id: string
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount: Json
          updated_at?: string
          version?: number
        }
        Update: {
          amount?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_tax_inclusive?: boolean
          item_id?: string
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_line_item_adjustment_item_id_foreign"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "order_line_item"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_item_tax_line: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          item_id: string
          provider_id: string | null
          rate: number
          raw_rate: Json
          tax_rate_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          item_id: string
          provider_id?: string | null
          rate: number
          raw_rate: Json
          tax_rate_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          item_id?: string
          provider_id?: string | null
          rate?: number
          raw_rate?: Json
          tax_rate_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_line_item_tax_line_item_id_foreign"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "order_line_item"
            referencedColumns: ["id"]
          },
        ]
      }
      order_order_posmodule_pos_transaction: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          order_id: string
          pos_transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          order_id: string
          pos_transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          pos_transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_payment_collection: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          order_id: string
          payment_collection_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          order_id: string
          payment_collection_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          payment_collection_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_promotion: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          order_id: string
          promotion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          order_id: string
          promotion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          promotion_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_shipping: {
        Row: {
          claim_id: string | null
          created_at: string
          deleted_at: string | null
          exchange_id: string | null
          id: string
          order_id: string
          return_id: string | null
          shipping_method_id: string
          updated_at: string
          version: number
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          deleted_at?: string | null
          exchange_id?: string | null
          id: string
          order_id: string
          return_id?: string | null
          shipping_method_id: string
          updated_at?: string
          version: number
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          deleted_at?: string | null
          exchange_id?: string | null
          id?: string
          order_id?: string
          return_id?: string | null
          shipping_method_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_method: {
        Row: {
          amount: number
          created_at: string
          data: Json | null
          deleted_at: string | null
          description: Json | null
          id: string
          is_custom_amount: boolean
          is_tax_inclusive: boolean
          metadata: Json | null
          name: string
          raw_amount: Json
          shipping_option_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          description?: Json | null
          id: string
          is_custom_amount?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          name: string
          raw_amount: Json
          shipping_option_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          description?: Json | null
          id?: string
          is_custom_amount?: boolean
          is_tax_inclusive?: boolean
          metadata?: Json | null
          name?: string
          raw_amount?: Json
          shipping_option_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_shipping_method_adjustment: {
        Row: {
          amount: number
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          promotion_id: string | null
          provider_id: string | null
          raw_amount: Json
          shipping_method_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount: Json
          shipping_method_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          promotion_id?: string | null
          provider_id?: string | null
          raw_amount?: Json
          shipping_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_method_adjustment_shipping_method_id_foreign"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "order_shipping_method"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_method_tax_line: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          provider_id: string | null
          rate: number
          raw_rate: Json
          shipping_method_id: string
          tax_rate_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          provider_id?: string | null
          rate: number
          raw_rate: Json
          shipping_method_id: string
          tax_rate_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          provider_id?: string | null
          rate?: number
          raw_rate?: Json
          shipping_method_id?: string
          tax_rate_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_method_tax_line_shipping_method_id_foreign"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "order_shipping_method"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          from_status: string | null
          id: string
          metadata: Json | null
          order_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "module_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_summary: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          order_id: string
          totals: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          order_id: string
          totals?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          totals?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_summary_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_transaction: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          exchange_id: string | null
          id: string
          order_id: string
          raw_amount: Json
          reference: string | null
          reference_id: string | null
          return_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          exchange_id?: string | null
          id: string
          order_id: string
          raw_amount: Json
          reference?: string | null
          reference_id?: string | null
          return_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          exchange_id?: string | null
          id?: string
          order_id?: string
          raw_amount?: Json
          reference?: string | null
          reference_id?: string | null
          return_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_transaction_order_id_foreign"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      payment: {
        Row: {
          amount: number
          canceled_at: string | null
          captured_at: string | null
          created_at: string
          currency_code: string
          data: Json | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          payment_collection_id: string
          payment_session_id: string
          provider_id: string
          raw_amount: Json
          updated_at: string
        }
        Insert: {
          amount: number
          canceled_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency_code: string
          data?: Json | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          payment_collection_id: string
          payment_session_id: string
          provider_id: string
          raw_amount: Json
          updated_at?: string
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency_code?: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          payment_collection_id?: string
          payment_session_id?: string
          provider_id?: string
          raw_amount?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_payment_collection_id_foreign"
            columns: ["payment_collection_id"]
            isOneToOne: false
            referencedRelation: "payment_collection"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_collection: {
        Row: {
          amount: number
          authorized_amount: number | null
          captured_amount: number | null
          completed_at: string | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          raw_amount: Json
          raw_authorized_amount: Json | null
          raw_captured_amount: Json | null
          raw_refunded_amount: Json | null
          refunded_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          authorized_amount?: number | null
          captured_amount?: number | null
          completed_at?: string | null
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          raw_amount: Json
          raw_authorized_amount?: Json | null
          raw_captured_amount?: Json | null
          raw_refunded_amount?: Json | null
          refunded_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          authorized_amount?: number | null
          captured_amount?: number | null
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          raw_amount?: Json
          raw_authorized_amount?: Json | null
          raw_captured_amount?: Json | null
          raw_refunded_amount?: Json | null
          refunded_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_collection_payment_providers: {
        Row: {
          payment_collection_id: string
          payment_provider_id: string
        }
        Insert: {
          payment_collection_id: string
          payment_provider_id: string
        }
        Update: {
          payment_collection_id?: string
          payment_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_collection_payment_providers_payment_col_aa276_foreign"
            columns: ["payment_collection_id"]
            isOneToOne: false
            referencedRelation: "payment_collection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collection_payment_providers_payment_pro_2d555_foreign"
            columns: ["payment_provider_id"]
            isOneToOne: false
            referencedRelation: "payment_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_session: {
        Row: {
          amount: number
          authorized_at: string | null
          context: Json | null
          created_at: string
          currency_code: string
          data: Json
          deleted_at: string | null
          id: string
          metadata: Json | null
          payment_collection_id: string
          provider_id: string
          raw_amount: Json
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          authorized_at?: string | null
          context?: Json | null
          created_at?: string
          currency_code: string
          data?: Json
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          payment_collection_id: string
          provider_id: string
          raw_amount: Json
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          authorized_at?: string | null
          context?: Json | null
          created_at?: string
          currency_code?: string
          data?: Json
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          payment_collection_id?: string
          provider_id?: string
          raw_amount?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_session_payment_collection_id_foreign"
            columns: ["payment_collection_id"]
            isOneToOne: false
            referencedRelation: "payment_collection"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          backup_frequency_hours: number | null
          created_at: string
          id: string
          max_admin_users: number
          max_automations: number | null
          max_backups: number | null
          max_badges: number
          max_carousel_slides: number
          max_categories: number
          max_chatbot_messages_month: number
          max_cms_pages: number
          max_crm_contacts: number
          max_currencies: number
          max_custom_domains: number
          max_customers: number
          max_email_sends_month: number
          max_file_upload_mb: number
          max_images_per_product: number
          max_languages: number
          max_newsletter_subscribers: number
          max_orders_month: number
          max_payment_methods: number
          max_pos_kiosk_devices: number | null
          max_pos_payment_methods: number
          max_products: number
          max_promotions_active: number
          max_requests_day: number
          max_reviews_per_product: number
          max_whatsapp_templates: number
          max_wishlist_items: number
          plan_expires_at: string | null
          plan_name: string
          plan_tier: string
          storage_limit_mb: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          backup_frequency_hours?: number | null
          created_at?: string
          id?: string
          max_admin_users?: number
          max_automations?: number | null
          max_backups?: number | null
          max_badges?: number
          max_carousel_slides?: number
          max_categories?: number
          max_chatbot_messages_month?: number
          max_cms_pages?: number
          max_crm_contacts?: number
          max_currencies?: number
          max_custom_domains?: number
          max_customers?: number
          max_email_sends_month?: number
          max_file_upload_mb?: number
          max_images_per_product?: number
          max_languages?: number
          max_newsletter_subscribers?: number
          max_orders_month?: number
          max_payment_methods?: number
          max_pos_kiosk_devices?: number | null
          max_pos_payment_methods?: number
          max_products?: number
          max_promotions_active?: number
          max_requests_day?: number
          max_reviews_per_product?: number
          max_whatsapp_templates?: number
          max_wishlist_items?: number
          plan_expires_at?: string | null
          plan_name?: string
          plan_tier?: string
          storage_limit_mb?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          backup_frequency_hours?: number | null
          created_at?: string
          id?: string
          max_admin_users?: number
          max_automations?: number | null
          max_backups?: number | null
          max_badges?: number
          max_carousel_slides?: number
          max_categories?: number
          max_chatbot_messages_month?: number
          max_cms_pages?: number
          max_crm_contacts?: number
          max_currencies?: number
          max_custom_domains?: number
          max_customers?: number
          max_email_sends_month?: number
          max_file_upload_mb?: number
          max_images_per_product?: number
          max_languages?: number
          max_newsletter_subscribers?: number
          max_orders_month?: number
          max_payment_methods?: number
          max_pos_kiosk_devices?: number | null
          max_pos_payment_methods?: number
          max_products?: number
          max_promotions_active?: number
          max_requests_day?: number
          max_reviews_per_product?: number
          max_whatsapp_templates?: number
          max_wishlist_items?: number
          plan_expires_at?: string | null
          plan_name?: string
          plan_tier?: string
          storage_limit_mb?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_presets: {
        Row: {
          created_at: string
          description: string | null
          flags: Json
          id: string
          limits: Json
          plan_tier: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flags?: Json
          id?: string
          limits?: Json
          plan_tier: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flags?: Json
          id?: string
          limits?: Json
          plan_tier?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          name: string
          stripe_price_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          stripe_price_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          stripe_price_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pos_session: {
        Row: {
          close_notes: string | null
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          deleted_at: string | null
          id: string
          opening_balance: number
          operator: string
          status: string
          terminal_id: string | null
          updated_at: string
        }
        Insert: {
          close_notes?: string | null
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          deleted_at?: string | null
          id: string
          opening_balance?: number
          operator: string
          status?: string
          terminal_id?: string | null
          updated_at?: string
        }
        Update: {
          close_notes?: string | null
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          opening_balance?: number
          operator?: string
          status?: string
          terminal_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pos_shift: {
        Row: {
          actual_cash: number | null
          close_notes: string | null
          closed_at: string | null
          created_at: string
          deleted_at: string | null
          discrepancy: number | null
          expected_cash: number
          id: string
          operator: string
          status: string
          terminal_id: string | null
          total_revenue: number
          transaction_count: number
          updated_at: string
        }
        Insert: {
          actual_cash?: number | null
          close_notes?: string | null
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          discrepancy?: number | null
          expected_cash?: number
          id: string
          operator: string
          status?: string
          terminal_id?: string | null
          total_revenue?: number
          transaction_count?: number
          updated_at?: string
        }
        Update: {
          actual_cash?: number | null
          close_notes?: string | null
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          discrepancy?: number | null
          expected_cash?: number
          id?: string
          operator?: string
          status?: string
          terminal_id?: string | null
          total_revenue?: number
          transaction_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      pos_transaction: {
        Row: {
          amount: number
          cash_tendered: number | null
          created_at: string
          currency_code: string
          customer_name: string | null
          deleted_at: string | null
          discount_percent: number | null
          id: string
          line_items_snapshot: Json | null
          notes: string | null
          order_id: string | null
          payment_method: string
          receipt_number: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cash_tendered?: number | null
          created_at?: string
          currency_code?: string
          customer_name?: string | null
          deleted_at?: string | null
          discount_percent?: number | null
          id: string
          line_items_snapshot?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          receipt_number?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_tendered?: number | null
          created_at?: string
          currency_code?: string
          customer_name?: string | null
          deleted_at?: string | null
          discount_percent?: number | null
          id?: string
          line_items_snapshot?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          receipt_number?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      price: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          max_quantity: number | null
          min_quantity: number | null
          price_list_id: string | null
          price_set_id: string
          raw_amount: Json
          raw_max_quantity: Json | null
          raw_min_quantity: Json | null
          rules_count: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          max_quantity?: number | null
          min_quantity?: number | null
          price_list_id?: string | null
          price_set_id: string
          raw_amount: Json
          raw_max_quantity?: Json | null
          raw_min_quantity?: Json | null
          rules_count?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          price_list_id?: string | null
          price_set_id?: string
          raw_amount?: Json
          raw_max_quantity?: Json | null
          raw_min_quantity?: Json | null
          rules_count?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_price_list_id_foreign"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_price_set_id_foreign"
            columns: ["price_set_id"]
            isOneToOne: false
            referencedRelation: "price_set"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          ends_at: string | null
          id: string
          rules_count: number | null
          starts_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          ends_at?: string | null
          id: string
          rules_count?: number | null
          starts_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          rules_count?: number | null
          starts_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_list_rule: {
        Row: {
          attribute: string
          created_at: string
          deleted_at: string | null
          id: string
          price_list_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id: string
          price_list_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          price_list_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "price_list_rule_price_list_id_foreign"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_list"
            referencedColumns: ["id"]
          },
        ]
      }
      price_preference: {
        Row: {
          attribute: string
          created_at: string
          deleted_at: string | null
          id: string
          is_tax_inclusive: boolean
          updated_at: string
          value: string | null
        }
        Insert: {
          attribute: string
          created_at?: string
          deleted_at?: string | null
          id: string
          is_tax_inclusive?: boolean
          updated_at?: string
          value?: string | null
        }
        Update: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_tax_inclusive?: boolean
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      price_rule: {
        Row: {
          attribute: string
          created_at: string
          deleted_at: string | null
          id: string
          operator: string
          price_id: string
          priority: number
          updated_at: string
          value: string
        }
        Insert: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id: string
          operator?: string
          price_id: string
          priority?: number
          updated_at?: string
          value: string
        }
        Update: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          operator?: string
          price_id?: string
          priority?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_rule_price_id_foreign"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "price"
            referencedColumns: ["id"]
          },
        ]
      }
      price_set: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product: {
        Row: {
          collection_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          discountable: boolean
          external_id: string | null
          handle: string
          height: string | null
          hs_code: string | null
          id: string
          is_giftcard: boolean
          length: string | null
          material: string | null
          metadata: Json | null
          mid_code: string | null
          origin_country: string | null
          status: string
          subtitle: string | null
          thumbnail: string | null
          title: string
          type_id: string | null
          updated_at: string
          weight: string | null
          width: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discountable?: boolean
          external_id?: string | null
          handle: string
          height?: string | null
          hs_code?: string | null
          id: string
          is_giftcard?: boolean
          length?: string | null
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          status?: string
          subtitle?: string | null
          thumbnail?: string | null
          title: string
          type_id?: string | null
          updated_at?: string
          weight?: string | null
          width?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discountable?: boolean
          external_id?: string | null
          handle?: string
          height?: string | null
          hs_code?: string | null
          id?: string
          is_giftcard?: boolean
          length?: string | null
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          status?: string
          subtitle?: string | null
          thumbnail?: string | null
          title?: string
          type_id?: string | null
          updated_at?: string
          weight?: string | null
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_collection_id_foreign"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "product_collection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_type_id_foreign"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "product_type"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          handle: string
          id: string
          is_active: boolean
          is_internal: boolean
          metadata: Json | null
          mpath: string
          name: string
          parent_category_id: string | null
          rank: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          handle: string
          id: string
          is_active?: boolean
          is_internal?: boolean
          metadata?: Json | null
          mpath: string
          name: string
          parent_category_id?: string | null
          rank?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          handle?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          metadata?: Json | null
          mpath?: string
          name?: string
          parent_category_id?: string | null
          rank?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_parent_category_id_foreign"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_category"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_product: {
        Row: {
          product_category_id: string
          product_id: string
        }
        Insert: {
          product_category_id: string
          product_id: string
        }
        Update: {
          product_category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_product_product_category_id_foreign"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_product_product_id_foreign"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collection: {
        Row: {
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          handle: string
          id: string
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          handle?: string
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_option: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          product_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          product_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_product_id_foreign"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_value: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          option_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          option_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          option_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_value_option_id_foreign"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_option"
            referencedColumns: ["id"]
          },
        ]
      }
      product_product_productreviewmodule_product_review: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          product_id: string
          product_review_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          product_id: string
          product_review_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          product_id?: string
          product_review_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_review: {
        Row: {
          author_name: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          id: string
          product_id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          author_name: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          product_id: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          author_name: string
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_name: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_sales_channel: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          product_id: string
          sales_channel_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          product_id: string
          sales_channel_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          product_id?: string
          sales_channel_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_shipping_profile: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          product_id: string
          shipping_profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          product_id: string
          shipping_profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          product_id?: string
          shipping_profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_tag: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      product_tags: {
        Row: {
          product_id: string
          product_tag_id: string
        }
        Insert: {
          product_id: string
          product_tag_id: string
        }
        Update: {
          product_id?: string
          product_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_foreign"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_product_tag_id_foreign"
            columns: ["product_tag_id"]
            isOneToOne: false
            referencedRelation: "product_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      product_type: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      product_variant: {
        Row: {
          allow_backorder: boolean
          barcode: string | null
          created_at: string
          deleted_at: string | null
          ean: string | null
          height: number | null
          hs_code: string | null
          id: string
          length: number | null
          manage_inventory: boolean
          material: string | null
          metadata: Json | null
          mid_code: string | null
          origin_country: string | null
          product_id: string | null
          sku: string | null
          thumbnail: string | null
          title: string
          upc: string | null
          updated_at: string
          variant_rank: number | null
          weight: number | null
          width: number | null
        }
        Insert: {
          allow_backorder?: boolean
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          ean?: string | null
          height?: number | null
          hs_code?: string | null
          id: string
          length?: number | null
          manage_inventory?: boolean
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          product_id?: string | null
          sku?: string | null
          thumbnail?: string | null
          title: string
          upc?: string | null
          updated_at?: string
          variant_rank?: number | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          allow_backorder?: boolean
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          ean?: string | null
          height?: number | null
          hs_code?: string | null
          id?: string
          length?: number | null
          manage_inventory?: boolean
          material?: string | null
          metadata?: Json | null
          mid_code?: string | null
          origin_country?: string | null
          product_id?: string | null
          sku?: string | null
          thumbnail?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
          variant_rank?: number | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_product_id_foreign"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_inventory_item: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          inventory_item_id: string
          required_quantity: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          inventory_item_id: string
          required_quantity?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          inventory_item_id?: string
          required_quantity?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: []
      }
      product_variant_option: {
        Row: {
          option_value_id: string
          variant_id: string
        }
        Insert: {
          option_value_id: string
          variant_id: string
        }
        Update: {
          option_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_option_option_value_id_foreign"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_option_variant_id_foreign"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_price_set: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          price_set_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          price_set_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          price_set_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: []
      }
      product_variant_product_image: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          image_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_product_image_image_id_foreign"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "image"
            referencedColumns: ["id"]
          },
        ]
      }
      product_wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_address: Json | null
          full_name: string | null
          id: string
          medusa_customer_id: string | null
          phone: string | null
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_address?: Json | null
          full_name?: string | null
          id: string
          medusa_customer_id?: string | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_address?: Json | null
          full_name?: string | null
          id?: string
          medusa_customer_id?: string | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          briefing_completed_at: string | null
          briefing_notes: string | null
          briefing_started_at: string | null
          completed_notes: string | null
          completed_started_at: string | null
          created_at: string | null
          current_phase: string
          design_completed_at: string | null
          design_notes: string | null
          design_started_at: string | null
          development_completed_at: string | null
          development_notes: string | null
          development_started_at: string | null
          estimated_launch_date: string | null
          id: string
          launch_completed_at: string | null
          launch_notes: string | null
          launch_started_at: string | null
          overall_progress: number | null
          review_completed_at: string | null
          review_notes: string | null
          review_started_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          briefing_completed_at?: string | null
          briefing_notes?: string | null
          briefing_started_at?: string | null
          completed_notes?: string | null
          completed_started_at?: string | null
          created_at?: string | null
          current_phase?: string
          design_completed_at?: string | null
          design_notes?: string | null
          design_started_at?: string | null
          development_completed_at?: string | null
          development_notes?: string | null
          development_started_at?: string | null
          estimated_launch_date?: string | null
          id?: string
          launch_completed_at?: string | null
          launch_notes?: string | null
          launch_started_at?: string | null
          overall_progress?: number | null
          review_completed_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          briefing_completed_at?: string | null
          briefing_notes?: string | null
          briefing_started_at?: string | null
          completed_notes?: string | null
          completed_started_at?: string | null
          created_at?: string | null
          current_phase?: string
          design_completed_at?: string | null
          design_notes?: string | null
          design_started_at?: string | null
          development_completed_at?: string | null
          development_notes?: string | null
          development_started_at?: string | null
          estimated_launch_date?: string | null
          id?: string
          launch_completed_at?: string | null
          launch_notes?: string | null
          launch_started_at?: string | null
          overall_progress?: number | null
          review_completed_at?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion: {
        Row: {
          campaign_id: string | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          is_automatic: boolean
          is_tax_inclusive: boolean
          limit: number | null
          metadata: Json | null
          status: string
          type: string
          updated_at: string
          used: number
        }
        Insert: {
          campaign_id?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id: string
          is_automatic?: boolean
          is_tax_inclusive?: boolean
          limit?: number | null
          metadata?: Json | null
          status?: string
          type: string
          updated_at?: string
          used?: number
        }
        Update: {
          campaign_id?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_automatic?: boolean
          is_tax_inclusive?: boolean
          limit?: number | null
          metadata?: Json | null
          status?: string
          type?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaign_id_foreign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaign"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_application_method: {
        Row: {
          allocation: string | null
          apply_to_quantity: number | null
          buy_rules_min_quantity: number | null
          created_at: string
          currency_code: string | null
          deleted_at: string | null
          id: string
          max_quantity: number | null
          promotion_id: string
          raw_value: Json | null
          target_type: string
          type: string
          updated_at: string
          value: number | null
        }
        Insert: {
          allocation?: string | null
          apply_to_quantity?: number | null
          buy_rules_min_quantity?: number | null
          created_at?: string
          currency_code?: string | null
          deleted_at?: string | null
          id: string
          max_quantity?: number | null
          promotion_id: string
          raw_value?: Json | null
          target_type: string
          type: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          allocation?: string | null
          apply_to_quantity?: number | null
          buy_rules_min_quantity?: number | null
          created_at?: string
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          max_quantity?: number | null
          promotion_id?: string
          raw_value?: Json | null
          target_type?: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_application_method_promotion_id_foreign"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotion"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_campaign: {
        Row: {
          campaign_identifier: string
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          campaign_identifier: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id: string
          name: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          campaign_identifier?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_campaign_budget: {
        Row: {
          attribute: string | null
          campaign_id: string
          created_at: string
          currency_code: string | null
          deleted_at: string | null
          id: string
          limit: number | null
          raw_limit: Json | null
          raw_used: Json
          type: string
          updated_at: string
          used: number
        }
        Insert: {
          attribute?: string | null
          campaign_id: string
          created_at?: string
          currency_code?: string | null
          deleted_at?: string | null
          id: string
          limit?: number | null
          raw_limit?: Json | null
          raw_used: Json
          type: string
          updated_at?: string
          used?: number
        }
        Update: {
          attribute?: string | null
          campaign_id?: string
          created_at?: string
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          limit?: number | null
          raw_limit?: Json | null
          raw_used?: Json
          type?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaign_budget_campaign_id_foreign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaign"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_campaign_budget_usage: {
        Row: {
          attribute_value: string
          budget_id: string
          created_at: string
          deleted_at: string | null
          id: string
          raw_used: Json
          updated_at: string
          used: number
        }
        Insert: {
          attribute_value: string
          budget_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          raw_used: Json
          updated_at?: string
          used?: number
        }
        Update: {
          attribute_value?: string
          budget_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          raw_used?: Json
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaign_budget_usage_budget_id_foreign"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaign_budget"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_promotion_rule: {
        Row: {
          promotion_id: string
          promotion_rule_id: string
        }
        Insert: {
          promotion_id: string
          promotion_rule_id: string
        }
        Update: {
          promotion_id?: string
          promotion_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_promotion_rule_promotion_id_foreign"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_promotion_rule_promotion_rule_id_foreign"
            columns: ["promotion_rule_id"]
            isOneToOne: false
            referencedRelation: "promotion_rule"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_redemptions: {
        Row: {
          created_at: string | null
          discount_cents: number
          id: string
          metadata: Json | null
          order_id: string | null
          promotion_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_cents: number
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promotion_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_cents?: number
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promotion_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "module_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_rule: {
        Row: {
          attribute: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          operator: string
          updated_at: string
        }
        Insert: {
          attribute: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          operator: string
          updated_at?: string
        }
        Update: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          operator?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_rule_value: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          promotion_rule_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          promotion_rule_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          promotion_rule_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rule_value_promotion_rule_id_foreign"
            columns: ["promotion_rule_id"]
            isOneToOne: false
            referencedRelation: "promotion_rule"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_module_ids: string[] | null
          applicable_tier_ids: string[] | null
          applicable_to: string | null
          code: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          ends_at: string | null
          excluded_module_ids: string[] | null
          id: string
          is_active: boolean | null
          is_auto_applied: boolean | null
          max_discount_cents: number | null
          min_amount_cents: number | null
          min_modules: number | null
          name: string
          per_customer_limit: number | null
          rules: Json | null
          starts_at: string | null
          stripe_coupon_id: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          value: number | null
        }
        Insert: {
          applicable_module_ids?: string[] | null
          applicable_tier_ids?: string[] | null
          applicable_to?: string | null
          code?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          excluded_module_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          is_auto_applied?: boolean | null
          max_discount_cents?: number | null
          min_amount_cents?: number | null
          min_modules?: number | null
          name: string
          per_customer_limit?: number | null
          rules?: Json | null
          starts_at?: string | null
          stripe_coupon_id?: string | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value?: number | null
        }
        Update: {
          applicable_module_ids?: string[] | null
          applicable_tier_ids?: string[] | null
          applicable_to?: string | null
          code?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          excluded_module_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          is_auto_applied?: boolean | null
          max_discount_cents?: number | null
          min_amount_cents?: number | null
          min_modules?: number | null
          name?: string
          per_customer_limit?: number | null
          rules?: Json | null
          starts_at?: string | null
          stripe_coupon_id?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value?: number | null
        }
        Relationships: []
      }
      provider_identity: {
        Row: {
          auth_identity_id: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          provider: string
          provider_metadata: Json | null
          updated_at: string
          user_metadata: Json | null
        }
        Insert: {
          auth_identity_id: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          id: string
          provider: string
          provider_metadata?: Json | null
          updated_at?: string
          user_metadata?: Json | null
        }
        Update: {
          auth_identity_id?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          provider?: string
          provider_metadata?: Json | null
          updated_at?: string
          user_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_identity_auth_identity_id_foreign"
            columns: ["auth_identity_id"]
            isOneToOne: false
            referencedRelation: "auth_identity"
            referencedColumns: ["id"]
          },
        ]
      }
      publishable_api_key_sales_channel: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          publishable_key_id: string
          sales_channel_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          publishable_key_id: string
          sales_channel_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          publishable_key_id?: string
          sales_channel_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      refund: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          note: string | null
          payment_id: string
          raw_amount: Json
          refund_reason_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          note?: string | null
          payment_id: string
          raw_amount: Json
          refund_reason_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          payment_id?: string
          raw_amount?: Json
          refund_reason_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_payment_id_foreign"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_reason: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          label: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          label: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      region: {
        Row: {
          automatic_taxes: boolean
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          automatic_taxes?: boolean
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          automatic_taxes?: boolean
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      region_country: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          iso_2: string
          iso_3: string
          metadata: Json | null
          name: string
          num_code: string
          region_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          iso_2: string
          iso_3: string
          metadata?: Json | null
          name: string
          num_code: string
          region_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          iso_2?: string
          iso_3?: string
          metadata?: Json | null
          name?: string
          num_code?: string
          region_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_country_region_id_foreign"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region"
            referencedColumns: ["id"]
          },
        ]
      }
      region_payment_provider: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          payment_provider_id: string
          region_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          payment_provider_id: string
          region_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          payment_provider_id?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservation_item: {
        Row: {
          allow_backorder: boolean | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          external_id: string | null
          id: string
          inventory_item_id: string
          line_item_id: string | null
          location_id: string
          metadata: Json | null
          quantity: number
          raw_quantity: Json | null
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          external_id?: string | null
          id: string
          inventory_item_id: string
          line_item_id?: string | null
          location_id: string
          metadata?: Json | null
          quantity: number
          raw_quantity?: Json | null
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          inventory_item_id?: string
          line_item_id?: string | null
          location_id?: string
          metadata?: Json | null
          quantity?: number
          raw_quantity?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_item_inventory_item_id_foreign"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_item"
            referencedColumns: ["id"]
          },
        ]
      }
      return: {
        Row: {
          canceled_at: string | null
          claim_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_id: number
          exchange_id: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          no_notification: boolean | null
          order_id: string
          order_version: number
          raw_refund_amount: Json | null
          received_at: string | null
          refund_amount: number | null
          requested_at: string | null
          status: Database["public"]["Enums"]["return_status_enum"]
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_id?: number
          exchange_id?: string | null
          id: string
          location_id?: string | null
          metadata?: Json | null
          no_notification?: boolean | null
          order_id: string
          order_version: number
          raw_refund_amount?: Json | null
          received_at?: string | null
          refund_amount?: number | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["return_status_enum"]
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_id?: number
          exchange_id?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          no_notification?: boolean | null
          order_id?: string
          order_version?: number
          raw_refund_amount?: Json | null
          received_at?: string | null
          refund_amount?: number | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["return_status_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      return_fulfillment: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_id: string
          id: string
          return_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id: string
          id: string
          return_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_id?: string
          id?: string
          return_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      return_item: {
        Row: {
          created_at: string
          damaged_quantity: number
          deleted_at: string | null
          id: string
          item_id: string
          metadata: Json | null
          note: string | null
          quantity: number
          raw_damaged_quantity: Json
          raw_quantity: Json
          raw_received_quantity: Json
          reason_id: string | null
          received_quantity: number
          return_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          damaged_quantity?: number
          deleted_at?: string | null
          id: string
          item_id: string
          metadata?: Json | null
          note?: string | null
          quantity: number
          raw_damaged_quantity?: Json
          raw_quantity: Json
          raw_received_quantity?: Json
          reason_id?: string | null
          received_quantity?: number
          return_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          damaged_quantity?: number
          deleted_at?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          note?: string | null
          quantity?: number
          raw_damaged_quantity?: Json
          raw_quantity?: Json
          raw_received_quantity?: Json
          reason_id?: string | null
          received_quantity?: number
          return_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      return_reason: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          label: string
          metadata: Json | null
          parent_return_reason_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          label: string
          metadata?: Json | null
          parent_return_reason_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          parent_return_reason_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_reason_parent_return_reason_id_foreign"
            columns: ["parent_return_reason_id"]
            isOneToOne: false
            referencedRelation: "return_reason"
            referencedColumns: ["id"]
          },
        ]
      }
      revalidation_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          path: string | null
          processed_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          path?: string | null
          processed_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          path?: string | null
          processed_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revalidation_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "module_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channel: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_disabled: boolean
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          is_disabled?: boolean
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_disabled?: boolean
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_channel_stock_location: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          sales_channel_id: string
          stock_location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          sales_channel_id: string
          stock_location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          sales_channel_id?: string
          stock_location_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      script_migrations: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: number
          script_name: string
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: number
          script_name: string
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: number
          script_name?: string
        }
        Relationships: []
      }
      service_zone: {
        Row: {
          created_at: string
          deleted_at: string | null
          fulfillment_set_id: string
          id: string
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_set_id: string
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fulfillment_set_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_zone_fulfillment_set_id_foreign"
            columns: ["fulfillment_set_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_set"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_option: {
        Row: {
          created_at: string
          data: Json | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          price_type: string
          provider_id: string | null
          service_zone_id: string
          shipping_option_type_id: string
          shipping_profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          price_type?: string
          provider_id?: string | null
          service_zone_id: string
          shipping_option_type_id: string
          shipping_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          price_type?: string
          provider_id?: string | null
          service_zone_id?: string
          shipping_option_type_id?: string
          shipping_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_option_provider_id_foreign"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_provider"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_option_service_zone_id_foreign"
            columns: ["service_zone_id"]
            isOneToOne: false
            referencedRelation: "service_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_option_shipping_option_type_id_foreign"
            columns: ["shipping_option_type_id"]
            isOneToOne: false
            referencedRelation: "shipping_option_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_option_shipping_profile_id_foreign"
            columns: ["shipping_profile_id"]
            isOneToOne: false
            referencedRelation: "shipping_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_option_price_set: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          price_set_id: string
          shipping_option_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          price_set_id: string
          shipping_option_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          price_set_id?: string
          shipping_option_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_option_rule: {
        Row: {
          attribute: string
          created_at: string
          deleted_at: string | null
          id: string
          operator: string
          shipping_option_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          attribute: string
          created_at?: string
          deleted_at?: string | null
          id: string
          operator: string
          shipping_option_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          attribute?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          operator?: string
          shipping_option_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_option_rule_shipping_option_id_foreign"
            columns: ["shipping_option_id"]
            isOneToOne: false
            referencedRelation: "shipping_option"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_option_type: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id: string
          label: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_profile: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          name: string
          target_type: string
          target_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          name: string
          target_type?: string
          target_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          name?: string
          target_type?: string
          target_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      stock_location: {
        Row: {
          address_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_location_address_id_foreign"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "stock_location_address"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_location_address: {
        Row: {
          address_1: string
          address_2: string | null
          city: string | null
          company: string | null
          country_code: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_1: string
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code: string
          created_at?: string
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_1?: string
          address_2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store: {
        Row: {
          created_at: string
          default_location_id: string | null
          default_region_id: string | null
          default_sales_channel_id: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_location_id?: string | null
          default_region_id?: string | null
          default_sales_channel_id?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_location_id?: string | null
          default_region_id?: string | null
          default_sales_channel_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_currency: {
        Row: {
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          is_default: boolean
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id: string
          is_default?: boolean
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_currency_store_id_foreign"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locale: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          locale_code: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          locale_code: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          locale_code?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_locale_store_id_foreign"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          attempts: number
          created_at: string | null
          error: string | null
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          locked_at: string | null
          processed_at: string | null
          source: string | null
          state: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          processed_at?: string | null
          source?: string | null
          state?: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string | null
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          processed_at?: string | null
          source?: string | null
          state?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subdomain_routes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subdomain: string
          target_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subdomain: string
          target_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subdomain?: string
          target_url?: string
        }
        Relationships: []
      }
      subscription_modules: {
        Row: {
          activated_at: string | null
          created_at: string | null
          deactivated_at: string | null
          id: string
          metadata: Json | null
          module_id: string
          status: string
          subscription_id: string
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          metadata?: Json | null
          module_id: string
          status?: string
          subscription_id: string
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string
          status?: string
          subscription_id?: string
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_modules_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_modules_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          metadata: Json | null
          plan_id: string | null
          status: string
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_defaults: {
        Row: {
          category: string
          config_key: string
          config_value: Json
          description: string | null
          id: string
          system_key: string
          updated_at: string | null
        }
        Insert: {
          category: string
          config_key: string
          config_value?: Json
          description?: string | null
          id?: string
          system_key?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          system_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_provider: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tax_rate: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_combinable: boolean
          is_default: boolean
          metadata: Json | null
          name: string
          rate: number | null
          tax_region_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          is_combinable?: boolean
          is_default?: boolean
          metadata?: Json | null
          name: string
          rate?: number | null
          tax_region_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_combinable?: boolean
          is_default?: boolean
          metadata?: Json | null
          name?: string
          rate?: number | null
          tax_region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_tax_rate_tax_region_id"
            columns: ["tax_region_id"]
            isOneToOne: false
            referencedRelation: "tax_region"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rate_rule: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          reference: string
          reference_id: string
          tax_rate_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          reference: string
          reference_id: string
          tax_rate_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          reference?: string
          reference_id?: string
          tax_rate_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_tax_rate_rule_tax_rate_id"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rate"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_region: {
        Row: {
          country_code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          parent_id: string | null
          provider_id: string | null
          province_code: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          metadata?: Json | null
          parent_id?: string | null
          provider_id?: string | null
          province_code?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          provider_id?: string | null
          province_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_tax_region_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tax_region"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_tax_region_provider_id"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "tax_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_errors: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant_errors_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_medusa_scope: {
        Row: {
          created_at: string
          medusa_sales_channel_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          medusa_sales_channel_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          medusa_sales_channel_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          country: string | null
          created_at: string
          creation_source: string | null
          deployment_status: string | null
          dokploy_application_id: string | null
          dokploy_project_id: string | null
          domain: string | null
          github_repo_url: string | null
          id: string
          is_demo: boolean | null
          name: string
          owner_email: string | null
          plan_tier: string
          provisioning_error: string | null
          provisioning_phase: string | null
          provisioning_started_at: string | null
          region_preset: string | null
          slug: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          vps_node_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          creation_source?: string | null
          deployment_status?: string | null
          dokploy_application_id?: string | null
          dokploy_project_id?: string | null
          domain?: string | null
          github_repo_url?: string | null
          id?: string
          is_demo?: boolean | null
          name: string
          owner_email?: string | null
          plan_tier?: string
          provisioning_error?: string | null
          provisioning_phase?: string | null
          provisioning_started_at?: string | null
          region_preset?: string | null
          slug: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          vps_node_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          creation_source?: string | null
          deployment_status?: string | null
          dokploy_application_id?: string | null
          dokploy_project_id?: string | null
          domain?: string | null
          github_repo_url?: string | null
          id?: string
          is_demo?: boolean | null
          name?: string
          owner_email?: string | null
          plan_tier?: string
          provisioning_error?: string | null
          provisioning_phase?: string | null
          provisioning_started_at?: string | null
          region_preset?: string | null
          slug?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          vps_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_vps_node_id_fkey"
            columns: ["vps_node_id"]
            isOneToOne: false
            referencedRelation: "vps_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          company: string | null
          content: string
          created_at: string | null
          id: string
          is_visible: boolean | null
          name: string
          rating: number | null
          role: string | null
          sort_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      user: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preference: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_rbac_role: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          rbac_role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          rbac_role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          rbac_role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      view_configuration: {
        Row: {
          configuration: Json
          created_at: string
          deleted_at: string | null
          entity: string
          id: string
          is_system_default: boolean
          name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          configuration: Json
          created_at?: string
          deleted_at?: string | null
          entity: string
          id: string
          is_system_default?: boolean
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string
          deleted_at?: string | null
          entity?: string
          id?: string
          is_system_default?: boolean
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vps_nodes: {
        Row: {
          created_at: string | null
          current_tenants: number
          dokploy_token: string | null
          dokploy_url: string | null
          host: string | null
          hostname: string
          id: string
          ip_address: string
          label: string | null
          max_tenants: number
          region: string
          specs: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_tenants?: number
          dokploy_token?: string | null
          dokploy_url?: string | null
          host?: string | null
          hostname: string
          id?: string
          ip_address: string
          label?: string | null
          max_tenants?: number
          region?: string
          specs?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_tenants?: number
          dokploy_token?: string | null
          dokploy_url?: string | null
          host?: string | null
          hostname?: string
          id?: string
          ip_address?: string
          label?: string | null
          max_tenants?: number
          region?: string
          specs?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      web_base_pricing: {
        Row: {
          contract_type: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          maintenance_price: number
          setup_price: number
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          created_at?: string | null
          currency: string
          id?: string
          is_active?: boolean | null
          maintenance_price: number
          setup_price: number
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          maintenance_price?: number
          setup_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      web_vitals_events: {
        Row: {
          created_at: string
          delta: number | null
          id: string
          metric_id: string
          metric_name: string
          metric_value: number
          navigation_type: string | null
          page_url: string | null
          rating: string | null
          start_time: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          delta?: number | null
          id?: string
          metric_id: string
          metric_name: string
          metric_value: number
          navigation_type?: string | null
          page_url?: string | null
          rating?: string | null
          start_time?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          delta?: number | null
          id?: string
          metric_id?: string
          metric_name?: string
          metric_value?: number
          navigation_type?: string | null
          page_url?: string | null
          rating?: string | null
          start_time?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean
          name: string
          template: string
          tenant_id: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean
          name: string
          template: string
          tenant_id?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean
          name?: string
          template?: string
          tenant_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution: {
        Row: {
          context: Json | null
          created_at: string
          deleted_at: string | null
          execution: Json | null
          id: string
          retention_time: number | null
          run_id: string
          state: string
          transaction_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          deleted_at?: string | null
          execution?: Json | null
          id: string
          retention_time?: number | null
          run_id?: string
          state: string
          transaction_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          deleted_at?: string | null
          execution?: Json | null
          id?: string
          retention_time?: number | null
          run_id?: string
          state?: string
          transaction_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_job_stats: {
        Row: {
          avg_duration_seconds: number | null
          completed_24h: number | null
          job_count: number | null
          job_type: string | null
          latest_created: string | null
          status: string | null
        }
        Relationships: []
      }
      rls_policy_audit: {
        Row: {
          policies: Json | null
          policy_count: number | null
          rls_enabled: boolean | null
          rls_forced: boolean | null
          schema_name: unknown
          table_name: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      check_rls_gaps: {
        Args: never
        Returns: {
          policy_count: number
          schema_name: string
          table_name: string
        }[]
      }
      claim_job: {
        Args: { p_job_id: string; p_worker_id: string }
        Returns: boolean
      }
      claim_vps_node_for_tenant: {
        Args: { p_region?: string; p_tenant_id: string }
        Returns: Json
      }
      claim_webhook_event:
        | {
            Args: {
              p_event_id: string
              p_event_type: string
              p_tenant_id?: string
            }
            Returns: string
          }
        | {
            Args: { p_event_id: string; p_stale_threshold?: string }
            Returns: boolean
          }
      cleanup_health_snapshots: { Args: never; Returns: undefined }
      cleanup_old_jobs: { Args: never; Returns: undefined }
      cleanup_revalidation_queue: { Args: never; Returns: undefined }
      delete_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
      get_capability_overrides: {
        Args: { p_tenant_id: string }
        Returns: {
          admin_user_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          key: string
          override_type: string
          reason: string | null
          tenant_id: string
          updated_at: string | null
          value: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "capability_overrides"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_flag_definitions: {
        Args: never
        Returns: {
          category: string
          conflicts: string[] | null
          created_at: string | null
          deps: string[] | null
          description: string | null
          group_color: string
          group_label: string
          is_active: boolean | null
          key: string
          label: string
          sort_order: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "flag_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fleet_storage_summary: { Args: never; Returns: Json }
      get_job_counts_by_tenant: {
        Args: never
        Returns: {
          dead: number
          failed: number
          pending: number
          tenant_id: string
        }[]
      }
      get_limit_definitions: {
        Args: never
        Returns: {
          category: string
          created_at: string
          default_value: number
          description: string | null
          display_name: string
          id: string
          limit_key: string
          metadata: Json | null
          sort_order: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "limit_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_medusa_credentials: { Args: { p_tenant_id: string }; Returns: Json }
      get_module_registry: { Args: never; Returns: Json }
      get_owner_module_catalog: { Args: { p_locale?: string }; Returns: Json }
      get_subdomain_route: {
        Args: { subdomain_query: string }
        Returns: {
          target_url: string
        }[]
      }
      get_tenant_governance: { Args: { p_tenant_id: string }; Returns: Json }
      get_tenant_secret: { Args: { p_secret_id: string }; Returns: string }
      get_tenant_storage_usage: { Args: { p_slug: string }; Returns: Json }
      increment_chat_usage: { Args: { p_user_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      log_entitlement:
        | {
            Args: {
              p_action: string
              p_actor_id?: string
              p_details?: Json
              p_tenant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_event_type: string
              p_origin?: string
              p_payload: Json
              p_resolved_by?: string
              p_tenant_id: string
            }
            Returns: string
          }
      log_tenant_error: {
        Args: {
          p_details?: Json
          p_message?: string
          p_severity?: string
          p_source: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      mark_webhook_failed: {
        Args: { p_error: string; p_event_id: string }
        Returns: undefined
      }
      mark_webhook_processed: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      propagate_dead_parent: {
        Args: { p_parent_job_id: string }
        Returns: number
      }
      provision_tenant: {
        Args: {
          p_admin_user_id?: string
          p_color_preset?: string
          p_country?: string
          p_currency?: string
          p_domain?: string
          p_locale?: string
          p_name: string
          p_owner_email?: string
          p_plan_tier?: string
          p_region_preset?: string
          p_slug: string
        }
        Returns: Json
      }
      record_chat_usage: {
        Args: {
          p_completion_tokens: number
          p_cost: number
          p_locale: string
          p_model: string
          p_prompt_tokens: number
          p_user_id: string
        }
        Returns: undefined
      }
      store_medusa_credentials: {
        Args: {
          p_admin_email: string
          p_admin_password: string
          p_medusa_url: string
          p_tenant_id: string
        }
        Returns: string
      }
      store_tenant_secret: {
        Args: {
          p_secret_name: string
          p_secret_value: string
          p_tenant_id: string
        }
        Returns: string
      }
      update_owner_config: {
        Args: { p_tenant_id: string; p_updates: Json }
        Returns: boolean
      }
    }
    Enums: {
      claim_reason_enum:
        | "missing_item"
        | "wrong_item"
        | "production_failure"
        | "other"
      order_claim_type_enum: "refund" | "replace"
      order_status_enum:
        | "pending"
        | "completed"
        | "draft"
        | "archived"
        | "canceled"
        | "requires_action"
      return_status_enum:
        | "open"
        | "requested"
        | "received"
        | "partially_received"
        | "canceled"
      testimonial_rating: "1" | "2" | "3" | "4" | "5"
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
      claim_reason_enum: [
        "missing_item",
        "wrong_item",
        "production_failure",
        "other",
      ],
      order_claim_type_enum: ["refund", "replace"],
      order_status_enum: [
        "pending",
        "completed",
        "draft",
        "archived",
        "canceled",
        "requires_action",
      ],
      return_status_enum: [
        "open",
        "requested",
        "received",
        "partially_received",
        "canceled",
      ],
      testimonial_rating: ["1", "2", "3", "4", "5"],
    },
  },
} as const


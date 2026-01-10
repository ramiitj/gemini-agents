import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { Json } from "@/integrations/supabase/types";

interface PlatformSettings {
  branding: {
    name: string;
    tagline: string;
    primaryColor: string;
    logoUrl: string;
    faviconUrl: string;
  };
  features: {
    webSearch: boolean;
    imageSearch: boolean;
    codeGeneration: boolean;
    teamCollaboration: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

interface ModelConfig {
  id: string;
  model_key: string;
  provider: string;
  model_name: string;
  is_active: boolean;
  settings: {
    temperature?: number;
    maxTokens?: number;
  };
}

interface SystemPrompt {
  id: string;
  prompt_key: string;
  prompt_content: string;
  description: string;
  is_active: boolean;
  version: number;
}

interface BillingConfig {
  id: string;
  service_key: string;
  service_name: string;
  pricing: Json;
  is_active: boolean | null;
}

export const useAdminSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [billing, setBilling] = useState<BillingConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from("platform_settings")
        .select("*");

      if (settingsError) throw settingsError;

      const settingsMap: Record<string, any> = {};
      settingsData?.forEach((s) => {
        settingsMap[s.key] = s.value;
      });

      setSettings({
        branding: settingsMap.branding || {},
        features: settingsMap.features || {},
        seo: settingsMap.seo || {},
      });
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("model_config")
        .select("*")
        .order("model_key");

      if (error) throw error;
      setModels(data as ModelConfig[]);
    } catch (err) {
      console.error("Error fetching models:", err);
    }
  }, []);

  const fetchPrompts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_prompts")
        .select("*")
        .order("prompt_key");

      if (error) throw error;
      setPrompts(data as SystemPrompt[]);
    } catch (err) {
      console.error("Error fetching prompts:", err);
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("billing_config")
        .select("*")
        .order("service_key");

      if (error) throw error;
      setBilling(data as BillingConfig[]);
    } catch (err) {
      console.error("Error fetching billing:", err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSettings(),
      fetchModels(),
      fetchPrompts(),
      fetchBilling(),
    ]);
    setLoading(false);
  }, [fetchSettings, fetchModels, fetchPrompts, fetchBilling]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });

      if (error) throw error;

      await fetchSettings();
      toast({ title: "Settings updated successfully" });
    } catch (err) {
      console.error("Error updating setting:", err);
      toast({ title: "Failed to update settings", variant: "destructive" });
    }
  };

  const updateModel = async (id: string, updates: Partial<ModelConfig>) => {
    try {
      const { error } = await supabase
        .from("model_config")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      await fetchModels();
      toast({ title: "Model configuration updated" });
    } catch (err) {
      console.error("Error updating model:", err);
      toast({ title: "Failed to update model", variant: "destructive" });
    }
  };

  const updatePrompt = async (id: string, updates: Partial<SystemPrompt>) => {
    try {
      // Increment version when content changes
      const currentPrompt = prompts.find((p) => p.id === id);
      const newVersion =
        updates.prompt_content && currentPrompt
          ? currentPrompt.version + 1
          : undefined;

      const { error } = await supabase
        .from("system_prompts")
        .update({
          ...updates,
          ...(newVersion && { version: newVersion }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchPrompts();
      toast({ title: "System prompt updated" });
    } catch (err) {
      console.error("Error updating prompt:", err);
      toast({ title: "Failed to update prompt", variant: "destructive" });
    }
  };

  const updateBillingConfig = async (
    id: string,
    updates: Partial<BillingConfig>
  ) => {
    try {
      const { error } = await supabase
        .from("billing_config")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      await fetchBilling();
      toast({ title: "Billing configuration updated" });
    } catch (err) {
      console.error("Error updating billing:", err);
      toast({ title: "Failed to update billing", variant: "destructive" });
    }
  };

  const logActivity = async (
    action: string,
    entityType?: string,
    entityId?: string,
    details?: any
  ) => {
    try {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .single();

      if (adminUser) {
        await supabase.from("admin_activity_log").insert({
          admin_user_id: adminUser.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details,
        });
      }
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  return {
    settings,
    models,
    prompts,
    billing,
    loading,
    updateSetting,
    updateModel,
    updatePrompt,
    updateBillingConfig,
    logActivity,
    refetch: fetchAll,
  };
};

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { SavedDesign } from "@/types/search";

interface SaveDesignParams {
  name: string;
  code: string;
  imageUrl?: string;
  medium: 'web' | 'app';
  projectId?: string;
}

export function useDesignGallery(organizationId: string | undefined) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDesigns = useCallback(async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('design_gallery')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDesigns((data as SavedDesign[]) || []);
    } catch (error) {
      console.error('Error fetching designs:', error);
      toast.error('Failed to load designs');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const saveDesign = async (design: SaveDesignParams): Promise<SavedDesign | null> => {
    if (!organizationId || !user) {
      toast.error('Unable to save design');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('design_gallery')
        .insert({
          name: design.name,
          code: design.code,
          image_url: design.imageUrl || null,
          medium: design.medium,
          organization_id: organizationId,
          project_id: design.projectId || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      const savedDesign = data as SavedDesign;
      setDesigns(prev => [savedDesign, ...prev]);
      toast.success('Design saved to gallery');
      return savedDesign;
    } catch (error) {
      console.error('Error saving design:', error);
      toast.error('Failed to save design');
      return null;
    }
  };

  const deleteDesign = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('design_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDesigns(prev => prev.filter(d => d.id !== id));
      toast.success('Design deleted');
      return true;
    } catch (error) {
      console.error('Error deleting design:', error);
      toast.error('Failed to delete design');
      return false;
    }
  };

  return {
    designs,
    isLoading,
    fetchDesigns,
    saveDesign,
    deleteDesign
  };
}

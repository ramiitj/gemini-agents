import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Loader2, Bot, Sparkles, Zap, Brain } from "lucide-react";

const providerIcons: Record<string, typeof Bot> = {
  google: Sparkles,
  openai: Brain,
  anthropic: Zap,
};

const AdminModels = () => {
  const { models, loading, updateModel, logActivity } = useAdminSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    temperature?: number;
    maxTokens?: number;
  }>({});

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateModel(id, { is_active: isActive });
    await logActivity(
      `${isActive ? "Enabled" : "Disabled"} model`,
      "model_config",
      id
    );
  };

  const handleSaveSettings = async (id: string) => {
    await updateModel(id, {
      settings: editValues,
    });
    await logActivity("Updated model settings", "model_config", id);
    setEditingId(null);
    setEditValues({});
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">AI Models</h1>
          <p className="text-muted-foreground">
            Configure and manage AI model settings
          </p>
        </div>

        <div className="grid gap-4">
          {models.map((model) => {
            const Icon = providerIcons[model.provider] || Bot;
            const isEditing = editingId === model.id;
            const settings = isEditing ? editValues : model.settings;

            return (
              <Card key={model.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {model.model_name}
                        <Badge variant="outline" className="font-normal">
                          {model.model_key}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{model.provider}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={model.is_active}
                    onCheckedChange={(checked) => handleToggle(model.id, checked)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature</Label>
                        <span className="text-sm text-muted-foreground">
                          {settings.temperature ?? 0.7}
                        </span>
                      </div>
                      <Slider
                        value={[settings.temperature ?? 0.7]}
                        onValueChange={([value]) => {
                          if (!isEditing) {
                            setEditingId(model.id);
                            setEditValues({
                              ...model.settings,
                              temperature: value,
                            });
                          } else {
                            setEditValues({ ...editValues, temperature: value });
                          }
                        }}
                        max={2}
                        step={0.1}
                        disabled={!model.is_active}
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values make output more random
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Tokens</Label>
                      <Input
                        type="number"
                        value={settings.maxTokens ?? 4096}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isEditing) {
                            setEditingId(model.id);
                            setEditValues({
                              ...model.settings,
                              maxTokens: value,
                            });
                          } else {
                            setEditValues({ ...editValues, maxTokens: value });
                          }
                        }}
                        disabled={!model.is_active}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum tokens in response
                      </p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditValues({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveSettings(model.id)}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {models.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No models configured</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminModels;

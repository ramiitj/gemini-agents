import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Loader2, Brain, History, Save, RotateCcw } from "lucide-react";

const AdminBehavior = () => {
  const { prompts, loading, updatePrompt, logActivity } = useAdminSettings();
  const [editingPrompt, setEditingPrompt] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const mainPrompt = prompts.find((p) => p.prompt_key === "main_agent");

  useEffect(() => {
    if (mainPrompt && !editingPrompt) {
      setEditingPrompt({
        id: mainPrompt.id,
        content: mainPrompt.prompt_content,
      });
    }
  }, [mainPrompt]);

  const handleSave = async () => {
    if (!editingPrompt) return;

    setSaving(true);
    await updatePrompt(editingPrompt.id, {
      prompt_content: editingPrompt.content,
    });
    await logActivity(
      "Updated system prompt",
      "system_prompts",
      editingPrompt.id
    );
    setSaving(false);
  };

  const handleReset = () => {
    if (mainPrompt) {
      setEditingPrompt({
        id: mainPrompt.id,
        content: mainPrompt.prompt_content,
      });
    }
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
          <h1 className="text-2xl font-semibold text-foreground">
            System Behavior
          </h1>
          <p className="text-muted-foreground">
            Configure AI agent personality and behavior
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main Agent Prompt */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Main Agent System Prompt</CardTitle>
                    <CardDescription>
                      Define how the AI agent behaves and responds
                    </CardDescription>
                  </div>
                </div>
                {mainPrompt && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <History className="mr-1 h-3 w-3" />
                      v{mainPrompt.version}
                    </Badge>
                    <Switch
                      checked={mainPrompt.is_active}
                      onCheckedChange={(checked) =>
                        updatePrompt(mainPrompt.id, { is_active: checked })
                      }
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={editingPrompt?.content || ""}
                  onChange={(e) =>
                    setEditingPrompt((prev) =>
                      prev ? { ...prev, content: e.target.value } : null
                    )
                  }
                  placeholder="Enter the system prompt that defines AI behavior..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is sent to the AI model to define its personality,
                  capabilities, and constraints. Changes take effect immediately.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Saved
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Other Prompts */}
          {prompts
            .filter((p) => p.prompt_key !== "main_agent")
            .map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {prompt.prompt_key}
                      </CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{prompt.version}</Badge>
                      <Switch
                        checked={prompt.is_active}
                        onCheckedChange={(checked) =>
                          updatePrompt(prompt.id, { is_active: checked })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={prompt.prompt_content}
                    onChange={(e) =>
                      updatePrompt(prompt.id, {
                        prompt_content: e.target.value,
                      })
                    }
                    className="min-h-[100px] font-mono text-sm"
                  />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBehavior;

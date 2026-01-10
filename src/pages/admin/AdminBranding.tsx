import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Loader2, Upload, Palette, Type, Image } from "lucide-react";
import HolocronIcon from "@/components/brand/HolocronIcon";

const AdminBranding = () => {
  const { settings, loading, updateSetting, logActivity } = useAdminSettings();
  const [branding, setBranding] = useState({
    name: "GetHolocron",
    tagline: "AI-Powered Product Development",
    primaryColor: "#6366F1",
    logoUrl: "/logo.svg",
    faviconUrl: "/favicon.svg",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.branding) {
      setBranding((prev) => ({ ...prev, ...settings.branding }));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSetting("branding", branding);
    await logActivity("Updated branding settings", "platform_settings", "branding");
    setSaving(false);
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
          <h1 className="text-2xl font-semibold text-foreground">Branding</h1>
          <p className="text-muted-foreground">
            Customize your platform's look and feel
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Brand Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Brand Identity
              </CardTitle>
              <CardDescription>
                Configure your platform name and tagline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Platform Name</Label>
                <Input
                  id="name"
                  value={branding.name}
                  onChange={(e) =>
                    setBranding({ ...branding, name: e.target.value })
                  }
                  placeholder="GetHolocron"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={branding.tagline}
                  onChange={(e) =>
                    setBranding({ ...branding, tagline: e.target.value })
                  }
                  placeholder="AI-Powered Product Development"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colors
              </CardTitle>
              <CardDescription>Set your primary brand color</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding({ ...branding, primaryColor: e.target.value })
                    }
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding({ ...branding, primaryColor: e.target.value })
                    }
                    placeholder="#6366F1"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 text-sm text-muted-foreground">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  <div>
                    <p className="font-medium">{branding.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {branding.tagline}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo & Favicon */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logo & Favicon
              </CardTitle>
              <CardDescription>
                Upload your logo and favicon (SVG recommended)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <HolocronIcon size="lg" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={branding.logoUrl}
                        onChange={(e) =>
                          setBranding({ ...branding, logoUrl: e.target.value })
                        }
                        placeholder="/logo.svg"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enter URL or path to logo file
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <HolocronIcon size="md" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={branding.faviconUrl}
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            faviconUrl: e.target.value,
                          })
                        }
                        placeholder="/favicon.svg"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enter URL or path to favicon file
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBranding;

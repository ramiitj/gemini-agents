import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Loader2, CreditCard, Zap, HardDrive, Bot } from "lucide-react";

const serviceIcons: Record<string, typeof CreditCard> = {
  ai_requests: Bot,
  deployments: Zap,
  storage: HardDrive,
};

interface PricingData {
  unit?: string;
  pricePerUnit?: number;
  freeQuota?: number;
}

const getPricing = (pricing: unknown): PricingData => {
  if (typeof pricing === "object" && pricing !== null) {
    const p = pricing as Record<string, unknown>;
    return {
      unit: typeof p.unit === "string" ? p.unit : "request",
      pricePerUnit: typeof p.pricePerUnit === "number" ? p.pricePerUnit : 0,
      freeQuota: typeof p.freeQuota === "number" ? p.freeQuota : 0,
    };
  }
  return { unit: "request", pricePerUnit: 0, freeQuota: 0 };
};

const AdminBilling = () => {
  const { billing, loading, updateBillingConfig, logActivity } = useAdminSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    pricePerUnit?: number;
    freeQuota?: number;
  }>({});

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateBillingConfig(id, { is_active: isActive });
    await logActivity(
      `${isActive ? "Enabled" : "Disabled"} billing service`,
      "billing_config",
      id
    );
  };

  const handleSave = async (id: string) => {
    const current = billing.find((b) => b.id === id);
    if (!current) return;

    const currentPricing = getPricing(current.pricing);

    await updateBillingConfig(id, {
      pricing: {
        ...currentPricing,
        ...editValues,
      },
    });
    await logActivity("Updated billing config", "billing_config", id);
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
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="text-muted-foreground">
            Configure pricing and billing for platform services
          </p>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold">
                  {billing.filter((b) => b.is_active).length}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Configs */}
        <div className="grid gap-4">
          {billing.map((service) => {
            const Icon = serviceIcons[service.service_key] || CreditCard;
            const isEditing = editingId === service.id;
            const basePricing = getPricing(service.pricing);
            const pricing = isEditing
              ? { ...basePricing, ...editValues }
              : basePricing;

            return (
              <Card key={service.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {service.service_name}
                      </CardTitle>
                      <CardDescription>
                        Per {pricing.unit}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={service.is_active ?? false}
                      onCheckedChange={(checked) =>
                        handleToggle(service.id, checked)
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Price per {pricing.unit}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.001"
                          value={pricing.pricePerUnit ?? 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isEditing) {
                              setEditingId(service.id);
                              setEditValues({ pricePerUnit: value });
                            } else {
                              setEditValues({
                                ...editValues,
                                pricePerUnit: value,
                              });
                            }
                          }}
                          className="pl-7"
                          disabled={!service.is_active}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Free Quota ({pricing.unit}s)</Label>
                      <Input
                        type="number"
                        value={pricing.freeQuota ?? 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isEditing) {
                            setEditingId(service.id);
                            setEditValues({ freeQuota: value });
                          } else {
                            setEditValues({ ...editValues, freeQuota: value });
                          }
                        }}
                        disabled={!service.is_active}
                      />
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
                        onClick={() => handleSave(service.id)}
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
      </div>
    </AdminLayout>
  );
};

export default AdminBilling;

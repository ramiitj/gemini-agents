import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Eye, EyeOff, Loader2, Triangle } from "lucide-react";

interface VercelConnectionProps {
  organizationId: string;
}

export default function VercelConnection({ organizationId }: VercelConnectionProps) {
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedTeamId, setConnectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnection();
  }, [organizationId]);

  const fetchConnection = async () => {
    const { data } = await supabase
      .from('vercel_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (data) {
      setIsConnected(true);
      setConnectedTeamId(data.vercel_team_id);
    }
  };

  const testConnection = async () => {
    if (!token) {
      toast({ title: "Error", description: "Please enter a token", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const userData = await response.json();
      toast({ title: "Success", description: `Connected as ${userData.user?.username || userData.user?.email}` });
    } catch (error) {
      toast({ title: "Error", description: "Invalid token or connection failed", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!token) {
      toast({ title: "Error", description: "Please enter a token", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Validate token first
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      // Store connection (token is stored in secrets, not here)
      const { error } = await supabase
        .from('vercel_connections')
        .upsert({
          organization_id: organizationId,
          vercel_team_id: teamId || null
        });

      if (error) throw error;

      setIsConnected(true);
      setConnectedTeamId(teamId || null);
      setToken("");
      toast({ title: "Connected", description: "Vercel integration connected successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('vercel_connections')
        .delete()
        .eq('organization_id', organizationId);

      if (error) throw error;

      setIsConnected(false);
      setConnectedTeamId(null);
      toast({ title: "Disconnected", description: "Vercel integration removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Triangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Vercel</CardTitle>
              <CardDescription>Deploy automatically</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <X className="h-3 w-3" />
              Not connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {connectedTeamId ? `Team: ${connectedTeamId}` : "Personal account"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vercel-token">API Token</Label>
              <div className="relative">
                <Input
                  id="vercel-token"
                  type={showToken ? "text" : "password"}
                  placeholder="Enter your Vercel token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a token at vercel.com/account/tokens
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vercel-team">Team ID (optional)</Label>
              <Input
                id="vercel-team"
                placeholder="team_xxxxxxxxx"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for personal account
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting || !token}
              >
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Connection
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isLoading || !token}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

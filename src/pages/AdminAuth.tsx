import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import HolocronIcon from "@/components/brand/HolocronIcon";
import { Shield, Loader2 } from "lucide-react";

const AdminAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signOut, user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    // If user is logged in and is admin, redirect to admin dashboard
    if (user && !adminLoading) {
      if (isAdmin) {
        navigate("/admin/dashboard");
      }
    }
  }, [user, isAdmin, adminLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // After sign in, we need to wait for admin check
    // The useEffect above will handle redirect if admin
    // If not admin, we show error and sign out
    setTimeout(async () => {
      const { data: adminCheck } = await (await import("@/integrations/supabase/client")).supabase
        .from("admin_users")
        .select("id")
        .single();

      if (!adminCheck) {
        toast({
          title: "Access denied",
          description: "You do not have admin privileges.",
          variant: "destructive",
        });
        await signOut();
        setLoading(false);
        return;
      }

      navigate("/admin/dashboard");
      setLoading(false);
    }, 500);
  };

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <HolocronIcon size="md" />
        <span className="text-base font-medium text-foreground">GetHolocron</span>
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-medium text-foreground">Admin Portal</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@getholocron.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in to Admin"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Admin access only. No public registration.
        </p>
      </div>

      <Link
        to="/"
        className="mt-6 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to main site
      </Link>
    </div>
  );
};

export default AdminAuth;

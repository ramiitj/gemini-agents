import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HolocronIcon } from "@/components/brand/HolocronIcon";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<{ orgName: string; token: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  const redirectPath = searchParams.get('redirect');

  useEffect(() => {
    if (user) {
      navigate(redirectPath || "/dashboard");
    }
  }, [user, navigate, redirectPath]);

  // Check for pending invitation when email changes
  const checkPendingInvitation = async (emailToCheck: string) => {
    if (!emailToCheck || !isSignUp) return;
    
    try {
      const { data } = await supabase
        .from("invitations")
        .select("token, organizations(name)")
        .eq("email", emailToCheck.toLowerCase().trim())
        .eq("status", "pending")
        .maybeSingle();
      
      if (data && data.organizations) {
        const orgName = (data.organizations as any).name;
        setPendingInvitation({ orgName, token: data.token });
      } else {
        setPendingInvitation(null);
      }
    } catch {
      setPendingInvitation(null);
    }
  };

  const handleEmailBlur = () => {
    checkPendingInvitation(email);
  };

  // Auto-generate username from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!username || username === slugify(name)) {
      setUsername(slugify(value));
    }
  };

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
  };

  const validateUsername = (value: string): boolean => {
    const regex = /^[a-z0-9-]{3,20}$/;
    return regex.test(value);
  };

  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('user already registered') || message.includes('already been registered')) {
      return "This email is already registered. Try signing in instead, or use 'Forgot password?' to reset.";
    }
    if (message.includes('invalid credentials') || message.includes('invalid login')) {
      return "Incorrect email or password. Try again or use 'Forgot password?'";
    }
    if (message.includes('email not confirmed')) {
      return "Please confirm your email first. Check your inbox for the confirmation link.";
    }
    if (message.includes('signup is disabled')) {
      return "Signups are currently disabled. Please contact an administrator.";
    }
    
    return error.message;
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Enter your email first",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp && username && !validateUsername(username)) {
      toast({
        title: "Invalid username",
        description: "Username must be 3-20 characters, lowercase letters, numbers, and hyphens only.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = isSignUp
      ? await signUp(email.trim(), password, name.trim(), username || undefined)
      : await signIn(email.trim(), password);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    // Always navigate to dashboard - useOrganization will auto-accept pending invitations
    navigate(redirectPath || "/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <HolocronIcon className="h-5 w-5 text-primary" />
        <span className="text-base font-medium text-foreground">GetHolocron</span>
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-medium text-foreground">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>

        {pendingInvitation && isSignUp && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
            <p className="font-medium text-foreground">You have a pending invitation!</p>
            <p className="text-muted-foreground mt-1">
              You've been invited to <strong>{pendingInvitation.orgName}</strong>. 
              After signup, you'll automatically join with the assigned role and permissions.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-username"
                  maxLength={20}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Used for your branch name (e.g., {username || 'your-username'}/feature)
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
            {isSignUp && (
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setPendingInvitation(null);
            }}
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;

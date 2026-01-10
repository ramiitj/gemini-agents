import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HolocronIcon } from "@/components/brand/HolocronIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type InviteStatus = "loading" | "accepting" | "success" | "expired" | "invalid" | "already_accepted" | "auth_required";

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [organizationName, setOrganizationName] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store token and redirect to auth
      setStatus("auth_required");
      return;
    }

    acceptInvitation();
  }, [user, authLoading, token]);

  const acceptInvitation = async () => {
    if (!token || !user) return;

    setStatus("loading");

    try {
      // Fetch invitation
      const { data: invitation, error: fetchError } = await supabase
        .from("invitations")
        .select("*, organizations(name)")
        .eq("token", token)
        .single();

      if (fetchError || !invitation) {
        setStatus("invalid");
        return;
      }

      setOrganizationName(invitation.organizations?.name || "the organization");

      // Check if already accepted
      if (invitation.status === "accepted") {
        setStatus("already_accepted");
        return;
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      // Check if invitation is for this user's email
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        setStatus("invalid");
        return;
      }

      setStatus("accepting");

      // Check if user already has a role in this org
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", invitation.organization_id)
        .single();

      if (!existingRole) {
        // Create user_role entry
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            organization_id: invitation.organization_id,
            role: invitation.role as "owner" | "admin" | "editor" | "viewer",
            custom_role_id: invitation.custom_role_id,
            custom_permissions: invitation.custom_permissions,
          });

        if (roleError) {
          console.error("Error creating user role:", roleError);
          setStatus("invalid");
          return;
        }
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Error updating invitation:", updateError);
      }

      setStatus("success");

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setStatus("invalid");
    }
  };

  const handleGoToAuth = () => {
    navigate(`/auth?redirect=/accept-invite/${token}`);
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
      case "accepting":
        return (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <CardTitle className="mt-4">
              {status === "loading" ? "Verifying invitation..." : "Joining organization..."}
            </CardTitle>
            <CardDescription>Please wait while we process your invitation</CardDescription>
          </>
        );

      case "success":
        return (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">Welcome to {organizationName}!</CardTitle>
            <CardDescription>
              You've successfully joined the organization. Redirecting to dashboard...
            </CardDescription>
          </>
        );

      case "expired":
        return (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
            <CardTitle className="mt-4">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation link has expired. Please ask your team admin to send a new invitation.
            </CardDescription>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go to Home
            </Button>
          </>
        );

      case "already_accepted":
        return (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-blue-500" />
            <CardTitle className="mt-4">Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted. Go to your dashboard to access the organization.
            </CardDescription>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        );

      case "invalid":
        return (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or you don't have permission to accept it.
            </CardDescription>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go to Home
            </Button>
          </>
        );

      case "auth_required":
        return (
          <>
            <HolocronIcon className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="mt-4">Sign in Required</CardTitle>
            <CardDescription>
              Please sign in or create an account to accept this invitation.
            </CardDescription>
            <Button className="mt-4" onClick={handleGoToAuth}>
              Sign in to Continue
            </Button>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center">
            <HolocronIcon className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;

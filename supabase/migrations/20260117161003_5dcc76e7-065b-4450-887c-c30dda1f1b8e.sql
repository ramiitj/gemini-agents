-- Fix 1: Add email normalization trigger for invitations (if not exists)
CREATE OR REPLACE FUNCTION public.normalize_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if any and recreate
DROP TRIGGER IF EXISTS normalize_invitation_email_trigger ON public.invitations;

CREATE TRIGGER normalize_invitation_email_trigger
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_invitation_email();

-- Fix 2: Update user_roles "Users can join org via invitation" policy to use case-insensitive matching
DROP POLICY IF EXISTS "Users can join org via invitation" ON public.user_roles;

CREATE POLICY "Users can join org via invitation"
ON public.user_roles
FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.organization_id = user_roles.organization_id
      AND lower(invitations.email) = lower(auth.email())
      AND invitations.status = 'pending'
      AND invitations.expires_at > now()
  )
);

-- Fix 3: Update invitations policies to use case-insensitive matching
DROP POLICY IF EXISTS "Invitees can accept their own invitations" ON public.invitations;

CREATE POLICY "Invitees can accept their own invitations"
ON public.invitations
FOR UPDATE
USING (lower(email) = lower(auth.email()))
WITH CHECK (lower(email) = lower(auth.email()));

DROP POLICY IF EXISTS "Admins and invitees can view invitations" ON public.invitations;

CREATE POLICY "Admins and invitees can view invitations"
ON public.invitations
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id = invitations.organization_id
      AND user_roles.role IN ('owner', 'admin')
  ))
  OR (lower(email) = lower(auth.email()))
);
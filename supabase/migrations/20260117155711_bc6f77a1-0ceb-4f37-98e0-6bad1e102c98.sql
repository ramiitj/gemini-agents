-- 1. Add trigger to normalize invitation emails to lowercase at write time
CREATE OR REPLACE FUNCTION public.normalize_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER normalize_invitation_email_trigger
BEFORE INSERT OR UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.normalize_invitation_email();

-- 2. Normalize existing invitation emails
UPDATE public.invitations SET email = lower(trim(email)) WHERE email != lower(trim(email));

-- 3. Drop and recreate invitations RLS policies with case-insensitive matching
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations to their email" ON public.invitations;
DROP POLICY IF EXISTS "Org owners and admins can create invitations" ON public.invitations;

-- Policy: Users can view invitations sent to their email (case-insensitive)
CREATE POLICY "Users can view invitations to their email" 
ON public.invitations 
FOR SELECT 
USING (lower(email) = lower(auth.email()));

-- Policy: Users can update (accept) invitations sent to their email (case-insensitive)
CREATE POLICY "Users can update invitations to their email" 
ON public.invitations 
FOR UPDATE 
USING (lower(email) = lower(auth.email()));

-- Policy: Org owners and admins can create invitations
CREATE POLICY "Org owners and admins can create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organization_id
    AND user_roles.role IN ('owner', 'admin')
  )
);

-- Policy: Org owners and admins can view all org invitations
CREATE POLICY "Org admins can view all org invitations" 
ON public.invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = invitations.organization_id
    AND user_roles.role IN ('owner', 'admin')
  )
);
-- Drop the restrictive SELECT policy on user_roles
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;

-- Create a new policy that allows users to see roles of members in the same organization
CREATE POLICY "roles_select" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.user_id = auth.uid()
    AND p2.user_id = user_roles.user_id
    AND p1.organization_id IS NOT NULL
  )
);
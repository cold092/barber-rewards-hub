-- Grant RPC execution to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;

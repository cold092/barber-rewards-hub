-- Ensure new users always receive a role (default client or from metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_role public.app_role;
BEGIN
  new_role := CASE
    WHEN NEW.raw_user_meta_data ? 'role'
      AND (NEW.raw_user_meta_data->>'role') IN ('admin', 'barber', 'client')
      THEN (NEW.raw_user_meta_data->>'role')::public.app_role
    ELSE 'client'::public.app_role
  END;

  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

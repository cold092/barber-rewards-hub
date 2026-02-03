-- Recreate signup trigger to guarantee role assignment from metadata
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_role public.app_role;
  raw_role text;
BEGIN
  raw_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'app_role',
    NEW.raw_app_meta_data->>'role',
    NEW.raw_app_meta_data->>'app_role'
  );

  new_role := CASE
    WHEN raw_role IN ('admin', 'barber', 'client') THEN raw_role::public.app_role
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

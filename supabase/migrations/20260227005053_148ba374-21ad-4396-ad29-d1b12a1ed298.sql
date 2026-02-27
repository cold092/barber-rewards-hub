
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _org_name text;
  _org_id uuid;
  _user_name text;
  _existing_profile uuid;
BEGIN
  -- Check if profile already exists (e.g. created by edge function)
  SELECT id INTO _existing_profile FROM public.profiles WHERE user_id = NEW.id LIMIT 1;
  IF _existing_profile IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _org_name := NEW.raw_user_meta_data->>'organization_name';
  _user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');

  IF _org_name IS NOT NULL AND _org_name <> '' THEN
    INSERT INTO public.organizations (name) VALUES (_org_name) RETURNING id INTO _org_id;
    INSERT INTO public.profiles (user_id, name, organization_id) VALUES (NEW.id, _user_name, _org_id);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.profiles (user_id, name) VALUES (NEW.id, _user_name);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'barber');
  END IF;

  RETURN NEW;
END;
$$;

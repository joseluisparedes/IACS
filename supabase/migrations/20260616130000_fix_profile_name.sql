-- 1. Actualizar el trigger handle_new_user para que obtenga el nombre de la lista blanca
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_allowed BOOLEAN;
  v_allowed_user_id UUID;
  v_allowed_user_name TEXT;
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    -- Crear perfil de admin
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Administrador General'));
    
    INSERT INTO public.profile_roles (profile_id, role)
    VALUES (new.id, 'admin');
  ELSE
    -- Verificar si está en lista blanca
    SELECT true, id, name INTO is_allowed, v_allowed_user_id, v_allowed_user_name FROM public.allowed_users WHERE email = new.email;
    
    IF is_allowed THEN
      -- Crear perfil con el nombre de la lista blanca
      INSERT INTO public.profiles (id, email, name)
      VALUES (new.id, new.email, COALESCE(v_allowed_user_name, new.raw_user_meta_data->>'name', new.email));
      
      -- Copiar los roles desde la whitelist
      INSERT INTO public.profile_roles (profile_id, role, vp_id, direcciones_ids)
      SELECT new.id, role, vp_id, direcciones_ids 
      FROM public.user_roles_whitelist 
      WHERE allowed_user_id = v_allowed_user_id;
      
    ELSE
      -- Crear perfil sin acceso
      INSERT INTO public.profiles (id, email, name)
      VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email));
      
      INSERT INTO public.profile_roles (profile_id, role)
      VALUES (new.id, 'sin_acceso');
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Corregir los nombres de los perfiles existentes que tengan el email en vez del nombre
UPDATE profiles p
SET name = a.name
FROM allowed_users a
WHERE p.email = a.email AND p.name = p.email;

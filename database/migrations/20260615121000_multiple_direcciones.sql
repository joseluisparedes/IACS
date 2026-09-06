-- 1. Alterar tabla allowed_users
ALTER TABLE allowed_users ADD COLUMN direcciones_ids UUID[] DEFAULT '{}';

-- Migrar datos existentes
UPDATE allowed_users SET direcciones_ids = ARRAY[direccion_id] WHERE direccion_id IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE allowed_users DROP COLUMN direccion_id CASCADE;

-- 2. Alterar tabla profiles
ALTER TABLE profiles ADD COLUMN direcciones_ids UUID[] DEFAULT '{}';

-- Migrar datos existentes
UPDATE profiles SET direcciones_ids = ARRAY[direccion_id] WHERE direccion_id IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE profiles DROP COLUMN direccion_id CASCADE;

-- 3. Actualizar la función (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_allowed BOOLEAN;
  assigned_vp UUID;
  assigned_dirs UUID[];
  assigned_roles TEXT[];
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    assigned_roles := ARRAY['admin'];
  ELSE
    -- Verificar si está en lista blanca
    SELECT true, vp_id, direcciones_ids, roles 
    INTO is_allowed, assigned_vp, assigned_dirs, assigned_roles 
    FROM public.allowed_users WHERE email = new.email;
    
    IF is_allowed THEN
      -- Usa los roles asignados en la lista blanca, por defecto 'registrador'
      IF assigned_roles IS NULL OR array_length(assigned_roles, 1) = 0 THEN
        assigned_roles := ARRAY['registrador'];
      END IF;
    ELSE
      assigned_roles := ARRAY['sin_acceso'];
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, name, roles, vp_id, direcciones_ids)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email), assigned_roles, assigned_vp, assigned_dirs);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Crear nueva tabla de lista blanca de roles (user_roles_whitelist)
CREATE TABLE IF NOT EXISTS user_roles_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  allowed_user_id UUID REFERENCES allowed_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  vp_id UUID REFERENCES vps(id) ON DELETE CASCADE,
  direcciones_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear nueva tabla de roles para perfiles (profile_roles)
CREATE TABLE IF NOT EXISTS profile_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  vp_id UUID REFERENCES vps(id) ON DELETE CASCADE,
  direcciones_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Migrar datos de allowed_users a user_roles_whitelist
-- Insertaremos un registro por cada rol que tuviera el usuario.
INSERT INTO user_roles_whitelist (allowed_user_id, role, vp_id, direcciones_ids)
SELECT 
  id as allowed_user_id, 
  unnest(roles) as role, 
  vp_id::uuid, -- vp_id was text before, but we need to ensure it casts to uuid or handles the text correctly if it wasn't UUID. Oh wait, allowed_users.vp_id might be text from early on!
  direcciones_ids 
FROM allowed_users
WHERE roles IS NOT NULL AND array_length(roles, 1) > 0;

-- 4. Migrar datos de profiles a profile_roles
INSERT INTO profile_roles (profile_id, role, vp_id, direcciones_ids)
SELECT 
  id as profile_id, 
  unnest(roles) as role, 
  vp_id::uuid,
  direcciones_ids 
FROM profiles
WHERE roles IS NOT NULL AND array_length(roles, 1) > 0;

-- 5. Eliminar columnas obsoletas
ALTER TABLE allowed_users DROP COLUMN roles CASCADE;
ALTER TABLE allowed_users DROP COLUMN vp_id CASCADE;
ALTER TABLE allowed_users DROP COLUMN direcciones_ids CASCADE;
-- Original vp_solicitante in allowed_users? Let's drop it if it exists.
ALTER TABLE allowed_users DROP COLUMN IF EXISTS vp_solicitante CASCADE;

ALTER TABLE profiles DROP COLUMN roles CASCADE;
ALTER TABLE profiles DROP COLUMN vp_id CASCADE;
ALTER TABLE profiles DROP COLUMN direcciones_ids CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS vp_solicitante CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS allowed_vps CASCADE;

-- 6. Actualizar el trigger de creación de usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_allowed BOOLEAN;
  v_allowed_user_id UUID;
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    -- Crear perfil de admin
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Administrador'));
    
    INSERT INTO public.profile_roles (profile_id, role)
    VALUES (new.id, 'admin');
  ELSE
    -- Verificar si está en lista blanca
    SELECT true, id INTO is_allowed, v_allowed_user_id FROM public.allowed_users WHERE email = new.email;
    
    IF is_allowed THEN
      -- Crear perfil básico
      INSERT INTO public.profiles (id, email, name)
      VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email));
      
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

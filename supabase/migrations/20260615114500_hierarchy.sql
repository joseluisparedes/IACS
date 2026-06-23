-- 1. Crear tabla VPs
CREATE TABLE IF NOT EXISTS vps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  bp_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla Direcciones
CREATE TABLE IF NOT EXISTS direcciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  vp_id UUID REFERENCES vps(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, vp_id)
);

-- 3. Modificar allowed_users
ALTER TABLE allowed_users ADD COLUMN IF NOT EXISTS vp_id UUID REFERENCES vps(id) ON DELETE SET NULL;
ALTER TABLE allowed_users ADD COLUMN IF NOT EXISTS direccion_id UUID REFERENCES direcciones(id) ON DELETE SET NULL;
ALTER TABLE allowed_users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{registrador}';

-- Remover columna antigua (opcional pero recomendado si ya no se usa, usar CASCADE para limpiar vistas si hay)
ALTER TABLE allowed_users DROP COLUMN IF EXISTS vp_solicitante CASCADE;

-- 4. Modificar profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vp_id UUID REFERENCES vps(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direccion_id UUID REFERENCES direcciones(id) ON DELETE SET NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS vp_solicitante CASCADE;

-- 5. Actualizar el Trigger handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_allowed BOOLEAN;
  assigned_vp UUID;
  assigned_dir UUID;
  assigned_roles TEXT[];
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    assigned_roles := ARRAY['admin'];
  ELSE
    -- Verificar si está en lista blanca
    SELECT true, vp_id, direccion_id, roles 
    INTO is_allowed, assigned_vp, assigned_dir, assigned_roles 
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

  INSERT INTO public.profiles (id, email, name, roles, vp_id, direccion_id)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email), assigned_roles, assigned_vp, assigned_dir);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

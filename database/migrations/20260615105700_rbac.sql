-- 1. Tabla de Lista Blanca (allowed_users)
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  vp_solicitante TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Perfiles y Roles (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  vp_solicitante TEXT,
  allowed_vps TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Iniciativas (Ejemplo básico para empezar el flujo)
CREATE TABLE IF NOT EXISTS initiatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  vp_solicitante TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  observation_reason TEXT,
  assigned_bp_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Automatización: Crear Profile al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_allowed BOOLEAN;
  assigned_vp TEXT;
  default_roles TEXT[];
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    default_roles := ARRAY['admin'];
  ELSE
    -- Verificar si está en lista blanca para ser registrador
    SELECT true, vp_solicitante INTO is_allowed, assigned_vp FROM public.allowed_users WHERE email = new.email;
    IF is_allowed THEN
      default_roles := ARRAY['registrador'];
    ELSE
      default_roles := ARRAY['sin_acceso'];
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, name, roles, vp_solicitante)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email), default_roles, assigned_vp);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

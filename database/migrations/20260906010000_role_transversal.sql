-- Migration: Add is_transversal column to user_roles_whitelist and profile_roles
ALTER TABLE public.user_roles_whitelist 
ADD COLUMN IF NOT EXISTS is_transversal BOOLEAN DEFAULT false;

ALTER TABLE public.profile_roles 
ADD COLUMN IF NOT EXISTS is_transversal BOOLEAN DEFAULT false;

-- Update trigger function to propagate is_transversal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_allowed BOOLEAN := false;
  v_allowed_user_id UUID;
BEGIN
  -- Verificar si es el super admin
  IF new.email = 'jose241100@gmail.com' THEN
    INSERT INTO public.profiles (id, email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Administrador'))
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    
    INSERT INTO public.profile_roles (profile_id, role, is_transversal)
    VALUES (new.id, 'admin', true)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Verificar si está en lista blanca
    SELECT true, id INTO is_allowed, v_allowed_user_id FROM public.allowed_users WHERE email = new.email;
    
    IF is_allowed THEN
      INSERT INTO public.profiles (id, email, name)
      VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email))
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
      
      -- Copiar los roles desde la whitelist incluyendo is_transversal
      INSERT INTO public.profile_roles (profile_id, role, vp_id, direcciones_ids, is_transversal)
      SELECT new.id, role, vp_id, direcciones_ids, COALESCE(is_transversal, false)
      FROM public.user_roles_whitelist 
      WHERE allowed_user_id = v_allowed_user_id;
      
    ELSE
      INSERT INTO public.profiles (id, email, name)
      VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', new.email))
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
      
      INSERT INTO public.profile_roles (profile_id, role, is_transversal)
      VALUES (new.id, 'sin_acceso', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

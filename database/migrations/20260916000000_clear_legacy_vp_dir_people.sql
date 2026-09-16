-- Migración para limpiar campos legacy de personas/correos en vps y direcciones,
-- dado que el modelo de asignación, aprobaciones y notificaciones ahora opera
-- mediante roles de perfil (profile_roles) y el motor de flujos de trabajo (workflow engine).

UPDATE vps SET bp_name = NULL, email = NULL;
UPDATE direcciones SET director_name = NULL, email = NULL;

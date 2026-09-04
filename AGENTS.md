# IACS — Directrices y Estándares del Sistema

Este documento establece las directivas permanentes de arquitectura, seguridad y despliegue para el desarrollo y evolución de **IACS (IT Needs Manager)**, basadas en los marcos de **The Architect**, **Cyber Neo** y **All Deploy**.

---

## 1. 🏛️ Arquitectura y Robustez (The Architect)

### A. Resiliencia y Fallbacks Obligatorios
- **Tolerancia a Fallos en APIs:** Ninguna operación crítica de usuario (guardado de fichas, envío de iniciativas, actualizaciones) debe fallar silenciosamente.
- **Fallback a Supabase:** En peticiones donde el backend en la nube (Render) pueda estar en suspensión (*cold start*) o con problemas de red, el frontend debe contar con un fallback directo hacia el cliente de Supabase respetando las políticas RLS.
- **Timeouts Controlados:** Toda llamada a modelos de lenguaje (Gemini / Groq) o APIs externas debe estar envuelta en un `withTimeout` (máximo 20–25 segundos) con alternativa de modelo secundaria.

### B. Segmentación Semántica de Conocimiento
- Los documentos de contexto nunca deben cortarse por conteo ciego de palabras.
- Se debe preservar la integridad conceptual de cada política o regla institucional, asegurando que el título, contexto, regla y cuestionamiento de TEO residan siempre en la misma ficha.

### C. Tipado y Calidad de Código
- Tipado estricto en TypeScript tanto en cliente como en servidor.
- Prohibido suprimir errores con castings inseguros o dependencias circulares.

---

## 2. 🛡️ Ciberseguridad y Hardening (Cyber Neo)

### A. Autenticación y Autorización en Doble Capa
- **Tokens Bearer Obligatorios:** Todas las peticiones administrativas hacia `/api/` deben incluir la cabecera `Authorization: Bearer <access_token>` inyectada automáticamente por el interceptor global de fetch.
- **Validación en Servidor:** Endpoints administrativos deben estar protegidos por `requireAdminAuth`, validando la firma del token en Supabase Auth y comprobando que el usuario posea el rol `admin` en `profile_roles`.
- **Row Level Security (RLS):** Todas las tablas en Supabase deben tener RLS habilitado con políticas restrictivas (`is_admin()`).

### B. Sanitización y Control de Carga de Archivos
- Validar tipos MIME permitidos tanto por extensión como por inspección del buffer en el servidor.
- Límite máximo estricto en carga de archivos (25 MB para documentos y diagramas de arquitectura).
- Limpieza y sanitización de prompts para evitar inyecciones en el contexto de TEO.

---

## 3. 🚀 Auditoría y Despliegue (All Deploy)

### A. Auditoría Pre-Commit y Pre-Deploy
- Ejecutar verificación de tipos de TypeScript (`npx tsc --noEmit`) antes de cualquier commit.
- Asegurar que no existan errores de linting ni referencias rotas.
- Verificar que el árbol de trabajo (`git status`) esté limpio y ordenado.

### B. Sincronización Local vs. Producción
- El frontend se despliega automáticamente en **GitHub Pages** al hacer push a `main`.
- El backend reside en **Render** (`https://iacs-3v3f.onrender.com`).
- Mantener siempre el ping de warm-up a `/api/health` en el inicio de la aplicación para mitigar la latencia de arranque del servidor.

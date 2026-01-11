Este folder está preparado para la futura integración con Supabase.

Idea de uso (cuando se conecte):

- Crear `client.ts` con `createClient` de `@supabase/supabase-js`
- Implementar repositorios en `lib/repos/*` usando Supabase (DB + Auth)

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Nota: por ahora no se importa nada desde aquí para no afectar el build/deploy.

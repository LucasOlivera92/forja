# FORJA — Sprint 0

El sistema operativo de tu evolución. Cuerpo, primero.

## Correr en local (modo demo, sin Supabase)

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` — vas a ver la barra de navegación con los 5
tabs (Hoy, Entreno, Nutrición, Descanso, Progreso) funcionando, y `/login`
con el formulario deshabilitado en modo demo.

## Conectar tu proyecto real de Supabase (cuando lo crees)

1. Creá el proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza para empezar).
2. Copiá `.env.local.example` a `.env.local`.
3. Completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — están en
   Project Settings → API de tu proyecto.
4. Corré la migración `supabase/migrations/0001_profiles.sql` desde el
   SQL Editor de Supabase (o con la CLI de Supabase si la tenés instalada).
5. Reiniciá `npm run dev` — el modo demo se desactiva solo, sin tocar código.

## Qué probar en este Sprint 0

- Instalar la PWA desde el navegador ("Agregar a inicio" / "Instalar app").
- Navegar entre los 5 tabs y confirmar que la barra inferior siempre está visible.
- Ver el mensaje de "modo demo" en `/hoy` y en `/login`.

## Estructura del proyecto

Ver `FORJA_Folder_Structure.md` (paso 7 del documento de arquitectura) para
el detalle completo de cada carpeta y su responsabilidad.

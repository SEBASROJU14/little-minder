# Little Minder — Context for Claude Code Sessions

App de productividad gentil para personas con ADHD. El tono es cálido, sin presión, con un gato compañero. Todo en inglés en la UI excepto Mind Notes (que puede estar en español). Puerto de dev: **3001**.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15.3 (App Router), TypeScript, React 19 |
| Estilos | Tailwind CSS v4 (sin config JS — todo en `globals.css` con `@theme`) |
| Font | Plus Jakarta Sans (variable `--font-jakarta`) |
| DB + Auth | Supabase (`@supabase/supabase-js` v2) |
| AI — búsqueda | Anthropic API (`claude-sonnet-4-6`) — raw fetch, no SDK, para compatibilidad Vercel |
| AI — foto proof | Anthropic SDK (`@anthropic-ai/sdk`) — `claude-sonnet-4-6` con vision |
| Transcripción | OpenAI Whisper (`whisper-1`) vía raw fetch |
| Audio recording | MediaRecorder API (cliente) |
| PWA | Service worker manual (`/public/sw.js`), `manifest.json` |
| Deploy | Vercel |

### Variables de entorno requeridas
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY         # para Whisper (transcribir audio)
ANTHROPIC_API_KEY      # para mind-search y validate-proof
```

---

## Estructura de archivos

```
app/
  page.tsx                  # Entry: login Google OAuth o selector de energía
  layout.tsx                # Root layout: fuentes, providers, service worker
  globals.css               # Tokens de color Tailwind v4, animaciones
  auth/callback/page.tsx    # Intercambia OAuth code por sesión Supabase
  home/page.tsx             # Pantalla principal (thingys + mind notes + cat)
  create/page.tsx           # Pantalla alternativa de creación (legacy, sin deadline)
  api/
    transcribe/route.ts         # Whisper para MicButton en AddThingySheet
    transcribe-note/route.ts    # Whisper para Mind Notes (separado para logs)
    mind-search/route.ts        # Claude: busca en notas del usuario
    validate-proof/route.ts     # Claude vision: valida foto de proof

components/
  ThingyCard.tsx            # Card con progress circle, chunks, atributos, deadline
  AddThingySheet.tsx        # Bottom sheet para crear thingy (voz + texto + opciones)
  MicButton.tsx             # Botón grabación reutilizable (MediaRecorder + Whisper)
  MindNoteCard.tsx          # Card de nota con foto opcional y delete
  CatCompanion.tsx          # Gato fijo en esquina inferior derecha, mensajes por energía
  XPBar.tsx                 # Barra de nivel + XP animada
  ProgressCircle.tsx        # SVG circular con pasos 0/25/50/75/100, tappable
  EnergyPill.tsx            # Pill de color para nivel de energía
  ProofModal.tsx            # Modal foto proof con validación Claude vision
  SmartMindModal.tsx        # (Legacy — reemplazado por inline en home/page.tsx)
  MindNoteModal.tsx         # (Legacy — reemplazado por inline en home/page.tsx)
  MindSearchModal.tsx       # (Legacy — reemplazado por inline en home/page.tsx)
  CatDisplay.tsx            # Subcomponente visual del gato

contexts/
  AppContext.tsx             # Thingys, XP, energy — Supabase + estado local
  MindNotesContext.tsx       # Mind notes — Supabase + optimistic updates

lib/
  missions.ts               # Tipos, funciones, XP rewards, mensajes del gato
  supabase.ts               # createClient (anon key, browser)
```

---

## Base de datos (Supabase)

### Tabla `thingys`
```sql
id                  TEXT PRIMARY KEY
user_id             TEXT NOT NULL          -- ← ahora es el UUID de Supabase Auth
title               TEXT NOT NULL
energy              TEXT CHECK (energy IN ('low','medium','high'))
completed           BOOLEAN DEFAULT false
created_at          TIMESTAMPTZ DEFAULT now()
completed_at        TIMESTAMPTZ
is_custom           BOOLEAN DEFAULT true
daily               BOOLEAN DEFAULT false
require_photo       BOOLEAN DEFAULT false
progress            INTEGER DEFAULT 0 CHECK (progress IN (0,25,50,75,100))
has_proof           BOOLEAN
proof_message       TEXT
last_completed_date TEXT                   -- toDateString() para daily reset
deadline            TEXT                   -- YYYY-MM-DD
chunks_enabled      BOOLEAN                -- columna puede no existir en instancias viejas
chunks              JSONB                  -- array de {id, text, completed}
```

### Tabla `user_xp`
```sql
user_id    TEXT PRIMARY KEY              -- UUID de Supabase Auth
xp         INTEGER DEFAULT 0
updated_at TIMESTAMPTZ
```

### Tabla `mind_notes`
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    TEXT NOT NULL                 -- UUID de Supabase Auth
text       TEXT
photo_url  TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### Storage bucket
- `mind-note-photos` — fotos de mind notes, path: `{userId}/{timestamp}-{filename}`

### Seguridad
- RLS **deshabilitado** en `thingys` y `user_xp` (diseño inicial sin auth)
- Después de activar Google OAuth: considerar habilitar RLS con políticas `auth.uid() = user_id`

---

## Features implementadas

### 1. Thingys (tareas)
- Niveles de energía: `low` / `medium` / `high` (colores: rosa / lavanda / verde)
- **Progress circle** SVG: pasos 0 → 25 → 50 → 75 → 100%, tappable; al llegar a 100% completa el thingy
- **Chunks** (subtareas): hasta 10 pasos, progress se calcula automáticamente de chunks completados
- **Atributos por pill**:
  - `♻ daily` — se resetea cada día (verifica `last_completed_date !== toDateString()` al cargar)
  - `🔔 deadline` — inline date picker; ring amarillo si vence hoy, rojo si venció
  - `📷 photo proof` — requiere foto al completar (opcional u obligatorio)
  - `≡ chunks` — toggle para activar subtareas
- **Ordenamiento** en home: near deadline → tiene deadline → energía = energía actual → daily → resto
- **Do again**: botón para resetear thingy completado (útil para dailies completados manualmente)
- XP rewards: low=10, medium=20, high=30 (+5 bonus si hay foto proof)

### 2. AddThingySheet (crear thingy)
- Bottom sheet animado con backdrop blur
- Combinación voz (MicButton → Whisper) + texto
- `suggestEnergy(text)`: detecta palabras como "workout/clean/study" → high, "rest/breathe/pill" → low
- "ask the cat" sugiere nivel de energía del texto ingresado
- Opciones: daily, require photo, deadline (date picker)
- Si viene de transcripción de voz, pre-rellena texto y sugiere energía automáticamente

### 3. Mind Notes
- Grabación inline en el botón "mind note" de home (no modal)
- **Detección de intent**: palabras como "guarda/recuerda/anota" → `save`; "dónde/cuándo/busca" → `search`
- **Save**: inserta en Supabase `mind_notes` con optimistic update (aparece inmediatamente)
- **Search**: envía notas al endpoint `/api/mind-search` → Claude responde en ≤3 oraciones
- Soporte fotos: upload a bucket `mind-note-photos`
- `MindNoteCard`: muestra texto + thumbnail de foto si existe, botón × para eliminar
- Las notas se pasan al search ya ordenadas por `created_at` DESC para que Claude priorice la más reciente

### 4. Cat Companion
- Fixed en esquina inferior derecha, imagen `/public/cat.png`
- Muestra mensajes según `energy` del usuario (`CAT_MESSAGES[energy]`)
- Mensajes idle cada 18 segundos, primer mensaje a los 2 segundos
- Click → mensaje de encouragement aleatorio
- No anima ni bloquea interacción

### 5. XP y niveles
- `getLevelFromXP(xp)`: level = `floor(xp / 100) + 1`, se necesitan 100 XP por nivel
- `XPBar`: animación de fill al montar (0% → valor real en 700ms con easing)
- Persiste en tabla `user_xp` con upsert en cada `completeThingy`

### 6. Voice (MicButton)
- Componente reutilizable con prop `endpoint` (default `/api/transcribe`)
- Estados: idle → recording → loading → error → idle
- MediaRecorder con MIME type detection: webm;opus > webm > mp4 > ogg
- Extensión: mp4 → `.m4a` para que Whisper lo reconozca en iOS
- Whisper: `language: "es"`, `model: "whisper-1"`
- Timeout 25s con AbortController

### 7. Photo Proof
- `ProofModal`: stages `ask → capture → validating → done`
- Si `requirePhotoProof=true`: obligatorio (hay botón "skip this time" pequeño)
- Si `requirePhotoProof=false`: opcional (botón skip prominente)
- Valida con Claude vision (`/api/validate-proof`): respuesta cálida de ≤10 palabras
- Fallbacks locales si Claude falla
- Bonus +5 XP al tener proof

### 8. Autenticación — Supabase Auth + Google OAuth
- **Implementado en la última sesión** (2026-05-09)
- `app/page.tsx`: detecta sesión; sin sesión → pantalla login con botón Google; con sesión → selector de energía
- `app/auth/callback/page.tsx`: client component que llama `exchangeCodeForSession(code)` y redirige a `/`
- `app/home/page.tsx`: guard reemplazado de `sessionStorage.getItem("lm_session")` → `supabase.auth.getSession()`
- `contexts/AppContext.tsx` y `MindNotesContext.tsx`: eliminado `USER_ID = "default_user"`, ahora usan `supabase.auth.getSession()` + `onAuthStateChange` para obtener el UUID real del usuario
- Patrón: `userIdRef` (para callbacks con deps vacías) + `userId` state (para triggear re-load de datos)
- **Configuración pendiente en Supabase Dashboard**:
  1. Authentication → Providers → Google → habilitar, pegar Client ID y Secret
  2. Authentication → URL Configuration → Redirect URLs: `http://localhost:3001/auth/callback` + dominio de producción

### 9. PWA
- Service worker (`/public/sw.js`) cachea: `/`, `/home`, `/create`, `manifest.json`, `cat.png`, `logo.png`
- API routes excluidas del cache
- `manifest.json`: `display: standalone`, `theme_color: #C9B8E8`, `background_color: #FAFAF8`
- `reactStrictMode: true` en `next.config.ts`

---

## Decisiones de diseño

**¿Por qué raw fetch en `/api/mind-search` y no el SDK de Anthropic?**
El SDK de Anthropic falla silenciosamente en Vercel Edge/Serverless con ciertos runtimes. Commit `5a72b55` lo documenta. La solución fue reemplazar el SDK con `fetch` directo a `https://api.anthropic.com/v1/messages`.

**¿Por qué dos endpoints de transcripción (`/api/transcribe` y `/api/transcribe-note`)?**
Se separan para tener logs independientes y poder identificar cuál falla. Funcionalmente idénticos, excepto que `transcribe-note` tiene logs más detallados de error.

**¿Por qué `userIdRef` en los contextos en lugar de solo state?**
Los callbacks `addThingy`, `completeThingy`, `addNote` están definidos con `useCallback([])`. Si leyeran `userId` del state necesitarían agregarlo a las deps, recreando los callbacks en cada login/logout. El ref permite leer el valor actualizado sin romper las deps.

**¿Por qué Mind Notes inline en `home/page.tsx` y no en un modal/componente?**
Se refactorizó de SmartMindModal → inline para que el flujo graba → procesa → muestra sea más fluido y no requiera abrir/cerrar modal. Los tres componentes Modal (SmartMindModal, MindNoteModal, MindSearchModal) siguen en `/components` pero ya no se usan.

**¿Por qué `detectMindIntent` en el cliente y no en el servidor?**
La detección es basada en palabras clave simples, sin necesidad de LLM. Mantenerla cliente-side evita un round-trip extra antes de decidir si guardar o buscar.

**Tokens de color en Tailwind v4**
Tailwind v4 define tokens en `@theme` dentro de `globals.css`, sin `tailwind.config.js`. Los tokens custom son:
`cream`, `cream-dark`, `lavender`, `lavender-light`, `lavender-dark`, `moss`, `moss-light`, `moss-dark`, `carbon`, `carbon-soft`, `rose-soft`, `amber-soft`.

**ProgressCircle: pasos discretos 0/25/50/75/100**
Decisión deliberada: ADHD + granularidad infinita = parálisis. Los 5 pasos discretos reducen la fricción cognitiva.

**Daily reset**
Se hace en el cliente al cargar, comparando `last_completed_date` con `new Date().toDateString()`. No hay cron job. Si el usuario no abre la app, los dailies no se resetean (comportamiento aceptable para el caso de uso).

---

## Bugs resueltos y cómo

### Stale closure en mind-search (commit `709f7b0`)
**Problema**: `processMindTranscript` usaba el array `notes` del closure inicial (siempre vacío).
**Fix**: `notesRef.current = notes` en un useEffect; `processMindTranscript` lee `notesRef.current`.

### Claude priorizaba notas antiguas sobre recientes (commits `23af51b`, `d04caca`, `e540e61`)
**Problema**: Claude elegía notas por relevancia semántica, ignorando que la más reciente siempre gana.
**Fix**: Ordenar notas por `created_at` DESC antes de enviar, y agregar en el system prompt: "La nota [1] es SIEMPRE la más reciente. Responde ÚNICAMENTE con la información de la nota más reciente que sea relevante."

### Whisper: audio iOS no reconocido (commit `5369189`)
**Problema**: iOS Safari graba `audio/mp4`, Whisper no lo acepta con extensión `.mp4`.
**Fix**: Mapear `mimeType.includes("mp4")` → extensión `.m4a`.

### SDK Anthropic falla en Vercel (commit `5a72b55`)
**Problema**: `@anthropic-ai/sdk` lanzaba errores de streaming/fetch en el runtime de Vercel.
**Fix**: Reemplazar SDK con `fetch` directo en `mind-search/route.ts`.

### OpenAI SDK falla en `transcribe-note` (commit `772a1d9`)
**Problema**: Similar al anterior — el SDK de OpenAI tenía problemas en Vercel serverless.
**Fix**: Reemplazar con `fetch` directo a `https://api.openai.com/v1/audio/transcriptions`.

### Todos los usuarios compartían datos (resuelto 2026-05-09)
**Problema**: `USER_ID = "default_user"` hardcodeado en ambos contextos.
**Fix**: Obtener UUID real de `supabase.auth.getSession()` + `onAuthStateChange`.

---

## Commits importantes (git log)

```
d612ae7  debug: add logs to mind-search
5a72b55  fix: raw fetch to Anthropic API (SDK fails on Vercel)        ← crítico
e540e61  fix: stricter prompt for recent notes
4f66431  fix: sort by full timestamp not just date
7c8be13  fix: sort notes by date desc before search
d04caca  Revert "fix: prioritize recent notes in search"
23af51b  fix: prioritize recent notes in search
b488e34  fix: send full notes to Claude search
709f7b0  fix: stale closure bug in mind-search + full notes logs       ← crítico
361bd91  feat: mind note records immediately inline, no modal
e4ccf6c  feat: two prominent buttons + SmartMindModal with intent detection
772a1d9  fix: replace OpenAI SDK with raw fetch in transcribe-note    ← crítico
a12387f  feat: timing logs in transcribe
8c40c28  fix: copy exact bai-quoter transcribe route
a220015  fix: void then + mimeType before recorder like bai-quoter
5369189  fix: correct audio extension for iOS (mp4→m4a) + 25s timeout ← crítico
0d51d5a  feat: mind notes con voz y búsqueda AI
c0bb780  Initial commit — Little Minder PWA
```

*(Nota: los commits de autenticación del 2026-05-09 no están en el repo todavía — están sin commitear.)*

---

## Próximos pasos pendientes

### Bloqueantes para producción
1. **Configurar Google OAuth en Supabase Dashboard**:
   - Authentication → Providers → Google → Client ID + Secret (de Google Cloud Console)
   - Authentication → URL Configuration → Redirect URLs: `http://localhost:3001/auth/callback` + URL de Vercel
2. **Commitear y pushear los cambios de auth** (AppContext, MindNotesContext, page.tsx, home/page.tsx, auth/callback/page.tsx)
3. **Agregar variables de entorno en Vercel**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### RLS (Row Level Security)
- Actualmente deshabilitado en `thingys` y `user_xp`
- Habilitar cuando auth esté estable:
  ```sql
  ALTER TABLE thingys ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own thingys"
    ON thingys FOR ALL USING (auth.uid()::text = user_id);

  ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own xp"
    ON user_xp FOR ALL USING (auth.uid()::text = user_id);
  ```
- `mind_notes` también necesita política similar

### Features pendientes / ideas
- **Sign out**: no hay botón de cerrar sesión todavía
- **`/create` page**: duplica funcionalidad de AddThingySheet pero sin deadline; considerar eliminar o unificar
- **Chunks en DB**: la columna `chunks` y `chunks_enabled` puede no existir en instalaciones antiguas de Supabase — verificar que el schema esté actualizado
- **Push notifications**: recordatorios de deadlines
- **Onboarding**: primera vez que el usuario entra, explicar qué es un thingy
- **Export/backup**: exportar thingys completados
- **Modo oscuro**: tokens de color están listos, falta implementar `prefers-color-scheme`

### Deuda técnica
- SmartMindModal, MindNoteModal, MindSearchModal en `/components` ya no se usan → candidatos a eliminar
- `app/create/page.tsx`: funcionalidad solapada con AddThingySheet, sin deadline
- Los logs de debug de `mind-search` (commit `d612ae7`) deberían limpiarse en producción

---

## Patrones a recordar

**Supabase queries son lazy en v2** — solo ejecutan con `.then()` o `await`. Siempre usar:
```typescript
supabase.from("table").insert(row).then(({ error }) => { ... });
// NO: supabase.from("table").insert(row); // ← no ejecuta
```

**MediaRecorder en iOS**: siempre detectar MIME type antes de instanciar, mapear `mp4 → .m4a`.

**Claude no usa SDK en este proyecto para mind-search**: usar `fetch` directo con header `x-api-key`.

**Tailwind v4**: los tokens custom van en `@theme` dentro de `globals.css`, NO en `tailwind.config.js` (no existe).

**Next.js 15 App Router**: `"use client"` en todo componente con hooks o eventos. Los API routes están en `app/api/*/route.ts`.

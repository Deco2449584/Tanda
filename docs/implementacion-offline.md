# Implementación offline — Kiosk Tanda

Documento de referencia para retomar e implementar/commitar los cambios de modo offline del kiosk.  
**Estado:** cambios en working tree, **sin commit** al momento de escribir este archivo.

---

## Objetivos implementados

1. **Fichaje offline** — guardar clock-in/out en IndexedDB (foto + metadata) y subir cuando vuelva la conexión.
2. **Validación de PIN offline** — empleados contra roster cacheado (restricciones + turnos).
3. **Validación online en PIN** — restricciones y acción (check-in/out) antes de la cámara, no después.
4. **Sincronización en background** — foto → éxito inmediato en UI → geo + upload en segundo plano.
5. **Conectividad real** — ping al servidor (no solo `navigator.onLine`) para detectar lie-fi.
6. **Sin bloqueo del reloj** — eliminado modal bloqueante por fichajes rechazados; gestión desde panel de registros.
7. **Panel de registros del dispositivo** — pendientes, rechazados (con motivo + eliminar/reintentar), subidos con éxito.
8. **PIN de salida offline** — hash del lock PIN cacheado en el dispositivo para salir del kiosk sin red.
9. **Roster local actualizado** — tras fichaje online/offline exitoso, sin sobrescribir con datos viejos del servidor.

---

## Arquitectura general

```
PIN empleado
  ├─ Online  → POST /api/kiosk/lookup (restricciones + acción)
  └─ Offline → roster IndexedDB + validate-offline-kiosk.ts

Cámara → enqueue IndexedDB (pending)
  → applyLocalRosterPunch (optimistic update)
  → UI éxito inmediata
  → background: GPS → flushQueuedPunchById / flushKioskOfflineQueue
       ├─ upload foto Storage
       ├─ POST /api/kiosk/punch (clientCapturedAt, offlineQueueId, geoBackfilled)
       ├─ éxito → archive sync_history + remove queue + applyLocalRosterPunch + sync roster
       └─ 409/403 → status failed + lastError (solo servidor decide rechazo permanente)

Hook useKioskOfflineSync
  ├─ probe cada 5s (/api/kiosk/ping)
  ├─ flush al reconectar + poll 30s mientras haya pending
  ├─ roster cada 30 min si online y sin pending
  └─ expone: pendingItems, failedItems, syncedItems, retry/remove/flush
```

### IndexedDB (`tanda-kiosk-offline`, versión 2)

| Store | Contenido |
|-------|-----------|
| `queue` | Fichajes pendientes/fallidos (`QueuedPunch` + `imageBlob`) |
| `roster` | Staff cacheado con `lastAction`, turnos, restricciones |
| `meta` | `lastRosterSyncAt`, `lastFlushAt` |
| `sync_history` | Últimos 100 fichajes subidos con éxito desde este dispositivo |

### localStorage (complementario)

| Clave | Uso |
|-------|-----|
| `kiosk_device_session_cache` | Sesión del dispositivo para bootstrap offline |
| `kiosk_lock_pin_hash` | Hash SHA-256 del PIN de salida (`kiosk-lock:{pin}`) |
| `kiosk_device_token` / `kiosk_client_session_id` | Identidad del dispositivo |

---

## Archivos modificados (git tracked)

### API / servidor

| Archivo | Cambios |
|---------|---------|
| `tanda-web/src/app/api/kiosk/devices/session/route.ts` | Sesión incluye `lockPinHash` para cache offline; usa `buildKioskDeviceSessionFromDoc` |
| `tanda-web/src/app/api/kiosk/punch/route.ts` | Soporta `clientCapturedAt`, `offlineQueueId`, `actionType`, `geoBackfilled` |
| `tanda-web/src/lib/kiosk/server/punch-service.ts` | `loadKioskRoster`, `lookupKioskEmployee` con restricciones, `recordDeferredKioskPunch` con conflicto 409, `geoBackfilled` |
| `tanda-web/src/lib/kiosk/server/kiosk-devices-service.ts` | `buildKioskDeviceSessionFromDoc`, expone `lockPinHash` en sesión al cliente |

### UI Kiosk

| Archivo | Cambios |
|---------|---------|
| `tanda-web/src/components/kiosk/KioskApp.tsx` | Hook offline, bootstrap sesión cacheada, `offlineState` a idle/locked shell |
| `tanda-web/src/components/kiosk/KioskScreen.tsx` | PIN online/offline, éxito inmediato, background sync, banner, botón registros (móvil), sin modal bloqueante |
| `tanda-web/src/components/kiosk/KioskIdleScreen.tsx` | Botón "Device records", aviso pending/rejected, panel al salir del kiosk |
| `tanda-web/src/components/kiosk/KioskLockedShell.tsx` | Botón registros (sin PIN), PIN salida con `deviceId`, pasa `offlineState` |
| `tanda-web/src/components/kiosk/KioskPinGate.tsx` | Verificación offline contra hash cacheado si falla red |
| `tanda-web/src/components/kiosk/KioskActivation.tsx` | Guarda hash del lock PIN al activar tablet |
| `tanda-web/src/components/kiosk/KioskAlert.tsx` | Ajustes menores de UI |

### Lib / tipos / utilidades

| Archivo | Cambios |
|---------|---------|
| `tanda-web/src/lib/kiosk/clear-kiosk-session.ts` | Limpia también `kiosk_lock_pin_hash` |
| `tanda-web/src/lib/types/kiosk-device.ts` | `lockPinHash?: string` en `KioskDeviceSession` |
| `tanda-web/src/lib/types/attendance.ts` | Campo relacionado con `geoBackfilled` (si aplica en tipos) |
| `tanda-web/src/lib/geo/capture-position.ts` | Ajuste menor para captura en kiosk |
| `tanda-web/src/components/attendance/AttendanceTable.tsx` | Cambio menor relacionado (1 línea) |

---

## Archivos nuevos (untracked)

### API

| Archivo | Descripción |
|---------|-------------|
| `tanda-web/src/app/api/kiosk/ping/route.ts` | `GET` — health check ligero para probe de conectividad |
| `tanda-web/src/app/api/kiosk/roster/route.ts` | `GET` — roster extendido (empleados, turnos, restricciones, timezone) |

### UI

| Archivo | Descripción |
|---------|-------------|
| `tanda-web/src/components/kiosk/KioskOfflineBanner.tsx` | Badge Online/Offline, aviso amarillo dismissible, indicador de sync |
| `tanda-web/src/components/kiosk/KioskSyncRecordsPanel.tsx` | Panel con tabs Pending / Rejected / Uploaded |

### Offline core (`tanda-web/src/lib/kiosk/offline/`)

| Archivo | Descripción |
|---------|-------------|
| `kiosk-offline-db.ts` | IndexedDB v2, stores queue/roster/meta/sync_history |
| `kiosk-offline-types.ts` | `QueuedPunch`, `KioskOfflineRoster`, `KioskSyncHistoryEntry`, etc. |
| `kiosk-offline-queue.ts` | enqueue, list pending/failed, retry, remove |
| `flush-kiosk-offline-queue.ts` | Upload foto + POST punch; **no** refresca roster antes de subir; `applyLocalRosterPunch` tras éxito |
| `kiosk-offline-roster.ts` | Sync roster, `applyLocalRosterPunch`, `lookupOfflineEmployee` |
| `validate-offline-kiosk.ts` | Validación PIN offline (restricciones, cola local, acción check-in/out) |
| `kiosk-sync-history.ts` | Archiva fichajes subidos (máx. 100) |
| `kiosk-connectivity.ts` | `probeKioskConnectivity()` → ping, timeout 2.5s, intervalo 5s |
| `kiosk-browser-network.ts` | Eventos `online`/`offline` del navegador |
| `kiosk-network.ts` | `fetchWithTimeout` para lookup/punch/roster |
| `resolve-geo-for-sync.ts` | Geo al subir si no se capturó al fichar (`geoBackfilled`) |
| `roster-shift-dates.ts` | Utilidad fechas de turnos para roster |
| `use-kiosk-offline-sync.ts` | Hook React: estado, flush, retry, historial, probe |

### Sesión / PIN offline

| Archivo | Descripción |
|---------|-------------|
| `tanda-web/src/lib/kiosk/kiosk-session-cache.ts` | Cache sesión dispositivo en localStorage |
| `tanda-web/src/lib/kiosk/kiosk-lock-pin-cache.ts` | Cache hash PIN salida por `deviceId` |
| `tanda-web/src/lib/kiosk/lock-pin-hash.ts` | `hashKioskLockPin` en browser (mismo algoritmo que servidor) |

---

## Archivo eliminado (en working tree)

| Archivo | Motivo |
|---------|--------|
| `tanda-web/src/components/kiosk/KioskFailedSyncModal.tsx` | Reemplazado por `KioskSyncRecordsPanel` — ya no bloquea el reloj |

---

## Flujos de usuario

### Fichaje

1. Empleado ingresa PIN de 4 dígitos.
2. **Online:** `POST /api/kiosk/lookup` valida restricciones y devuelve `actionType`.
3. **Offline:** valida contra roster + cola local en IndexedDB.
4. Cámara → guarda en cola → muestra éxito → en background GPS + upload.
5. Si online al momento del upload, intenta `flushQueuedPunchById` de inmediato.

### Salir del kiosk (tablet bloqueado)

1. Botón candado → `KioskPinGate`.
2. **Online:** `POST /api/kiosk/devices/unlock`.
3. **Offline:** compara PIN con hash en `kiosk_lock_pin_hash`.
4. **Requisito:** el dispositivo debe haber estado online al menos una vez tras activar/cambiar PIN para cachear el hash.

### Ver registros (funciona offline)

- **Dentro del kiosk (tablet):** icono lista arriba derecha (junto al candado).
- **Kiosk móvil:** icono lista junto a Exit.
- **Kiosk pausado (idle):** botón "Device records".
- Tabs: **Pending** | **Rejected** | **Uploaded**.
- Rejected: ver `lastError`, reintentar (si online), eliminar del dispositivo.

---

## Constantes importantes

| Constante | Valor | Archivo |
|-----------|-------|---------|
| `KIOSK_CONNECTIVITY_PROBE_INTERVAL_MS` | 5000 ms | `kiosk-connectivity.ts` |
| `KIOSK_OFFLINE_FLUSH_INTERVAL_MS` | 30000 ms | `kiosk-connectivity.ts` |
| `KIOSK_ROSTER_SYNC_INTERVAL_MS` | 30 min | `use-kiosk-offline-sync.ts` |
| `KIOSK_OFFLINE_MAX_FLUSH_ATTEMPTS` | 5 | `kiosk-offline-types.ts` |
| `MAX_SYNC_HISTORY_ENTRIES` | 100 | `kiosk-sync-history.ts` |
| IndexedDB `DB_VERSION` | 2 | `kiosk-offline-db.ts` |

---

## Bugs corregidos en esta iteración

| Problema | Causa | Solución |
|----------|-------|----------|
| Modal bloqueante sin internet | Items `failed` previos en IndexedDB | Modal eliminado; gestión en panel al salir |
| "Try again" no funcionaba | Flush ignoraba status `failed` | `retryFailedQueuedPunches()` + flush dedicado |
| Roster local no se actualizaba online | `syncKioskRosterFromServer()` **antes** del upload sobrescribía el optimistic update | Roster sync **después** del éxito; `applyLocalRosterPunch` en `syncQueuedPunch` |
| No se podía salir offline | PIN solo vía API | Hash cacheado + verificación local |
| No se veían registros offline | Panel solo en idle y requería salir | Botón registros en `KioskLockedShell` sin PIN |

---

## Checklist para commit futuro

```bash
# Ver estado
git status

# Archivos a incluir (offline kiosk)
git add tanda-web/src/app/api/kiosk/ping/
git add tanda-web/src/app/api/kiosk/roster/
git add tanda-web/src/lib/kiosk/offline/
git add tanda-web/src/lib/kiosk/kiosk-session-cache.ts
git add tanda-web/src/lib/kiosk/kiosk-lock-pin-cache.ts
git add tanda-web/src/lib/kiosk/lock-pin-hash.ts
git add tanda-web/src/components/kiosk/KioskOfflineBanner.tsx
git add tanda-web/src/components/kiosk/KioskSyncRecordsPanel.tsx
git add tanda-web/src/app/api/kiosk/devices/session/route.ts
git add tanda-web/src/app/api/kiosk/punch/route.ts
git add tanda-web/src/components/kiosk/
git add tanda-web/src/lib/kiosk/
git add tanda-web/src/lib/types/kiosk-device.ts
git add tanda-web/src/lib/types/attendance.ts
git add tanda-web/src/lib/geo/capture-position.ts
git add tanda-web/src/components/attendance/AttendanceTable.tsx

# Confirmar que KioskFailedSyncModal.tsx está eliminado
git add tanda-web/src/components/kiosk/KioskFailedSyncModal.tsx

# NO incluir
# tanda-web/.next/
```

### Mensaje de commit sugerido

```
Add offline kiosk queue, roster cache, and device records panel.

Employees can clock in/out offline with deferred sync; lock PIN and
sync records work without network after one online session.
```

---

## Pruebas manuales recomendadas

- [ ] Activar tablet → conectar online → desconectar → salir con PIN de bloqueo
- [ ] Fichaje offline → reconectar → sube automáticamente
- [ ] Fichaje online → segundo empleado ve acción correcta (check-out tras check-in)
- [ ] Conflicto 409 (ya checked-in en otro tablet) → aparece en Rejected con mensaje
- [ ] Panel registros accesible offline desde icono lista en kiosk activo
- [ ] Lie-fi: badge pasa a Offline cuando ping falla
- [ ] Tablet ya activado antes del deploy: una sesión online cachea el PIN de salida

---

## Notas / pendientes opcionales

- Textos de UI están en **inglés**; traducir a español si se desea.
- Tablets activados **antes** de este cambio necesitan **una conexión online** para recibir `lockPinHash` en sesión.
- `validateQueuedPunchBeforeSync` en `validate-offline-kiosk.ts` existe pero **no se usa** en flush (el servidor decide rechazos).
- Multi-tablet: conflicto se detecta al subir (409), no al fichar offline en cada tablet.

---

*Generado como referencia de implementación — revisar `git diff` antes de commitear por si hay cambios adicionales no listados aquí.*

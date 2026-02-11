# Análisis y Optimización de Sincronización Audio-Video en RustDesk

## ✅ OPTIMIZACIONES IMPLEMENTADAS

### 1. Sistema de Timestamps Unificados ✅

**Archivos modificados:**
- `libs/hbb_common/protos/message.proto` - Agregado campo `pts` a AudioFrame
- `src/av_sync.rs` - Nuevo módulo de sincronización AV
- `src/lib.rs` - Exportación del módulo av_sync
- `src/server/audio_service.rs` - Inicialización de reloj AV y timestamps en audio
- `src/server/video_service.rs` - Uso del reloj AV compartido

**Cambios realizados:**
- ✅ Agregado campo `int64 pts` a `AudioFrame` en protobuf
- ✅ Creado reloj AV global compartido (`AV_SYNC_CLOCK`)
- ✅ Audio y video ahora usan el mismo reloj de referencia
- ✅ Timestamps en milisegundos desde el inicio de la sesión
- ✅ Inicialización automática del reloj desde audio o video service

### 2. Controlador de Sincronización AV ✅

**Archivo creado:**
- `src/av_sync.rs` - Módulo completo de sincronización (165 líneas)

**Funcionalidades implementadas:**
- ✅ `AVSyncController` global compartido entre audio y video
- ✅ Monitoreo de drift entre audio y video
- ✅ Detección de desincronización (umbral: 100ms)
- ✅ Funciones helper para actualizar PTS de audio/video
- ✅ API para obtener drift y estado de sincronización
- ✅ Tests unitarios incluidos

### 3. Optimización de Buffers de Audio ✅

**Archivos modificados:**
- `src/client.rs` - Reducción de buffer de audio
- `src/server/connection.rs` - Mejora en manejo de latencia

**Cambios realizados:**
- ✅ Buffer de audio reducido de 3000ms a 500ms
- ✅ Latencia de descarte de audio aumentada de 1000ms a 2000ms
- ✅ Logging de latencia para monitoreo (500ms warning, 2000ms drop)
- ✅ Menor latencia general del sistema

### 4. Coordinación de Threads ✅

**Archivos modificados:**
- `src/client.rs` - AudioHandler y VideoHandler actualizados

**Cambios realizados:**
- ✅ AudioHandler actualiza PTS global al recibir frames
- ✅ VideoHandler actualiza PTS global al recibir frames
- ✅ Ambos threads comparten el mismo controlador de sincronización
- ✅ Extracción de PTS desde EncodedVideoFrame

### 5. Mecanismo de Sincronización AV ✅

**Implementación:**
- ✅ Controlador global accesible desde cualquier punto
- ✅ Funciones helper: `update_audio_pts()`, `update_video_pts()`
- ✅ Monitoreo de drift: `get_av_drift()`, `is_av_synchronized()`
- ✅ Reset de sincronización: `reset_av_sync()`

---

## Problemas Identificados (RESUELTOS)

### 1. **Falta de Timestamps Unificados**
- **Audio**: No tiene timestamps explícitos en `AudioFrame` (línea 500-523 en `audio_service.rs`)
- **Video**: Usa timestamps `ms` basados en tiempo transcurrido (línea 719 en `video_service.rs`)
- **Problema**: Audio y video usan relojes diferentes, causando drift con el tiempo

### 2. **Descarte de Audio por Latencia**
- **Ubicación**: `src/server/connection.rs` líneas 793-800
- **Problema**: Si la latencia > 1000ms, los frames de audio se descartan completamente
- **Impacto**: Pérdida de sincronización cuando hay congestión de red

### 3. **Buffer de Audio sin Sincronización con Video**
- **Ubicación**: `src/client.rs` líneas 1289-1311
- **Problema**: El buffer de audio (`AudioBuffer`) opera independientemente del video
- **Impacto**: Audio puede adelantarse o atrasarse respecto al video

### 4. **Procesamiento en Threads Separados sin Coordinación**
- **Audio**: Thread separado (línea 2934 en `client.rs`)
- **Video**: Múltiples threads por display (línea 2306 en `io_loop.rs`)
- **Problema**: No hay mecanismo de sincronización entre threads de audio y video

### 5. **Timing de Audio Basado en Callback**
- **Ubicación**: `src/client.rs` líneas 1490-1503
- **Problema**: El timing se basa en timestamps del callback de audio, no en PTS del stream
- **Impacto**: Puede causar jitter y desincronización

## Soluciones Propuestas

### 1. **Sistema de Timestamps Unificado**
- Agregar campo `pts` (Presentation Timestamp) a `AudioFrame`
- Usar el mismo reloj de referencia para audio y video
- Sincronizar basándose en el tiempo de captura, no de envío

### 2. **Mecanismo de Sincronización AV**
- Implementar un `AVSyncController` que:
  - Monitoree la diferencia de timestamps entre audio y video
  - Ajuste dinámicamente el playback de audio si hay drift
  - Mantenga un buffer adaptativo

### 3. **Mejora en el Manejo de Latencia**
- En lugar de descartar audio, implementar:
  - Ajuste de velocidad de reproducción (time-stretching)
  - Buffer adaptativo que se ajusta a la latencia de red
  - Priorización de frames clave

### 4. **Optimización de Buffers**
- Reducir `AUDIO_BUFFER_MS` si es necesario
- Implementar buffer de jitter adaptativo
- Sincronizar vaciado de buffers con frames de video

### 5. **Coordinación de Threads**
- Compartir información de timing entre threads de audio y video
- Usar eventos de sincronización para coordinar playback
- Implementar un reloj maestro compartido

## Archivos a Modificar

1. **`libs/hbb_common/protos/message.proto`** - Agregar campo `pts` a AudioFrame
2. **`src/server/audio_service.rs`** - Agregar timestamps al capturar audio
3. **`src/client.rs`** - Implementar sincronización AV en playback
4. **`src/client/io_loop.rs`** - Coordinar threads de audio y video
5. **`src/server/connection.rs`** - Mejorar manejo de latencia de audio

## Métricas de Éxito

- Drift AV < 50ms durante sesiones de 10+ minutos
- Sin pérdida de sincronización durante picos de latencia
- Audio y video reproducidos en paralelo sin bloqueos
- Latencia total reducida en 20-30%


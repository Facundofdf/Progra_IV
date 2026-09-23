# Changelog de la refactorización (Fase 1)

Resumen de todo lo que se agregó, modificó y corrigió sobre el proyecto
original, organizado para poder explicarlo en la defensa oral. La consigna
completa y los temas del parcial están en `docs/` (o donde los hayan
guardado); acá solo se lista qué cambió y por qué.

## 1. Temas del programa que faltaban y ahora están cubiertos

| Tema | Dónde se implementó |
|---|---|
| **Observables** | `SupabaseService.escucharButacasEnTiempoReal()` — devuelve un `Observable<string[]>` conectado a Supabase Realtime (canal sobre la tabla `entradas`). Se consume con `.subscribe()` en `MapaButacasComponent` y se corta en `ngOnDestroy` con `.unsubscribe()`. |
| **Input() / Output()** | Se extrajo `ButacaComponent` (`features/compra/MapaButacasComponent/butaca/`), un componente hijo "tonto" que recibe `@Input() butaca` / `@Input() seleccionada` y emite `@Output() click`. |
| **Signal Forms** | El formulario de cupones (`admin-cupones`) se migró de Reactive Forms a una implementación de Signal Forms en `core/signal-forms/` (ver sección 4 para la justificación de por qué es propia y no el paquete experimental de Angular). |
| **Pipe personalizado** | `shared/pipes/duracion.pipe.ts` (`duracionAmigable`), usado en el detalle de película para mostrar "2h 8min" en vez de un número pelado de minutos. |
| **Directiva personalizada** | `shared/directives/auto-focus.directive.ts` (`appAutoFocus`), aplicada al input de email del login. |
| **CanActivate (guard nuevo)** | `authGuard` en `core/guards/roles.guard.ts`, aplicado a `/perfil` (antes esa ruta no tenía ningún guard). |
| **Ciclo de vida (AfterViewInit / afterNextRender)** | `AdminMetricasComponent` dejó de usar `setTimeout(100ms)` para esperar que el `<canvas>` se dibuje; ahora usa `afterNextRender()`. También se agregó `ngOnDestroy` para destruir las instancias de Chart.js (antes quedaban vivas en memoria al navegar a otra sección). |
| **PWA / Service Worker** | `@angular/service-worker` agregado al proyecto, `ngsw-config.json`, `manifest.webmanifest` + íconos, y `provideServiceWorker()` en `app.config.ts` (activo solo en producción). |

## 2. Funcionalidad de la consigna que faltaba y se agregó

- **Restricción de edad al comprar**: `MapaButacasComponent` ahora calcula la edad del usuario logueado (`core/utils/edad.util.ts`) contra la restricción de la película y bloquea la selección de butacas si no cumple o si no hay sesión iniciada. Se muestra un aviso explícito.
- **Cupón con edad mínima**: `pago.component.ts` ahora valida la edad real del comprador contra `cupon.edad_minima` antes de aplicar el descuento (antes cualquiera podía usar el cupón de "+50").
- **Log de auditoría real**: se agregaron los tres casos puntuales que pide la consigna:
  - `CREAR_FUNCION` en `crearFuncionAutomaticamente()`.
  - `EDITAR_PRECIO` en `actualizarPelicula()` (solo si el precio realmente cambió).
  - `VALIDAR_QR` en `validarEntradaPorCodigo()`.
- **Validador de QR (Empleados)**: `ValidadorComponent` estaba vacío (scaffold default de Angular) y ahora está completamente implementado, con una "cámara" simulada (según lo acordado, sin librería real de lectura de QR) y validación manual con código de respaldo. Marca la compra como `usada` para que un mismo código no sirva dos veces.
- **Alertas de estreno reales**: el botón "🔔 Avisarme" del Home solo hacía un `alert()` de mentira. Ahora inserta de verdad en `alertas_estrenos` (`SupabaseService.crearAlerta` / `eliminarAlerta`).
- **Reseñas de usuarios no registrados**: la consigna pide que cualquiera pueda reseñar, registrado o no. Se agregó un formulario de reseña en el detalle de película (visible para todos), y `agregarResena()` ahora acepta `perfil_id = null`. Se agregó `alter table resenas alter column perfil_id drop not null` en el SQL de migración.
- **Método de pago real**: el checkout mostraba un formulario de tarjeta fijo sin selector y sin guardar nada. Ahora hay un selector (tarjeta / MercadoPago / efectivo) y `procesarCompra()` guarda el valor real en la columna `metodo_pago` (que antes ni siquiera existía en la base — se agregó en el SQL).
- **`en_preventa` conectado al admin**: el campo existía en la base pero el formulario de películas nunca lo seteaba. Ahora se deriva automáticamente de `estado === 'preventa'` al guardar.

## 3. Bugs corregidos

- **Choque de horarios con duración incorrecta**: `crearFuncionAutomaticamente()` asumía un bloqueo fijo de 180 minutos para TODAS las funciones existentes al chequear superposición de horarios. Ahora usa la duración real de cada película (+30 min de limpieza), igual que para la función nueva. Esto podía generar tanto falsos choques (películas cortas) como choques no detectados (películas largas).
- **`obtenerVentas()` contra columnas inexistentes**: la query pedía `total` y `created_at`, pero la tabla real tiene `total_pagado` y `fecha_compra`. Se corrigió la query y el template de `admin-ventas`.
- **Ruta `/perfil` sin protección**: cualquiera podía entrar a `/perfil` sin sesión y ver una pantalla vacía. Ahora tiene `authGuard`, que redirige a `/login?redirectTo=...` y el login vuelve a esa misma ruta después de autenticar.
- **Claves de Supabase hardcodeadas**: se movieron a `src/environments/environment.ts` / `environment.development.ts`, con el `fileReplacements` correspondiente en `angular.json`.
- **Acceso al cliente Supabase por "hack"**: `mis-cosas.component.ts` accedía a `this.supabase['supabase']` (bypaseando el encapsulamiento) para borrar una alerta. Ahora usa el método público `eliminarAlerta()`.

## 4. Nota sobre Signal Forms

Angular tiene una propuesta **experimental** de formularios basados en
Signals (paquete `@angular/forms/signals`), que todavía cambia de versión
en versión y no está estabilizada. Para no atar la entrega a una API que
puede no compilar según la versión exacta de Angular que se instale,
`core/signal-forms/signal-forms.ts` implementa una versión reducida y
estable que expone **exactamente los mismos conceptos** que pide el
programa: `signal()`, `form()`, `[formField]`, `value()`, `valid()` /
`invalid()` y `errors()`. Está documentado en el archivo para poder
explicarlo en la defensa: el día que el paquete oficial se estabilice, se
reemplaza este archivo por el import de Angular sin tocar los componentes
que lo usan (misma superficie de API).

## 5. Antes de correr el proyecto

1. Correr `npm install` dentro de `cine-app/` (agregamos `@angular/service-worker` al `package.json`).
2. Ejecutar el script `sql/001_ajustes_fase1.sql` en el SQL Editor de Supabase (agrega la columna `metodo_pago`, habilita Realtime sobre `entradas`, permite `perfil_id` nulo en `resenas`).
3. Revisar las políticas de RLS de Supabase (quedaron anotadas al final del mismo script SQL): hoy toda la seguridad de roles vive en los Guards de Angular, que corren en el cliente y no protegen la base contra alguien que llame directo a la API REST.
4. `ng build` no se pudo verificar en este entorno por no tener acceso a `npm install`/`ng` — probarlo en su máquina antes de la entrega, en especial la parte de Signal Forms.

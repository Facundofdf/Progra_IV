# CineApp 🎬

Aplicación web de venta de entradas de cine (TP de Programación IV), hecha
con **Angular 21 (standalone, sin NgModules) + Supabase** (Postgres, Auth,
Realtime).

> Para el detalle completo de qué se agregó/modificó en la última
> refactorización (y por qué), ver [`CHANGELOG.md`](../CHANGELOG.md) en la
> raíz del repo. Este README se enfoca en arquitectura y cómo correr el
> proyecto.

## Índice

- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Decisiones técnicas](#decisiones-técnicas)
- [Cómo correr el proyecto](#cómo-correr-el-proyecto)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Roles de usuario](#roles-de-usuario)
- [Temas del programa cubiertos](#temas-del-programa-cubiertos)
- [Limitaciones conocidas / pendientes](#limitaciones-conocidas--pendientes)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 21, componentes **standalone** (no se usan NgModules) |
| Estado | Angular **Signals** (`signal`, `computed`, `effect`) como modelo principal |
| Async / tiempo real | **RxJS Observables** para Supabase Realtime |
| Backend / DB | **Supabase** (Postgres + Row Level Security + Realtime + Auth) |
| Gráficos | Chart.js (panel de métricas del admin) |
| PWA | `@angular/service-worker` |
| Estilos | CSS plano por componente (sin framework de UI) |

## Arquitectura

La app está organizada por **features**, no por tipo de archivo, para que
cada pantalla sea fácil de ubicar y de cargar de forma perezosa:

```
src/app/
├── core/               # Todo lo transversal: servicios, guards, utils
│   ├── services/
│   │   └── supabase.service.ts   # Único punto de acceso a la DB/Auth/Realtime
│   ├── guards/
│   │   └── roles.guard.ts        # adminGuard, empleadoGuard, authGuard
│   ├── signal-forms/              # Signal Forms "propio" (ver más abajo)
│   └── utils/
│       └── edad.util.ts          # cálculo de edad / edad mínima requerida
├── shared/
│   ├── pipes/
│   │   └── duracion.pipe.ts      # pipe custom: minutos -> "2h 8min"
│   └── directives/
│       └── auto-focus.directive.ts
└── features/
    ├── public/         # Home, detalle de película (sin login)
    ├── auth/           # Login / registro
    ├── perfil/         # Mis compras, mis alertas, mis reseñas (requiere login)
    ├── compra/         # Mapa de butacas -> pago -> confirmación
    ├── empleados/      # Validador de QR
    └── admin/          # Películas, funciones, cupones, ventas, métricas
```

**Flujo principal (comprar una entrada):**

1. `HomeComponent` / `DetallePeliculaComponent` listan películas y funciones
   (datos públicos, sin login).
2. `MapaButacasComponent` carga las butacas de la función elegida y se
   suscribe a un `Observable<string[]>` (`escucharButacasEnTiempoReal`) que
   escucha cambios en tiempo real sobre la tabla `entradas` vía Supabase
   Realtime — si otra persona compra una butaca mientras el usuario está
   mirando el mapa, se actualiza sola. Cada butaca es un componente hijo
   (`ButacaComponent`) que se comunica con el padre por `@Input()`/`@Output()`.
3. `PagoComponent` valida cupones (incluida la edad mínima), permite elegir
   método de pago y confirma la compra, que genera **un solo código QR por
   compra completa** (todas las butacas + candy bar de esa transacción).
4. `ValidadorComponent` (rol Empleado) permite escanear (simulado) o tipear
   ese código para marcarlo como usado, mostrando qué butacas y qué candy
   bar corresponde entregar.

## Decisiones técnicas

Estas son las decisiones que vale la pena poder explicar en la defensa oral:

### 1. Todo standalone, sin NgModules
El proyecto no usa `NgModule` en ningún lado; cada componente declara sus
propios `imports`. Es el enfoque recomendado por Angular desde la v17 y
simplifica mucho el lazy loading (`loadComponent` en las rutas en vez de
`loadChildren` + módulo).

### 2. Signals como modelo de estado, Observables solo para streams async
Se usan **Signals** para todo el estado local de los componentes (listas,
formularios, flags de carga) porque el cambio se propaga automáticamente a
la vista sin `OnPush` manual ni `async pipe` en todos lados. Los
**Observables** se reservan para lo que son: flujos que emiten *a lo largo
del tiempo* desde una fuente externa — en este caso, el canal de Realtime
de Supabase. `MapaButacasComponent` se suscribe en `ngOnInit` y se
desuscribe explícitamente en `ngOnDestroy` para no dejar el canal abierto
al navegar a otra pantalla.

### 3. "Signal Forms" propio en vez del paquete experimental de Angular
Angular tiene una propuesta **experimental** de formularios basados en
Signals (`@angular/forms/signals`) que todavía cambia de versión en
versión y no está estabilizada. Para no atar la entrega a una API que
puede no compilar según la versión exacta de Angular instalada (y sin
acceso a verificarlo contra el registro de npm en este entorno de
desarrollo), `core/signal-forms/signal-forms.ts` implementa una versión
reducida y estable que expone los mismos conceptos que pide la materia:
`signal()`, `form()`, la directiva `[formField]`, `value()`, `valid()` /
`invalid()` y `errors()`. Se usa en el formulario de cupones
(`admin-cupones`). El día que el paquete oficial de Angular se
estabilice, alcanza con reemplazar este archivo por el import real sin
tocar los componentes que lo consumen, porque exponen la misma superficie
de API.

### 4. Un solo QR por compra (no uno por butaca)
Se decidió a propósito que el QR representa **la compra completa**: si un
grupo de 4 personas compra 4 butacas juntas, entran las 4 escaneando un
único código. Separar en QR individuales por butaca hubiese complicado la
validación sin agregar valor para el caso de uso real (grupos que van
juntos al cine).

### 5. Lectura de cámara simulada en el validador
El validador de QR (`ValidadorComponent`, rol Empleado) simula la lectura
de cámara con una animación y un timeout, en vez de integrar una librería
real de lectura de códigos QR (por ejemplo `zxing` o la Barcode Detection
API del navegador). La decisión fue explícita para no sumar una
dependencia externa más y mantener el foco en la lógica de negocio
(validar contra la base, marcar como usado, mostrar qué entregar). El
input manual del código siempre está disponible como alternativa /
respaldo, y ejerce exactamente la misma lógica de validación
(`validarEntradaPorCodigo`) que usaría un escaneo real.

### 6. Auditoría con `logs_auditoria`
Ciertas acciones sensibles (crear función, editar precio de una película,
validar un QR) quedan registradas en la tabla `logs_auditoria` con
`accion`, `entidad`, `perfil_id` y `detalles`, para poder mostrar
trazabilidad en la defensa oral.

### 7. Variables de entorno para las claves de Supabase
La URL y la clave anon de Supabase viven en `src/environments/` (con
`fileReplacements` en `angular.json`) en vez de hardcodeadas dentro de
`supabase.service.ts`, siguiendo la práctica estándar de Angular para
separar configuración de código.

## Cómo correr el proyecto

```bash
cd cine-app
npm install
ng serve
```

Antes de correrlo hace falta:

1. **Variables de entorno**: completar `src/environments/environment.ts` y
   `environment.development.ts` con la URL y la clave `anon` del proyecto
   de Supabase.
2. **Migración SQL**: ejecutar `sql/001_ajustes_fase1.sql` (dentro de esta
   misma carpeta `cine-app/`) en el SQL Editor de Supabase. Agrega la
   columna `metodo_pago`, habilita Realtime sobre la tabla `entradas`,
   permite `perfil_id` nulo en `resenas` (reseñas anónimas) y deja
   comentada una guía de políticas de RLS.
3. **RLS**: revisar/activar las políticas de Row Level Security en
   Supabase — hoy la seguridad de roles (admin/empleado/cliente) vive en
   los Guards de Angular, que corren en el cliente y no protegen la base
   de datos contra alguien que llame directo a la API REST de Supabase.

## Estructura de carpetas

Ver el árbol en la sección [Arquitectura](#arquitectura).

## Roles de usuario

| Rol | Puede |
|---|---|
| Visitante (sin cuenta) | Ver cartelera, ver detalle de película, dejar una reseña |
| Cliente (logueado) | Todo lo anterior + comprar entradas, ver historial de compras, activar alertas de estreno |
| Empleado | Validar QR de entradas en la puerta del cine |
| Admin | ABM de películas / funciones / cupones, ver ventas y métricas |

## Temas del programa cubiertos

| Tema | Dónde |
|---|---|
| Componentes standalone | Todo el proyecto |
| Lazy loading de rutas | `app.routes.ts` (`loadComponent` en cada ruta de feature) |
| Servicios + Inyección de dependencias | `SupabaseService` (`providedIn: 'root'`) |
| Guards (`CanActivate`) | `adminGuard`, `empleadoGuard`, `authGuard` en `core/guards/roles.guard.ts` |
| Ciclos de vida (`OnInit`, `OnDestroy`, `AfterViewInit`, `afterNextRender`) | `MapaButacasComponent`, `AdminMetricasComponent`, `AutoFocusDirective` |
| Observables + RxJS | `SupabaseService.escucharButacasEnTiempoReal()` |
| `@Input()` / `@Output()` | `ButacaComponent` |
| Formularios (Template-driven, Reactive y Signal Forms) | Login/registro (template-driven), y `admin-cupones` (Signal Forms propio) |
| Pipe personalizado | `shared/pipes/duracion.pipe.ts` |
| Directiva personalizada | `shared/directives/auto-focus.directive.ts` |
| PWA / Service Worker | `ngsw-config.json`, `manifest.webmanifest`, `provideServiceWorker()` |

Más detalle línea por línea en [`CHANGELOG.md`](../CHANGELOG.md).

## Limitaciones conocidas / pendientes

- **RLS de Supabase**: no está configurado en este repo (solo documentado
  como guía comentada en el SQL). Toda la seguridad de roles hoy depende
  de los Guards de Angular, que son del lado del cliente.
- **Tests automatizados**: el proyecto no tiene specs (`*.spec.ts`)
  escritos.
- **`ng build` de producción**: no se pudo verificar en el entorno donde
  se hizo esta última tanda de cambios (sin acceso a instalar
  dependencias/CLI). Correrlo antes de la entrega final, especialmente la
  parte de Signal Forms y el service worker.
- **Deploy**: falta publicar la app en una URL pública (Vercel, Netlify,
  GitHub Pages, etc.), requisito de la consigna.
- **Expiración automática de preventa**: la consigna menciona que la
  preventa debería cerrarse sola una cantidad de días antes del estreno;
  hoy `en_preventa` se setea manualmente desde el panel de admin.

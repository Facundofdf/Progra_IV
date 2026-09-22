import { Routes } from '@angular/router';
import { adminGuard, empleadoGuard } from './core/guards/roles.guard';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout.component';

export const routes: Routes = [
  // --- Rutas Públicas ---
  { 
    path: '', 
    loadComponent: () => import('./features/public/HomeComponent/home.component').then(m => m.HomeComponent)
  },
  { 
    path: 'comprar', 
    loadComponent: () => import('./features/compra/MapaButacasComponent/mapa-butacas.component').then(m => m.MapaButacasComponent)
  },
  { 
    path: 'comprar/candy', 
    loadComponent: () => import('./features/compra/seleccion-candy/seleccion-candy.component').then(m => m.SeleccionCandyComponent)
  },
  { 
    path: 'comprar/pago', 
    loadComponent: () => import('./features/compra/pago/pago.component').then(m => m.PagoComponent)
  },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'pelicula/:id', // <-- El :id es dinámico
    loadComponent: () => import('./features/public/detalle-pelicula/detalle-pelicula.component').then(m => m.DetallePeliculaComponent)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil-layout/perfil-layout.component').then(m => m.PerfilLayoutComponent),
    children: [
      { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
      { 
        path: 'peliculas', 
        loadComponent: () => import('./features/perfil/mis-peliculas/mis-peliculas.component').then(m => m.MisPeliculasComponent) 
      },
      { 
        path: 'cosas', 
        loadComponent: () => import('./features/perfil/mis-cosas/mis-cosas.component').then(m => m.MisCosasComponent) 
      }
    ]
  },

  // --- Rutas Protegidas (Admin) ---
  { 
    path: 'admin', 
    component: AdminLayoutComponent, 
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
      { 
        path: 'peliculas', 
        loadComponent: () => import('./features/admin/admin-peliculas/admin-peliculas.component').then(m => m.AdminPeliculasComponent)
      },
      { 
        path: 'generos', 
        loadComponent: () => import('./features/admin/admin-generos/admin-generos.component').then(m => m.AdminGenerosComponent)
      },
      { 
        path: 'candy', 
        loadComponent: () => import('./features/admin/admin-candy/admin-candy.component').then(m => m.AdminCandyComponent)
      },
      { 
        path: 'ventas', 
        loadComponent: () => import('./features/admin/admin-ventas/admin-ventas.component').then(m => m.AdminVentasComponent)
      },
      { 
        path: 'metricas', 
        loadComponent: () => import('./features/admin/admin-metricas/admin-metricas.component').then(m => m.AdminMetricasComponent)
      },
      { 
        path: 'logs', 
        loadComponent: () => import('./features/admin/admin-logs/admin-logs.component').then(m => m.AdminLogsComponent)
      },
      { 
        path: 'funciones', 
        loadComponent: () => import('./features/admin/admin-funciones/admin-funciones.component').then(m => m.AdminFuncionesComponent)
      },
      { 
        path: 'cupones', 
        loadComponent: () => import('./features/admin/admin-cupones/admin-cupones.component').then(m => m.AdminCuponesComponent)
      },
      { 
        path: 'fidelizacion', 
        loadComponent: () => import('./features/admin/admin-fidelizacion/admin-fidelizacion.component').then(m => m.AdminFidelizacionComponent)
      }
    ]
  },

  // --- Rutas Protegidas (Empleado) ---
  { 
    path: 'empleados/validar', 
    loadComponent: () => import('./features/empleados/ValidadorComponent/validador.component').then(m => m.ValidadorComponent),
    canActivate: [empleadoGuard] // El patovica del empleado
  },

  // --- Ruta Comodín (SIEMPRE VA AL FINAL) ---
  // Si el usuario escribe cualquier cosa como /pepito, lo manda al inicio
  { path: '**', redirectTo: '', pathMatch: 'full'}
];
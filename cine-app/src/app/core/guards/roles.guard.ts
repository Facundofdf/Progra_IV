import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service'; 

// Guard para proteger el Panel de Administración
export const adminGuard: CanActivateFn = async (route, state) => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const rol = await supabase.getRolActual();

    if (rol === 'admin') {
        return true; // Deja pasar
    } else {
        router.navigate(['/']); // Lo patea al inicio
        return false;
    }
};

// Guard genérico: solo exige que haya una sesión iniciada (cualquier rol).
// Lo usamos en /perfil, porque antes esa ruta no tenía NINGÚN guard y un
// usuario no logueado podía entrar directo por URL y ver una pantalla vacía.
export const authGuard: CanActivateFn = async (route, state) => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const usuario = await supabase.getUsuarioActual();

    if (usuario) {
        return true;
    } else {
        // Lo mandamos a loguearse, guardando a dónde quería ir para
        // poder redirigirlo de vuelta después de iniciar sesión.
        router.navigate(['/login'], { queryParams: { redirectTo: state.url } });
        return false;
    }
};

// Guard para proteger la vista de escaneo de QR (Empleados)
export const empleadoGuard: CanActivateFn = async (route, state) => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const rol = await supabase.getRolActual();

    // Dejamos pasar al empleado, y por lógica, el admin también debería poder escanear
    if (rol === 'empleado' || rol === 'admin') {
        return true;
    } else {
        router.navigate(['/']);
        return false;
    }
};
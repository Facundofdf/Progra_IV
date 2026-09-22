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
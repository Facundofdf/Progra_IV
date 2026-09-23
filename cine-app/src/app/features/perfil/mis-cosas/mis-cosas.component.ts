import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-mis-cosas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './mis-cosas.component.html',
    styleUrls: ['./mis-cosas.component.css']
})
export class MisCosasComponent implements OnInit {
    private supabase = inject(SupabaseService);

    perfil = signal<any>(null);
    historialCanjes = signal<any[]>([]);
    alertas = signal<any[]>([]);
    cargando = signal(true);

    async ngOnInit() {
        await this.cargarDatos();
    }

    async cargarDatos() {
        const user = await this.supabase.getUsuarioActual();
        if (!user) return;

        try {
            this.cargando.set(true);
            const [perfilData, canjesData, alertasData] = await Promise.all([
                this.supabase.obtenerPerfil(user.id),
                this.supabase.obtenerHistorialCanjes(user.id),
                this.supabase.obtenerMisAlertas(user.id)
            ]);

            this.perfil.set(perfilData);
            this.historialCanjes.set(canjesData);
            this.alertas.set(alertasData);
        } catch (error) {
            console.error('Error cargando Mis Cosas:', error);
        } finally {
            this.cargando.set(false);
        }
    }

    async eliminarAlerta(alertaId: string) {
        if (confirm('¿Dejar de seguir esta película?')) {
            try {
                await this.supabase.eliminarAlerta(alertaId);
                await this.cargarDatos(); // Recargamos para actualizar la lista
            } catch (error) {
                console.error('Error al eliminar alerta:', error);
            }
        }
    }
}
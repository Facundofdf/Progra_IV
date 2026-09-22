import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-admin-ventas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-ventas.component.html',
    styleUrls: ['./admin-ventas.component.css']
})
export class AdminVentasComponent implements OnInit {
    private supabase = inject(SupabaseService);

    ventasCargadas = signal<any[]>([]);
    cargando = signal(true);

    async ngOnInit() {
        await this.cargarHistorialVentas();
    }

    async cargarHistorialVentas() {
        try {
            this.cargando.set(true);
            const data = await this.supabase.obtenerVentas();
            this.ventasCargadas.set(data || []);
        } catch (error: any) {
            console.error('Error al cargar ventas:', error.message);
        } finally {
            this.cargando.set(false);
        }
    }
}
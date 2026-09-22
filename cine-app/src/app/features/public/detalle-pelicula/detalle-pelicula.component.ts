import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-detalle-pelicula',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './detalle-pelicula.component.html',
    styleUrls: ['./detalle-pelicula.component.css']
})
export class DetallePeliculaComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private supabase = inject(SupabaseService);

    pelicula = signal<any>(null);
    funciones = signal<any[]>([]);
    resenas = signal<any[]>([]);
    cargando = signal(true);

    filtroFecha = signal('');
    filtroFormato = signal('');
    filtroIdioma = signal('');

    formatosDisponibles = computed(() => [...new Set(this.funciones().map(f => f.formato))]);
    idiomasDisponibles = computed(() => [...new Set(this.funciones().map(f => f.idioma))]);

    funcionesFiltradas = computed(() => {
        let lista = this.funciones();

        if (this.filtroFecha()) {
            lista = lista.filter(f => f.fecha_hora.startsWith(this.filtroFecha()));
        }
        if (this.filtroFormato()) {
            lista = lista.filter(f => f.formato === this.filtroFormato());
        }
        if (this.filtroIdioma()) {
            lista = lista.filter(f => f.idioma === this.filtroIdioma());
        }
        return lista;
    });

    async ngOnInit() {
        // Leemos el ID de la película desde la URL
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            await this.cargarDetalles(id);
        }
    }

    async cargarDetalles(id: string) {
        try {
            this.cargando.set(true);
            const [peliData, funcData, resData] = await Promise.all([
                this.supabase.obtenerPeliculaPorId(id),
                this.supabase.obtenerFuncionesPorPelicula(id),
                this.supabase.obtenerResenasPorPelicula(id)
            ]);

            this.pelicula.set(peliData);
            this.funciones.set(funcData);
            this.resenas.set(resData);
        } catch (error) {
            console.error('Error al cargar la película:', error);
        } finally {
            this.cargando.set(false);
        }
    }

    calcularPromedio() {
        const r = this.resenas();
        if (r.length === 0) return 0;
        const suma = r.reduce((acc, curr) => acc + curr.puntuacion, 0);
        return (suma / r.length).toFixed(1);
    }
}
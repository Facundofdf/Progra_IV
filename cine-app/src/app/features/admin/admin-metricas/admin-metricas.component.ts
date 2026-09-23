import { Component, inject, signal, OnInit, OnDestroy, Injector, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto'; // Magia pura: importa la librería original completa
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule], // Ya no necesitamos importar directivas raras
    templateUrl: './admin-metricas.component.html',
    styleUrls: ['./admin-metricas.component.css']
})
export class AdminMetricasComponent implements OnInit, OnDestroy {
    private supabase = inject(SupabaseService);
    private injector = inject(Injector);

    cargando = signal(true);
    ingresosHoy = signal(0);
    entradasHoy = signal(0);
    rangoPeliculas = signal<'semana' | 'mes'>('semana');

    // Variables para guardar los gráficos nativos y poder destruirlos si se actualizan
    graficoPeliculasInstancia: any;
    graficoCandyInstancia: any;

    async ngOnInit() {
        await this.cargarTarjetasDiarias();

        // Apagamos el "cargando" para que Angular renderice los <canvas> en el HTML
        this.cargando.set(false);

        // Antes se usaba un setTimeout(100ms) "a ojo" para esperar que
        // Angular termine de dibujar el <canvas> antes de instanciar
        // Chart.js. afterNextRender() es el hook correcto para esto: se
        // ejecuta justo después de que el próximo ciclo de renderizado
        // (el que dibuja el canvas, disparado por cargando.set(false))
        // termine, sin depender de un tiempo arbitrario.
        afterNextRender(() => {
            this.cargarGraficoPeliculas();
            this.cargarGraficoCandy();
        }, { injector: this.injector });
    }

    ngOnDestroy(): void {
        // Antes los gráficos solo se destruían si el propio componente los
        // volvía a redibujar; si el usuario simplemente navegaba a otra
        // sección del panel, las instancias de Chart.js quedaban vivas en
        // memoria (memory leak). Las destruimos acá explícitamente.
        this.graficoPeliculasInstancia?.destroy();
        this.graficoCandyInstancia?.destroy();
    }

    async cargarTarjetasDiarias() {
        try {
            const datos = await this.supabase.obtenerMetricasDiarias();
            let sumaTotal = 0;
            let totalEntradas = 0;

            datos.forEach(compra => {
                sumaTotal += compra.total_pagado;
                if (compra.entradas) totalEntradas += compra.entradas.length;
            });

            this.ingresosHoy.set(sumaTotal);
            this.entradasHoy.set(totalEntradas);
        } catch (error) {
            console.error('Error cargando tarjetas:', error);
        }
    }

    async cargarGraficoPeliculas() {
        try {
            const dias = this.rangoPeliculas() === 'semana' ? 7 : 30;
            const entradas = await this.supabase.obtenerVentasPeliculas(dias);
            const ventasPorTitulo: { [key: string]: number } = {};

            entradas.forEach(entrada => {
                const funcion = entrada.funciones as any;
                const titulo = funcion?.peliculas?.titulo;
                if (titulo) {
                    ventasPorTitulo[titulo] = (ventasPorTitulo[titulo] || 0) + 1;
                }
            });

            const ordenado = Object.entries(ventasPorTitulo).sort((a, b) => b[1] - a[1]);
            const labels = ordenado.map(i => i[0]);
            const data = ordenado.map(i => i[1]);

            // Si el gráfico ya existía, lo destruimos para redibujarlo limpio
            if (this.graficoPeliculasInstancia) {
                this.graficoPeliculasInstancia.destroy();
            }

            // Buscamos el Canvas en el HTML directamente
            const canvas = document.getElementById('canvasPelis') as HTMLCanvasElement;
            if (!canvas) return;

            this.graficoPeliculasInstancia = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{ data: data, backgroundColor: '#fbc02d', borderRadius: 6 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Entradas Vendidas por Película', color: '#fff' } },
                    scales: { y: { beginAtZero: true, ticks: { color: '#aaa', stepSize: 1 } }, x: { ticks: { color: '#ccc' } } }
                }
            });

        } catch (error) {
            console.error('Error cargando gráfico de películas:', error);
        }
    }

    async cargarGraficoCandy() {
        try {
            const candyHistorico = await this.supabase.obtenerRankingCandy();
            const ventasPorProducto: { [key: string]: number } = {};

            candyHistorico.forEach(c => {
                const prod = c.productos_candy as any;
                const nombre = prod?.nombre;
                if (nombre) {
                    ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + c.cantidad;
                }
            });

            const ordenado = Object.entries(ventasPorProducto).sort((a, b) => b[1] - a[1]);
            const labels = ordenado.map(i => i[0]);
            const data = ordenado.map(i => i[1]);

            if (this.graficoCandyInstancia) {
                this.graficoCandyInstancia.destroy();
            }

            const canvas = document.getElementById('canvasCandy') as HTMLCanvasElement;
            if (!canvas) return;

            this.graficoCandyInstancia = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{ data: data, backgroundColor: ['#4CAF50', '#2196F3', '#f44336', '#ff9800', '#9c27b0', '#795548', '#00bcd4'], borderWidth: 0 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#fff' } }, title: { display: true, text: 'Productos Candy Bar Más Vendidos', color: '#fff' } }
                }
            });
        } catch (error) {
            console.error('Error cargando gráfico de candy:', error);
        }
    }

    onRangoChange() {
        this.cargarGraficoPeliculas();
    }
}

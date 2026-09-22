import { Component, inject, signal, OnInit } from '@angular/core';
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
export class AdminMetricasComponent implements OnInit {
    private supabase = inject(SupabaseService);

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

        // Le damos a Angular 100 milisegundos para dibujar el HTML antes de inyectar los gráficos
        setTimeout(() => {
            this.cargarGraficoPeliculas();
            this.cargarGraficoCandy();
        }, 100);
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
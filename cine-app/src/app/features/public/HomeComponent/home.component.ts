import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para el [(ngModel)] del buscador
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private supabase = inject(SupabaseService);

  // Estados base
  todasLasPeliculas = signal<any[]>([]);
  generosDisponibles = signal<any[]>([]);
  
  // Variables atadas al buscador del HTML
  textoBusqueda = signal('');
  generoSeleccionado = signal('');

  // 1. Las 3 "Más vendidas" (Por ahora tomamos 3 disponibles al azar o las primeras 3)
  peliculasDestacadas = computed(() => {
    return this.todasLasPeliculas()
      .filter(p => p.estado === 'disponible' || p.estado === 'preventa')
      .slice(0, 3);
  });

  // 2. Cartelera Reactiva (Se filtra automáticamente cuando el usuario escribe o elige un género)
  peliculasCartelera = computed(() => {
    let pelis = this.todasLasPeliculas().filter(p => p.estado === 'disponible' || p.estado === 'preventa');

    // Filtro por texto
    if (this.textoBusqueda().trim() !== '') {
      pelis = pelis.filter(p => p.titulo.toLowerCase().includes(this.textoBusqueda().toLowerCase()));
    }

    // Filtro por género
    if (this.generoSeleccionado() !== '') {
      pelis = pelis.filter(p => 
        p.peliculas_generos?.some((pg: any) => pg.generos.id === this.generoSeleccionado())
      );
    }

    return pelis;
  });

  // 3. Próximamente
  peliculasProximamente = computed(() => {
    return this.todasLasPeliculas().filter(p => p.estado === 'proximamente');
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const pelis = await this.supabase.obtenerPeliculas();
      const gens = await this.supabase.obtenerGeneros();
      this.todasLasPeliculas.set(pelis || []);
      this.generosDisponibles.set(gens || []);
    } catch (error) {
      console.error('Error al cargar la home:', error);
    }
  }

  async activarAlerta(pelicula: any) {
    const usuario = await this.supabase.getUsuarioActual();

    if (!usuario) {
      alert('Necesitás una cuenta para activar alertas. ¡Registrate o iniciá sesión!');
      return;
    }

    try {
      await this.supabase.crearAlerta(pelicula.id, usuario.id);
      alert(`¡Listo! Te vamos a avisar cuando se abra la venta de "${pelicula.titulo}". Podés ver todas tus alertas en Mi Perfil > Mis Cosas.`);
    } catch (error: any) {
      alert('No pudimos activar la alerta: ' + error.message);
    }
  }
}
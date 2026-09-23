import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.css'
})
export class AdminPeliculasComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);

  // Listados para mostrar en pantalla
  generosDisponibles = signal<any[]>([]);
  peliculasCargadas = signal<any[]>([]);
  
  mensaje = signal({ texto: '', tipo: '' });
  peliculaEditandoId = signal<string | null>(null);

  // Formulario de Películas
  peliculaForm = this.fb.group({
    titulo: ['', Validators.required],
    sinopsis: [''],
    duracion_minutos: [null as number | null, [Validators.required, Validators.min(1)]],
    imagen_poster: [''],
    restriccion_edad: ['ATP', Validators.required],
    generos: [[] as string[], Validators.required],
    estado: ['disponible', Validators.required],
    precio_base: [0, [Validators.required, Validators.min(0)]],
    precio_preventa: [0, [Validators.min(0)]],
    fecha_estreno: ['']
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    // Necesitamos los géneros para el select múltiple, y las películas para la lista
    const generos = await this.supabase.obtenerGeneros();
    const peliculas = await this.supabase.obtenerPeliculas();
    this.generosDisponibles.set(generos || []);
    this.peliculasCargadas.set(peliculas || []);
  }

  async guardarPelicula() {
    if (this.peliculaForm.invalid) {
      this.peliculaForm.markAllAsTouched();
      this.mostrarMensaje('⚠️ Faltan completar campos obligatorios o seleccionar un género.', 'error');
      return;
    }
    
    const { generos, ...datosPeliculaForm } = this.peliculaForm.value;
    const editId = this.peliculaEditandoId();

    // "en_preventa" antes nunca se seteaba desde este formulario (solo
    // existía el campo "estado"), así que la columna quedaba huérfana.
    // La derivamos automáticamente del estado elegido.
    const datosPelicula = {
      ...datosPeliculaForm,
      en_preventa: datosPeliculaForm.estado === 'preventa'
    };

    try {
      let peliculaId = '';
      const adminActual = await this.supabase.getUsuarioActual();

      if (editId) {
        await this.supabase.actualizarPelicula(editId, datosPelicula, adminActual?.id ?? null);
        peliculaId = editId;
        this.mostrarMensaje('Película actualizada con éxito', 'exito');
      } else {
        const nuevaPelicula = await this.supabase.crearPelicula(datosPelicula);
        peliculaId = nuevaPelicula.id;
        this.mostrarMensaje('Película agregada con éxito', 'exito');
      }

      await this.supabase.actualizarGenerosPelicula(peliculaId, generos as string[]);

      this.cancelarEdicion();
      await this.cargarDatos();
    } catch (error: any) {
      this.mostrarMensaje('Error al guardar: ' + error.message, 'error');
    }
  }

  editarPelicula(pelicula: any) {
    this.peliculaEditandoId.set(pelicula.id);
    
    const generosIds = pelicula.peliculas_generos 
      ? pelicula.peliculas_generos.map((pg: any) => pg.generos.id) 
      : [];

    this.peliculaForm.patchValue({
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis,
      duracion_minutos: pelicula.duracion_minutos,
      imagen_poster: pelicula.imagen_poster,
      restriccion_edad: pelicula.restriccion_edad,
      generos: generosIds, 
      estado: pelicula.estado || 'disponible',
      precio_base: pelicula.precio_base,
      precio_preventa: pelicula.precio_preventa,
      fecha_estreno: pelicula.fecha_estreno
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.peliculaEditandoId.set(null);
    this.peliculaForm.reset({ 
      duracion_minutos: null, 
      restriccion_edad: 'ATP', 
      generos: [], 
      estado: 'disponible',
      precio_base: 0,
      precio_preventa: 0
    });
  }

  async eliminarPelicula(id: string) {
    if(confirm('¿Seguro que deseas eliminar esta película?')) {
      try {
        await this.supabase.eliminarPelicula(id);
        this.mostrarMensaje('Película eliminada', 'exito');
        await this.cargarDatos();
      } catch (error: any) {
        this.mostrarMensaje('Error al eliminar', 'error');
      }
    }
  }

  mostrarMensaje(texto: string, tipo: string) {
    this.mensaje.set({ texto, tipo });
    setTimeout(() => this.mensaje.set({ texto: '', tipo: '' }), 4000);
  }
}
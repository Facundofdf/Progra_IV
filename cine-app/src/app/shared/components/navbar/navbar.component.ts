import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  usuario = this.supabase.usuarioActual;
  rolUsuario = signal<string>('visitante'); // Guardamos el rol actual

  constructor() {
    // Angular detecta automáticamente cuando 'usuario' cambia y ejecuta esto
    effect(() => {
      const user = this.usuario();
      if (user) {
        this.supabase.getRolActual().then(rol => this.rolUsuario.set(rol));
      } else {
        this.rolUsuario.set('visitante');
      }
    });
  }

  async logout() {
    await this.supabase.cerrarSesion();
    this.router.navigate(['/']);
  }

  buscarPelicula(termino: string) {
    if (termino.trim() !== '') {
      this.router.navigate(['/'], { queryParams: { q: termino } });
    } else {
      this.router.navigate(['/']);
    }
  }
}
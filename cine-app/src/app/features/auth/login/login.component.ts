import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  esRegistro = signal(false);
  mensajeError = signal('');
  cargando = signal(false);

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombre: [''],
    apellido: [''],
    fecha_nacimiento: [''],
    tipo_sangre: [''],
    color_ojos: [''],
    dias_vacaciones: [0]
  });

  toggleModo() {
    this.esRegistro.set(!this.esRegistro());
    this.mensajeError.set('');
  }

  async procesarFormulario() {
    const { email, password, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones } = this.authForm.value;

    if (this.esRegistro()) {
      if (!nombre || !apellido || !fecha_nacimiento || !tipo_sangre || !color_ojos) {
        this.mensajeError.set('Para registrarte debes completar todos los datos del formulario.');
        return;
      }
    } else {
      if (!email || !password) {
        this.mensajeError.set('Ingresá email y contraseña válidos.');
        return;
      }
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      if (this.esRegistro()) {
        const authData = await this.supabase.registrarUsuario(email!, password!);
        
        if (authData?.user?.id) {
          await this.supabase.actualizarDatosPerfil(authData.user.id, {
            email: email,
            nombre,
            apellido,
            fecha_nacimiento,
            tipo_sangre,
            color_ojos,
            dias_vacaciones,
            rol: 'cliente'
          });
        }
      }
      
      await this.supabase.iniciarSesion(email!, password!);
      
      const rol = await this.supabase.getRolActual();
      if (rol === 'admin') {
        this.router.navigate(['/admin']);
      } else if (rol === 'empleado') {
        this.router.navigate(['/empleados/validar']);
      } else {
        this.router.navigate(['/']); 
      }

    } catch (error: any) {
      this.mensajeError.set(error.message || 'Error de autenticación');
    } finally {
      this.cargando.set(false);
    }
  }
}
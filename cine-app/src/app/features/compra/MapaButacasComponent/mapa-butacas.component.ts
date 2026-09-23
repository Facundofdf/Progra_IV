import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CompraService } from '../../../core/services/compra.service';
import { ButacaComponent, ButacaDTO } from './butaca/butaca.component';
import { calcularEdad, edadMinimaRequerida } from '../../../core/utils/edad.util';

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  imports: [CommonModule, ButacaComponent],
  templateUrl: './mapa-butacas.component.html',
  styleUrls: ['./mapa-butacas.component.css']
})
export class MapaButacasComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private compraService = inject(CompraService);

  funcionInfo = signal<any>(null);
  filasMapa = signal<any[]>([]);
  asientosOcupados = signal<string[]>([]);
  asientosSeleccionados = signal<ButacaDTO[]>([]);
  mostrarModalDecision = signal(false);

  cargando = signal(true);
  precioBase = 0;

  // --- Restricción de edad (requisito puntual del TP) ---
  restriccionActiva = signal(false); // true si la película pide +13 o +18
  edadRequerida = signal(0);
  puedeComprar = signal(true); // false si el usuario logueado no cumple la edad

  // Suscripción al Observable de butacas en tiempo real. La guardamos
  // para poder cortarla nosotros mismos en ngOnDestroy (si no, el canal
  // de Supabase Realtime queda escuchando para siempre).
  private butacasSub?: Subscription;

  async ngOnInit() {
    // Leemos el ID de la función que viene por la URL (?funcion=...)
    const funcionId = this.route.snapshot.queryParamMap.get('funcion');
    if (!funcionId) {
      this.router.navigate(['/']); // Si entró sin elegir función, lo mandamos al home
      return;
    }

    try {
      this.cargando.set(true);
      const info = await this.supabase.obtenerFuncionConPrecios(funcionId);
      this.funcionInfo.set(info);

      // El precio es preventa si la peli está en preventa, sino el base
      this.precioBase = info.peliculas.en_preventa ? info.peliculas.precio_preventa : info.peliculas.precio_base;

      // --- Chequeo de restricción de edad ---
      await this.chequearRestriccionEdad(info.peliculas.restriccion_edad);

      // Ya no pedimos las butacas ocupadas una sola vez: nos suscribimos
      // al Observable que las mantiene actualizadas en tiempo real.
      this.butacasSub = this.supabase.escucharButacasEnTiempoReal(funcionId).subscribe({
        next: (codigos) => {
          this.asientosOcupados.set(codigos);
          this.sincronizarOcupacionEnMapa(codigos);
          // Si mientras elegía butacas alguien le "ganó" una que ya tenía
          // seleccionada, la sacamos de su selección para no dejarlo pagar
          // por una butaca que ya no está disponible.
          this.asientosSeleccionados.set(
            this.asientosSeleccionados().filter(b => !codigos.includes(b.codigo))
          );
        },
        error: (err) => console.error('Error escuchando butacas en tiempo real:', err),
      });

      this.generarMapa();
    } catch (error) {
      console.error('Error al cargar la sala', error);
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy(): void {
    // Cortamos la suscripción -> dispara el teardown del Observable, que
    // a su vez cierra el canal de Realtime en Supabase.
    this.butacasSub?.unsubscribe();
  }

  /** Compara la edad del usuario logueado contra la restricción de la película. */
  private async chequearRestriccionEdad(restriccionEdad: string | null) {
    const minima = edadMinimaRequerida(restriccionEdad);
    this.edadRequerida.set(minima);
    this.restriccionActiva.set(minima > 0);

    if (minima === 0) {
      this.puedeComprar.set(true);
      return;
    }

    const usuario = await this.supabase.getUsuarioActual();

    if (!usuario) {
      // No podemos verificar la edad de alguien que no está logueado,
      // así que para películas con restricción exigimos iniciar sesión.
      this.puedeComprar.set(false);
      return;
    }

    const perfil = await this.supabase.obtenerPerfil(usuario.id);
    const edad = calcularEdad(perfil?.fecha_nacimiento);

    this.puedeComprar.set(edad !== null && edad >= minima);
  }

  generarMapa() {
    const letras = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
    const mapaGenerado = [];

    for (let letra of letras) {
      // Reglas del TP
      const esAccesible = (letra === 'J' || letra === 'K');
      const esVIP = (letra === 'R' || letra === 'S' || letra === 'T');

      // Cantidades según la fila
      const cantIzq = esAccesible ? 2 : 4;
      const cantCentro = esAccesible ? 10 : 20;
      const cantDer = esAccesible ? 2 : 4;

      let numeroButaca = 1;

      // Generamos bloque Izquierdo
      const izq = this.crearBloque(letra, cantIzq, numeroButaca, esAccesible, esVIP);
      numeroButaca += cantIzq;

      // Generamos bloque Central
      const centro = this.crearBloque(letra, cantCentro, numeroButaca, esAccesible, esVIP);
      numeroButaca += cantCentro;

      // Generamos bloque Derecho
      const der = this.crearBloque(letra, cantDer, numeroButaca, esAccesible, esVIP);

      mapaGenerado.push({ letra, bloques: { izq, centro, der }, esAccesible, esVIP });
    }

    this.filasMapa.set(mapaGenerado);
  }

  crearBloque(letra: string, cantidad: number, numeroInicial: number, esAccesible: boolean, esVIP: boolean): ButacaDTO[] {
    const bloque: ButacaDTO[] = [];
    for (let i = 0; i < cantidad; i++) {
      const codigo = `${letra}${numeroInicial + i}`;
      bloque.push({
        codigo: codigo,
        tipo: esAccesible ? 'accesible' : (esVIP ? 'vip' : 'normal'),
        ocupada: this.asientosOcupados().includes(codigo),
        precioAdicional: esVIP ? (this.precioBase * 0.3) : 0 // VIP cuesta 30% más (podes cambiarlo)
      });
    }
    return bloque;
  }

  /** Cuando llega una actualización en vivo, recorremos el mapa ya dibujado y actualizamos solo el flag "ocupada" de cada butaca. */
  private sincronizarOcupacionEnMapa(codigosOcupados: string[]) {
    this.filasMapa.set(
      this.filasMapa().map(fila => ({
        ...fila,
        bloques: {
          izq: fila.bloques.izq.map((b: ButacaDTO) => ({ ...b, ocupada: codigosOcupados.includes(b.codigo) })),
          centro: fila.bloques.centro.map((b: ButacaDTO) => ({ ...b, ocupada: codigosOcupados.includes(b.codigo) })),
          der: fila.bloques.der.map((b: ButacaDTO) => ({ ...b, ocupada: codigosOcupados.includes(b.codigo) })),
        }
      }))
    );
  }

  // Ahora recibe el evento (click) del componente hijo <app-butaca>
  toggleSeleccion(butaca: ButacaDTO) {
    if (butaca.ocupada) return;
    if (!this.puedeComprar()) return; // Restricción de edad: ni dejamos elegir butaca

    const seleccionados = this.asientosSeleccionados();
    const index = seleccionados.findIndex(b => b.codigo === butaca.codigo);

    if (index > -1) {
      // Si ya estaba, lo quitamos
      const copia = [...seleccionados];
      copia.splice(index, 1);
      this.asientosSeleccionados.set(copia);
    } else {
      // Si no estaba, lo agregamos (Máximo 10 por compra por seguridad)
      if (seleccionados.length >= 10) {
        alert('Podés comprar un máximo de 10 entradas a la vez.');
        return;
      }
      this.asientosSeleccionados.set([...seleccionados, butaca]);
    }
  }

  estaSeleccionada(codigo: string) {
    return this.asientosSeleccionados().some(b => b.codigo === codigo);
  }

  calcularTotal() {
    return this.asientosSeleccionados().reduce((total, butaca) => {
      return total + this.precioBase + butaca.precioAdicional;
    }, 0);
  }

  continuarCompra() {
    if (this.asientosSeleccionados().length === 0) return;
    if (!this.puedeComprar()) return;

    const tieneVip = this.asientosSeleccionados().some(b => b.tipo === 'vip');
    if (tieneVip) {
      if(!confirm('Tenés entradas VIP seleccionadas (Tienen un costo mayor). ¿Deseás continuar?')) return;
    }

    // Guardamos en la memoria temporal (CompraService)
    this.compraService.guardarButacas(
      this.funcionInfo(),
      this.asientosSeleccionados(),
      this.calcularTotal()
    );

    // EN LUGAR DE RUTEAR, ABRIMOS EL MODAL QUE PIDE EL TP
    this.mostrarModalDecision.set(true);
  }

  // Nuevos métodos para los botones del modal
  irAlCandyBar() {
    this.mostrarModalDecision.set(false);
    this.router.navigate(['/comprar/candy']);
  }

  irDirectoAPagar() {
    this.mostrarModalDecision.set(false);
    // Como no pasó por el candy, guardamos candy vacío
    this.compraService.guardarCandy([], 0);
    this.router.navigate(['/comprar/pago']);
  }

  irALogin() {
    this.router.navigate(['/login'], { queryParams: { redirectTo: this.router.url } });
  }
}

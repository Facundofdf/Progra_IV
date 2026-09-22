import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CompraService } from '../../../core/services/compra.service';

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-butacas.component.html',
  styleUrls: ['./mapa-butacas.component.css']
})
export class MapaButacasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private compraService = inject(CompraService);

  funcionInfo = signal<any>(null);
  filasMapa = signal<any[]>([]);
  asientosOcupados = signal<string[]>([]);
  asientosSeleccionados = signal<any[]>([]);
  mostrarModalDecision = signal(false);
  
  cargando = signal(true);
  precioBase = 0;

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

      const ocupadas = await this.supabase.obtenerButacasOcupadas(funcionId);
      this.asientosOcupados.set(ocupadas);

      this.generarMapa();
    } catch (error) {
      console.error('Error al cargar la sala', error);
    } finally {
      this.cargando.set(false);
    }
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

  crearBloque(letra: string, cantidad: number, numeroInicial: number, esAccesible: boolean, esVIP: boolean) {
    const bloque = [];
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

  toggleSeleccion(butaca: any) {
    if (butaca.ocupada) return;

    const seleccionados = this.asientosSeleccionados();
    const index = seleccionados.findIndex(b => b.codigo === butaca.codigo);

    if (index > -1) {
      // Si ya estaba, lo quitamos
      seleccionados.splice(index, 1);
      this.asientosSeleccionados.set([...seleccionados]);
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
}
import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CompraService {
    // Guardamos todo el estado de la compra acá
    reserva = signal({
        funcion: null as any,
        butacas: [] as any[],
        totalButacas: 0,
        candy: [] as any[],
        totalCandy: 0
    });

    guardarButacas(funcion: any, butacas: any[], total: number) {
        this.reserva.update(r => ({ ...r, funcion, butacas, totalButacas: total }));
    }

    guardarCandy(itemsCandy: any[], total: number) {
        this.reserva.update(r => ({ ...r, candy: itemsCandy, totalCandy: total }));
    }

    obtenerTotalFinal() {
        return this.reserva().totalButacas + this.reserva().totalCandy;
    }

    limpiarReserva() {
        this.reserva.set({ funcion: null, butacas: [], totalButacas: 0, candy: [], totalCandy: 0 });
    }
}
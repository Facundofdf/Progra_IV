import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})

export class SupabaseService {
  private supabase: SupabaseClient;
  usuarioActual = signal<any>(null);

  constructor() {
    const supabaseUrl = 'https://qbcspocdnhaubiapddhd.supabase.co';
    const supabaseKey = 'sb_publishable_uvySuR-Hb_8mVYytJg7g_g_kFPNMLBk';
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.usuarioActual.set(session?.user ?? null);
    });
  }

// AUTENTICACIÓN Y ROLES
  // ==========================================

  // Obtiene el usuario autenticado actualmente
  async getUsuarioActual() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  // Obtiene el perfil completo (con rol, puntos, crédito, etc.)
  async obtenerPerfil(userId: string) {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error al obtener perfil:', error.message);
      return null;
    }
    return data;
  }

  // Método rápido para saber qué rol tiene la persona que está navegando
  async getRolActual(): Promise<'admin' | 'empleado' | 'cliente' | 'visitante'> {
    const user = await this.getUsuarioActual();
    if (!user) return 'visitante';
    
    const perfil = await this.obtenerPerfil(user.id);
    return perfil?.rol || 'cliente';
  }

  async registrarUsuario(email: string, contrasena: string, metadata?: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email: email,
      password: contrasena,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    return data;
  }

  // Inicia sesión con email y contraseña
  async iniciarSesion(email: string, contrasena: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: contrasena
    });
    if (error) throw error;
    return data;
  }

  // Cierra la sesión activa
  async cerrarSesion() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async obtenerPeliculas() {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select(`
        *,
        peliculas_generos (
          generos ( id, nombre )
        )
      `);
    if (error) throw error;
    return data;
  }

  async obtenerGeneros() {
    const { data, error } = await this.supabase.from('generos').select('*');
    if (error) throw error;
    return data;
  }

  // Inserta la película y devuelve el registro creado
  async crearPelicula(peliculaData: any) {
    const { data, error } = await this.supabase
      .from('peliculas')
      .insert(peliculaData)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  // Elimina una película (y sus relaciones en cascada)
  async eliminarPelicula(id: string) {
    const { error } = await this.supabase.from('peliculas').delete().eq('id', id);
    if (error) throw error;
  }

    async actualizarPelicula(id: string, peliculaData: any) {
    const { data, error } = await this.supabase
      .from('peliculas')
      .update(peliculaData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Crea un nuevo género
  async crearGenero(nombre: string) {
    const { data, error } = await this.supabase.from('generos').insert({ nombre }).select().single();
    if (error) throw error;
    return data;
  }

  // Elimina un género
  async eliminarGenero(id: string) {
    const { error } = await this.supabase.from('generos').delete().eq('id', id);
    if (error) throw error;
  }

  async actualizarGenerosPelicula(peliculaId: string, generoIds: string[]) {
    // 1. Borramos cualquier género anterior asignado a esta película
    await this.supabase
      .from('peliculas_generos')
      .delete()
      .eq('pelicula_id', peliculaId);
    
    // 2. Si hay géneros nuevos, armamos los pares y los guardamos
    if (generoIds && generoIds.length > 0) {
      const vinculaciones = generoIds.map(generoId => ({
        pelicula_id: peliculaId,
        genero_id: generoId
      }));
      
      const { error } = await this.supabase
        .from('peliculas_generos')
        .insert(vinculaciones);
        
      if (error) throw error;
    }
  }

  // Actualiza los datos extra del perfil después del registro
// Actualiza o CREA los datos extra del perfil después del registro
  async actualizarDatosPerfil(userId: string, datos: any) {
    // Le inyectamos el ID de usuario generado por la autenticación
    const perfilCompleto = {
      id: userId,
      ...datos
    };

    const { error } = await this.supabase
      .from('perfiles')
      .upsert(perfilCompleto); // Upsert fuerza la creación del registro
    
    if (error) throw error;
  }

  async obtenerProductosCandy() {
    const{data, error} = await this.supabase
    .from('productos_candy')
    .select('*')
    .order('categoria', {ascending: true})
    .order('nombre', {ascending: true})

    if (error) throw error;
    return data;
  }

  async crearProductoCandy(productoData: any) {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .insert(productoData)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async actualizarProductoCandy(id: string, productoData: any) {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .update(productoData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async eliminarProductoCandy(id: string) {
    const { error } = await this.supabase
      .from('productos_candy')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async obtenerVentas() {
    // Traemos las compras y cruzamos con el perfil para obtener nombre y email
    const { data, error } = await this.supabase
      .from('compras')
      .select(`
        id,
        total,
        metodo_pago,
        created_at,
        perfiles ( nombre, apellido, email )
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  }

  async obtenerLogs() {
    const { data, error } = await this.supabase
      .from('logs_auditoria')
      .select(`
        id,
        accion,
        entidad,
        detalles,
        created_at,
        perfiles!fk_logs_perfil ( nombre, apellido, email )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) throw error;
    return data;
  }

  // ==========================================
  // SALAS Y FUNCIONES (Horarios)
  // ==========================================

  async obtenerFunciones() {
    const { data, error } = await this.supabase
      .from('funciones')
      .select(`
        id, fecha_hora, formato, idioma,
        peliculas ( titulo, duracion_minutos, imagen_poster ),
        salas ( nombre )
      `)
      .order('fecha_hora', { ascending: true });
      
    if (error) throw error;
    return data;
  }

  // MAGIA: ASIGNACIÓN AUTOMÁTICA DE SALAS
  async crearFuncionAutomaticamente(datosFuncion: any) {
    // 1. Calculamos cuánto dura la película que queremos proyectar (+30 min de limpieza)
    const { data: peli } = await this.supabase
      .from('peliculas')
      .select('duracion_minutos')
      .eq('id', datosFuncion.pelicula_id)
      .single();
      
    const duracionPeli = peli?.duracion_minutos || 120;
    const tiempoBloqueoMs = (duracionPeli + 30) * 60000; // a milisegundos

    const inicioDeseado = new Date(datosFuncion.fecha_hora).getTime();
    const finDeseado = inicioDeseado + tiempoBloqueoMs;

    // 2. Traemos todas las funciones que existen y todas las salas
    const { data: funcionesExistentes } = await this.supabase.from('funciones').select('*');
    const { data: salas } = await this.supabase.from('salas').select('*');

    // 3. Buscamos una sala libre
    const salaDisponible = salas?.find(sala => {
      // Verificamos si la sala tiene alguna función que "choque" con nuestro horario
      const tieneChoque = funcionesExistentes?.some(func => {
        if (func.sala_id !== sala.id) return false; // Es de otra sala, no importa
        
        // Asumimos un bloqueo estándar de 3 horas por cada función existente para estar seguros
        const inicioExistente = new Date(func.fecha_hora).getTime();
        const finExistente = inicioExistente + (180 * 60000); 

        // Fórmula matemática de superposición de rangos de tiempo
        return (inicioDeseado < finExistente && finDeseado > inicioExistente);
      });
      return !tieneChoque; // Si no choca, esta es la sala elegida
    });

    if (!salaDisponible) {
      throw new Error('No hay salas disponibles en ese horario. Por favor, elegí otra hora.');
    }

    // 4. Creamos la función asignando automáticamente la sala libre
    datosFuncion.sala_id = salaDisponible.id;
    
    const { error } = await this.supabase.from('funciones').insert(datosFuncion);
    if (error) throw error;
  }

  async eliminarFuncion(id: string) {
    const { error } = await this.supabase.from('funciones').delete().eq('id', id);
    if (error) throw error;
  }

  // ==========================================
  // CUPONES DE DESCUENTO
  // ==========================================

  async obtenerCupones() {
    const { data, error } = await this.supabase
      .from('cupones')
      .select('*')
      .order('porcentaje_descuento', { ascending: false });
      
    if (error) throw error;
    return data;
  }

  async crearCupon(cuponData: any) {
    // Forzamos mayúsculas para evitar errores del usuario al tipearlo
    cuponData.codigo = cuponData.codigo.toUpperCase().trim();
    
    // Si la edad mínima es 0 o está vacía, la mandamos como null (sin restricción)
    if (!cuponData.edad_minima) {
      cuponData.edad_minima = null;
    }

    const { error } = await this.supabase.from('cupones').insert(cuponData);
    if (error) throw error;
  }

  async eliminarCupon(id: string) {
    const { error } = await this.supabase.from('cupones').delete().eq('id', id);
    if (error) throw error;
  }

  // ==========================================
  // PROGRAMA DE FIDELIZACIÓN
  // ==========================================

  async obtenerConfigFidelizacion() {
    const { data, error } = await this.supabase
      .from('config_fidelizacion')
      .select('*')
      .eq('id', 1)
      .single();
      
    if (error) throw error;
    return data;
  }

  async actualizarConfigFidelizacion(datos: any) {
    const { error } = await this.supabase
      .from('config_fidelizacion')
      .update(datos)
      .eq('id', 1);
      
    if (error) throw error;
  }

  // ==========================================
  // VISTA CLIENTE: DETALLE Y COMPRA
  // ==========================================

  async obtenerPeliculaPorId(id: string) {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select(`
        *,
        peliculas_generos ( generos ( nombre ) )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async obtenerFuncionesPorPelicula(peliculaId: string) {
    const hoy = new Date().toISOString(); // Solo traemos funciones de hoy en adelante
    const { data, error } = await this.supabase
      .from('funciones')
      .select(`
        id, fecha_hora, formato, idioma,
        salas ( nombre )
      `)
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora', hoy)
      .order('fecha_hora', { ascending: true });
    if (error) throw error;
    return data;
  }

  async obtenerResenasPorPelicula(peliculaId: string) {
    const { data, error } = await this.supabase
      .from('resenas')
      .select(`
        puntuacion, comentario, fecha,
        perfiles ( nombre, apellido )
      `)
      .eq('pelicula_id', peliculaId)
      .order('fecha', { ascending: false });
    if (error && error.code !== '42P01') throw error; // Ignoramos si la tabla no existe aún
    return data || [];
  }

  // ==========================================
  // COMPRA Y BUTACAS
  // ==========================================

  async obtenerFuncionConPrecios(funcionId: string) {
    const { data, error } = await this.supabase
      .from('funciones')
      .select(`
        *,
        peliculas ( titulo, precio_base, precio_preventa, en_preventa ),
        salas ( nombre )
      `)
      .eq('id', funcionId)
      .single();
    if (error) throw error;
    return data;
  }

  async obtenerButacasOcupadas(funcionId: string) {
    const { data, error } = await this.supabase
      .from('entradas')
      .select('codigo_butaca')
      .eq('funcion_id', funcionId);
    
    if (error && error.code !== '42P01') throw error;
    // Devolvemos solo un array simple con los códigos ['A1', 'A2', 'C5', ...]
    return data ? data.map(e => e.codigo_butaca) : [];
  }

  // ==========================================
  // PAGOS Y GENERACIÓN DE TICKET
  // ==========================================

  async validarCupon(codigo: string) {
    const { data, error } = await this.supabase
      .from('cupones')
      .select('*')
      .eq('codigo', codigo.toUpperCase().trim())
      .single();
      
    if (error) return null; // Si no lo encuentra, devuelve null
    return data;
  }

  async procesarCompra(
    reserva: any, 
    totalPagado: number, 
    usuarioId: string | null = null,
    puntosGastados: number = 0,
    creditoGastado: number = 0,
    recompensasCanjeadas: string = ''
  ) {
    // 1. Generamos código único QR
    const codigoUnico = 'CINE-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // REDONDEAMOS EL TOTAL para evitar el Error 400 por decimales
    const totalRedondeado = Math.round(totalPagado);

    // 2. Creamos la Compra principal (Sacamos metodo_pago para evitar conflictos con la DB)
    const { data: compra, error: errorCompra } = await this.supabase
      .from('compras')
      .insert({
        perfil_id: usuarioId,
        codigo_qr: codigoUnico,
        estado_qr: 'valido',
        total_pagado: totalRedondeado,
        fecha_compra: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (errorCompra) {
      console.error('Error al insertar en compras:', errorCompra);
      throw errorCompra;
    }

    // 3. Guardamos las Entradas (Redondeando también el precio)
    const precioBase = reserva.funcion.peliculas.en_preventa ? reserva.funcion.peliculas.precio_preventa : reserva.funcion.peliculas.precio_base;
    const entradasInsert = reserva.butacas.map((b: any) => ({
      compra_id: compra.id,
      funcion_id: reserva.funcion.id,
      codigo_butaca: b.codigo,
      precio_pagado: Math.round(precioBase + b.precioAdicional)
    }));
    
    const { error: errorEntradas } = await this.supabase.from('entradas').insert(entradasInsert);
    if (errorEntradas) console.error('Error en entradas:', errorEntradas);

    // 4. Guardamos Candy Bar
    if (reserva.candy.length > 0) {
      const candyInsert = reserva.candy.map((c: any) => ({
        compra_id: compra.id,
        producto_candy_id: c.producto.id,
        cantidad: c.cantidad
      }));
      await this.supabase.from('compras_candy').insert(candyInsert);
    }

    // 5. ACTUALIZAMOS LA BILLETERA (Redondeando todo por seguridad)
    if (usuarioId) {
      const { data: perfil } = await this.supabase.from('perfiles').select('puntos, credito').eq('id', usuarioId).single();
      
      const puntosGanados = Math.floor(totalRedondeado); 
      const nuevosPuntos = Math.round((perfil?.puntos || 0) + puntosGanados - puntosGastados);
      const nuevoCredito = Math.round((perfil?.credito || 0) - creditoGastado);

      await this.supabase.from('perfiles').update({ puntos: nuevosPuntos, credito: nuevoCredito }).eq('id', usuarioId);

      // Historial de canjes
      if (puntosGastados > 0) {
        await this.supabase.from('historial_canjes').insert({
          perfil_id: usuarioId,
          recompensa_obtenida: recompensasCanjeadas,
          puntos_gastados: Math.round(puntosGastados),
          fecha: new Date().toISOString()
        });
      }
    }

    // 6. Log de auditoría
    if (usuarioId) {
      const { error: errorLog } = await this.supabase.from('logs_auditoria').insert({
        accion: 'NUEVA_COMPRA',
        entidad: 'compras',
        perfil_id: usuarioId,
        detalles: `Ticket ${codigoUnico} por $${totalRedondeado} (${reserva.butacas.length} butacas)`
      });
      
      // Si ahora falla, queremos saberlo, porque significa que hay un error real en el servidor
      if (errorLog) throw errorLog; 
    }

    return codigoUnico;
  }

  // ==========================================
  // PERFIL DEL CLIENTE (Mis Películas / Mis Cosas)
  // ==========================================

  async obtenerMisCompras(userId: string) {
    // Traemos las compras y las cruzamos con las entradas y funciones
    const { data, error } = await this.supabase
      .from('compras')
      .select(`
        id, total_pagado, fecha_compra,
        entradas (
          id,
          funciones (
            id, fecha_hora,
            peliculas ( id, titulo, imagen_poster )
          )
        )
      `)
      .eq('perfil_id', userId)
      .order('fecha_compra', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  async cancelarCompra(compraId: string, perfilId: string, montoADevolver: number) {
    // 1. Obtenemos el crédito actual del usuario
    const { data: perfil } = await this.supabase.from('perfiles').select('credito').eq('id', perfilId).single();
    const nuevoCredito = Number(perfil?.credito || 0) + Number(montoADevolver);

    // 2. Le sumamos el dinero como crédito a favor
    await this.supabase.from('perfiles').update({ credito: nuevoCredito }).eq('id', perfilId);

    // 3. Borramos la compra (al estar conectada en Cascada en la base, borra las entradas liberando las butacas)
    const { error } = await this.supabase.from('compras').delete().eq('id', compraId);
    if (error) throw error;
  }

  async agregarResena(peliculaId: string, userId: string, puntuacion: number, comentario: string) {
    const { error } = await this.supabase.from('resenas').insert({
      pelicula_id: peliculaId,
      perfil_id: userId,
      puntuacion: puntuacion,
      comentario: comentario,
      fecha: new Date().toISOString()
    });
    if (error) throw error;
  }

  async obtenerHistorialCanjes(perfilId: string) {
    const { data, error } = await this.supabase
      .from('historial_canjes')
      .select('*')
      .eq('perfil_id', perfilId)
      .order('fecha', { ascending: false });
      
    if (error && error.code !== '42P01') throw error;
    return data || [];
  }

  async obtenerMisAlertas(perfilId: string) {
    const { data, error } = await this.supabase
      .from('alertas_estrenos')
      .select(`
        id,
        peliculas ( titulo, fecha_estreno, imagen_poster )
      `)
      .eq('perfil_id', perfilId);
      
    if (error && error.code !== '42P01') throw error;
    return data || [];
  }

  // ==========================================
  // MÉTRICAS Y DASHBOARD (Panel Admin)
  // ==========================================

  // 1. Facturación y Entradas del día
  async obtenerMetricasDiarias() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Desde las 00:00 de hoy

    const { data, error } = await this.supabase
      .from('compras')
      .select(`
        total_pagado,
        entradas ( id )
      `)
      .gte('fecha_compra', hoy.toISOString());

    if (error) throw error;
    return data || [];
  }

  // 2. Gráfico de películas: Buscamos entradas y filtramos por la fecha de su compra
  async obtenerVentasPeliculas(diasAtras: number) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAtras);

    // El "!inner" es un truco avanzado de Supabase para obligarlo a filtrar usando la tabla cruzada
    const { data, error } = await this.supabase
      .from('entradas')
      .select(`
        id,
        funciones ( peliculas ( titulo ) ),
        compras!inner ( fecha_compra )
      `)
      .gte('compras.fecha_compra', fechaLimite.toISOString());

    if (error) throw error;
    return data || [];
  }

  // 3. Gráfico Candy Bar: Agrupamos todas las ventas históricas
  async obtenerRankingCandy() {
    const { data, error } = await this.supabase
      .from('compras_candy')
      .select(`
        cantidad,
        productos_candy ( nombre )
      `);

    if (error) throw error;
    return data || [];
  }
}
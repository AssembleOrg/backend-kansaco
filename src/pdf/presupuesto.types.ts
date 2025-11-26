export interface PresupuestoProducto {
  cantidad: number;
  nombre: string;
  presentacion: string;
  precioUnitario: number;
  subtotal: number;
}

export interface PresupuestoData {
  empresa: {
    nombre: string;
    cuit: string;
    localidad: string;
    telefono: string;
    email: string;
    logoUrl: string; // base64 data URL
  };
  presupuesto: {
    numero: string;
    fecha: string; // formato: 1/11/2025
  };
  cliente: {
    razonSocial: string;
    telefono: string;
    direccion: string;
    email: string;
    localidad: string;
  };
  productos: PresupuestoProducto[];
  condiciones: {
    formaPago: string;
    validezDias: number;
    notas: string;
  };
  totales: {
    subtotal: number;
    ivaPorcentaje: number;
    ivaMonto: number;
    total: number;
  };
}


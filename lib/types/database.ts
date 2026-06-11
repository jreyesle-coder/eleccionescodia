export type Rol = 'operador' | 'supervisor' | 'gerente' | 'presidente'

export type EstadoGestion =
  | 'pendiente'
  | 'en_proceso'
  | 'contactado'
  | 'no_comunicacion'
  | 'cerrado'

export type ResultadoLlamada =
  | 'efectiva_confirma'
  | 'efectiva_no_confirma'
  | 'no_contesta'
  | 'numero_equivocado'
  | 'volver_a_llamar'
  | 'rechaza'

export interface Profile {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
  created_at: string
}

/** Colegiado del padrón CODIA (tabla `padron`) */
export interface Colegiado {
  id: number
  codigo: string            // colegiatura única
  apellido: string
  nombre: string
  nombre_completo: string
  telefono: string | null
  celular: string | null
  cedula: string | null
  email: string | null
  regional: string | null
  provincia: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  universidad: string | null
  fecha_exequatur: string | null
  exequatur: string | null
  // Campos de gestión call center
  estado_gestion: EstadoGestion
  asignado_a: string | null
  bloqueado_hasta: string | null
  intentos_no_contesta: number
  created_at: string
}

/** @deprecated Alias de compatibilidad — usa Colegiado */
export type Miembro = Colegiado

export interface Llamada {
  id: number
  colegiado_id: number
  operador_id: string
  fecha_hora: string
  resultado: ResultadoLlamada
  confirma_plancha1: boolean
  notas: string | null
  callback_at: string | null
}

/* ── Catálogos ── */

export interface Regional {
  id: number
  nombre: string
}

export interface Provincia {
  id: number
  nombre: string
  regional_id: number | null
}

export interface Nucleo {
  id: number
  nombre: string
  provincia_id: number | null
}

export interface Carrera {
  id: number
  nombre: string
}

/* ── Deudas / votantes ── */

export interface DeudasVotante {
  nombre: string
  codigo: string
  telefono: string | null
  profesion: string | null
  monto: number | null
  contacto: string | null
  nucleo: string | null
  regional: string | null
}

/* ── Tipos de retorno para RPCs ── */

export interface PanelOperadorRow {
  operador_id: string
  nombre: string
  rol: string
  colegiado_activo: boolean
  /** @deprecated usar colegiado_activo */
  miembro_activo: boolean
  llamadas_total: number
  efectivas_total: number
  confirmados_p1_total: number
  no_contesta_total: number
  llamadas_hoy: number
  efectivas_hoy: number
  confirmados_p1_hoy: number
  no_contesta_hoy: number
  ultima_actividad: string | null
}

export interface HistorialOperadorRow {
  llamada_id: number
  fecha_hora: string
  colegiado_nombre: string
  /** @deprecated usar colegiado_nombre */
  miembro_nombre: string
  codigo: string
  resultado: ResultadoLlamada
  confirma_p1: boolean
  notas: string | null
}

export interface KpisGenerales {
  total_colegiados: number
  /** @deprecated usar total_colegiados */
  total_miembros: number
  pendientes: number
  en_proceso: number
  contactados: number
  no_comunicacion: number
  cerrados: number
  confirmados_p1: number
  tasa_confirmacion: number
  nuevos_integrantes: number
  pensionados: number
}


export interface RecuperacionRow {
  id: number
  codigo: string
  nombre_completo: string
  telefono: string | null
  celular: string | null
  intentos: number
  regional: string | null
  nucleo: string | null
}


export interface MetricaRegion {
  region: string
  total: number
  pendientes: number
  en_proceso: number
  contactados: number
  sin_comunicacion: number
  cerrados: number
  confirmados_plancha1: number
}

export interface PadronVivoRow {
  id: number
  regional: string
  provincia: string | null
  nucleo: string | null
  codigo: string
  nombre_completo: string
  telefono: string | null
  celular: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  estado_gestion: EstadoGestion
  asignado_a: string | null
  ultima_llamada: string | null
  ultimo_resultado: string | null
  ultimo_confirma: boolean | null
  ultima_nota: string | null
}

export interface LlamadaPresidente {
  id: number
  colegiado_id: number
  operador_id: string
  fecha_hora: string
  resultado: ResultadoLlamada
  confirma_plancha1: boolean
  notas: string | null
  operador?: { nombre: string } | null
}

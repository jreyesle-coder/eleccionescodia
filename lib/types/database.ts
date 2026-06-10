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

export interface Miembro {
  id: number
  matricula: string
  nombre: string
  vencimiento: string | null
  telefono: string | null
  segmento_montero: boolean
  telefono_revisar: boolean
  estado_gestion: EstadoGestion
  asignado_a: string | null
  bloqueado_hasta: string | null
  intentos_no_contesta: number
  lote_manual: boolean
  orden_manual: number | null
  created_at: string
}

export interface Llamada {
  id: number
  miembro_id: number
  operador_id: string
  fecha_hora: string
  resultado: ResultadoLlamada
  confirma_plancha1: boolean
  notas: string | null
  callback_at: string | null
}

export interface EncuestaDia {
  id: number
  miembro_id: number | null
  voto_confirmado: boolean
  plancha_declarada: string | null
  encuestador_id: string | null
  fecha_hora: string
}

/* ── Tipos de retorno para RPCs del Sprint 3 ── */

export interface PanelOperadorRow {
  operador_id: string
  nombre: string
  rol: string
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
  miembro_nombre: string
  matricula: string
  resultado: ResultadoLlamada
  confirma_p1: boolean
  notas: string | null
}

export interface KpisGenerales {
  total_miembros: number
  pendientes: number
  en_proceso: number
  contactados: number
  no_comunicacion: number
  cerrados: number
  confirmados_p1: number
  tasa_confirmacion: number
  montero_total: number
  montero_contactados: number
}

export interface RecuperacionRow {
  id: number
  matricula: string
  nombre: string
  telefono: string | null
  intentos: number
  telefono_revisar: boolean
}

export interface MonteroRow {
  id: number
  matricula: string
  nombre: string
  telefono: string | null
  estado: string
  confirmado_p1: boolean
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

export interface MetricaDistrito {
  distrito: string
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
  region: string
  distrito: string
  matricula: string
  nombre: string
  telefono: string | null
  estado_gestion: EstadoGestion
  asignado_a: string | null
  ultima_llamada: string | null
  ultimo_resultado: string | null
  ultimo_confirma: boolean | null
  ultima_nota: string | null
}

export interface LlamadaPresidente {
  id: number
  miembro_id: number
  operador_id: string
  fecha_hora: string
  resultado: ResultadoLlamada
  confirma_plancha1: boolean
  motivo: string | null
  notas: string | null
  operador?: { nombre: string } | null
}

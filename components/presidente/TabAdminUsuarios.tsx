'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLES = ['operador', 'supervisor', 'gerente', 'presidente', 'dirigente', 'colaborador', 'delegado', 'suplente']

const NUCLEOS = [
  'ARQUITECTOS',
  'INGENIEROS CIVILES',
  'INGENIEROS AGRONOMOS',
  'INGENIEROS ELECTROMECANICOS',
  'INGENIEROS QUIMICOS',
  'AGRIMENSORES',
]

const ROL_COLOR: Record<string, string> = {
  presidente: 'bg-yellow-100 text-yellow-800',
  gerente:    'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  dirigente:  'bg-green-100 text-green-800',
  colaborador:'bg-teal-100 text-teal-800',
  operador:   'bg-gray-100 text-gray-700',
  delegado:   'bg-orange-100 text-orange-800',
  suplente:   'bg-orange-50 text-orange-700',
  '—':        'bg-gray-50 text-gray-400',
}

interface UsuarioRow {
  user_id: string
  email: string
  nombre: string
  rol: string
  nucleo_asignado: string | null
  regional_asignada: string | null
  activo: boolean
  created_at: string
  last_sign_in_at: string | null
}

interface EditState {
  rol: string
  nucleo_asignado: string
  regional_asignada: string
  activo: boolean
}

const ZONA = 'America/Santo_Domingo'

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-DO', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function TabAdminUsuarios() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filtro, setFiltro]     = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [edit, setEdit]         = useState<EditState>({ rol: '', nucleo_asignado: '', regional_asignada: '', activo: true })
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    const { data, error } = await supabase.rpc('admin_listar_usuarios')
    if (error) { setError(`Error: ${error.message}`); setCargando(false); return }
    setUsuarios((data as UsuarioRow[]) ?? [])
    setCargando(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  function abrirEdicion(u: UsuarioRow) {
    setEditando(u.user_id)
    setEdit({
      rol: u.rol === '—' ? 'operador' : u.rol,
      nucleo_asignado: u.nucleo_asignado ?? '',
      regional_asignada: u.regional_asignada ?? '',
      activo: u.activo,
    })
    setGuardadoOk(null)
  }

  async function guardar(userId: string) {
    setGuardando(true)
    const { error } = await supabase.rpc('admin_actualizar_perfil', {
      p_user_id:           userId,
      p_rol:               edit.rol,
      p_nucleo_asignado:   edit.nucleo_asignado   || null,
      p_regional_asignada: edit.regional_asignada || null,
      p_activo:            edit.activo,
    })
    setGuardando(false)
    if (error) { setError(`No se pudo guardar: ${error.message}`); return }
    setGuardadoOk(userId)
    setEditando(null)
    setUsuarios(prev => prev.map(u =>
      u.user_id === userId
        ? { ...u, rol: edit.rol, nucleo_asignado: edit.nucleo_asignado || null, regional_asignada: edit.regional_asignada || null, activo: edit.activo }
        : u
    ))
  }

  const filtrados = usuarios.filter(u => {
    const q = filtro.toLowerCase()
    return !q || u.email.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q)
  })

  const necesitaAsignacion = edit.rol === 'gerente' || edit.rol === 'dirigente' || edit.rol === 'colaborador'

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando usuarios…</p>

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-marino)' }}>Administración de Usuarios</h2>
          <p className="text-xs text-gray-400 mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={cargar} className="text-xs text-blue-600 hover:underline">↻ Actualizar</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
        />
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {filtrados.map(u => (
          <div
            key={u.user_id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              !u.activo ? 'opacity-60' : ''
            } ${guardadoOk === u.user_id ? 'border-green-300' : 'border-gray-100'}`}
          >
            {/* Fila principal */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar inicial */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: u.activo ? 'var(--color-marino)' : '#9ca3af' }}
                >
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {/* Descripción de acceso debajo del email */}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {u.rol === 'gerente' && u.nucleo_asignado && `CDN ${u.nucleo_asignado}`}
                    {u.rol === 'gerente' && !u.nucleo_asignado && 'Padrón general / Call Center completo'}
                    {u.rol === 'dirigente' && u.regional_asignada && `Dirigente — ${u.regional_asignada}`}
                    {u.rol === 'dirigente' && !u.regional_asignada && 'Dirigente — sin regional asignada'}
                    {u.rol === 'colaborador' && u.regional_asignada && `Colaborador — ${u.regional_asignada}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ROL_COLOR[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                  {u.rol === 'gerente' && u.nucleo_asignado ? `gerente · ${u.nucleo_asignado}` : u.rol}
                </span>
                {u.regional_asignada && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium hidden sm:inline">
                    {u.regional_asignada.replace('REGIONAL ', '')}
                  </span>
                )}
                {!u.activo && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Inactivo</span>
                )}
                <button
                  onClick={() => editando === u.user_id ? setEditando(null) : abrirEdicion(u)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors"
                  style={editando === u.user_id
                    ? { borderColor: '#d1d5db', color: '#6b7280' }
                    : { borderColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
                >
                  {editando === u.user_id ? 'Cancelar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Meta info */}
            <div className="px-5 pb-2 flex gap-4 text-[11px] text-gray-400 border-t border-gray-50">
              <span>Creado: {fmtFecha(u.created_at)}</span>
              <span>Último acceso: {fmtFecha(u.last_sign_in_at)}</span>
            </div>

            {/* Panel de edición */}
            {editando === u.user_id && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Rol */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Rol</label>
                    <select
                      value={edit.rol}
                      onChange={e => setEdit(prev => ({ ...prev, rol: e.target.value, nucleo_asignado: '', regional_asignada: '' }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                      style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Activo */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Estado</label>
                    <div className="flex gap-2 pt-1">
                      {[true, false].map(v => (
                        <button
                          key={String(v)}
                          onClick={() => setEdit(prev => ({ ...prev, activo: v }))}
                          className={`flex-1 text-sm py-2 rounded-xl font-semibold border transition-colors ${
                            edit.activo === v
                              ? v ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}
                        >
                          {v ? 'Activo' : 'Inactivo'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Núcleo (gerente) */}
                  {(edit.rol === 'gerente') && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Núcleo asignado</label>
                      <select
                        value={edit.nucleo_asignado}
                        onChange={e => setEdit(prev => ({ ...prev, nucleo_asignado: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                      >
                        <option value="">— Sin núcleo (Gerente Call Center) —</option>
                        {NUCLEOS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Regional (dirigente / colaborador) */}
                  {(edit.rol === 'dirigente' || edit.rol === 'colaborador') && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Regional asignada</label>
                      <input
                        type="text"
                        value={edit.regional_asignada}
                        onChange={e => setEdit(prev => ({ ...prev, regional_asignada: e.target.value }))}
                        placeholder="Ej: REGIONAL ESTE (LA ROMANA)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                      />
                    </div>
                  )}
                </div>

                {necesitaAsignacion && !edit.nucleo_asignado && !edit.regional_asignada && edit.rol === 'gerente' && (
                  <p className="text-xs text-blue-600">Sin núcleo = acceso completo al call center.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => guardar(u.user_id)}
                    disabled={guardando}
                    className="text-sm font-bold px-5 py-2 rounded-xl text-white disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: 'var(--color-marino)' }}
                  >
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="text-sm font-semibold px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {guardadoOk === u.user_id && (
              <div className="px-5 py-2 bg-green-50 border-t border-green-100">
                <p className="text-xs text-green-700 font-semibold">✓ Cambios guardados correctamente.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

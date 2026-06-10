import Marca from './marca'
import CerrarSesion from './CerrarSesion'

interface AppHeaderProps {
  nombreUsuario: string
  rol?: string
}

export default function AppHeader({ nombreUsuario, rol }: AppHeaderProps) {
  return (
    <header className="bg-white sticky top-0 z-10 shadow-sm">
      <div className="px-5 py-3 flex items-center justify-between">
        <Marca />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-marino)' }}>
              {nombreUsuario}
            </p>
            {rol && (
              <p className="text-xs leading-tight capitalize" style={{ color: 'var(--color-real)' }}>
                {rol}
              </p>
            )}
          </div>
          <CerrarSesion />
        </div>
      </div>
      {/* Franja de acento: azul marino + dorado */}
      <div className="flex h-[3px]">
        <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
        <div className="w-16" style={{ backgroundColor: 'var(--color-dorado)' }} />
        <div className="w-4" style={{ backgroundColor: 'var(--color-plancha)' }} />
      </div>
    </header>
  )
}

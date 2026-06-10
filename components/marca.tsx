export default function Marca() {
  return (
    <div className="flex items-center gap-3">
      {/* Logo directamente sobre fondo blanco, sin recuadro extra */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-codia.png"
        alt="CODIA"
        className="h-11 w-auto object-contain"
      />
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-sm tracking-wide leading-tight" style={{ color: 'var(--color-marino)' }}>
          CODIA · Call Center
        </span>
        {/* Pildora PLANCHA #1: rojo con borde dorado */}
        <span
          className="inline-block text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full border"
          style={{
            backgroundColor: 'var(--color-plancha)',
            borderColor: 'var(--color-dorado)',
            letterSpacing: '0.04em',
          }}
        >
          PLANCHA #1
        </span>
      </div>
    </div>
  )
}

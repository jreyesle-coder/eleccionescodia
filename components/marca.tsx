export default function Marca() {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/presidente.jpg"
        alt="George Richardson"
        className="h-11 w-auto object-contain rounded-full"
      />
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-sm tracking-wide leading-tight" style={{ color: 'var(--color-marino)' }}>
          George Richardson
        </span>
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

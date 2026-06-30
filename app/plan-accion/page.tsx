import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vota este próximo 17 de Julio — George Richardson | CODIA 2026',
  description: 'Vota este próximo 17 de Julio. Conoce el Plan de Acción de George Richardson para el CODIA 2026-2027.',
  openGraph: {
    title: 'Vota este próximo 17 de Julio',
    description: 'Por un CODIA más fuerte, moderno y transparente. Conoce el Plan de Acción del Arq. Richardson.',
    images: [
      {
        url: 'https://eleccionescodia.rogapps.com/vota-17-julio.jpg',
        width: 919,
        height: 1455,
        alt: 'Vota este viernes 17 de julio — Arq. Richardson Presidente CODIA',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vota este próximo 17 de Julio',
    description: 'Por un CODIA más fuerte, moderno y transparente. Conoce el Plan de Acción del Arq. Richardson.',
    images: ['https://eleccionescodia.rogapps.com/vota-17-julio.jpg'],
  },
}

const EJES = [
  {
    num: '1',
    titulo: 'Defensa del Ejercicio Profesional y Dignificación Laboral',
    items: [
      'Escala Salarial Profesional',
      'Reformulación de la Ley 83-24',
      'Cumplimiento de la Ley 6232 y carrera administrativa para profesionales',
      'Observatorio Nacional del Ejercicio Profesional',
      'Plataforma Digital de Denuncias',
      'Fortalecimiento jurídico y fiscalizador',
      'Fortalecimiento de los capítulos profesionales del CODIA',
      'Participación del CODIA en los programas y mesas de trabajo de las Sectoriales del gobierno',
    ],
  },
  {
    num: '2',
    titulo: 'Educación Continua, Innovación y Transformación Digital',
    items: [
      'Programa Nacional de Educación Continua',
      'Academia Virtual CODIA',
      'Becas nacionales e internacionales',
      'Certificaciones profesionales especializadas e internacionales',
      'Laboratorio BIM y Centro de Innovación',
      'Formación en Inteligencia Artificial',
      'Biblioteca Técnica Digital',
      'Capacitación híbrida en todo el país',
      'Convenios con universidades y organismos internacionales',
    ],
  },
  {
    num: '3',
    titulo: 'Empleo, Emprendimiento y Desarrollo Profesional',
    items: [
      'Feria Nacional de Empleo CODIA',
      'Bolsa de Empleo Digital CODIA',
      'Banco Nacional de Datos Profesionales',
      'Plataforma nacional de consultores CODIA',
      'Programa "CODIA Exporta Servicios" Profesionales',
      'Programa de Emprendimiento Profesional',
      'Ruedas de negocios nacionales e internacionales',
      'Creación del Departamento de Género del CODIA',
    ],
  },
  {
    num: '4',
    titulo: 'Bienestar y Protección Social',
    items: [
      'Pensiones solidarias gestionadas a través de la Dirección General de Jubilaciones y Pensiones, y la Presidencia',
      'Seguro de vida para todos los colegiados del CODIA a nivel nacional',
      'Mejorar los programas de asistencia social y acompañamiento',
      'Convenios con clínicas, laboratorios y farmacias',
      'Seguro Complementario para Expresidentes Nacionales, Asambleístas y Miembros de las Delegaciones',
      'Programa de salud preventiva',
      'Carnet Inteligente CODIA (CDIC)',
    ],
  },
  {
    num: '5',
    titulo: 'Deportes, Cultura e Integración Familiar',
    items: [
      'Liga Infantil de Béisbol CODIA',
      'Liga Femenina de Voleibol',
      'Programas de natación y recreación',
      'Instalación de áreas infantiles y gimnasios funcionales',
      'Juegos Nacionales CODIA',
      'Festival Cultural Nacional CODIA',
      'Revista Científica y Tecnológica CODIA',
      'Becas para hijos de colegiados',
    ],
  },
  {
    num: '6',
    titulo: 'Transparencia, Institucionalidad y Buen Gobierno',
    items: [
      'Informes financieros trimestrales',
      'Portal de Transparencia y Datos Abiertos CODIA',
      'Compras y contrataciones con máxima transparencia',
      'Cumplimiento de las Leyes 47-25',
      'Mecanismos de participación digital',
      'Rendición permanente de cuentas',
      'CODIA Abierto, para delegaciones y núcleos',
      'Sistema Digital para el Sorteo de Peritajes',
    ],
  },
  {
    num: '7',
    titulo: 'Medio Ambiente y Desarrollo Sostenible',
    items: [
      'Programa Nacional de Reforestación CODIA',
      'Programa CODIA Verde',
      'Promoción de la construcción sostenible',
      'Jornadas de educación ambiental',
      'Publicación de artículos técnicos sobre sostenibilidad y cambio climático',
      'Impulso de criterios ambientales en proyectos públicos y privados',
      'Premio CODIA a la Innovación Ambiental',
    ],
  },
  {
    num: '8',
    titulo: 'Infraestructura y Fortalecimiento Institucional',
    items: [
      'Plan Nacional de Recuperación de Infraestructuras',
      'Concurso Nacional de Diseño de la Sede Central, regionales y delegaciones',
      'Modernización de locales regionales y delegaciones',
      'Digitalización de servicios institucionales',
      'Salones inteligentes para reuniones híbridas y capacitación virtual',
      'Mejora de condiciones laborales del personal administrativo',
      'Instalaciones seguras, accesibles y funcionales',
    ],
  },
  {
    num: '9',
    titulo: 'Juventud, Integración y Nuevas Generaciones',
    items: [
      'Programa de Orientación para Estudiantes de Término',
      'Programa Primer Empleo',
      'Programa de Liderazgo Juvenil',
      'Incubadora de emprendimientos',
      'Red Nacional de Jóvenes Profesionales CODIA',
      'Red Universitaria CODIA',
      'Acuerdo de pago para la reintegración de colegiados inactivos',
      'Participación de jóvenes en la vida gremial y directiva',
      'Programa de pasantías con acuerdo con Sectoriales del gobierno, ayuntamientos y universidades',
    ],
  },
  {
    num: '10',
    titulo: 'Relaciones Institucionales e Internacionalización',
    items: [
      'Fortalecer relaciones con la UIA y organismos internacionales',
      'Cooperación con Centroamérica y el Caribe',
      'Convenios con universidades nacionales e internacionales',
      'Programas de movilidad profesional y académica',
      'Participación activa en organismos internacionales',
      'Posicionar al CODIA como referente regional en ingeniería, arquitectura y agrimensura',
      'Promoción del país en foros y congresos internacionales',
    ],
  },
]

const INDICADORES = [
  { valor: '2,000+', desc: 'colegiados capacitados anualmente' },
  { valor: '500+', desc: 'empleos gestionados anualmente' },
  { valor: '20+', desc: 'convenios internacionales activos' },
  { valor: '50+', desc: 'nuevos convenios comerciales para el Carnet Inteligente CODIA' },
  { valor: '100%', desc: 'regionales y delegaciones digitalizadas' },
]

const LOGROS_100_DIAS = [
  'Lanzamiento del Portal de Transparencia y Datos Abiertos.',
  'Instalación de la Comisión de Escala Salarial Profesional.',
  'Puesta en marcha del Observatorio del Ejercicio Profesional.',
  'Implementación de la Bolsa de Empleo Digital.',
  'Inicio de la Academia Virtual CODIA.',
  'Seguro de vida para todos los colegiados del CODIA.',
  'Firma de convenios médicos y de beneficios.',
  'Lanzamiento del Concurso de Diseño de la Sede Central.',
  'Inicio del proceso de digitalización de servicios.',
  'Mesa Nacional de Planeamiento Urbano y Desarrollo.',
]

export default function PlanAccionPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden" style={{ backgroundColor: 'var(--color-marino-oscuro)' }}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, var(--color-dorado) 0%, transparent 35%)',
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">

            {/* Badge VOTA — 17 de julio */}
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-5 py-3 mb-6 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-dorado)" strokeWidth="1.6" strokeLinecap="round" className="w-9 h-9 shrink-0">
                <path d="M12 11c0 3-1 5-2.5 6.5M8.5 14c0 2-.5 3.5-1.5 5M15.5 14c0 1.5-.2 2.7-.6 3.9M5.5 11.5c0-1 .2-2 .6-3M18.5 11.5c0 2.5-.4 4.5-1.2 6.5M12 7.5a4.5 4.5 0 014.5 4.5c0 1-.1 2-.3 3M12 4.2C7.7 4.2 4.2 7.7 4.2 12c0 1 .1 2 .4 3" />
              </svg>
              <div className="text-left">
                <p className="text-lg font-extrabold leading-none tracking-tight" style={{ color: 'var(--color-marino)' }}>
                  VOTA
                </p>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-dorado)' }}>
                  Este viernes 17 de julio
                </p>
              </div>
            </div>

            <p className="text-sm md:text-base font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--color-dorado)' }}>
              CODIA · Gestión 2026–2027
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
              PLAN DE<br />ACCIÓN
            </h1>
            <p className="text-xl md:text-2xl font-bold mt-3" style={{ color: 'var(--color-dorado)' }}>
              George Richardson
            </p>
            <p className="text-base md:text-lg text-blue-100 mt-4 max-w-md mx-auto md:mx-0 leading-relaxed">
              Por un CODIA más fuerte, moderno y transparente.
            </p>
          </div>
          <div className="w-48 md:w-72 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4" style={{ borderColor: 'var(--color-dorado)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo 4.jpg" alt="Arq. Richardson Presidente" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ════════ VISIÓN Y MISIÓN ════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-8" style={{ backgroundColor: '#F3F5F8' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-dorado)' }}>
              Nuestra Visión
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed">
              Construir un CODIA moderno, transparente, participativo y tecnológicamente avanzado, que defienda con firmeza el ejercicio profesional, promueva el bienestar de sus miembros, fortalezca la capacitación continua y contribuya activamente al desarrollo sostenible de la República Dominicana.
            </p>
          </div>
          <div className="rounded-3xl p-8" style={{ backgroundColor: 'var(--color-marino)' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-dorado)' }}>
              Nuestra Misión
            </h2>
            <p className="text-lg text-white leading-relaxed">
              Nos comprometemos a impulsar una gestión cercana, eficiente y orientada a resultados, donde cada colegiado se sienta representado, protegido y orgulloso de pertenecer a su institución.
            </p>
          </div>
        </div>
      </section>

      {/* ════════ PRIMEROS 100 DÍAS ════════ */}
      <section style={{ backgroundColor: '#F3F5F8' }}>
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}>
              Compromiso Inmediato
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: 'var(--color-marino)' }}>
              Primeros 100 Días
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {LOGROS_100_DIAS.map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm">
                <span
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-extrabold"
                  style={{ backgroundColor: 'var(--color-dorado)' }}
                >
                  {i + 1}
                </span>
                <p className="text-base text-gray-800 leading-snug pt-1">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ INDICADORES DE ÉXITO ════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: 'var(--color-marino)' }}>
            Indicadores de Éxito 2026–2027
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {INDICADORES.map((ind, i) => (
            <div key={i} className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--color-marino)' }}>
              <div className="text-3xl md:text-4xl font-extrabold mb-2" style={{ color: 'var(--color-dorado)' }}>
                {ind.valor}
              </div>
              <p className="text-sm text-blue-100 leading-snug">{ind.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 10 EJES ESTRATÉGICOS ════════ */}
      <section style={{ backgroundColor: 'var(--color-marino-oscuro)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}>
              Hoja de Ruta 2026–2027
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              10 Ejes Estratégicos de Transformación Institucional
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {EJES.map((eje) => (
              <div key={eje.num} className="rounded-2xl overflow-hidden bg-white">
                <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: 'var(--color-dorado)' }}>
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base font-extrabold shrink-0 bg-white"
                    style={{ color: 'var(--color-dorado)' }}
                  >
                    {eje.num}
                  </span>
                  <h3 className="text-base font-bold text-white leading-snug">{eje.titulo}</h3>
                </div>
                <ul className="px-5 py-4 space-y-2.5">
                  {eje.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700 leading-snug">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-marino)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ DERECHO DE AUTOR Y ACUERDOS DE VIVIENDA ════════ */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-8 border-2" style={{ borderColor: 'var(--color-dorado)' }}>
            <h3 className="text-xl font-extrabold mb-3" style={{ color: 'var(--color-marino)' }}>
              Defensa del Derecho de Autor de Proyectos de Colegiados
            </h3>
            <p className="text-base text-gray-700 leading-relaxed">
              Acuerdo institucional con la ONDA para la protección legal de los proyectos de nuestros colegiados.
            </p>
          </div>
          <div className="rounded-3xl p-8 border-2" style={{ borderColor: 'var(--color-dorado)' }}>
            <h3 className="text-xl font-extrabold mb-3" style={{ color: 'var(--color-marino)' }}>
              Acuerdos con el MIVHED y FONVIVIENDA
            </h3>
            <ul className="space-y-2">
              {[
                'Financiamiento preferencial.',
                'Bonos para primera vivienda.',
                'Programas de mejoramiento de vivienda.',
                'Facilidades de adquisición y construcción.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-base text-gray-700 leading-snug">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-dorado)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════ CARNET DIGITAL ════════ */}
      <section style={{ backgroundColor: '#F3F5F8' }}>
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: 'var(--color-marino)' }}>
              Carnet Digital e Inteligente CODIA (CDIC)
            </h2>
            <p className="text-base text-gray-500 mt-2">Innovación, Identidad y Compromiso Profesional</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Identificación profesional digital e impresa',
              'Tecnología NFC y código QR',
              'Verificación inmediata de colegiatura',
              'Firma digital y acceso a servicios del CODIA',
              'Descuentos en comercios y servicios para colegiados',
              'Acceso a eventos, cursos y certificaciones',
              'Consulta de estado de membresía',
              'Pago de colegiatura en línea',
              'Notificaciones y beneficios personalizados',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 shadow-sm">
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-dorado)' }} />
                <p className="text-base text-gray-800 leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA FINAL ════════ */}
      <section className="px-6 py-16 text-center" style={{ backgroundColor: 'var(--color-marino)' }}>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          Súmate al cambio que el CODIA necesita
        </h2>
        <p className="text-blue-100 mb-8 max-w-lg mx-auto">
          Verifica tu derecho al voto y comparte tu opinión sobre este plan.
        </p>
        <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
          <Link
            href="/home"
            className="flex-1 text-center text-base font-bold py-4 px-6 rounded-2xl transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}
          >
            ✓ Verifícate para Votar
          </Link>
          <Link
            href="/encuesta"
            className="flex-1 text-center text-base font-bold py-4 px-6 rounded-2xl border-2 transition-all hover:bg-white/10"
            style={{ borderColor: 'white', color: 'white' }}
          >
            Queremos Conocer Tu Opinión
          </Link>
        </div>
      </section>

    </div>
  )
}

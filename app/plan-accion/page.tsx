import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plan de Acción — George Richardson | CODIA 2026',
  description: 'Conoce el Plan de Acción de George Richardson para el CODIA 2026-2027.',
}

export default function PlanAccionPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F5F8' }}>
      {/* Header */}
      <div className="w-full py-8 px-6" style={{ backgroundColor: 'var(--color-marino)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ backgroundColor: 'var(--color-dorado)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            PLAN DE ACCIÓN
          </h1>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-dorado)' }}>
            George Richardson — CODIA 2026
          </p>
          <div className="mt-3 h-0.5 w-20 mx-auto rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Visión y Misión */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4" style={{ borderColor: 'var(--color-dorado)' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-dorado)' }}>
              Nuestra Visión
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Construir un CODIA moderno, transparente, participativo y tecnológicamente avanzado, que defienda con firmeza el ejercicio profesional, promueva el bienestar de sus miembros, fortalezca la capacitación continua y contribuya activamente al desarrollo sostenible de la República Dominicana.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4" style={{ borderColor: 'var(--color-marino)' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-marino)' }}>
              Nuestra Misión
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Nos comprometemos a impulsar una gestión cercana, eficiente y orientada a resultados, donde cada colegiado se sienta representado, protegido y orgulloso de pertenecer a su institución.
            </p>
          </div>
        </div>

        {/* Primeros 100 días */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'var(--color-dorado)' }}>
              ★
            </div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-marino)' }}>
              Plan de Acción: Primeros 100 Días
            </h2>
          </div>
          <ul className="space-y-3">
            {[
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
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span
                  className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-dorado)' }}
                >
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Indicadores de Éxito */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold mb-5" style={{ color: 'var(--color-marino)' }}>
            Indicadores de Éxito 2026–2027
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { valor: '2,000+', desc: 'colegiados capacitados anualmente' },
              { valor: '500+', desc: 'empleos gestionados anualmente' },
              { valor: '20+', desc: 'convenios internacionales activos' },
              { valor: '50+', desc: 'nuevos convenios comerciales para el Carnet Inteligente CODIA' },
              { valor: '100%', desc: 'regionales y delegaciones digitalizadas' },
              { valor: '✓', desc: 'Portal de Transparencia funcionando en su totalidad' },
              { valor: '✓', desc: 'Concurso nacional de remodelación de la Sede Central' },
              { valor: '✓', desc: 'Programa de pensiones solidarias implementado' },
              { valor: '✓', desc: 'Seguro de vida para todos los colegiados del CODIA' },
            ].map((ind, i) => (
              <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#F3F5F8' }}>
                <div className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-dorado)' }}>
                  {ind.valor}
                </div>
                <p className="text-xs text-gray-500 leading-snug">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 10 Ejes Estratégicos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold mb-5" style={{ color: 'var(--color-marino)' }}>
            10 Ejes Estratégicos de Transformación Institucional
          </h2>
          <div className="space-y-4">
            {[
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
                  'Plataforma nacional de consultores',
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
            ].map((eje) => (
              <div key={eje.num} className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                    style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}
                  >
                    {eje.num}
                  </span>
                  <h3 className="text-sm font-bold text-white">{eje.titulo}</h3>
                </div>
                <ul className="px-4 py-3 space-y-1.5">
                  {eje.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-dorado)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Sección adicional: Defensa del Derecho de Autor y Acuerdos */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold mb-3" style={{ color: 'var(--color-marino)' }}>
              Defensa del Derecho de Autor de Proyectos de Colegiados
            </h3>
            <p className="text-sm text-gray-700">
              Acuerdo institucional con la ONDA para la protección legal de los proyectos de nuestros colegiados.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold mb-3" style={{ color: 'var(--color-marino)' }}>
              Acuerdos con el MIVHED y FONVIVIENDA
            </h3>
            <ul className="space-y-1.5">
              {[
                'Financiamiento preferencial.',
                'Bonos para primera vivienda.',
                'Programas de mejoramiento de vivienda.',
                'Facilidades de adquisición y construcción.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-dorado)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Carnet Digital */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold mb-3" style={{ color: 'var(--color-marino)' }}>
            Carnet Digital e Inteligente CODIA (CDIC)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Innovación, Identidad y Compromiso Profesional</p>
          <div className="grid grid-cols-2 gap-3">
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
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-dorado)' }} />
                {item}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CTA final */}
      <div className="sticky bottom-0 w-full px-4 py-4 border-t border-gray-200 bg-white shadow-lg">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 text-center text-sm font-bold py-3 px-4 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}
          >
            ✓ Verifícate para Votar
          </Link>
          <Link
            href="/encuesta"
            className="flex-1 text-center text-sm font-bold py-3 px-4 rounded-xl border-2 transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-marino)', color: 'var(--color-marino)', backgroundColor: 'white' }}
          >
            Queremos Conocer Tu Opinión
          </Link>
        </div>
      </div>
    </div>
  )
}

import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Términos y Condiciones | BetTracker Pro",
  description: "Términos de servicio y condiciones de uso de BetTracker Pro",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              BetTracker Pro
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>
        <p className="text-muted-foreground mb-8">
          Última actualización:{" "}
          {new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Aceptación de los Términos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Al acceder y utilizar BetTracker Pro (&quot;el Servicio&quot;),
              aceptas cumplir con estos Términos y Condiciones. Si no estás de
              acuerdo con alguna parte de estos términos, no podrás acceder al
              Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Descripción del Servicio
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              BetTracker Pro es una herramienta de gestión financiera personal
              diseñada para ayudar a los usuarios a:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Gestionar y dar seguimiento a sus inversiones personales</li>
              <li>Calcular proyecciones de interés compuesto</li>
              <li>Establecer y monitorear metas financieras</li>
              <li>Analizar estadísticas y tendencias de rendimiento</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>IMPORTANTE:</strong> BetTracker Pro NO es una casa de
              apuestas, NO ofrece pronósticos deportivos, y NO garantiza
              ganancias de ningún tipo. Es exclusivamente una herramienta de
              gestión.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Elegibilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar este Servicio, debes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Ser mayor de 18 años (o la edad legal en tu jurisdicción)</li>
              <li>
                Residir en una jurisdicción donde las apuestas deportivas sean
                legales (si aplica)
              </li>
              <li>
                Proporcionar información veraz y precisa durante el registro
              </li>
              <li>Mantener la confidencialidad de tu cuenta y contraseña</li>
            </ul>
          </section>

          <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-amber-800 dark:text-amber-200">
              ⚠️ 4. Juego Responsable
            </h2>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed mb-4">
              <strong>Reconocemos la importancia del juego responsable.</strong>{" "}
              Las apuestas deportivas conllevan riesgos financieros
              significativos. Te recomendamos encarecidamente:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-amber-700 dark:text-amber-300">
              <li>Nunca apuestes dinero que no puedas permitirte perder</li>
              <li>Establece límites de pérdida estrictos antes de comenzar</li>
              <li>No intentes recuperar pérdidas apostando más</li>
              <li>
                Busca ayuda profesional si sientes que las apuestas están
                afectando tu vida
              </li>
              <li>
                Considera las apuestas como entretenimiento, no como fuente de
                ingresos
              </li>
            </ul>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed mt-4">
              <strong>Recursos de ayuda:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 text-amber-700 dark:text-amber-300">
              <li>
                Jugadores Anónimos:{" "}
                <a
                  href="https://www.jugadoresanonimos.org"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.jugadoresanonimos.org
                </a>
              </li>
              <li>Línea de ayuda: 900 200 225 (España)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Uso Aceptable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Te comprometes a NO utilizar el Servicio para:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Actividades ilegales o fraudulentas</li>
              <li>Violar derechos de propiedad intelectual</li>
              <li>Interferir con el funcionamiento del Servicio</li>
              <li>Compartir tu cuenta con terceros</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Propiedad Intelectual
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo el contenido del Servicio, incluyendo pero no limitado a
              textos, gráficos, logos, iconos, imágenes, clips de audio,
              descargas digitales, y software, es propiedad de BetTracker Pro o
              sus licenciantes y está protegido por leyes de propiedad
              intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Planes y Pagos</h2>
            <p className="text-muted-foreground leading-relaxed">
              BetTracker Pro ofrece diferentes planes de suscripción. Los
              detalles de precios y características están disponibles en nuestra
              página de precios. Nos reservamos el derecho de modificar los
              precios con previo aviso de 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Limitación de Responsabilidad
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              BetTracker Pro se proporciona &quot;tal cual&quot; y &quot;según
              disponibilidad&quot;. No garantizamos que el Servicio será
              ininterrumpido o libre de errores. En ningún caso seremos
              responsables por:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                Pérdidas financieras derivadas del uso del Servicio o de
                apuestas
              </li>
              <li>
                Decisiones tomadas basándose en la información del Servicio
              </li>
              <li>Interrupciones del servicio o pérdida de datos</li>
              <li>Acciones de terceros o eventos fuera de nuestro control</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de modificar estos términos en cualquier
              momento. Los cambios entrarán en vigor inmediatamente después de
              su publicación. El uso continuado del Servicio después de
              cualquier modificación constituye tu aceptación de los nuevos
              términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Terminación</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos suspender o terminar tu acceso al Servicio en cualquier
              momento, sin previo aviso, por cualquier motivo, incluyendo pero
              no limitado a la violación de estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Ley Aplicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estos términos se regirán e interpretarán de acuerdo con las leyes
              de Chile, sin tener en cuenta sus disposiciones sobre conflicto de
              leyes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para cualquier pregunta sobre estos Términos y Condiciones, puedes
              contactarnos en:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> soporte@bettracker.pro
              <br />
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} BetTracker Pro. Todos los derechos
            reservados.
          </p>
          <div className="flex justify-center gap-6 text-sm mt-4">
            <Link href="/terms" className="text-primary font-medium">
              Términos
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacidad
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

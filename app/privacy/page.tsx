import {
  TrendingUp,
  ArrowLeft,
  Shield,
  Database,
  Eye,
  Lock,
  Mail,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Política de Privacidad | BetTracker Pro",
  description: "Política de privacidad y protección de datos de BetTracker Pro",
};

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-4">Política de Privacidad</h1>
        <p className="text-muted-foreground mb-8">
          Última actualización:{" "}
          {new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {/* Quick Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
              Datos Protegidos
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Encriptación de extremo a extremo
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">
              No Vendemos Datos
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Tu información nunca se vende
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <Eye className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">
              Control Total
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Tú decides qué compartir
            </p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
            <p className="text-muted-foreground leading-relaxed">
              En BetTracker Pro, nos tomamos muy en serio la privacidad de
              nuestros usuarios. Esta Política de Privacidad describe cómo
              recopilamos, usamos, almacenamos y protegemos tu información
              personal cuando utilizas nuestro servicio.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Esta política cumple con el Reglamento General de Protección de
              Datos (GDPR) de la Unión Europea, la Ley Orgánica de Protección de
              Datos (LOPD) de España, y otras regulaciones aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-6 w-6" />
              2. Datos que Recopilamos
            </h2>

            <h3 className="text-xl font-medium mt-6 mb-3">
              2.1 Información que nos proporcionas
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Datos de cuenta:</strong> Email, nombre de usuario
                (opcional), contraseña encriptada
              </li>
              <li>
                <strong>Datos de perfil:</strong> Foto de perfil (opcional),
                preferencias de la aplicación
              </li>
              <li>
                <strong>Datos financieros:</strong> Registros de apuestas, metas
                financieras, configuración de banca (almacenados localmente y en
                tu cuenta)
              </li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">
              2.2 Información recopilada automáticamente
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Datos de uso:</strong> Páginas visitadas, funciones
                utilizadas, tiempo de sesión
              </li>
              <li>
                <strong>Datos del dispositivo:</strong> Tipo de navegador,
                sistema operativo, resolución de pantalla
              </li>
              <li>
                <strong>Datos de ubicación:</strong> País (solo para
                cumplimiento legal, nunca ubicación exacta)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-6 w-6" />
              3. Cómo Usamos tus Datos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos tu información para:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Proporcionar y mantener el servicio</li>
              <li>Personalizar tu experiencia</li>
              <li>Enviar notificaciones importantes sobre tu cuenta</li>
              <li>Mejorar nuestros productos y servicios</li>
              <li>Cumplir con obligaciones legales</li>
              <li>Prevenir fraudes y garantizar la seguridad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Base Legal para el Procesamiento
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Procesamos tus datos personales bajo las siguientes bases legales:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong>Consentimiento:</strong> Cuando te registras y aceptas
                estos términos
              </li>
              <li>
                <strong>Ejecución del contrato:</strong> Para proporcionarte el
                servicio
              </li>
              <li>
                <strong>Interés legítimo:</strong> Para mejorar el servicio y
                prevenir fraudes
              </li>
              <li>
                <strong>Obligación legal:</strong> Cuando la ley lo requiere
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Compartición de Datos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>
                NO vendemos, alquilamos ni compartimos tu información personal
                con terceros
              </strong>{" "}
              para fines de marketing. Solo compartimos datos en los siguientes
              casos:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong>Proveedores de servicios:</strong> Empresas que nos
                ayudan a operar (hosting, analytics), bajo estrictos acuerdos de
                confidencialidad
              </li>
              <li>
                <strong>Requisitos legales:</strong> Cuando lo exija la ley o
                una orden judicial
              </li>
              <li>
                <strong>Protección de derechos:</strong> Para proteger nuestros
                derechos, propiedad o seguridad
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              6. Seguridad de los Datos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas para
              proteger tus datos:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Encriptación SSL/TLS en todas las comunicaciones</li>
              <li>Contraseñas hasheadas con algoritmos seguros (bcrypt)</li>
              <li>Autenticación de dos factores disponible</li>
              <li>Acceso restringido a datos personales</li>
              <li>Monitoreo continuo de seguridad</li>
              <li>Copias de seguridad encriptadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Retención de Datos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Conservamos tus datos personales mientras tu cuenta esté activa o
              según sea necesario para proporcionarte servicios. Si deseas
              eliminar tu cuenta, puedes hacerlo desde la configuración de tu
              perfil. Después de la eliminación:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Datos de cuenta: Se eliminan inmediatamente</li>
              <li>
                Datos de uso anonimizados: Pueden conservarse para análisis
              </li>
              <li>
                Datos requeridos legalmente: Se conservan según la legislación
                aplicable
              </li>
            </ul>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              8. Tus Derechos (GDPR/LOPD)
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Tienes los siguientes derechos sobre tus datos personales:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">📋 Acceso</h4>
                <p className="text-sm text-muted-foreground">
                  Solicitar una copia de tus datos
                </p>
              </div>
              <div>
                <h4 className="font-medium">✏️ Rectificación</h4>
                <p className="text-sm text-muted-foreground">
                  Corregir datos inexactos
                </p>
              </div>
              <div>
                <h4 className="font-medium">🗑️ Supresión</h4>
                <p className="text-sm text-muted-foreground">
                  Eliminar tus datos (&quot;derecho al olvido&quot;)
                </p>
              </div>
              <div>
                <h4 className="font-medium">⏸️ Limitación</h4>
                <p className="text-sm text-muted-foreground">
                  Restringir el procesamiento
                </p>
              </div>
              <div>
                <h4 className="font-medium">📦 Portabilidad</h4>
                <p className="text-sm text-muted-foreground">
                  Recibir tus datos en formato estándar
                </p>
              </div>
              <div>
                <h4 className="font-medium">🚫 Oposición</h4>
                <p className="text-sm text-muted-foreground">
                  Oponerte al procesamiento
                </p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para ejercer cualquiera de estos derechos, contacta a:{" "}
              <strong>privacidad@bettracker.pro</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Cookies y Tecnologías Similares
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies y tecnologías similares para:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong>Cookies esenciales:</strong> Necesarias para el
                funcionamiento del sitio (autenticación, sesión)
              </li>
              <li>
                <strong>Cookies de preferencias:</strong> Recordar tus
                configuraciones (tema, idioma)
              </li>
              <li>
                <strong>Cookies analíticas:</strong> Entender cómo usas el
                servicio (pueden desactivarse)
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Puedes gestionar las cookies desde la configuración de tu
              navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Transferencias Internacionales
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Nuestros servidores están ubicados en la Unión Europea. Si es
              necesario transferir datos fuera del EEE, lo hacemos bajo
              cláusulas contractuales tipo aprobadas por la Comisión Europea.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Menores de Edad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nuestro servicio no está dirigido a menores de 18 años. No
              recopilamos intencionalmente información de menores. Si eres
              padre/tutor y crees que tu hijo nos ha proporcionado información,
              contáctanos para eliminarla.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              12. Cambios en esta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos actualizar esta política ocasionalmente. Te notificaremos
              cambios significativos por email o mediante un aviso en el
              servicio. Te recomendamos revisar esta página periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6" />
              13. Contacto
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Si tienes preguntas sobre esta Política de Privacidad o quieres
              ejercer tus derechos:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground">
                <strong>BetTracker Pro</strong>
                <br />
                Email: privacidad@bettracker.pro
                <br />
                Delegado de Protección de Datos (DPO): dpo@bettracker.pro
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              También puedes presentar una reclamación ante la autoridad de
              protección de datos de tu país (en España: Agencia Española de
              Protección de Datos - www.aepd.es).
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
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Términos
            </Link>
            <Link href="/privacy" className="text-primary font-medium">
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

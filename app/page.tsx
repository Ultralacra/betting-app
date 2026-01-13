import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  TrendingUp,
  Target,
  ShieldCheck,
  Zap,
  CheckCircle2,
  BarChart3,
  Lock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/20">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">BetTracker Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hidden sm:block">
              Iniciar Sesión
            </Link>
            <Button asChild size="sm" className="rounded-full px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Link href="/login">Comenzar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-24 lg:pb-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge variant="outline" className="mb-6 rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary animate-fade-in">
              🚀 La herramienta #1 para apostadores inteligentes
            </Badge>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Deja de apostar al azar. <br className="hidden sm:block" />
              <span className="text-primary">Invierte con estrategia.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              Transforma tu hobby en una inversión rentable. Gestiona tu capital con interés compuesto, define metas financieras y visualiza tu éxito con BetTracker Pro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-xl shadow-primary/20 transition-transform hover:scale-105">
                <Link href="/login">
                  Crear Cuenta Gratis <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-8 text-base border-primary/20 hover:bg-primary/5">
                <Link href="#features">
                  Ver cómo funciona
                </Link>
              </Button>
            </div>

            {/* Hero Image Mockup */}
            <div className="mt-16 sm:mt-24 relative mx-auto max-w-5xl rounded-2xl border border-border/50 bg-background/50 shadow-2xl backdrop-blur-sm p-2 lg:p-4 animate-scale-in">
              <div className="rounded-xl overflow-hidden bg-muted/20 border border-border/30 aspect-[16/9] relative grid place-items-center group">
                 <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 flex items-end justify-center pb-20">
                     <p className="text-muted-foreground font-medium bg-background/80 backdrop-blur px-4 py-2 rounded-full border border-border/50">Vista previa del Dashboard Interactivo</p>
                 </div>
                 {/* Placeholder for actual dashboard screenshot */}
                 <div className="w-full h-full bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] flex items-center justify-center">
                    <BarChart3 className="h-32 w-32 text-muted-foreground/20" />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Todo lo que necesitas para ganar</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Olvídate de Excel. BetTracker Pro centraliza tu gestión de banca, seguimiento de metas y análisis en una sola plataforma moderna.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Target}
                title="Metas Financieras"
                description="Define objetivos como 'Nuevo PC' o 'Viaje' y rastrea tu progreso en tiempo real con cada victoria."
              />
              <FeatureCard 
                icon={Zap}
                title="Interés Compuesto"
                description="Nuestra calculadora reajusta automáticamente tus stakes diarios para maximizar ganancias exponencialmente."
              />
              <FeatureCard 
                icon={ShieldCheck}
                title="Disciplina Férrea"
                description="El sistema te dice exactamente cuánto apostar. Elimina el factor emocional y protege tu banca."
              />
              <FeatureCard 
                icon={BarChart3}
                title="Analítica Avanzada"
                description="Visualiza tu ROI, Yield y rachas ganadoras con gráficos hermosos y fáciles de entender."
              />
              <FeatureCard 
                icon={Lock}
                title="Seguridad Total"
                description="Tus datos están encriptados y protegidos. Solo tú tienes acceso a tu estrategia financiera."
              />
              <FeatureCard 
                icon={TrendingUp}
                title="Escalabilidad PRO"
                description="Comienza gratis y desbloquea herramientas profesionales con nuestra membresía PRO cuando estés listo."
              />
            </div>
          </div>
        </section>

        {/* Pricing/CTA Section */}
        <section className="py-24 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-top-left scale-110" />
           <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
             <div className="mx-auto max-w-3xl text-center bg-background border border-border rounded-3xl p-10 shadow-2xl">
               <h2 className="text-3xl font-bold mb-6">Únete a la élite de apostadores</h2>
               <p className="text-lg text-muted-foreground mb-8">
                 Deja de ser un espectador y conviértete en el dueño de tus resultados. La herramienta que usan los profesionales ya está disponible para ti.
               </p>
               <ul className="grid sm:grid-cols-2 gap-4 text-left mb-10 max-w-lg mx-auto">
                 {['Gestión de banca automatizada', 'Seguimiento de metas ilimitado', 'Soporte prioritario', 'Acceso a actualizaciones futuras'].map((item) => (
                   <li key={item} className="flex items-center gap-2">
                     <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                     <span className="text-sm font-medium">{item}</span>
                   </li>
                 ))}
               </ul>
               <Button asChild size="lg" className="w-full sm:w-auto h-14 rounded-full px-10 text-lg shadow-xl shadow-primary/25 hover:scale-105 transition-all">
                 <Link href="/login">Empezar Ahora - Es Gratis</Link>
               </Button>
               <p className="mt-4 text-sm text-muted-foreground">No se requiere tarjeta de crédito para el plan Free.</p>
             </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="p-1.5 rounded bg-primary/10 text-primary">
               <TrendingUp className="h-4 w-4" />
             </div>
             <span className="font-bold text-foreground">BetTracker Pro</span>
          </div>
          <p className="text-sm mb-6">&copy; {new Date().getFullYear()} BetTracker Pro. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="#" className="hover:text-foreground transition-colors">Términos</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-6">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

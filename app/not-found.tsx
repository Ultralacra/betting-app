import { TrendingUp, Home, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <TrendingUp className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            BetTracker Pro
          </span>
        </Link>

        {/* 404 Number */}
        <div className="mb-6">
          <span className="text-9xl font-black text-primary/20">404</span>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold mb-4">Página no encontrada</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Lo sentimos, la página que buscas no existe o ha sido movida. Verifica
          la URL o regresa al inicio.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Ir al Dashboard
            </Link>
          </Button>
        </div>

        {/* Suggestions */}
        <div className="mt-12 text-left">
          <h2 className="text-sm font-semibold mb-4 text-center">
            ¿Buscabas alguna de estas páginas?
          </h2>
          <div className="grid gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Mi Perfil</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Iniciar Sesión</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

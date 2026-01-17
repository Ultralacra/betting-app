"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Bell } from "lucide-react";

async function apiJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new Error(body || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export default function AdminPushClient() {
  const [title, setTitle] = useState("BetTracker");
  const [body, setBody] = useState("Tienes una actualización.");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchCount = async () => {
    try {
      const json = await apiJson<{ count: number }>("/api/push/count");
      setCount(json.count ?? 0);
    } catch (e: any) {
      setCount(null);
    }
  };

  useEffect(() => {
    void fetchCount();
  }, []);

  const sendPush = async (t: string, b: string, u: string) => {
    setBusy(true);
    try {
      const res = await apiJson<{
        ok: boolean;
        sent?: number;
        failed?: number;
      }>("/api/push/send", {
        method: "POST",
        body: JSON.stringify({ title: t, body: b, url: u }),
        headers: { "Content-Type": "application/json" },
      });

      toast({
        title: "Enviado",
        description: `Enviadas: ${res.sent ?? 0}, Fallidas: ${res.failed ?? 0}`,
      });
      await fetchCount();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message ?? "No se pudo enviar",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => sendPush(title, body, url);

  const handleSendUpdate = () =>
    sendPush(
      "🚀 Nueva versión disponible",
      "Abre la app para actualizar a la última versión con nuevas mejoras.",
      "/",
    );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Enviar Notificación Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botón rápido para notificar nueva versión */}
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendUpdate}
            disabled={busy}
            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Notificar nueva versión
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            Suscriptores: {count === null ? "—" : count}
          </span>
        </div>

        {/* Formulario personalizado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Título"
          />
          <Input
            value={url}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="URL (opcional)"
          />
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          placeholder="Cuerpo del mensaje"
        />
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={busy}>
            {busy ? "Enviando…" : "Enviar personalizado"}
          </Button>
          <Button variant="outline" onClick={fetchCount} disabled={busy}>
            Actualizar conteo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

async function apiJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...init });
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

  const handleSend = async () => {
    setBusy(true);
    try {
      const res = await apiJson<{ ok: boolean; sent?: number; failed?: number }>(
        "/api/push/send",
        {
          method: "POST",
          body: JSON.stringify({ title, body, url }),
          headers: { "Content-Type": "application/json" },
        }
      );

      toast({ title: "Enviado", description: `Enviadas: ${res.sent ?? 0}, Fallidas: ${res.failed ?? 0}` });
      await fetchCount();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message ?? "No se pudo enviar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Enviar Notificación Push</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Título" />
          <Input value={url} onChange={(e) => setUrl((e.target as HTMLInputElement).value)} placeholder="URL (opcional)" />
          <div className="flex items-center">
            <div className="text-sm text-muted-foreground">Suscriptores: {count === null ? "—" : count}</div>
          </div>
        </div>
        <Textarea value={body} onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)} placeholder="Cuerpo" />
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={busy}>{busy ? "Enviando…" : "Enviar a todos"}</Button>
          <Button variant="outline" onClick={fetchCount} disabled={busy}>Actualizar conteo</Button>
        </div>
      </CardContent>
    </Card>
  );
}

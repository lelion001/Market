import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, X, Upload, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REGIONS, formatHTG } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, signedUrl } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/pibliye")({
  head: () => ({ meta: [{ title: "Pibliye — Mache Lakay" }] }),
  component: Page,
});

function Page() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    kind: "product" as "product" | "service" | "training",
    name: "",
    description: "",
    price: "",
    quantity: "1",
    whatsapp: "",
    moncash: "",
    natcash: "",
    region: REGIONS[0] as string,
  });
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/konekte" as never });
  }, [loading, user, navigate]);

  // Check subscription rules: first publish is free, subsequent need active sub
  const { data: prodCount = 0 } = useQuery({
    queryKey: ["my-product-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: hasActiveSub = false } = useQuery({
    queryKey: ["my-active-sub", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      return !!data;
    },
  });

  const needsSubscription = prodCount > 0 && !hasActiveSub;

  // Set defaults from profile
  useEffect(() => {
    if (profile && !form.whatsapp && profile.phone) {
      setForm((f) => ({ ...f, whatsapp: profile.phone ?? "", region: profile.region ?? f.region }));
    }
  }, [profile]); // eslint-disable-line

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - imagePaths.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      for (const f of toUpload) {
        const path = await uploadImage("product-images", user.id, f);
        const url = await signedUrl("product-images", path);
        setImagePaths((p) => [...p, path]);
        if (url) setPreviews((p) => ({ ...p, [path]: url }));
      }
    } catch (err: any) {
      toast.error(err.message ?? "Pa kapab voye foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (path: string) => {
    setImagePaths((p) => p.filter((x) => x !== path));
    supabase.storage.from("product-images").remove([path]).catch(() => {});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (needsSubscription) {
      toast.error("Ou bezwen yon abònman aktif pou pibliye yon dezyèm pwodwi.");
      navigate({ to: "/abonman" as never });
      return;
    }
    if (imagePaths.length === 0) {
      toast.error("Mete omwen yon foto");
      return;
    }
    if (!form.whatsapp.trim()) {
      toast.error("Mete yon nimewo WhatsApp pou kliyan yo kontakte w");
      return;
    }
    setSubmitting(true);
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      const { data, error } = await supabase
        .from("products")
        .insert({
          owner_id: user.id,
          store_id: store?.id ?? null,
          kind: form.kind,
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: Number(form.price) || 0,
          quantity: Number(form.quantity) || 0,
          images: imagePaths,
          whatsapp: form.whatsapp.trim(),
          moncash: form.moncash.trim() || null,
          natcash: form.natcash.trim() || null,
          region: form.region,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Pwodwi pibliye!");
      navigate({ to: "/pwodwi/$id" as never, params: { id: data!.id } as never });
    } catch (err: any) {
      toast.error(err.message ?? "Pa kapab pibliye");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <AppShell>
      <div className="px-4 py-4">
        <h1 className="text-2xl font-extrabold">Pibliye yon pwodwi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Premye piblikasyon an gratis. Apre sa, ou bezwen abònman.
        </p>

        {needsSubscription && (
          <Link
            to="/abonman"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-accent bg-accent/15 p-3 text-sm font-semibold text-accent-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Ou deja gen {prodCount} pwodwi. Pran yon abònman pou kontinye pibliye.</span>
          </Link>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          {/* Type */}
          <div>
            <Label>Kalite</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["product", "service", "training"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, kind: k })}
                  className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition ${
                    form.kind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card"
                  }`}
                >
                  {k === "product" ? "Pwodwi" : k === "service" ? "Sèvis" : "Fòmasyon"}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <Label>Foto (1–10)</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {imagePaths.map((p) => (
                <div key={p} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {previews[p] ? (
                    <img src={previews[p]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">…</div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(p)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {imagePaths.length < 10 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary">
                  {uploading ? <span className="text-xs">…</span> : <Upload className="h-5 w-5" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
                </label>
              )}
            </div>
          </div>

          <Field label="Non pwodwi">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
          </Field>
          <Field label="Deskripsyon">
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-xl"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pri (HTG)">
              <Input
                required
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Kantite">
              <Input
                required
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="h-11 rounded-xl"
              />
            </Field>
          </div>

          {form.price && form.quantity && (
            <div className="rounded-xl bg-muted px-3 py-2 text-xs">
              Total estòk: <strong>{formatHTG(Number(form.price) * Number(form.quantity))}</strong>
            </div>
          )}

          <Field label="WhatsApp (obligatwa)">
            <Input
              required
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="+509 …"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="MonCash">
              <Input value={form.moncash} onChange={(e) => setForm({ ...form, moncash: e.target.value })} className="h-11 rounded-xl" />
            </Field>
            <Field label="NatCash">
              <Input value={form.natcash} onChange={(e) => setForm({ ...form, natcash: e.target.value })} className="h-11 rounded-xl" />
            </Field>
          </div>

          <Field label="Rejyon">
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            disabled={submitting || needsSubscription}
            className="h-12 w-full rounded-xl ml-gradient font-bold text-primary-foreground shadow-glow transition active:scale-95 disabled:opacity-60"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            {submitting ? "Pibliye…" : "Pibliye Pwodwi"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
  }

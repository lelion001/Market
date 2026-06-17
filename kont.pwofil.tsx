import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/constants";
import { uploadImage, signedUrl } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/kont/pwofil")({
  head: () => ({ meta: [{ title: "Pwofil — Mache Lakay" }] }),
  component: Page,
});

function Page() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", region: REGIONS[0] as string });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/konekte" as never });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        region: profile.region ?? REGIONS[0],
      });
      if (profile.avatar_url) {
        signedUrl("avatars", profile.avatar_url).then((u) => setAvatarUrl(u));
      } else {
        setAvatarUrl(null);
      }
    }
  }, [profile]);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const path = await uploadImage("avatars", user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      const url = await signedUrl("avatars", path);
      setAvatarUrl(url);
      await refreshProfile();
      toast.success("Foto pwofil mete a jou");
    } catch (err: any) {
      toast.error(err.message ?? "Pa kapab voye foto a");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Pwofil mete a jou");
  };

  if (!user) return null;

  const initials = (form.full_name || "U").trim().charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-extrabold">Modifye Pwofil</h1>

        {/* Avatar (WhatsApp-style) */}
        <div className="mt-5 flex flex-col items-center">
          <label className="relative cursor-pointer">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-muted ring-4 ring-card shadow-card">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow ring-2 ring-card">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
              disabled={uploadingAvatar}
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Klike sou foto a pou chanje l</p>
        </div>

        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Non Konplè</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Rejyon</Label>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button disabled={saving} className="h-12 w-full rounded-xl ml-gradient font-bold text-primary-foreground shadow-glow disabled:opacity-60">
            {saving ? "Sove…" : "Sove Chanjman"}
          </button>
        </form>
      </div>
    </AppShell>
  );
                    }

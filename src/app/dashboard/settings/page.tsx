"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

function ProfileSection() {
  const { data: profile, isLoading } = trpc.profile.getCurrent.useQuery();
  const utils = trpc.useUtils();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => utils.profile.getCurrent.invalidate(),
  });
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSave = () => {
    updateProfile.mutate(
      { name },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  if (isLoading) return <SectionSkeleton />;

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-caps uppercase text-zinc-500">Profile</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
        >
          {updateProfile.isPending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-success">Saved</span>}
        {updateProfile.isError && (
          <span className="text-sm text-error">Failed to save</span>
        )}
      </div>
    </section>
  );
}

function NotificationsSection() {
  const { data: settings, isLoading } = trpc.notification.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => utils.notification.getSettings.invalidate(),
  });
  const { isSubscribed, isSupported, subscribe, unsubscribe } = useNotificationContext();

  const toggle = (field: string, value: boolean) => {
    updateSettings.mutate({ [field]: value });
  };

  const updateTime = (field: string, value: string) => {
    updateSettings.mutate({ [field]: value });
  };

  if (isLoading || !settings) return <SectionSkeleton />;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-caps uppercase text-zinc-500">Notifications</h2>

      {/* Morning check-in */}
      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div>
          <p className="text-sm font-medium">Morning check-in</p>
          <p className="text-xs text-zinc-500">Daily planning reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.morningCheckTime}
            onChange={(e) => updateTime("morningCheckTime", e.target.value)}
            disabled={!settings.morningCheckEnabled}
            className="rounded-sm border border-border bg-card px-2 py-1 text-sm disabled:opacity-50 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.morningCheckEnabled}
            onChange={(v) => toggle("morningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Evening check-in */}
      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div>
          <p className="text-sm font-medium">Evening check-in</p>
          <p className="text-xs text-zinc-500">Daily review reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.eveningCheckTime}
            onChange={(e) => updateTime("eveningCheckTime", e.target.value)}
            disabled={!settings.eveningCheckEnabled}
            className="rounded-sm border border-border bg-card px-2 py-1 text-sm disabled:opacity-50 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.eveningCheckEnabled}
            onChange={(v) => toggle("eveningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Email notifications */}
      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div>
          <p className="text-sm font-medium">Email notifications</p>
          <p className="text-xs text-zinc-500">Receive check-in reminders via email</p>
        </div>
        <ToggleSwitch
          checked={settings.emailNotificationsEnabled}
          onChange={(v) => toggle("emailNotificationsEnabled", v)}
        />
      </div>

      {/* Push notifications */}
      <div className="space-y-3 rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Push notifications</p>
            <p className="text-xs text-zinc-500">
              Browser reminders for plan + reckon + re-entry nudges.
            </p>
          </div>
          <ToggleSwitch
            checked={settings.pushNotificationsEnabled}
            onChange={(v) => toggle("pushNotificationsEnabled", v)}
            disabled={!isSupported}
          />
        </div>

        {settings.pushNotificationsEnabled && (
          <div className="flex items-center justify-between gap-2 rounded-sm border border-border px-3 py-2">
            <p className="text-xs text-zinc-500">
              {isSubscribed
                ? "This browser is subscribed to push notifications."
                : "This browser is not subscribed yet."}
            </p>
            {isSubscribed ? (
              <button
                onClick={() => {
                  unsubscribe().catch(() => {});
                }}
                className="rounded-sm border border-border px-2 py-1 text-xs font-medium hover:bg-accent transition-colors duration-150"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={() => {
                  subscribe().catch(() => {});
                }}
                disabled={!isSupported}
                className="rounded-sm bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
              >
                Subscribe
              </button>
            )}
          </div>
        )}
      </div>

      {!isSupported && (
        <p className="text-xs text-zinc-500">
          Push notifications are not supported in this browser.
        </p>
      )}

      {updateSettings.isError && (
        <p className="text-sm text-error">Failed to update settings</p>
      )}

      <Link
        href="/dashboard/setup"
        className="text-sm text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-50"
      >
        Re-run notification setup
      </Link>
    </section>
  );
}

function ThemeSection() {
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("grindproof:theme") as typeof theme | null;
    if (stored) setThemeState(stored);
  }, []);

  const setTheme = (mode: "light" | "dark" | "system") => {
    setThemeState(mode);
    localStorage.setItem("grindproof:theme", mode);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (mode === "light") root.classList.add("light");
    else if (mode === "dark") root.classList.add("dark");
  };

  if (!mounted) return <SectionSkeleton />;

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-caps uppercase text-zinc-500">Theme</h2>
      <div className="flex gap-2">
        {(["light", "dark", "system"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            className={cn(
              "px-4 py-2 rounded-sm text-sm capitalize transition-colors duration-150",
              theme === mode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </section>
  );
}

function TimezoneSection() {
  const { data: settings, isLoading } = trpc.notification.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => utils.notification.getSettings.invalidate(),
  });

  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (isLoading || !settings) return <SectionSkeleton />;

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-caps uppercase text-zinc-500">Timezone</h2>
      <p className="text-xs text-zinc-500">
        Detected: {detectedTz}
      </p>
      <Select
        value={settings.timezone}
        onValueChange={(value) => updateSettings.mutate({ timezone: value })}
      >
        <SelectTrigger className="w-full rounded-sm">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updateSettings.isError && (
        <p className="text-sm text-error">Failed to update timezone</p>
      )}
    </section>
  );
}

function AccountSection() {
  const { signOut } = useAuth();
  const router = useRouter();
  const deleteAccount = trpc.profile.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut();
      router.push("/");
    },
  });

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-caps uppercase text-error">Danger Zone</h2>

      <button
        onClick={signOut}
        className="w-full rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
      >
        Sign out
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full rounded-sm border border-error px-4 py-2 text-sm font-medium text-error hover:bg-error/5 transition-colors duration-150">
            Delete account
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteAccount.isError && (
            <p className="text-sm text-error">
              Failed to delete account. Please try again.
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              className="rounded-sm bg-error px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete my account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ConnectAgentSection() {
  const utils = trpc.useUtils();
  const { data: tokens, isLoading } = trpc.mcpToken.list.useQuery();
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<"never" | "90" | "365">("never");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState<"token" | "config" | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const createToken = trpc.mcpToken.create.useMutation({
    onSuccess: (data) => {
      setRevealed({ token: data.token, name: data.name });
      setName("");
      setExpiry("never");
      setDialogOpen(false);
      utils.mcpToken.list.invalidate();
    },
  });

  const revokeToken = trpc.mcpToken.revoke.useMutation({
    onSuccess: () => {
      setRevokeTarget(null);
      utils.mcpToken.list.invalidate();
    },
  });

  const endpoint =
    (typeof window !== "undefined" ? window.location.origin : "https://grindproof.co") +
    "/api/mcp/mcp";

  const configSnippet = revealed
    ? `{
  "mcpServers": {
    "grindproof": {
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer ${revealed.token}" }
    }
  }
}`
    : "";

  async function copy(text: string, which: "token" | "config") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore.
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-caps uppercase text-muted-foreground">
          Connect an agent
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate a token to connect your own AI agent (Claude Code, Cursor, custom
          agents) to your GrindProof account over MCP.
        </p>
      </div>

      {/* One-time reveal of a freshly created token. */}
      {revealed && (
        <div className="space-y-3 rounded-sm border border-border bg-background p-3">
          <p className="text-sm font-medium">
            Token created — copy it now. You won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-sm border border-border bg-card px-2 py-1.5 text-xs">
              {revealed.token}
            </code>
            <button
              onClick={() => copy(revealed.token, "token")}
              className="shrink-0 rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
            >
              {copied === "token" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">MCP client config</span>
              <button
                onClick={() => copy(configSnippet, "config")}
                className="rounded-sm border border-border px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
              >
                {copied === "config" ? "Copied" : "Copy config"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-sm border border-border bg-card p-2 text-xs">
              {configSnippet}
            </pre>
          </div>
          <button
            onClick={() => setRevealed(null)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Existing tokens */}
      {isLoading ? (
        <SectionSkeleton />
      ) : tokens && tokens.length > 0 ? (
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.prefix}… ·{" "}
                  {t.lastUsedAt
                    ? `last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                  {t.expiresAt
                    ? ` · expires ${new Date(t.expiresAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setRevokeTarget({ id: t.id, name: t.name })}
                className="shrink-0 rounded-sm border border-error px-3 py-1.5 text-xs font-medium text-error hover:bg-error/5 transition-colors duration-150"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No connected agents yet.</p>
      )}

      {/* Generate token dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button className="w-full rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150">
            Generate token
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate an access token</DialogTitle>
            <DialogDescription>
              Give it a name so you can recognize it later, then paste it into your MCP
              client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claude Code laptop"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token-expiry">Expires</Label>
              <Select value={expiry} onValueChange={(v) => setExpiry(v as typeof expiry)}>
                <SelectTrigger id="token-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createToken.isError && (
              <p className="text-sm text-error">Failed to create token. Please try again.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() =>
                createToken.mutate({
                  name: name.trim() || "Untitled agent",
                  expiresInDays: expiry === "never" ? null : Number(expiry),
                })
              }
              disabled={createToken.isPending || name.trim().length === 0}
              className="rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
            >
              {createToken.isPending ? "Generating..." : "Generate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke token</DialogTitle>
            <DialogDescription>
              Any agent using “{revokeTarget?.name}” will immediately lose access. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {revokeToken.isError && (
            <p className="text-sm text-error">Failed to revoke. Please try again.</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => revokeTarget && revokeToken.mutate({ id: revokeTarget.id })}
              disabled={revokeToken.isPending}
              className="rounded-sm bg-error px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
            >
              {revokeToken.isPending ? "Revoking..." : "Revoke token"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-900 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-9 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <ProfileSection />
        <NotificationsSection />
        <ThemeSection />
        <TimezoneSection />
        <ConnectAgentSection />
        <AccountSection />
      </div>
    </div>
  );
}

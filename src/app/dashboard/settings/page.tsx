"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc/client";
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
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {updateProfile.isPending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
        {updateProfile.isError && (
          <span className="text-sm text-red-600 dark:text-red-400">Failed to save</span>
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
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h2>

      {/* Morning check-in */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Morning check-in</p>
          <p className="text-xs text-zinc-500">Daily planning reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.morningCheckTime}
            onChange={(e) => updateTime("morningCheckTime", e.target.value)}
            disabled={!settings.morningCheckEnabled}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.morningCheckEnabled}
            onChange={(v) => toggle("morningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Evening check-in */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Evening check-in</p>
          <p className="text-xs text-zinc-500">Daily review reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.eveningCheckTime}
            onChange={(e) => updateTime("eveningCheckTime", e.target.value)}
            disabled={!settings.eveningCheckEnabled}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.eveningCheckEnabled}
            onChange={(v) => toggle("eveningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Email notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Email notifications</p>
          <p className="text-xs text-zinc-500">Receive check-in reminders via email</p>
        </div>
        <ToggleSwitch
          checked={settings.emailNotificationsEnabled}
          onChange={(v) => toggle("emailNotificationsEnabled", v)}
        />
      </div>

      {/* Push notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Push notifications</p>
          <p className="text-xs text-zinc-500">
            {isSupported ? "Browser push notifications" : "Not supported in this browser"}
          </p>
        </div>
        <ToggleSwitch
          checked={isSubscribed}
          onChange={(v) => (v ? subscribe() : unsubscribe())}
          disabled={!isSupported}
        />
      </div>

      {updateSettings.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">Failed to update settings</p>
      )}
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
  const timezones = Intl.supportedValuesOf("timeZone");

  if (isLoading || !settings) return <SectionSkeleton />;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Timezone</h2>
      <p className="text-xs text-zinc-500">
        Detected: {detectedTz}
      </p>
      <Select
        value={settings.timezone}
        onValueChange={(value) => updateSettings.mutate({ timezone: value })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {timezones.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updateSettings.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">Failed to update timezone</p>
      )}
    </section>
  );
}

function AccountSection() {
  const { signOut } = useAuth();
  const router = useRouter();
  const deleteAccount = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>

      <button
        onClick={signOut}
        className="w-full rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
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
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to delete account. Please try again.
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete my account"}
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-8 px-4 py-6">
        <ProfileSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <NotificationsSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <TimezoneSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <AccountSection />
      </div>
    </div>
  );
}

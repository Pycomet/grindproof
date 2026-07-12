"use client";

import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { MobileNav } from "@/components/MobileNav";
import { SetupRedirect } from "@/components/setup/SetupRedirect";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <NotificationProvider>
        <SetupRedirect />
        <ChatProvider>
          <div className="pb-16 lg:pb-0">
            {children}
            <MobileNav />
          </div>
        </ChatProvider>
      </NotificationProvider>
    </TaskProvider>
  );
}

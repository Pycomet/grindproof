"use client";

import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <NotificationProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </NotificationProvider>
    </TaskProvider>
  );
}

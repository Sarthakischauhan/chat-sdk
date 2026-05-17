'use client';
import { Trash2 } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useChat } from '../Chat/chat.context';
import { SidebarThreadActions } from './sidebar.action';

export function SidebarThread() {
  const { activeThreadId, deleteThread, selectThread, threads } = useChat();

  return (
    <SidebarMenu>
      {threads.map((thread) => (
        <SidebarMenuItem key={thread.id}>
          <SidebarMenuButton
            isActive={thread.id === activeThreadId}
            onClick={() => void selectThread(thread.id)}
            tooltip={thread.title}
            className="cursor-pointer"
          >
            <span>{thread.title}</span>
          </SidebarMenuButton>
          <SidebarThreadActions
            title={thread.title}
            actions={[
              {
                id: 'delete',
                label: 'Delete',
                icon: <Trash2 className="size-4" />,
                onClick: () => deleteThread(thread.id),
              },
            ]}
          />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

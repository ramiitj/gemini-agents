import { useState } from "react";
import { Bell, Check, MessageSquare, Rocket, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: "message" | "deployment" | "approval" | "member";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

// Mock notifications for now
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "approval",
    title: "Deployment needs approval",
    description: "marketing-site is ready for review",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "message",
    title: "New comment",
    description: "Sarah commented on your deployment",
    time: "15 min ago",
    read: false,
  },
  {
    id: "3",
    type: "deployment",
    title: "Deployment successful",
    description: "dashboard-app deployed to production",
    time: "1 hour ago",
    read: true,
  },
  {
    id: "4",
    type: "member",
    title: "New team member",
    description: "Alex joined the workspace",
    time: "2 hours ago",
    read: true,
  },
];

const notificationIcons = {
  message: <MessageSquare className="h-4 w-4" />,
  deployment: <Rocket className="h-4 w-4" />,
  approval: <Check className="h-4 w-4" />,
  member: <UserPlus className="h-4 w-4" />,
};

const notificationColors = {
  message: "text-blue-600",
  deployment: "text-green-600",
  approval: "text-amber-600",
  member: "text-purple-600",
};

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex gap-3 p-3 cursor-pointer ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${
                    notificationColors[notification.type]
                  }`}
                >
                  {notificationIcons[notification.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notification.time}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;

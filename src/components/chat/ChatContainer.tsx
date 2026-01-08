import { useState } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  codeChanges?: {
    file: string;
    diff: string;
  }[];
  status?: "pending" | "complete" | "error";
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "system",
    content: "Connected to marketing-site repository",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "2",
    role: "user",
    content: "Add a testimonials section below the hero with 3 customer quotes",
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: "3",
    role: "assistant",
    content: "I'll create a testimonials section with 3 customer quotes. Creating Testimonials.tsx and updating index.tsx.",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    status: "complete",
    codeChanges: [
      {
        file: "src/components/Testimonials.tsx",
        diff: `+ const testimonials = [
+   { name: "Sarah Chen", role: "CEO", quote: "..." },
+   { name: "Mike Johnson", role: "CTO", quote: "..." },
+   { name: "Emily Davis", role: "PM", quote: "..." },
+ ];`,
      },
      {
        file: "src/pages/index.tsx",
        diff: `+ import Testimonials from "@/components/Testimonials";
  ...
+       <Testimonials />`,
      },
    ],
  },
  {
    id: "4",
    role: "system",
    content: "Preview deployed successfully",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
];

const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate AI response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I understand. Let me make that change for you.",
        timestamp: new Date(),
        status: "pending",
      };
      setMessages((prev) => [...prev, aiResponse]);

      // Simulate completion
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiResponse.id ? { ...m, status: "complete" as const } : m
          )
        );

        // Add system message for deployment
        const deployMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "system",
          content: "Building preview...",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, deployMessage]);

        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === deployMessage.id
                ? { ...m, content: "Preview deployed successfully" }
                : m
            )
          );
        }, 2000);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} isTyping={isTyping} />
      <ChatInput onSend={handleSend} />
    </div>
  );
};

export default ChatContainer;

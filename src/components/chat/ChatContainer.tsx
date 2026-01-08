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
    content: "I'll create a testimonials section with 3 customer quotes. I'm adding a new Testimonials component and importing it into the home page.",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    codeChanges: [
      {
        file: "src/components/Testimonials.tsx",
        diff: "+ const testimonials = [\n+   { name: \"Sarah Chen\", role: \"CEO\", quote: \"...\" },\n+   { name: \"Mike Johnson\", role: \"CTO\", quote: \"...\" },\n+   { name: \"Emily Davis\", role: \"PM\", quote: \"...\" },\n+ ];",
      },
    ],
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
    
    // Simulate AI typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I understand. Let me make that change for you.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
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

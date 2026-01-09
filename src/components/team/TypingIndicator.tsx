interface TypingUser {
  id: string;
  name: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.name).join(", ");
  const verb = typingUsers.length === 1 ? "is" : "are";

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: "300ms" }}
        />
      </span>
      <span>
        {names} {verb} typing...
      </span>
    </div>
  );
};

export default TypingIndicator;

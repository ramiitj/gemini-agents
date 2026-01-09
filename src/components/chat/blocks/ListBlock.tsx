interface ListBlockProps {
  content: string;
}

export default function ListBlock({ content }: ListBlockProps) {
  const items = content.split('\n').map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  
  return (
    <ul className="space-y-1.5 my-2 ml-1">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          <span className="text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

import { Info, AlertTriangle, AlertCircle } from "lucide-react";

interface NoteBlockProps {
  content: string;
  type?: 'info' | 'warning' | 'important';
}

export default function NoteBlock({ content, type = 'info' }: NoteBlockProps) {
  const config = {
    info: {
      icon: <Info className="h-4 w-4" />,
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
      textClass: 'text-blue-700 dark:text-blue-300'
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-700 dark:text-amber-300'
    },
    important: {
      icon: <AlertCircle className="h-4 w-4" />,
      bgClass: 'bg-orange-500/10 border-orange-500/30',
      iconClass: 'text-orange-600 dark:text-orange-400',
      textClass: 'text-orange-700 dark:text-orange-300'
    }
  };
  
  const { icon, bgClass, iconClass, textClass } = config[type];
  
  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 my-2 ${bgClass}`}>
      <span className={`flex-shrink-0 mt-0.5 ${iconClass}`}>
        {icon}
      </span>
      <p className={`text-sm ${textClass}`}>{content}</p>
    </div>
  );
}

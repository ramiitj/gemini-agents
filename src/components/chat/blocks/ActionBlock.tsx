import { Check, Loader2, User, AlertCircle } from "lucide-react";

interface ActionBlockProps {
  content: string;
  actor: 'agent' | 'user';
  status?: 'pending' | 'in_progress' | 'complete' | 'error';
}

export default function ActionBlock({ content, actor, status = 'complete' }: ActionBlockProps) {
  if (actor === 'user') {
    return (
      <div className="flex items-start gap-3 bg-purple-500/10 border-l-4 border-purple-500 px-4 py-3 rounded-r-md my-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 flex-shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-sm text-purple-700 dark:text-purple-300">{content}</p>
      </div>
    );
  }
  
  // Agent actions
  const statusConfig = {
    pending: {
      icon: <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />,
      bgClass: 'bg-slate-500/10 border-slate-400',
      iconBgClass: 'bg-slate-500/20',
      textClass: 'text-slate-600 dark:text-slate-400'
    },
    in_progress: {
      icon: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
      bgClass: 'bg-blue-500/10 border-blue-500',
      iconBgClass: 'bg-blue-500/20',
      textClass: 'text-blue-700 dark:text-blue-300'
    },
    complete: {
      icon: <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />,
      bgClass: 'bg-green-500/10 border-green-500',
      iconBgClass: 'bg-green-500/20',
      textClass: 'text-green-700 dark:text-green-300'
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
      bgClass: 'bg-red-500/10 border-red-500',
      iconBgClass: 'bg-red-500/20',
      textClass: 'text-red-700 dark:text-red-300'
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={`flex items-start gap-3 border-l-4 px-4 py-3 rounded-r-md my-2 ${config.bgClass}`}>
      <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 mt-0.5 ${config.iconBgClass}`}>
        {config.icon}
      </div>
      <p className={`text-sm ${config.textClass}`}>{content}</p>
    </div>
  );
}

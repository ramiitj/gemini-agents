import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  password: string;
  isCheckingPwned: boolean;
  isPwnedPassword: boolean | null;
}

interface CheckItemProps {
  label: string;
  passed: boolean;
  loading?: boolean;
}

const CheckItem = ({ label, passed, loading = false }: CheckItemProps) => (
  <div className="flex items-center gap-2 text-xs">
    {loading ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    ) : passed ? (
      <Check className="h-3.5 w-3.5 text-green-500" />
    ) : (
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    )}
    <span className={cn(
      "transition-colors",
      passed ? "text-foreground" : "text-muted-foreground"
    )}>
      {label}
    </span>
  </div>
);

export const PasswordChecklist = ({ 
  password, 
  isCheckingPwned,
  isPwnedPassword 
}: PasswordChecklistProps) => {
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  // Only show pwned check result if we have a password of sufficient length
  const showPwnedCheck = password.length >= 6;
  const pwnedCheckPassed = showPwnedCheck && isPwnedPassword === false;

  return (
    <div className="space-y-1.5 pt-1">
      <CheckItem 
        label="At least 6 characters" 
        passed={hasMinLength} 
      />
      <CheckItem 
        label="Contains uppercase letter" 
        passed={hasUppercase} 
      />
      <CheckItem 
        label="Contains lowercase letter" 
        passed={hasLowercase} 
      />
      <CheckItem 
        label="Contains a number" 
        passed={hasNumber} 
      />
      {showPwnedCheck && (
        <CheckItem 
          label="Not a commonly compromised password" 
          passed={pwnedCheckPassed}
          loading={isCheckingPwned}
        />
      )}
    </div>
  );
};
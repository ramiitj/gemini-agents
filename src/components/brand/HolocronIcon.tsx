import { cn } from "@/lib/utils";

interface HolocronIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const HolocronIcon = ({ className, size = "md" }: HolocronIconProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
    >
      {/* Outer crystal shape */}
      <path
        d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
        className="fill-primary"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner glow/core */}
      <path
        d="M12 6L7 9V15L12 18L17 15V9L12 6Z"
        className="fill-primary"
        fillOpacity="0.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Center point */}
      <circle
        cx="12"
        cy="12"
        r="2"
        className="fill-primary"
      />
      {/* Connecting lines */}
      <path
        d="M12 2V6M12 18V22M3 7L7 9M17 9L21 7M3 17L7 15M17 15L21 17"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
    </svg>
  );
};

export default HolocronIcon;

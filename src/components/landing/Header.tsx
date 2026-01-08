import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            Product Compass
          </span>
        </div>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
          <Button size="sm">Get started</Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

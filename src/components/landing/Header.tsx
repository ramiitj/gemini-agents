import { Button } from "@/components/ui/button";
import { HolocronIcon } from "@/components/brand/HolocronIcon";
import { Link } from "react-router-dom";

const Header = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <HolocronIcon className="h-5 w-5 text-primary" />
          <span className="text-base font-medium text-foreground">
            GetHolocron
          </span>
        </div>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <button
            onClick={() => scrollToSection("features")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </button>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

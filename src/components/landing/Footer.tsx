import { Compass } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              Product Compass
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Documentation
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2026 Product Compass
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

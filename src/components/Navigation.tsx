import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoWhite from "@/assets/logos/logo-white.png";
import logoBlue from "@/assets/logos/logo-blue.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { navLinks } from "./navigation/navigationData";
import { SolutionsMegaMenu } from "./navigation/SolutionsMegaMenu";
import { IndustriesMegaMenu } from "./navigation/IndustriesMegaMenu";
import { ResourcesMegaMenu } from "./navigation/ResourcesMegaMenu";
import { PricingMegaMenu } from "./navigation/PricingMegaMenu";
import { HowItWorksMegaMenu } from "./navigation/HowItWorksMegaMenu";
import { MobileNavigation } from "./navigation/MobileNavigation";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const isHomepage = location.pathname === "/";
  // Always use dark text - all backgrounds are light (homepage gradient-mesh and glass nav)
  const useDarkText = true;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const triggerClassName = cn(
    "rounded-full px-4 py-2 bg-transparent transition-all duration-300 relative",
    useDarkText
      ? "text-heading hover:bg-heading/5 data-[state=open]:bg-heading/10"
      : "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10 data-[state=open]:bg-white/15"
  );

  const linkClassName = cn(
    "px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full relative group",
    useDarkText
      ? "text-heading hover:text-heading/70 hover:bg-heading/5"
      : "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
  );

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ ["--header-height" as any]: isScrolled || !isHomepage ? "80px" : "96px" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled || !isHomepage 
          ? "glass-nav py-2" 
          : "bg-transparent py-4"
      )}
    >
      <div className="container-custom">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center group"
            aria-label="24H Virtual - Go to homepage"
          >
            <motion.img
              src={useDarkText ? logoBlue : logoWhite}
              alt="24H Virtual logo"
              className="h-8 md:h-10 w-auto transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-1">
            <NavigationMenu fullWidth>
              <NavigationMenuList className="gap-1">
                {/* Solutions Super Mega Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClassName}>
                    Solutions
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-dropdown-full">
                    <SolutionsMegaMenu />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Industries Super Mega Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClassName}>
                    Industries
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-dropdown-full">
                    <IndustriesMegaMenu />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Resources Super Mega Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClassName}>
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-dropdown-full">
                    <ResourcesMegaMenu />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Pricing Super Mega Menu (outcome-based) */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClassName}>
                    Pricing
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-dropdown-full">
                    <PricingMegaMenu />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* How It Works Super Mega Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClassName}>
                    How It Works
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-dropdown-full">
                    <HowItWorksMegaMenu />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Direct Links */}
                {navLinks.map((link) => (
                  <NavigationMenuItem key={link.name}>
                    <Link to={link.href} className={linkClassName}>
                      {link.name}
                      {/* Animated underline */}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-current rounded-full transition-all duration-300 group-hover:w-3/4" />
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side CTAs */}
          <div className="hidden xl:flex items-center gap-3">
            <Link
              to="/login"
              className={cn(
                "text-sm font-medium transition-all duration-300 px-4 py-2 rounded-full relative group",
                useDarkText
                  ? "text-heading hover:text-heading/70 hover:bg-heading/5"
                  : "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
              )}
            >
              Login
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-current rounded-full transition-all duration-300 group-hover:w-1/2" />
            </Link>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="cta" 
                className="rounded-full group relative overflow-hidden px-6 glow-on-hover" 
                asChild
              >
                <Link to="/get-started">
                  <span className="relative z-10 flex items-center">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <motion.span 
                    className="absolute inset-0 bg-white/20"
                    initial={{ y: "100%" }}
                    whileHover={{ y: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild className="xl:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileOpen}
                className={cn(
                  "rounded-full transition-all duration-300 relative",
                  useDarkText 
                    ? "text-heading hover:bg-heading/5" 
                    : "text-primary-foreground hover:bg-white/10"
                )}
              >
                <AnimatePresence mode="wait">
                  {isMobileOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-6 w-6" aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:w-[420px] sm:max-w-[420px] border-none p-0 bg-background [&>button]:top-5 [&>button]:right-5 [&>button]:z-20 [&>button]:bg-background/80 [&>button]:backdrop-blur-md [&>button]:rounded-full [&>button]:p-2 [&>button]:opacity-100 [&>button]:shadow-soft [&>button>svg]:h-4 [&>button>svg]:w-4"
            >
              <MobileNavigation onClose={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </motion.header>
  );
}

// Landing page components
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <InteractiveDemo />
        <Features id="features" />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import PricingSection from "@/components/landing/PricingSection";
import SecuritySection from "@/components/landing/SecuritySection";
import Footer from "@/components/landing/Footer";


export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <FeatureGrid />
      <FeatureGrid />
<PricingSection />
<SecuritySection />
<Footer />
    </main>
  );
}
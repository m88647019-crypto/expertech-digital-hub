import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesGrid from "@/components/ServicesGrid";
import WhyExpertech from "@/components/WhyExpertech";
import BranchToggle from "@/components/BranchToggle";
import UploadPrint from "@/components/UploadPrint";
import BookingForm from "@/components/BookingForm";
import Footer from "@/components/Footer";
import WhatsAppFAB from "@/components/WhatsAppFAB";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesGrid />
        <WhyExpertech />
        <BranchToggle />
        <UploadPrint />
        <BookingForm />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
};

export default Index;

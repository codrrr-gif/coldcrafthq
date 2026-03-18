import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PainPoints from "@/components/PainPoints";
import System from "@/components/System";
import Process from "@/components/Process";
import Comparison from "@/components/Comparison";
import Deliverables from "@/components/Deliverables";
import FoundingClients from "@/components/FoundingClients";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <System />
        <Process />
        <Comparison />
        <Deliverables />
        <FoundingClients />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

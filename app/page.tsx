import Hero from "@/components/landing/Hero";
import PainPoints from "@/components/landing/PainPoints";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";

/**
 * Landing 首页：Hero → 痛点 → 功能 → 使用流程 → 页脚。
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <PainPoints />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}

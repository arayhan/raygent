import { Header } from './components/Header';
import { LightField } from './components/LightField';
import { ParticleField } from './components/ParticleField';
import { Hero } from './sections/Hero';
import { Why } from './sections/Why';
import { Flagship } from './sections/Flagship';
import { Features } from './sections/Features';
import { Compare } from './sections/Compare';
import { Docs } from './sections/Docs';
import { Examples } from './sections/Examples';
import { Founder } from './sections/Founder';
import { Cta } from './sections/Cta';
import { Footer } from './components/Footer';
import { LanguageProvider, useT } from './i18n/LanguageProvider';

function SkipLink() {
  const t = useT();
  return (
    <a href="#main" className="btn btn-primary skip-link">
      {t.ui.skip}
    </a>
  );
}

export function App() {
  return (
    <LanguageProvider initial="en">
      <SkipLink />
      <LightField />
      <ParticleField />
      <Header />
      <main id="main" className="relative z-10">
        <Hero />
        <Why />
        <Flagship />
        <Features />
        <Compare />
        <Docs />
        <Examples />
        <Founder />
        <Cta />
      </main>
      <Footer />
    </LanguageProvider>
  );
}

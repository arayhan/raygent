import { Header } from './components/Header';
import { Hero } from './sections/Hero';
import { Why } from './sections/Why';
import { Flagship } from './sections/Flagship';
import { Features } from './sections/Features';
import { Compare } from './sections/Compare';
import { Docs } from './sections/Docs';
import { Examples } from './sections/Examples';

export function App() {
  return (
    <>
      <a href="#main" className="btn btn-primary skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Why />
        <Flagship />
        <Features />
        <Compare />
        <Docs />
        <Examples />
      </main>
    </>
  );
}

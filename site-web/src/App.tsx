import { Header } from './components/Header';

export function App() {
  return (
    <>
      <a href="#main" className="btn btn-primary skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" />
    </>
  );
}

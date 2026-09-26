import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24">
      <h1 className="text-5xl font-bold text-white mb-4">Parakh AI</h1>
      <p className="text-slate-400 text-lg max-w-xl mb-8">
        An AI-powered compliance checker for packaged commodities under the
        Legal Metrology (Packaged Commodities) Rules, 2011 — scan a product
        label and get an instant, explainable compliance verdict.
      </p>
      <Link to="/check" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition">
        Check a Product
      </Link>
    </div>
  );
}
export default HomePage;

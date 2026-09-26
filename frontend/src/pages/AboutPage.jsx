function AboutPage() {
  const steps = [
    ['Scan', 'Product, package, or label image is captured or uploaded.'],
    ['Understand', 'OCR + Computer Vision extract relevant declarations and label information.'],
    ['Verify', 'An updatable Legal Metrology rule engine validates the extracted data.'],
    ['Flag', 'Missing, inconsistent, or non-compliant declarations are highlighted.'],
    ['Report', 'An explainable compliance report is generated for review and action.'],
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-6">How It Works</h1>
      <div className="space-y-4 mb-10">
        {steps.map(([title, desc], i) => (
          <div key={title} className="bg-slate-800 rounded-lg p-4 flex gap-4">
            <span className="text-blue-400 font-bold">{i + 1}</span>
            <div>
              <p className="text-white font-semibold">{title}</p>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-bold text-white mb-3">Tech Stack</h2>
      <p className="text-slate-400 text-sm">
        React, Tailwind CSS, Node.js, Express, MongoDB, Python, FastAPI, EasyOCR/PaddleOCR, OpenCV.
      </p>
    </div>
  );
}
export default AboutPage;

import { useState } from 'react';
import UploadScreen from '../components/UploadScreen';
import ResultsScreen from '../components/ResultsScreen';

function CheckPage() {
  const [result, setResult] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  function handleResult(data, previewUrl) {
    setResult(data);
    setImageUrl(previewUrl);
  }
  function handleReset() {
    setResult(null);
    setImageUrl(null);
  }

  if (result) return <ResultsScreen result={result} imageUrl={imageUrl} onReset={handleReset} />;
  return <UploadScreen onResult={handleResult} />;
}
export default CheckPage;

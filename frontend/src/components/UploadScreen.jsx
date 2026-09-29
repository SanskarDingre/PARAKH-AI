import { useState, useRef, useCallback } from 'react';
import { inspectImage } from '../api/inspectAPI';
import { UploadCloud, Camera, X, ScanLine } from 'lucide-react';

function UploadScreen({ onResult }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function setFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  function handleFileChange(e) {
    setFile(e.target.files[0]);
  }

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setFile(file);
    else setError('Please drop an image file.');
  }, []);

  // Camera
  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setShowCamera(true);
      // wait for DOM
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      setError('Camera access denied or not available.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setFile(file);
      stopCamera();
    }, 'image/jpeg', 0.9);
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const result = await inspectImage(selectedFile);
      onResult(result, previewUrl);
    } catch {
      setError('Something went wrong. Make sure the backend and OCR service are running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/30 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <ScanLine size={15} />
          Compliance Check
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Scan a Product Label</h1>
        <p className="text-slate-400 text-sm">Upload or capture an image of the package label to check Legal Metrology compliance.</p>
      </div>

      {/* Camera view */}
      {showCamera && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden mb-4 relative">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-t-2xl" />
          <div className="flex gap-3 p-3 justify-center bg-slate-900">
            <button
              onClick={capturePhoto}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Camera size={18} /> Capture
            </button>
            <button
              onClick={stopCamera}
              className="text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload / Drop zone */}
      {!showCamera && (
        <>
          {previewUrl ? (
            <div className="relative mb-4">
              <img src={previewUrl} alt="Preview" className="w-full rounded-2xl border border-slate-700 max-h-72 object-contain bg-slate-950" />
              <button
                onClick={clearSelection}
                className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 rounded-full p-1.5 text-slate-300 hover:text-white transition"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-lg text-slate-400 text-xs">
                {selectedFile.name}
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-4 ${
                isDragging
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud size={36} className={`mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-slate-600'}`} />
              <p className="text-slate-300 font-medium mb-1">
                {isDragging ? 'Drop your image here' : 'Drag & drop an image here'}
              </p>
              <p className="text-slate-500 text-sm">or click to browse — JPG, PNG, WEBP accepted</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {/* Camera button */}
          {!previewUrl && (
            <button
              onClick={openCamera}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition mb-4"
            >
              <Camera size={18} />
              Use Camera
            </button>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedFile || loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analysing…
          </>
        ) : (
          <>
            <ScanLine size={18} />
            Check Compliance
          </>
        )}
      </button>
      {loading && (
        <p className="text-slate-500 text-xs text-center mt-3">
          Running OCR and rule engine — this may take 10–30 seconds on first run.
        </p>
      )}
    </div>
  );
}
export default UploadScreen;

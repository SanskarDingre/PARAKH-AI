import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import CheckPage from './pages/CheckPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/check" element={<CheckPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;

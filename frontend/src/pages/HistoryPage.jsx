import { useNavigate } from 'react-router-dom';
import HistoryScreen from '../components/HistoryScreen';

function HistoryPage() {
  const navigate = useNavigate();
  return <HistoryScreen onBack={() => navigate('/check')} />;
}
export default HistoryPage;


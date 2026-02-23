import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Training from './pages/Training';
import Summary from './pages/Summary';
import History from './pages/History';
import Login from './pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/training" element={<Training />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/history" element={<History />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

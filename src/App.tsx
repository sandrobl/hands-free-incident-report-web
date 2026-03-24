import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import UnauthScreen from './components/UnauthScreen';
import Dashboard from './components/Dashboard';

export default function App() {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <>
      <Header />
      {isLoading      ? <LoadingScreen /> :
       !isAuthenticated ? <UnauthScreen /> :
       <Dashboard />}
    </>
  );
}

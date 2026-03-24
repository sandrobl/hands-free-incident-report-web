import { useAuth } from '../context/AuthContext';

export default function UnauthScreen() {
  const { login } = useAuth();

  return (
    <div className="state-screen">
      <div className="state-tag">Access Required</div>
      <div className="state-headline">Admin Portal</div>
      <div className="state-sub">
        Sign in with your authorised account to view incident reports.
      </div>
      <button className="btn btn-login" onClick={login}>
        Log In
      </button>
    </div>
  );
}

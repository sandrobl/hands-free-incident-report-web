import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { isLoading, isAuthenticated, user, login, logout } = useAuth();

  return (
    <header>
      <div className="logo">
        Hands<em>—</em>Free <em>//</em> Incident Admin
      </div>
      <div id="auth-area">
        {isAuthenticated && user && (
          <span id="user-email">{user.email ?? user.name ?? ''}</span>
        )}
        {!isLoading && !isAuthenticated && (
          <button className="btn btn-login" onClick={login}>
            Log In
          </button>
        )}
        {isAuthenticated && (
          <button className="btn" onClick={logout}>
            Log Out
          </button>
        )}
      </div>
    </header>
  );
}

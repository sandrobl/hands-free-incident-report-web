import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { createAuth0Client, Auth0Client, User } from '@auth0/auth0-spa-js';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from '../config';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Keep the client in a ref so callbacks stay stable across renders
  const clientRef = useRef<Auth0Client | null>(null);
  const didInit   = useRef(false);

  const [isLoading,       setIsLoading]       = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user,            setUser]            = useState<User | undefined>();

  useEffect(() => {
    // Guard against StrictMode double-invoke
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      const c = await createAuth0Client({
        domain:   AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        authorizationParams: {
          redirect_uri: window.location.origin,
          audience: AUTH0_AUDIENCE,
        },
        cacheLocation: 'localstorage',
      });

      clientRef.current = c;

      if (window.location.search.includes('code=')) {
        await c.handleRedirectCallback();
        window.history.replaceState({}, document.title, '/');
      }

      const authed = await c.isAuthenticated();
      const u      = authed ? await c.getUser() : undefined;

      setIsAuthenticated(authed);
      setUser(u);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(() => {
    clientRef.current?.loginWithRedirect();
  }, []);

  const logout = useCallback(() => {
    clientRef.current?.logout({ logoutParams: { returnTo: window.location.origin } });
  }, []);

  const getToken = useCallback((): Promise<string> => {
    if (!clientRef.current) return Promise.reject(new Error('Auth client not ready'));
    return clientRef.current.getTokenSilently();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

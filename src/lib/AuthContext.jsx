import React, { createContext, useState, useContext, useEffect } from 'react';
import { clearAccessToken, get, post } from '@/services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAccessToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      const returnTo = window.location.pathname + window.location.search;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    };
    window.addEventListener('datafin:session-expired', handleExpiredSession);
    return () => window.removeEventListener('datafin:session-expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const renewalInterval = 12 * 60 * 60 * 1000;
    let lastRenewed = Date.now();
    let renewing = false;
    const renewSession = async () => {
      if (renewing || Date.now() - lastRenewed < renewalInterval) return;
      renewing = true;
      try {
        await post('auth.renew');
        lastRenewed = Date.now();
      } catch (error) {
        if (error.status === 401) {
          window.dispatchEvent(new CustomEvent('datafin:session-expired'));
        } else {
          console.error('Não foi possível renovar a sessão.', error);
        }
      } finally {
        renewing = false;
      }
    };

    const interval = window.setInterval(renewSession, 60 * 60 * 1000);
    window.addEventListener('focus', renewSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', renewSession);
    };
  }, [isAuthenticated]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await get('auth.publicSettings');
        setAppPublicSettings(publicSettings);
        
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        if (appError.status === 401 || appError.status === 403) {
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required'
          });
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await get('auth.me');
      await post('auth.renew');
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    await post('auth.logout');
    window.google?.accounts?.id?.disableAutoSelect?.();
    clearAccessToken();
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

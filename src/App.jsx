import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PreferencesProvider } from '@/lib/preferences';
import { isPublicPath } from '@/lib/publicRoutes';
import AppLayout from '@/components/layout/AppLayout';
import PublicLayout from '@/components/public/PublicLayout';
import Articles from '@/pages/public/Articles';
import Article from '@/pages/public/Article';
import About from '@/pages/public/About';
import Contact from '@/pages/public/Contact';
import Privacy from '@/pages/public/Privacy';
import Terms from '@/pages/public/Terms';
import OAuthConsent from '@/pages/OAuthConsent';

// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Consolidated from '@/pages/Consolidated';
import Transactions from '@/pages/Transactions';
import Accounts from '@/pages/Accounts';
import Budgets from '@/pages/Budgets';
import Goals from '@/pages/Goals';
import Debts from '@/pages/Debts';
import Investments from '@/pages/Investments';
import Dre from '@/pages/Dre';
import Pricing from '@/pages/Pricing';
import TaxSimulator from '@/pages/TaxSimulator';
import Backup from '@/pages/Backup';
import Settings from '@/pages/Settings';
import InvoiceImport from '@/pages/InvoiceImport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Public pages remain available without an account.
  if (authError && !isPublicPath(window.location.pathname)) {
    if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Rotas de autenticação */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />

      {/* Área pública: conteúdo editorial e páginas institucionais */}
      <Route element={<PublicLayout />}>
        <Route path="/artigos" element={<Articles />} />
        <Route path="/artigos/:slug" element={<Article />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route path="/termos" element={<Terms />} />
      </Route>

      {/* Área autenticada */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consolidado" element={<Consolidated />} />
          <Route path="/lancamentos" element={<Transactions />} />
          <Route path="/contas" element={<Accounts />} />
          <Route path="/importar-fatura" element={<InvoiceImport />} />
          <Route path="/orcamento" element={<Budgets />} />
          <Route path="/metas" element={<Goals />} />
          <Route path="/dividas" element={<Debts />} />
          <Route path="/investimentos" element={<Investments />} />
          <Route path="/dre" element={<Dre />} />
          <Route path="/precificacao" element={<Pricing />} />
          <Route path="/simulador-tributario" element={<TaxSimulator />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PreferencesProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </PreferencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
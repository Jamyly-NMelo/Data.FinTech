import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PreferencesProvider } from '@/lib/preferences';
import { isPublicPath } from '@/lib/publicRoutes';
import AppLayout from '@/components/layout/AppLayout';
import PublicLayout from '@/components/public/PublicLayout';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Articles = lazy(() => import('@/pages/public/Articles'));
const Article = lazy(() => import('@/pages/public/Article'));
const About = lazy(() => import('@/pages/public/About'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const Privacy = lazy(() => import('@/pages/public/Privacy'));
const Terms = lazy(() => import('@/pages/public/Terms'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Consolidated = lazy(() => import('@/pages/Consolidated'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const Budgets = lazy(() => import('@/pages/Budgets'));
const Goals = lazy(() => import('@/pages/Goals'));
const Debts = lazy(() => import('@/pages/Debts'));
const Investments = lazy(() => import('@/pages/Investments'));
const Dre = lazy(() => import('@/pages/Dre'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const TaxSimulator = lazy(() => import('@/pages/TaxSimulator'));
const Backup = lazy(() => import('@/pages/Backup'));
const Settings = lazy(() => import('@/pages/Settings'));
const InvoiceImport = lazy(() => import('@/pages/InvoiceImport'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
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
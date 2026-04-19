/**
 * App.jsx — Route definitions
 *
 * WHY lazy loading: Chat and Login are large components. Lazy loading them
 * means the initial page load only fetches Home — the chat interface (with
 * all its libraries) downloads only when the user navigates there.
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Eagerly loaded — fast homepage
import Home from './pages/Home';

// Lazy loaded — only downloaded when navigated to
const Login = lazy(() => import('./pages/Login'));
const Chat = lazy(() => import('./pages/Chat'));

// Guard component: redirect to /login if not authenticated
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Full-screen spinner while lazy components load
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading NyayaBot...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:sessionId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

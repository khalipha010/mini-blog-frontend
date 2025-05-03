import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/NavBar';
import Home from './components/Home';
import Feed from './components/Feed';
import Login from './components/Login';
import Register from './components/Register';
import CreatePost from './components/CreatePost';
import MyPosts from './components/MyPosts';
import EditPost from './components/EditPost';
import Profile from './components/Profile';
import Search from './components/Search';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword'; // Import ResetPassword
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} /> {/* Add ResetPassword route */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/feed" element={<Feed />} />
                    <Route path="/create-post" element={<CreatePost />} />
                    <Route path="/my-posts" element={<MyPosts />} />
                    <Route path="/edit-post/:id" element={<EditPost />} />
                    <Route path="/profile/:userId" element={<Profile />} />
                    <Route path="/search" element={<Search />} />
                  </Route>
                  <Route path="*" element={<div className="text-center mt-8">404 - Page Not Found</div>} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

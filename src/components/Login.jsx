import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/login`, form);
      login(response.data.token, response.data.user);
      setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/feed'), 1500);
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ 
        text: error.response?.data.message || 'Login failed. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 100,
        damping: 10
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 20px -6px var(--accent)',
      transition: { type: 'spring', stiffness: 400 }
    },
    tap: { scale: 0.98 }
  };

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-bg)]"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div 
        className="glass w-full max-w-md p-8 sm:p-10 rounded-[var(--radius-lg)] backdrop-blur-lg border border-opacity-20 border-[var(--border)] shadow-2xl"
        variants={itemVariants}
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-3xl font-bold text-[var(--text-primary)] mb-2"
            variants={itemVariants}
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            className="text-[var(--text-secondary)]"
            variants={itemVariants}
          >
            Sign in to access your account
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-3 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-10 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                )}
              </button>
            </div>
          </motion.div>

          <motion.div className="flex items-center justify-between" variants={itemVariants}>
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)] border-[var(--border)] rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--text-secondary)]">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link 
                to="/forgot-password" 
                className="font-medium text-[var(--accent)] hover:text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius-md)] shadow-sm text-lg font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Sign In'}
            </motion.button>
          </motion.div>
        </form>

        {message.text && (
          <motion.div 
            className={`mt-6 p-4 rounded-[var(--radius-md)] ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {message.text}
          </motion.div>
        )}

        <motion.div className="mt-6 text-center" variants={itemVariants}>
          <p className="text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-[var(--accent)] hover:text-[var(--accent)] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default Login;
import { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserIcon, CameraIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('confirmPassword', formData.confirmPassword);
      if (profilePicture) data.append('profilePicture', profilePicture);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/register`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      login(response.data.token, response.data.user);
      setMessage({ 
        text: `Welcome, ${response.data.user.username}! Registration successful.`, 
        type: 'success' 
      });
      setTimeout(() => navigate('/feed'), 1500);
    } catch (error) {
      setMessage({ 
        text: error.response?.data.message || 'Registration failed', 
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
            Create Your Account
          </motion.h1>
          <motion.p 
            className="text-[var(--text-secondary)]"
            variants={itemVariants}
          >
            Join our community today
          </motion.p>
        </div>

        {/* Profile Picture Upload */}
        <motion.div className="flex justify-center mb-6" variants={itemVariants}>
          <div 
            className="relative w-24 h-24 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--border)] cursor-pointer group"
            onClick={() => fileInputRef.current.click()}
          >
            {previewImage ? (
              <img 
                src={previewImage} 
                alt="Profile preview" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-[var(--text-secondary)]">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <CameraIcon className="w-6 h-6 text-white" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="Choose a username"
                required
              />
            </div>
          </motion.div>

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
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius-md)] shadow-sm text-lg font-medium text-white bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:from-[var(--accent)] hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
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
              ) : 'Create Account'}
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

        <motion.div className="mt-6 text-center text-sm text-[var(--text-secondary)]" variants={itemVariants}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default Register;
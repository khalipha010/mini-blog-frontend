import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { Bars3Icon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  const linkVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    },
    hover: { 
      scale: 1.05,
      color: 'var(--accent)',
      transition: { type: 'spring', stiffness: 300 }
    },
    tap: { scale: 0.95 }
  };

  const menuVariants = {
    open: { 
      opacity: 1, 
      height: 'auto',
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2,
        ease: [0.17, 0.67, 0.83, 0.67] 
      }
    },
    closed: { 
      opacity: 0, 
      height: 0,
      transition: { 
        staggerChildren: 0.05,
        staggerDirection: -1,
        when: "afterChildren"
      }
    }
  };

  const NavLink = ({ to, children }) => (
    <motion.div 
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      variants={linkVariants}
      className="glass px-3 py-1 rounded-[var(--radius-sm)] backdrop-blur-sm"
      style={{ color: 'var(--text-primary)' }}
    >
      <Link to={to}>
        {children}
      </Link>
    </motion.div>
  );

  const MobileNavLink = ({ to, onClick, children }) => (
    <motion.div 
      variants={linkVariants}
      className="glass my-1 rounded-[var(--radius-sm)] backdrop-blur-sm"
      style={{ color: 'var(--text-primary)' }}
    >
      <Link
        to={to}
        onClick={onClick}
        className="block py-3 px-4 hover:bg-[var(--primary-bg)] hover:bg-opacity-30"
      >
        {children}
      </Link>
    </motion.div>
  );

  return (
    <motion.nav 
      className="glass sticky top-0 z-50 backdrop-blur-lg border-b border-opacity-10 border-[var(--border)]"
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 10 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.98 }}
            className="glass px-3 py-1 rounded-[var(--radius-sm)] backdrop-blur-sm"
          >
            <Link 
              to="/" 
              className="text-xl font-bold font-['Poppins'] bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent"
            >
              Mini Blog
            </Link>
          </motion.div>

          <div className="hidden md:flex items-center space-x-2">
            <NavLink to="/">Home</NavLink>
            
            {user && (
              <>
                <NavLink to="/feed">Feed</NavLink>
                <NavLink to="/search">Search</NavLink>
              </>
            )}

            {user ? (
              <>
                <NavLink to="/create-post">Create Post</NavLink>
                <NavLink to={`/profile/${user.id}`}>Profile</NavLink>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={linkVariants}
                  className="ml-2"
                >
                  <motion.button
                    onClick={handleLogout}
                    className="px-4 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white shadow-lg hover:shadow-[0_0_15px_var(--accent)]"
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 0 20px var(--accent)'
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Log Out
                  </motion.button>
                </motion.div>
              </>
            ) : (
              <>
                <NavLink to="/login">Login</NavLink>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={linkVariants}
                  className="ml-2"
                >
                  <Link 
                    to="/register" 
                    className="px-4 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white shadow-lg hover:shadow-[0_0_15px_var(--accent)]"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </>
            )}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={linkVariants}
            >
              <ThemeToggle />
            </motion.div>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={linkVariants}
            >
              <ThemeToggle />
            </motion.div>
            <motion.button
              onClick={toggleMenu}
              className="glass p-2 rounded-[var(--radius-sm)] backdrop-blur-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden glass mt-2 rounded-lg backdrop-blur-lg border border-opacity-20 border-[var(--border)]"
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
            >
              <div className="px-4 pt-2 pb-4">
                <MobileNavLink to="/" onClick={toggleMenu}>Home</MobileNavLink>
                
                {user && (
                  <>
                    <MobileNavLink to="/feed" onClick={toggleMenu}>Feed</MobileNavLink>
                    <MobileNavLink to="/search" onClick={toggleMenu}>Search</MobileNavLink>
                  </>
                )}

                {user ? (
                  <>
                    <MobileNavLink to="/create-post" onClick={toggleMenu}>Create Post</MobileNavLink>
                    <MobileNavLink to={`/profile/${user.id}`} onClick={toggleMenu}>Profile</MobileNavLink>
                    <motion.div
                      variants={linkVariants}
                      className="mt-2"
                    >
                      <motion.button
                        onClick={handleLogout}
                        className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-[var(--radius-sm)] shadow-lg hover:shadow-[0_0_15px_var(--accent)]"
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: '0 0 20px var(--accent)'
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Log Out
                      </motion.button>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <MobileNavLink to="/login" onClick={toggleMenu}>Login</MobileNavLink>
                    <motion.div
                      variants={linkVariants}
                      className="mt-2"
                    >
                      <Link
                        to="/register"
                        className="block py-3 px-4 bg-[var(--accent)] text-white rounded-[var(--radius-sm)] shadow-lg hover:shadow-[0_0_15px_var(--accent)] text-center"
                        onClick={toggleMenu}
                      >
                        Sign Up
                      </Link>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

export default Navbar;
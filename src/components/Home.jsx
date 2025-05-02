import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    // Debug environment
    console.log('=== Home.jsx useEffect Start ===');
    console.log('Browser user agent:', navigator.userAgent);
    console.log('Is secure context:', window.isSecureContext);
    console.log('Service worker support:', 'serviceWorker' in navigator);
    console.log('localStorage.appInstalled:', localStorage.getItem('appInstalled'));
    console.log('localStorage.installPromptDismissed:', localStorage.getItem('installPromptDismissed'));

    // Simulate loading (replace with asset checks if needed)
    const timer = setTimeout(() => setIsLoading(false), 500);

    // Register service worker
    if ('serviceWorker' in navigator) {
      console.log('Attempting to register service worker...');
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service worker registered:', registration);
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            console.log('All service worker registrations:', registrations);
          });
        })
        .catch((err) => {
          console.error('Service worker registration failed:', err);
        });
    } else {
      console.log('Service worker not supported in this browser');
    }

    // Check if app is installed or prompt dismissed
    const isAppInstalled = localStorage.getItem('appInstalled');
    const dismissedTimestamp = localStorage.getItem('installPromptDismissed');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in ms
    const isDismissed = dismissedTimestamp && now - parseInt(dismissedTimestamp) < oneDay;

    // Debug conditions
    console.log('isAppInstalled:', isAppInstalled);
    console.log('dismissedTimestamp:', dismissedTimestamp);
    console.log('isDismissed (within 24h):', isDismissed);

    // Handle beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      console.log('beforeinstallprompt fired:', e);
      if (!isAppInstalled && !isDismissed) {
        console.log('Showing install prompt');
        setDeferredPrompt(e);
        setShowInstallPrompt(true);
      } else {
        console.log('Prompt suppressed: appInstalled or dismissed within 24h');
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Handle appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      localStorage.setItem('appInstalled', 'true');
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    });

    // Check standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    console.log('Is standalone mode:', isStandalone);
    if (isStandalone && isAppInstalled) {
      console.log('App is running in standalone mode and marked as installed');
      setShowInstallPrompt(false);
    }

    console.log('Final showInstallPrompt:', showInstallPrompt);
    console.log('=== Home.jsx useEffect End ===');

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      return;
    }
    console.log('Prompting install');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install prompt outcome:', outcome);
    if (outcome === 'accepted') {
      localStorage.setItem('appInstalled', 'true');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissPrompt = () => {
    console.log('Dismissing prompt');
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Optional: Uncomment for "Don't Show Again" logic
  /*
  const handleDismissPrompt = () => {
    console.log('Dismissing prompt (Not Now)');
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDontShowAgain = () => {
    console.log('Dismissing prompt (Don’t Show Again)');
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };
  */

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
        duration: 0.5,
      },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
    exit: { opacity: 0, scale: 0.8 },
  };

  return (
    <>
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-[var(--primary-bg)] z-50">
          <img src="/pwa-192x192.png" alt="MiniBlog Logo" className="w-32 h-32" />
        </div>
      ) : (
        <motion.div
          className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:py-16 bg-[var(--primary-bg)]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div className="text-center mb-12" variants={itemVariants}>
              <motion.h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                <span className="bg-gradient-to-r from-[var(--accent)] to-purple-600 bg-clip-text text-transparent">
                  Share Your Story
                </span>
                <br />
                With The World
              </motion.h1>
              <motion.p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                Join our community of creators and thinkers. Express yourself through posts, connect with others, and discover new perspectives.
              </motion.p>
            </motion.div>

            {/* Install Prompt Popup */}
            <AnimatePresence>
              {showInstallPrompt && (
                <motion.div
                  className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-2 sm:px-4"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={modalVariants}
                >
                  <motion.div
                    className="bg-[var(--secondary-bg)] p-3 xs:p-4 sm:p-6 rounded-[var(--radius-lg)] w-[calc(100%-1rem)] xs:w-11/12 sm:w-4/5 md:w-3/5 lg:max-w-lg mx-auto border border-[var(--border)] shadow-lg"
                    variants={modalVariants}
                  >
                    {deferredPrompt ? (
                      <>
                        <h2 className="text-base xs:text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 xs:mb-3 sm:mb-4">
                          Install MiniBlog
                        </h2>
                        <p className="text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] mb-3 xs:mb-4 sm:mb-6">
                          Install MiniBlog for quick access to the full experience.
                        </p>
                        <div className="flex justify-end gap-2 xs:gap-3 sm:gap-4">
                          <button
                            onClick={handleDismissPrompt}
                            className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Not Now
                          </button>
                          <motion.button
                            onClick={handleInstallClick}
                            className="px-3 xs:px-4 sm:px-6 py-1 xs:py-1.5 sm:py-2 bg-gradient-to-r from-[var(--accent)] to-purple-600 text-white rounded-[var(--radius-md)] font-semibold text-xs xs:text-sm sm:text-base"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Install
                          </motion.button>
                        </div>
                      </>
                    ) : isIOS ? (
                      <>
                        <h2 className="text-base xs:text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 xs:mb-3 sm:mb-4">
                          Install MiniBlog
                        </h2>
                        <p className="text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] mb-3 xs:mb-4 sm:mb-6">
                          To install, tap the Share icon and select "Add to Home Screen".
                        </p>
                        <div className="flex justify-end gap-2 xs:gap-3 sm:gap-4">
                          <button
                            onClick={handleDismissPrompt}
                            className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Close
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base xs:text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 xs:mb-3 sm:mb-4">
                          Install MiniBlog
                        </h2>
                        <p className="text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] mb-3 xs:mb-4 sm:mb-6">
                          Install prompt not available. Try adding to home screen manually.
                        </p>
                        <div className="flex justify-end gap-2 xs:gap-3 sm:gap-4">
                          <button
                            onClick={handleDismissPrompt}
                            className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-xs xs:text-sm sm:text-base text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Close
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6"
              variants={itemVariants}
            >
              {user ? (
                <>
                  <motion.button
                    onClick={() => navigate('/feed')}
                    className="px-8 py-3.5 bg-[var(--accent)] text-white rounded-[var(--radius-md)] font-semibold text-lg shadow-lg"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Explore Feed
                  </motion.button>
                  <motion.button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-[var(--accent)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-md)] font-semibold text-lg shadow-lg"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Your Profile
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    onClick={() => navigate('/login')}
                    className="px-8 py-3.5 bg-[var(--accent)] text-white rounded-[var(--radius-md)] font-semibold text-lg shadow-lg"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/register')}
                    className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-[var(--accent)] text-white rounded-[var(--radius-md)] font-semibold text-lg shadow-lg"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Join Free
                  </motion.button>
                </>
              )}
            </motion.div>

            <motion.div
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={containerVariants}
            >
              {[
                {
                  icon: '✍️',
                  title: 'Create Content',
                  desc: 'Share your thoughts with beautiful formatting',
                },
                {
                  icon: '👥',
                  title: 'Connect',
                  desc: 'Follow friends and discover new creators',
                },
                {
                  icon: '🔍',
                  title: 'Discover',
                  desc: 'Find content tailored to your interests',
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="p-6 bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-secondary)]">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  );
}

export default Home;
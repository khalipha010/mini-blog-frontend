import { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperClipIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CreatePost() {
  const [form, setForm] = useState({ title: '', content: '' });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const MAX_FILES = 4;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    // Check file count
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`You can upload a maximum of ${MAX_FILES} media files on a free account.`, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
      });
      return;
    }

    // Check file types and sizes
    for (const file of selectedFiles) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        toast.error('Only images (JPEG, PNG) and videos (MP4, WebM) are allowed.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          theme: 'colored',
        });
        return;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error('Each image must be under 10MB on a free account.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          theme: 'colored',
        });
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast.error('Each video must be under 100MB on a free account.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          theme: 'colored',
        });
        return;
      }
    }

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    const newPreviews = newFiles.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name,
    }));
    setPreviews(newPreviews);
    setMessage({ text: '', type: '' });
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to create a post.', {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
      });
      navigate('/login');
      return;
    }

    // Validate before submission
    if (files.length > MAX_FILES) {
      toast.error(`You can upload a maximum of ${MAX_FILES} media files on a free account.`, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
      });
      return;
    }

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error('Each image must be under 10MB on a free account.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          theme: 'colored',
        });
        return;
      }
      if (!isImage && file.size > MAX_VIDEO_SIZE) {
        toast.error('Each video must be under 100MB on a free account.', {
          position: 'top-center',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          theme: 'colored',
        });
        return;
      }
    }

    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required.', {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
      });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('content', form.content);
    files.forEach((file) => {
      formData.append('media', file);
    });

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Post created successfully!', {
        position: 'top-center',
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
        onClose: () => navigate('/feed'),
      });
      setForm({ title: '', content: '' });
      setFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('Create post error:', error);
      toast.error(error.response?.data.message || 'Failed to create post.', {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        theme: 'colored',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
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
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 20px -6px var(--accent)',
      transition: { type: 'spring', stiffness: 400 },
    },
    tap: { scale: 0.98 },
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-bg)]"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        className="glass w-full max-w-2xl p-6 sm:p-8 rounded-[var(--radius-lg)] backdrop-blur-lg border border-opacity-20 border-[var(--border)] shadow-2xl"
        variants={itemVariants}
      >
        <div className="text-center mb-6">
          <motion.h1
            className="text-3xl font-bold text-[var(--text-primary)] mb-2"
            variants={itemVariants}
          >
            Create New Post
          </motion.h1>
          <motion.p
            className="text-[var(--text-secondary)]"
            variants={itemVariants}
          >
            Share your thoughts with the community
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full p-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Give your post a title..."
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full p-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              rows="6"
              placeholder="What's on your mind?"
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            </label>

            <div
              className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <PaperClipIcon className="w-8 h-8 text-[var(--text-secondary)]" />
                <p className="text-[var(--text-secondary)]">
                  Drag & drop files here or click to browse
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Supports images (JPEG, PNG, up to 10MB) and videos (MP4, WebM, up to 100MB)
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/mp4,video/webm"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <AnimatePresence>
              {previews.length > 0 && (
                <motion.div
                  className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {previews.map((preview, index) => (
                    <motion.div
                      key={index}
                      className="relative group rounded-[var(--radius-md)] overflow-hidden"
                      whileHover={{ scale: 1.02 }}
                    >
                      {preview.type === 'image' ? (
                        <img
                          src={preview.url}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="relative">
                          <video
                            src={preview.url}
                            className="w-full h-32 object-cover"
                          />
                          <VideoCameraIcon className="absolute top-2 left-2 w-5 h-5 text-white bg-black/50 rounded p-1" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                        {preview.name}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius-md)] shadow-sm text-lg font-medium text-white bg-gradient-to-r from-[var(--accent)] to-purple-600 hover:from-[var(--accent)] hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Publish Post'
              )}
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
        <ToastContainer />
      </motion.div>
    </motion.div>
  );
}

export default CreatePost;
import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

function EditPost() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        setMessage({ text: 'Please log in to edit posts', type: 'error' });
        setIsLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const post = response.data;
        if (post.user_id !== user.id) {
          setMessage({ text: 'Unauthorized to edit this post', type: 'error' });
          setIsLoading(false);
          navigate('/feed');
          return;
        }
        setTitle(post.title);
        setContent(post.content);
        setExistingMedia(post.media || []);
        setMessage({ text: '', type: '' });
      } catch (error) {
        console.error('Fetch post error:', error.response?.data, error.response?.status);
        if (error.response?.status === 404) {
          setMessage({ text: 'Post not found', type: 'error' });
        } else if (error.response?.status === 403) {
          setMessage({ text: 'Session expired. Please log in again.', type: 'error' });
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setMessage({ text: error.response?.data.message || 'Unable to load post', type: 'error' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, user, navigate]);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    if (existingMedia.length + mediaFiles.length + files.length > 4) {
      setMessage({ text: 'Maximum 4 media files allowed', type: 'error' });
      return;
    }
    setMediaFiles((prev) => [...prev, ...files]);
    setMessage({ text: '', type: '' });
  };

  const removeExistingMedia = (index) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || (!content.trim() && mediaFiles.length === 0 && existingMedia.length === 0)) {
      setMessage({ text: 'Title and either content or media are required', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ text: 'Please log in', type: 'error' });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('existingMedia', JSON.stringify(existingMedia));
    mediaFiles.forEach((file) => formData.append('images', file));

    try {
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ text: 'Post updated successfully!', type: 'success' });
      setTimeout(() => navigate('/feed'), 1500);
    } catch (error) {
      console.error('Update post error:', error);
      setMessage({ 
        text: error.response?.data.message || 'Failed to update post', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--secondary-bg)] shadow-lg"></div>
          <p className="text-[var(--text-secondary)] text-shadow-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-3xl mx-auto py-8 px-4 sm:px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.h1 
        className="text-3xl font-bold text-[var(--text-primary)] mb-6 text-shadow-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Edit Post
      </motion.h1>

      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-6 glass p-6 rounded-[var(--radius-lg)] shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-inner"
            placeholder="Enter post title"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="content" className="block text-sm font-medium text-[var(--text-primary)]">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-inner"
            placeholder="What's on your mind?"
            rows="6"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Media (Images/Videos)
          </label>
          
          <motion.label
            htmlFor="media-upload"
            className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] cursor-pointer hover:border-[var(--accent)] transition-colors shadow-lg hover:shadow-xl bg-[var(--secondary-bg)]/50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <ArrowUpTrayIcon className="w-10 h-10 mb-3 text-[var(--text-secondary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--accent)]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              PNG, JPG, GIF, MP4 up to 10MB (max 4 files)
            </p>
            <input
              id="media-upload"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="hidden"
            />
          </motion.label>

          <p className="text-sm text-[var(--text-secondary)] shadow-text">
            {existingMedia.length + mediaFiles.length} of 4 files selected
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <AnimatePresence>
              {existingMedia.map((media, index) => (
                <motion.div 
                  key={`existing-${index}`}
                  className="relative group shadow-xl hover:shadow-2xl rounded-[var(--radius-md)] overflow-hidden transition-shadow"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ 
                    scale: 1.03,
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                  }}
                >
                  {media.url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                    <img
                      src={media.url}
                      alt="Existing media"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <motion.button
                    type="button"
                    onClick={() => removeExistingMedia(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {mediaFiles.map((file, index) => {
                const url = URL.createObjectURL(file);
                const isVideo = file.type.startsWith('video');
                return (
                  <motion.div 
                    key={`new-${index}`}
                    className="relative group shadow-xl hover:shadow-2xl rounded-[var(--radius-md)] overflow-hidden transition-shadow"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ 
                      scale: 1.03,
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                    }}
                  >
                    {isVideo ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt="New media"
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <motion.button
                      type="button"
                      onClick={() => removeNewMedia(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] hover:bg-[var(--secondary-bg)] shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ 
              scale: 1.03,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
            }}
            whileTap={{ scale: 0.97 }}
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-[var(--radius-md)] hover:bg-opacity-90 flex items-center gap-2 shadow-xl hover:shadow-2xl transition-shadow"
            whileHover={{ 
              scale: 1.03,
              boxShadow: '0 10px 20px -5px var(--accent)'
            }}
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : 'Update Post'}
          </motion.button>
        </div>
      </motion.form>

      <AnimatePresence>
        {message.text && (
          <motion.div
            className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--radius-md)] shadow-2xl ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 shadow-green-300/50' 
                : 'bg-red-100 text-red-800 shadow-red-300/50'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EditPost;
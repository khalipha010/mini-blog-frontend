import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon, TrashIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newReply, setNewReply] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [showComments, setShowComments] = useState({});
  const [message, setMessage] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/posts/my-posts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPosts(response.data);
      const commentsData = {};
      await Promise.all(
        response.data.map(async (post) => {
          try {
            const commentResponse = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            commentsData[post.id] = commentResponse.data;
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
            commentsData[post.id] = [];
          }
        })
      );
      setComments(commentsData);
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to load posts');
      if (error.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm('Delete this post?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(posts.filter((post) => post.id !== postId));
        setComments((prev) => {
          const updated = { ...prev };
          delete updated[postId];
          return updated;
        });
        setMessage('Post deleted!');
      } catch (error) {
        setMessage(error.response?.data.message || 'Failed to delete post');
      }
    }
  };

  const handleCommentSubmit = async (postId, parentCommentId = null) => {
    const token = localStorage.getItem('token');
    const content = parentCommentId ? newReply[`${postId}-${parentCommentId}`] : newComment[postId];

    if (!token || !content?.trim()) {
      setMessage('Comment cannot be empty');
      return;
    }

    try {
      const payload = { postId, content };
      if (parentCommentId) payload.parentCommentId = parentCommentId;

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments((prev) => {
        const updated = { ...prev };
        if (parentCommentId) {
          const updateReplies = (comments) =>
            comments.map((c) =>
              c.id === parentCommentId
                ? { ...c, replies: [...(c.replies || []), response.data] }
                : { ...c, replies: updateReplies(c.replies || []) }
            );
          updated[postId] = updateReplies(updated[postId] || []);
        } else {
          updated[postId] = [...(updated[postId] || []), response.data];
        }
        return updated;
      });

      if (parentCommentId) {
        setNewReply((prev) => ({ ...prev, [`${postId}-${parentCommentId}`]: '' }));
        setShowReplyInput((prev) => ({ ...prev, [`${postId}-${parentCommentId}`]: false }));
      } else {
        setNewComment((prev) => ({ ...prev, [postId]: '' }));
      }
      setMessage(parentCommentId ? 'Reply added!' : 'Comment added!');
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to add comment');
    }
  };

  const handleCommentEdit = async (postId, commentId, content) => {
    const token = localStorage.getItem('token');
    if (!token || !content?.trim()) {
      setMessage('Comment cannot be empty');
      return;
    }

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments((prev) => {
        const updateComment = (comments) =>
          comments.map((c) =>
            c.id === commentId
              ? { ...response.data, replies: c.replies || [] }
              : { ...c, replies: updateComment(c.replies || []) }
          );
        return {
          ...prev,
          [postId]: updateComment(prev[postId] || []),
        };
      });
      setMessage('Comment updated!');
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to update comment');
    }
  };

  const handleCommentDelete = async (postId, commentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Please log in to delete comments');
      return;
    }

    if (window.confirm('Delete this comment?')) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
        }));
        setMessage('Comment deleted!');
      } catch (error) {
        setMessage(error.response?.data.message || 'Failed to delete comment');
      }
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const renderComment = (comment, postId, depth = 0) => (
    <motion.div
      key={comment.id}
      className={`border-t border-[var(--border)] pt-2 mt-2 ${depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-2">
        <img
          src={comment.profile_picture || '/default-avatar.png'}
          alt="Avatar"
          className="w-6 h-6 rounded-full"
          onError={(e) => (e.target.src = '/default-avatar.png')}
        />
        <span className="font-semibold text-[var(--text-primary)]">{comment.username}</span>
      </div>
      <p className="ml-8 text-[var(--text-secondary)]">{comment.content}</p>
      <div className="ml-8 mt-1 flex space-x-2 text-sm">
        <motion.button
          onClick={() =>
            setShowReplyInput((prev) => ({
              ...prev,
              [`${postId}-${comment.id}`]: !prev[`${postId}-${comment.id}`],
            }))
          }
          className="text-[var(--accent)] hover:underline flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
          Reply
        </motion.button>
        {user && user.id === comment.user_id && (
          <>
            <motion.button
              onClick={() => {
                const newContent = prompt('Edit comment:', comment.content);
                if (newContent) handleCommentEdit(postId, comment.id, newContent);
              }}
              className="text-[var(--accent)] hover:underline flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Edit
            </motion.button>
            <motion.button
              onClick={() => handleCommentDelete(postId, comment.id)}
              className="text-red-500 hover:underline flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </motion.button>
          </>
        )}
      </div>
      <AnimatePresence>
        {showReplyInput[`${postId}-${comment.id}`] && (
          <motion.div
            className="ml-8 mt-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <textarea
              value={newReply[`${postId}-${comment.id}`] || ''}
              onChange={(e) =>
                setNewReply((prev) => ({
                  ...prev,
                  [`${postId}-${comment.id}`]: e.target.value,
                }))
              }
              className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)]"
              placeholder="Add a reply..."
            />
            <motion.button
              onClick={() => handleCommentSubmit(postId, comment.id)}
              className="mt-2 px-4 py-1 bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:bg-opacity-90"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Reply
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {comment.replies?.length > 0 &&
        comment.replies.map((reply) => renderComment(reply, postId, depth + 1))}
    </motion.div>
  );

  return (
    <motion.div
      className="max-w-3xl mx-auto mt-8 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
        My Posts
      </h1>
      {posts.length === 0 ? (
        <div className="text-center text-[var(--text-secondary)]">
          <p>You haven't posted anything yet.</p>
          <motion.button
            onClick={() => navigate('/create-post')}
            className="mt-4 px-6 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] hover:bg-opacity-90"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create a Post
          </motion.button>
        </div>
      ) : (
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.2 },
            },
          }}
        >
          {posts.map((post) => (
            <motion.div
              key={post.id}
              className="border border-[var(--border)] p-4 sm:p-6 rounded-[var(--radius-lg)] bg-[var(--secondary-bg)] shadow-sm"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
                {post.title}
              </h2>
              <p className="text-[var(--text-secondary)] mb-4">{post.content}</p>
              {post.media && post.media.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {post.media.map((item, index) => (
                    <motion.div
                      key={index}
                      className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={`Post media ${index + 1}`}
                          className="w-full h-48 sm:h-64 object-cover"
                          onError={(e) => (e.target.src = '/default-image.png')}
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
              <div className="flex space-x-3 mb-4">
                <motion.button
                  onClick={() => navigate(`/edit-post/${post.id}`)}
                  className="p-2 bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:bg-opacity-90"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Edit post"
                >
                  <PencilIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 bg-red-500 text-white rounded-[var(--radius-sm)] hover:bg-red-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Delete post"
                >
                  <TrashIcon className="w-5 h-5" />
                </motion.button>
              </div>
              <motion.div className="mt-4">
                <motion.button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center space-x-1 text-[var(--accent)] hover:underline"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  <span>{showComments[post.id] ? 'Hide Comments' : 'Show Comments'}</span>
                </motion.button>
                <AnimatePresence>
                  {showComments[post.id] && (
                    <motion.div
                      className="mt-4"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Comments
                      </h3>
                      {comments[post.id]?.length > 0 ? (
                        comments[post.id]
                          .filter((c) => !c.parent_comment_id)
                          .map((comment) => renderComment(comment, post.id))
                      ) : (
                        <p className="text-[var(--text-secondary)]">No comments yet.</p>
                      )}
                      <div className="mt-4">
                        <textarea
                          value={newComment[post.id] || ''}
                          onChange={(e) =>
                            setNewComment((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)]"
                          placeholder="Add a comment..."
                        />
                        <motion.button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="mt-2 px-4 py-1 bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:bg-opacity-90"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Comment
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
      <AnimatePresence>
        {message && (
          <motion.div
            className="fixed bottom-4 right-4 bg-[var(--secondary-bg)] text-[var(--text-primary)] px-4 py-2 rounded-[var(--radius-md)] shadow-lg"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MyPosts;
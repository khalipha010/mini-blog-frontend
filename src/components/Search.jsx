
import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  HeartIcon as HeartIconSolid,
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('users');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setSuggestionsError('Please log in to see suggested users');
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/suggestions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const usersWithStats = await Promise.all(
          response.data.map(async (suggestedUser) => {
            try {
              const userResponse = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/users/${suggestedUser.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return {
                ...suggestedUser,
                stats: userResponse.data.stats || { posts: 0, followers: 0, following: 0 },
              };
            } catch (error) {
              console.error(`Error fetching stats for user ${suggestedUser.id}:`, error);
              return {
                ...suggestedUser,
                stats: { posts: 0, followers: 0, following: 0 },
              };
            }
          })
        );

        setSuggestedUsers(usersWithStats);
        if (usersWithStats.length === 0) {
          setSuggestionsError('No suggested users available at this time');
        }
      } catch (err) {
        setSuggestionsError(err.response?.data.message || 'Failed to fetch suggested users');
        setSuggestedUsers([]);
      }
    };

    fetchSuggestedUsers();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in to search');

      const endpoint = searchType === 'users' ? '/api/search/users' : '/api/search/posts';
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}${endpoint}?query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (searchType === 'posts') {
        const postsWithStatus = await Promise.all(
          response.data.map(async (post) => {
            const likeCheck = await axios
              .get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/like`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .catch(() => ({ data: { isLiked: false, likes: post.likes || 0 } }));
            return { ...post, isLiked: likeCheck.data.isLiked, likes: likeCheck.data.likes || post.likes || 0 };
          })
        );
        setSearchResults(postsWithStatus);
      } else {
        setSearchResults(response.data);
      }
      if (response.data.length === 0) {
        setError('No results found for your query');
      }
    } catch (err) {
      setError(err.response?.data.message || 'Failed to fetch search results');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass rounded-[var(--radius-lg)] p-6 backdrop-blur-lg border border-opacity-20 border-[var(--border)] shadow-2xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
            Discover Content
          </h1>
          <p className="text-[var(--text-secondary)]">Find users, posts, and communities</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${searchType}...`}
              className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-3 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-all duration-200"
            >
              <option value="users">Users</option>
              <option value="posts">Posts</option>
            </select>
            <motion.button
              type="submit"
              className="flex items-center justify-center px-6 py-3 bg-[var(--accent)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none disabled:opacity-50 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                  Search
                </>
              )}
            </motion.button>
          </div>
        </form>

        <div>
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-[var(--hover-bg)] h-12 w-12"></div>
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-[var(--hover-bg)] rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-[var(--hover-bg)] rounded"></div>
                    <div className="h-4 bg-[var(--hover-bg)] rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-[var(--accent)]" />
                {searchType === 'users' ? 'User Results' : 'Post Results'}
              </h2>
              <div className="grid gap-4">
                {searchType === 'users' ? (
                  searchResults.map((user) => <EnhancedUserCard key={user.id} user={user} />)
                ) : (
                  searchResults.map((post) => <EnhancedPostCard key={post.id} post={post} user={user} />)
                )}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center">
              <UserPlusIcon className="h-5 w-5 mr-2 text-[var(--accent)]" />
              Suggested Connections
            </h2>
            {suggestionsError && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">{suggestionsError}</p>
                  </div>
                </div>
              </div>
            )}
            {suggestedUsers.length === 0 && !suggestionsError && (
              <p className="text-[var(--text-secondary)] text-center py-4">
                No suggested users available at this time
              </p>
            )}
            {suggestedUsers.length > 0 && (
              <div className="grid gap-4">
                {suggestedUsers.map((user) => (
                  <EnhancedUserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EnhancedUserCard({ user }) {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [isHovering, setIsHovering] = useState(false);

  const handleProfileClick = () => {
    navigate(`/profile/${user.id}`);
  };

  const handleFollow = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (isFollowing) {
        await axios.delete(
          `${import.meta.env.VITE_BACKEND_URL}/api/follow/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/follow`,
          { followedId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  return (
    <motion.div
      className="bg-[var(--secondary-bg)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden"
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
    >
      <div className="relative h-24 bg-gradient-to-r from-blue-400 to-purple-500">
        <motion.img
          src={user.profile_picture || '/default-avatar.png'}
          alt={user.username}
          className="absolute -bottom-8 left-4 w-16 h-16 rounded-full border-4 border-[var(--secondary-bg)] object-cover cursor-pointer"
          onClick={handleProfileClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onError={(e) => (e.target.src = '/default-avatar.png')}
        />
      </div>
      <div className="p-4 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <motion.h3
              className="font-bold text-lg text-[var(--text-primary)] hover:underline cursor-pointer"
              onClick={handleProfileClick}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              {user.username}
            </motion.h3>
            {user.bio && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {user.bio}
              </p>
            )}
          </div>
          <motion.button
            onClick={handleFollow}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
              isFollowing
                ? 'bg-[var(--hover-bg)] text-[var(--text-primary)]'
                : 'bg-[var(--accent)] text-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFollowing ? (
              <>
                <UserMinusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Following</span>
              </>
            ) : (
              <>
                <UserPlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Follow</span>
              </>
            )}
          </motion.button>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[var(--text-primary)]">
          <div className="flex items-center space-x-1">
            <span>{user.stats?.posts || 0} Posts</span>
          </div>
          <motion.button
            className="flex items-center space-x-1 hover:text-[var(--accent)]"
            whileTap={{ scale: 0.95 }}
          >
            <UsersIcon className="w-5 h-5" />
            <span>{user.stats?.followers || 0} Followers</span>
          </motion.button>
          <motion.button
            className="flex items-center space-x-1 hover:text-[var(--accent)]"
            whileTap={{ scale: 0.95 }}
          >
            <UserGroupIcon className="w-5 h-5" />
            <span>{user.stats?.following || 0} Following</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EnhancedPostCard({ post, user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newReply, setNewReply] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [likedComments, setLikedComments] = useState({});
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const [commentError, setCommentError] = useState(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const navigate = useNavigate();
  const CONTENT_LIMIT = 200;

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    setIsLoadingComments(true);
    setCommentError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in to view comments');

      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(response.data);
      const commentLikesData = {};
      const collectLikes = (comments) => {
        comments.forEach((comment) => {
          commentLikesData[comment.id] = comment.isLiked || false;
          if (comment.replies) collectLikes(comment.replies);
        });
      };
      collectLikes(response.data);
      setLikedComments(commentLikesData);
    } catch (err) {
      setCommentError(err.response?.data.message || 'Failed to load comments');
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = liked
        ? await axios.delete(
            `${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/like`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        : await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/like`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
      setLikeCount(response.data.likes);
      setLiked(response.data.isLiked);
    } catch (error) {
      console.error('Like error:', error);
      setCommentError('Failed to update like status');
    }
  };

  const handleCommentSubmit = async (parentCommentId = null) => {
    if (!user) {
      setCommentError('Please log in to comment');
      navigate('/login');
      return;
    }

    const content = parentCommentId ? newReply[`${post.id}-${parentCommentId}`] : newComment;

    if (!content?.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments`,
        { postId: post.id, content, parentCommentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (post.user_id !== user.id) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
          {
            type: parentCommentId ? 'reply' : 'comment',
            recipientId: post.user_id,
            postId: post.id,
            senderId: user.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(commentResponse.data);
      const newCommentLikes = {};
      const collectLikes = (comments) => {
        comments.forEach((comment) => {
          newCommentLikes[comment.id] = comment.isLiked || false;
          if (comment.replies) collectLikes(comment.replies);
        });
      };
      collectLikes(commentResponse.data);
      setLikedComments(newCommentLikes);

      if (parentCommentId) {
        setNewReply((prev) => ({ ...prev, [`${post.id}-${parentCommentId}`]: '' }));
        setShowReplyInput((prev) => ({ ...prev, [`${post.id}-${parentCommentId}`]: false }));
      } else {
        setNewComment('');
      }
      setCommentError(null);
    } catch (error) {
      console.error('Comment submit error:', error);
      setCommentError(error.response?.data.message || 'Failed to add comment');
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      setCommentError('Please log in to like comments');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      let response;
      const isLiked = likedComments[commentId];
      if (isLiked) {
        response = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}/like`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const findComment = (comments) => {
          for (const comment of comments) {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
              const found = findComment(comment.replies);
              if (found) return found;
            }
          }
          return null;
        };
        const comment = findComment(comments);
        if (comment && comment.user_id !== user.id) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
            {
              type: 'comment_like',
              recipientId: comment.user_id,
              postId: post.id,
              commentId,
              senderId: user.id,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      const newLikes = response.data.likes;
      setLikedComments((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
      const updateCommentLikes = (comments) => {
        return comments.map((comment) => {
          if (comment.id === commentId) {
            return { ...comment, likes: newLikes, isLiked: !isLiked };
          }
          if (comment.replies) {
            return { ...comment, replies: updateCommentLikes(comment.replies) };
          }
          return comment;
        });
      };
      setComments(updateCommentLikes(comments));
      setCommentError(null);
    } catch (error) {
      console.error('Like comment error:', error);
      setCommentError(
        error.response?.status === 404
          ? 'Comment not found'
          : error.response?.data.message || 'Failed to like comment'
      );
    }
  };

  const handleEditComment = async (commentId, currentContent, parentCommentId = null) => {
    if (!user) {
      setCommentError('Please log in to edit comments');
      navigate('/login');
      return;
    }

    const newContent = prompt('Edit comment:', currentContent);
    if (!newContent || !newContent.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}`,
        { content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(commentResponse.data);
      setCommentError(null);
    } catch (error) {
      console.error('Edit comment error:', error);
      if (error.response?.status === 404) {
        setCommentError('Comment not found. It may have been deleted.');
      } else if (error.response?.status === 403) {
        setCommentError('You are not authorized to edit this comment.');
      } else {
        setCommentError(error.response?.data.message || 'Failed to update comment');
      }
    }
  };

  const handleDeleteComment = async (commentId, parentCommentId = null) => {
    if (!user) {
      setCommentError('Please log in to delete comments');
      navigate('/login');
      return;
    }

    if (!window.confirm('Delete this comment?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(commentResponse.data);
      setDeletedCommentIds((prev) => [...prev, commentId]);
      setLikedComments((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
      setCommentError(null);
    } catch (error) {
      console.error('Delete comment error:', error);
      if (error.response?.status === 404) {
        setCommentError('Comment already deleted.');
        const token = localStorage.getItem('token');
        const commentResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments(commentResponse.data);
      } else if (error.response?.status === 403) {
        setCommentError('You are not authorized to delete this comment.');
      } else {
        setCommentError(error.response?.data.message || 'Failed to delete comment');
      }
    }
  };

  const renderComment = (comment, depth = 0) => (
    <motion.div
      key={comment.id}
      className={`pt-3 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--border)]' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <Link to={`/profile/${comment.user_id}`} className="flex-shrink-0">
          <motion.img
            src={comment.profile_picture || '/default-avatar.png'}
            alt="Avatar"
            className="w-8 h-8 rounded-full hover:opacity-90 transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onError={(e) => (e.target.src = '/default-avatar.png')}
          />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${comment.user_id}`}
              className="font-semibold text-[var(--text-primary)] hover:underline"
            >
              {comment.username}
            </Link>
            <span className="text-xs text-[var(--text-secondary)]">
              {new Date(comment.updated_at || comment.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[var(--text-secondary)]">{comment.content}</p>

          <div className="mt-2 flex items-center gap-4 text-sm">
            <motion.button
              onClick={() => handleLikeComment(comment.id)}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-red-500"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {likedComments[comment.id] ? (
                <HeartIconSolid className="w-4 h-4 text-red-500" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              <span>{comment.likes || 0}</span>
            </motion.button>

            <motion.button
              onClick={() =>
                setShowReplyInput((prev) => ({
                  ...prev,
                  [`${post.id}-${comment.id}`]: !prev[`${post.id}-${comment.id}`],
                }))
              }
              className="text-[var(--accent)] hover:underline flex items-center gap-1"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>Reply</span>
            </motion.button>

            {user?.id === comment.user_id && !deletedCommentIds.includes(comment.id) && (
              <>
                <motion.button
                  onClick={() =>
                    handleEditComment(comment.id, comment.content, comment.parent_comment_id)
                  }
                  className="text-[var(--accent)] hover:underline flex items-center gap-1"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </motion.button>

                <motion.button
                  onClick={() => handleDeleteComment(comment.id, comment.parent_comment_id)}
                  className="text-red-500 hover:underline flex items-center gap-1"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete</span>
                </motion.button>
              </>
            )}
          </div>

          <AnimatePresence>
            {showReplyInput[`${post.id}-${comment.id}`] && (
              <motion.div
                className="mt-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <textarea
                  value={newReply[`${post.id}-${comment.id}`] || ''}
                  onChange={(e) =>
                    setNewReply((prev) => ({
                      ...prev,
                      [`${post.id}-${comment.id}`]: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--secondary-bg)] text-[var(--text-primary)]"
                  placeholder="Write your reply..."
                  rows="2"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <motion.button
                    onClick={() =>
                      setShowReplyInput((prev) => ({
                        ...prev,
                        [`${post.id}-${comment.id}`]: false,
                      }))
                    }
                    className="px-4 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--primary-bg)]"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => handleCommentSubmit(comment.id)}
                    className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-opacity-90"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Reply
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => renderComment(reply, depth + 1))}
        </div>
      )}
    </motion.div>
  );

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <motion.div
      className="bg-[var(--secondary-bg)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.img
            src={post.profile_picture || '/default-avatar.png'}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover cursor-pointer"
            onClick={() => handleProfileClick(post.user_id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onError={(e) => (e.target.src = '/default-avatar.png')}
          />
          <div>
            <motion.span
              className="font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
              onClick={() => handleProfileClick(post.user_id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              {post.username}
            </motion.span>
            <p className="text-xs text-[var(--text-secondary)]">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{post.title}</h3>
        <p className="text-[var(--text-secondary)] whitespace-pre-line">
          {isExpanded || post.content.length <= CONTENT_LIMIT
            ? post.content
            : `${post.content.slice(0, CONTENT_LIMIT)}...`}
        </p>
        {post.content.length > CONTENT_LIMIT && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        )}
      </div>

      {post.image_url && (
        <div className="border-t border-b border-[var(--border)]">
          <motion.img
            src={post.image_url}
            alt="Post content"
            className="w-full h-auto max-h-96 object-contain"
            onError={(e) => (e.target.src = '/default-image.png')}
            whileHover={{ opacity: 0.9 }}
          />
        </div>
      )}

      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={handleLike}
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-red-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {liked ? (
              <HeartIconSolid className="w-6 h-6 text-red-500 fill-red-500" />
            ) : (
              <HeartIcon className="w-6 h-6" />
            )}
            <span>{likeCount}</span>
          </motion.button>

          <motion.button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChatBubbleLeftIcon className="w-6 h-6" />
            <span>{comments.length || 0}</span>
          </motion.button>

          <motion.button
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-green-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ShareIcon className="w-6 h-6" />
            <span>Share</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            className="bg-[var(--secondary-bg)]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 space-y-4">
              {commentError && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-sm text-red-700">{commentError}</p>
                </div>
              )}
              {isLoadingComments && (
                <p className="text-center text-sm text-[var(--text-secondary)]">Loading comments...</p>
              )}
              {!isLoadingComments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments
                    .filter((c) => !c.parent_comment_id)
                    .map((comment) => (
                      <div key={comment.id}>{renderComment(comment)}</div>
                    ))}
                </div>
              ) : (
                !isLoadingComments && (
                  <p className="text-center text-[var(--text-secondary)] py-4">
                    No comments yet
                  </p>
                )
              )}
              {user && (
                <div className="mt-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--secondary-bg)] text-[var(--text-primary)]"
                    placeholder="Write a comment..."
                    rows="2"
                  />
                  <div className="mt-2 flex justify-end">
                    <motion.button
                      onClick={() => handleCommentSubmit()}
                      className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-opacity-90"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Post Comment
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
);
}

export default Search;

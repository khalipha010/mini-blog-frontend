import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  PlusIcon,
  XMarkIcon,
  MinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  BellIcon,
  BellSlashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Toast from '../components/Toast';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newReply, setNewReply] = useState({});
  const [showReplyInput, setShowReplyInput] = useState({});
  const [showComments, setShowComments] = useState({});
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState({});
  const [likedComments, setLikedComments] = useState({});
  const [mutedPosts, setMutedPosts] = useState({});
  const [showDropdown, setShowDropdown] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [commentSort, setCommentSort] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [collapsedComments, setCollapsedComments] = useState({});
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const feedTopRef = useRef(null);
  const pollingRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const dropdownRef = useRef({});

  // Add a toast
  const addToast = (text, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // Remove a toast
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(showDropdown).forEach((postId) => {
        if (
          showDropdown[postId] &&
          dropdownRef.current[postId] &&
          !dropdownRef.current[postId].contains(event.target)
        ) {
          setShowDropdown((prev) => ({ ...prev, [postId]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Initial fetch of all posts
  const fetchInitialPosts = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('Please log in to view posts', 'error');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const postsWithStatus = await Promise.all(
        response.data.map(async (post) => {
          const followCheck =
            user && user.id !== post.user_id
              ? await axios
                  .get(`${import.meta.env.VITE_BACKEND_URL}/api/users/${post.user_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  .catch(() => ({ data: { isFollowing: false } }))
              : { data: { isFollowing: false } };

          const likeCheck = await axios
            .get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/like`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { isLiked: false } }));

          const muteCheck = await axios
            .get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/mute`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { isMuted: false } }));

          let originalPoster = null;
          if (post.shared_from_post_id) {
            try {
              const originalPost = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.shared_from_post_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              originalPoster = {
                user_id: originalPost.data.user_id,
                username: originalPost.data.username,
              };
            } catch (error) {
              console.error(`Error fetching original post ${post.shared_from_post_id}:`, error);
            }
          }

          return {
            ...post,
            isFollowing: followCheck.data.isFollowing,
            isLiked: likeCheck.data.isLiked,
            isMuted: muteCheck.data.isMuted,
            originalPoster,
          };
        })
      );

      const sortedPosts = postsWithStatus.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPosts(sortedPosts);
      setLikedPosts(postsWithStatus.reduce((acc, post) => ({ ...acc, [post.id]: post.isLiked }), {}));
      setMutedPosts(postsWithStatus.reduce((acc, post) => ({ ...acc, [post.id]: post.isMuted }), {}));

      const commentsData = {};
      const commentLikesData = {};
      const visibleCommentsData = {};
      const initialCollapsed = {};
      await Promise.all(
        postsWithStatus.map(async (post) => {
          try {
            const commentResponse = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            commentsData[post.id] = commentResponse.data;
            visibleCommentsData[post.id] = 5;
            const collectLikesAndCollapse = (comments) => {
              comments.forEach((comment) => {
                commentLikesData[comment.id] = comment.isLiked || false;
                if (comment.replies?.length > 0) {
                  initialCollapsed[`${post.id}-${comment.id}`] = true; // Collapse by default
                }
                if (comment.replies) collectLikesAndCollapse(comment.replies);
              });
            };
            collectLikesAndCollapse(commentResponse.data);
          } catch (error) {
            console.error(`Error fetching comments for post ${post.id}:`, error);
            commentsData[post.id] = [];
            visibleCommentsData[post.id] = 5;
          }
        })
      );
      setComments(commentsData);
      setLikedComments(commentLikesData);
      setVisibleComments(visibleCommentsData);
      setCollapsedComments(initialCollapsed);
      setDeletedCommentIds([]);
    } catch (error) {
      console.error('Fetch posts error:', error);
      if (error.response?.status === 403) {
        addToast('Session expired. Please log in again.', 'error');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        addToast(error.response?.data.message || 'Failed to load posts', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch new posts
  const fetchNewPosts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newPosts = posts.length === 0
        ? response.data
        : response.data.filter(
            (post) => new Date(post.created_at).getTime() > new Date(posts[0].created_at).getTime()
          );

      if (newPosts.length > 0) {
        const newPostsWithStatus = await Promise.all(
          newPosts.map(async (post) => {
            const followCheck =
              user && user.id !== post.user_id
                ? await axios
                    .get(`${import.meta.env.VITE_BACKEND_URL}/api/users/${post.user_id}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    .catch(() => ({ data: { isFollowing: false } }))
                : { data: { isFollowing: false } };

            const likeCheck = await axios
              .get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/like`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .catch(() => ({ data: { isLiked: false } }));

            const muteCheck = await axios
              .get(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.id}/mute`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .catch(() => ({ data: { isMuted: false } }));

            let originalPoster = null;
            if (post.shared_from_post_id) {
              try {
                const originalPost = await axios.get(
                  `${import.meta.env.VITE_BACKEND_URL}/api/posts/${post.shared_from_post_id}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                originalPoster = {
                  user_id: originalPost.data.user_id,
                  username: originalPost.data.username,
                };
              } catch (error) {
                console.error(`Error fetching original post ${post.shared_from_post_id}:`, error);
              }
            }

            return {
              ...post,
              isFollowing: followCheck.data.isFollowing,
              isLiked: likeCheck.data.isLiked,
              isMuted: muteCheck.data.isMuted,
              originalPoster,
            };
          })
        );

        const sortedNewPosts = newPostsWithStatus.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPosts((prevPosts) => {
          const existingIds = new Set(prevPosts.map((p) => p.id));
          const uniqueNewPosts = sortedNewPosts.filter((p) => !existingIds.has(p.id));
          return [...uniqueNewPosts, ...prevPosts];
        });
        setLikedPosts((prev) => ({
          ...prev,
          ...sortedNewPosts.reduce((acc, post) => ({ ...acc, [post.id]: post.isLiked }), {}),
        }));
        setMutedPosts((prev) => ({
          ...prev,
          ...sortedNewPosts.reduce((acc, post) => ({ ...acc, [post.id]: post.isMuted }), {}),
        }));

        const commentsData = {};
        const commentLikesData = {};
        const visibleCommentsData = {};
        const initialCollapsed = {};
        await Promise.all(
          sortedNewPosts.map(async (post) => {
            try {
              const commentResponse = await axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/comments/${post.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              commentsData[post.id] = commentResponse.data;
              visibleCommentsData[post.id] = 5;
              const collectLikesAndCollapse = (comments) => {
                comments.forEach((comment) => {
                  commentLikesData[comment.id] = comment.isLiked || false;
                  if (comment.replies?.length > 0) {
                    initialCollapsed[`${post.id}-${comment.id}`] = true; // Collapse by default
                  }
                  if (comment.replies) collectLikesAndCollapse(comment.replies);
                });
              };
              collectLikesAndCollapse(commentResponse.data);
            } catch (error) {
              console.error(`Error fetching comments for post ${post.id}:`, error);
              commentsData[post.id] = [];
              visibleCommentsData[post.id] = 5;
            }
          })
        );
        setComments((prev) => ({ ...prev, ...commentsData }));
        setLikedComments((prev) => ({ ...prev, ...commentLikesData }));
        setVisibleComments((prev) => ({ ...prev, ...visibleCommentsData }));
        setCollapsedComments((prev) => ({ ...prev, ...initialCollapsed }));
        setNewPostsAvailable(true);
      }
    } catch (error) {
      console.error('Fetch new posts error:', error);
    } finally {
      setShowRefreshButton(true);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchInitialPosts();

    pollingRef.current = setInterval(() => {
      fetchNewPosts();
    }, 30000);
    refreshTimeoutRef.current = setTimeout(() => {
      setShowRefreshButton(true);
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [user?.id]);

  const handleManualRefresh = () => {
    setShowRefreshButton(false);
    setNewPostsAvailable(false);
    fetchNewPosts();
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    refreshTimeoutRef.current = setTimeout(() => {
      setShowRefreshButton(true);
    }, 30000);
  };

  const handleLike = async (postId) => {
    if (!user) {
      addToast('Please log in to like posts', 'error');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      let response;
      if (likedPosts[postId]) {
        response = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}/like`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const post = posts.find((p) => p.id === postId);
        if (post.user_id !== user.id && !mutedPosts[postId]) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
            {
              type: 'like',
              recipientId: post.user_id,
              postId,
              senderId: user.id,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      const newLikes = response.data.likes;
      setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, likes: newLikes } : post))
      );
    } catch (error) {
      console.error('Like error:', error);
      addToast(error.response?.data.message || 'Failed to like post', 'error');
    }
  };

  const handleLikeComment = async (postId, commentId) => {
    if (!user) {
      addToast('Please log in to like comments', 'error');
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
        const comment = findComment(comments[postId] || []);
        if (comment && comment.user_id !== user.id && !mutedPosts[postId]) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
            {
              type: 'comment_like',
              recipientId: comment.user_id,
              postId,
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
      setComments((prev) => ({
        ...prev,
        [postId]: updateCommentLikes(prev[postId] || []),
      }));
    } catch (error) {
      console.error('Like comment error:', error);
      addToast(
        error.response?.status === 404
          ? 'Comment not found'
          : error.response?.data.message || 'Failed to like comment',
        'error'
      );
    }
  };

  const handleShare = async (postId) => {
    if (!user) {
      addToast('Please log in to share posts', 'error');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/posts/share`,
        { postId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const post = posts.find((p) => p.id === postId);
      if (post.user_id !== user.id && !mutedPosts[postId]) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
          {
            type: 'share',
            recipientId: post.user_id,
            postId,
            senderId: user.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      addToast('Post shared!', 'success');
      fetchInitialPosts();
    } catch (error) {
      console.error('Share error:', error);
      addToast(error.response?.data.message || 'Failed to share post', 'error');
    }
  };

  const handleFollow = async (postUserId, isFollowing, username) => {
    if (!user) {
      addToast('Please log in to follow users', 'error');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      if (isFollowing) {
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/follow/${postUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/follow`,
          { followedId: postUserId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (postUserId !== user.id) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
            {
              type: 'follow',
              recipientId: postUserId,
              senderId: user.id,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.user_id === postUserId ? { ...post, isFollowing: !isFollowing } : post
        )
      );
      addToast(
        isFollowing ? `Unfollowed ${username}` : `Now following ${username}`,
        'success'
      );
    } catch (error) {
      addToast(error.response?.data.message || 'Failed to follow user', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user) {
      addToast('Please log in to delete posts', 'error');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setComments((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
      setMutedPosts((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
      setCollapsedComments((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (key.startsWith(`${postId}-`)) {
            delete updated[key];
          }
        });
        return updated;
      });
      setShowDropdown((prev) => ({ ...prev, [postId]: false }));
      addToast('Post deleted successfully!', 'success');
    } catch (error) {
      console.error('Delete post error:', error);
      addToast(error.response?.data.message || 'Failed to delete post', 'error');
    }
  };

  const handleCommentSubmit = async (postId, parentCommentId = null) => {
    if (!user) {
      addToast('Please log in to comment', 'error');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    const content = parentCommentId ? newReply[`${postId}-${parentCommentId}`] : newComment[postId];

    if (!content?.trim()) {
      addToast('Comment cannot be empty', 'error');
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments`,
        { postId, content, parentCommentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const post = posts.find((p) => p.id === postId);
      if (post.user_id !== user.id && !mutedPosts[postId]) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
          {
            type: parentCommentId ? 'reply' : 'comment',
            recipientId: post.user_id,
            postId,
            senderId: user.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => ({
        ...prev,
        [postId]: commentResponse.data,
      }));
      const newCommentLikes = {};
      const initialCollapsed = {};
      const collectLikesAndCollapse = (comments) => {
        comments.forEach((comment) => {
          newCommentLikes[comment.id] = comment.isLiked || false;
          if (comment.replies?.length > 0) {
            initialCollapsed[`${postId}-${comment.id}`] = true;
          }
          if (comment.replies) collectLikesAndCollapse(comment.replies);
        });
      };
      collectLikesAndCollapse(commentResponse.data);
      setLikedComments((prev) => ({ ...prev, ...newCommentLikes }));
      setCollapsedComments((prev) => ({ ...prev, ...initialCollapsed }));

      if (parentCommentId) {
        setNewReply((prev) => ({ ...prev, [`${postId}-${parentCommentId}`]: '' }));
        setShowReplyInput((prev) => ({ ...prev, [`${postId}-${parentCommentId}`]: false }));
      } else {
        setNewComment((prev) => ({ ...prev, [postId]: '' }));
      }
      setVisibleComments((prev) => ({
        ...prev,
        [postId]: Math.max(prev[postId] || 5, 5),
      }));
    } catch (error) {
      console.error('Comment submit error:', error);
      addToast(error.response?.data.message || 'Failed to add comment', 'error');
    }
  };

  const handleDeleteComment = async (postId, commentId, parentCommentId = null) => {
    if (!user) {
      addToast('Please log in to delete comments', 'error');
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
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => ({
        ...prev,
        [postId]: commentResponse.data,
      }));
      setDeletedCommentIds((prev) => [...prev, commentId]);
      setLikedComments((prev) => {
        const updated = { ...prev };
        delete updated[commentId];
        return updated;
      });
      setCollapsedComments((prev) => {
        const updated = { ...prev };
        delete updated[`${postId}-${commentId}`];
        return updated;
      });

      addToast('Comment deleted!', 'success');
    } catch (error) {
      console.error('Delete comment error:', error);
      if (error.response?.status === 404) {
        addToast('Comment already deleted.', 'error');
        const token = localStorage.getItem('token');
        const commentResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments((prev) => ({
          ...prev,
          [postId]: commentResponse.data,
        }));
      } else if (error.response?.status === 403) {
        addToast('You are not authorized to delete this comment.', 'error');
      } else {
        addToast(error.response?.data.message || 'Failed to delete comment', 'error');
      }
    }
  };

  const handleEditComment = async (postId, commentId, currentContent, parentCommentId = null) => {
    if (!user) {
      addToast('Please log in to edit comments', 'error');
      navigate('/login');
      return;
    }

    const newContent = prompt('Edit comment:', currentContent);
    if (!newContent || !newContent.trim()) {
      addToast('Comment cannot be empty', 'error');
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
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => ({
        ...prev,
        [postId]: commentResponse.data,
      }));

      addToast('Comment updated!', 'success');
    } catch (error) {
      console.error('Edit comment error:', error);
      if (error.response?.status === 404) {
        addToast('Comment not found. It may have been deleted.', 'error');
      } else if (error.response?.status === 403) {
        addToast('You are not authorized to edit this comment.', 'error');
      } else {
        addToast(error.response?.data.message || 'Failed to update comment', 'error');
      }
    }
  };

  const handlePinComment = async (postId, commentId) => {
    if (!user) {
      addToast('Please log in to pin comments', 'error');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}/pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => ({
        ...prev,
        [postId]: commentResponse.data,
      }));
      addToast('Comment pinned!', 'success');
    } catch (error) {
      console.error('Pin comment error:', error);
      addToast(
        error.response?.status === 403
          ? 'Only the post author can pin comments'
          : error.response?.data.message || 'Failed to pin comment',
        'error'
      );
    }
  };

  const handleUnpinComment = async (postId, commentId) => {
    if (!user) {
      addToast('Please log in to unpin comments', 'error');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${commentId}/unpin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const commentResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => ({
        ...prev,
        [postId]: commentResponse.data,
      }));
      addToast('Comment unpinned!', 'success');
    } catch (error) {
      console.error('Unpin comment error:', error);
      addToast(
        error.response?.status === 403
          ? 'Only the post author can unpin comments'
          : error.response?.data.message || 'Failed to unpin comment',
        'error'
      );
    }
  };

  const handleMutePost = async (postId) => {
    if (!user) {
      addToast('Please log in to mute posts', 'error');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      if (mutedPosts[postId]) {
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}/mute`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMutedPosts((prev) => ({ ...prev, [postId]: false }));
        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, isMuted: false } : post))
        );
        addToast('Notifications unmuted for this post', 'success');
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/posts/${postId}/mute`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMutedPosts((prev) => ({ ...prev, [postId]: true }));
        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, isMuted: true } : post))
        );
        addToast('Notifications muted for this post', 'success');
      }
      setShowDropdown((prev) => ({ ...prev, [postId]: false }));
    } catch (error) {
      console.error('Mute post error:', error);
      addToast(error.response?.data.message || 'Failed to mute/unmute post', 'error');
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleMediaZoom = (e) => {
    const delta = e.deltaY * -0.01;
    setZoomLevel((prev) => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handleNextMedia = (postMedia) => {
    setSelectedMediaIndex((prev) => (prev + 1) % postMedia.length);
    setZoomLevel(1);
  };

  const handlePrevMedia = (postMedia) => {
    setSelectedMediaIndex((prev) => (prev - 1 + postMedia.length) % postMedia.length);
    setZoomLevel(1);
  };

  const sortComments = (comments, sortType) => {
    if (!comments || !Array.isArray(comments)) return [];
    const sorted = [...comments];
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'most_liked':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return sorted;
    }
  };

  const handleLoadMoreComments = (postId) => {
    setVisibleComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 5) + 5,
    }));
  };

  const renderComment = (comment, postId, depth = 0) => {
    const hasReplies = comment.replies?.length > 0;
    const isCollapsed = collapsedComments[`${postId}-${comment.id}`];

    const toggleCollapse = () => {
      setCollapsedComments((prev) => ({
        ...prev,
        [`${postId}-${comment.id}`]: !prev[`${postId}-${comment.id}`],
      }));
    };

    return (
      <motion.div
        key={comment.id}
        className={`pt-3 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--border)]' : ''} ${
          comment.pinned ? 'bg-[var(--primary-bg)] rounded-lg p-2 shadow-sm' : ''
        }`}
        initial={{ opacity: 0, y: comment.pinned ? -20 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
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
              {comment.pinned && (
                <span className="text-[var(--accent)] flex items-center gap-1 text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 0h1v3l3 7h-3v10h-4V10H5l3-7V0h1zm3.236 7L12 3.5V7h2.236z" />
                  </svg>
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-1 text-[var(--text-secondary)]">{comment.content}</p>

            <div className="mt-2 flex items-center gap-4 text-sm">
              <motion.button
                onClick={() => handleLikeComment(postId, comment.id)}
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
                    [`${postId}-${comment.id}`]: !prev[`${postId}-${comment.id}`],
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
                      handleEditComment(
                        postId,
                        comment.id,
                        comment.content,
                        comment.parent_comment_id
                      )
                    }
                    className="text-[var(--accent)] hover:underline flex items-center gap-1"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>Edit</span>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handleDeleteComment(postId, comment.id, comment.parent_comment_id)
                    }
                    className="text-red-500 hover:underline flex items-center gap-1"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete</span>
                  </motion.button>
                </>
              )}

              {user?.id === posts.find((p) => p.id === postId)?.user_id &&
                !deletedCommentIds.includes(comment.id) &&
                !comment.parent_comment_id && (
                  <motion.button
                    onClick={() =>
                      comment.pinned
                        ? handleUnpinComment(postId, comment.id)
                        : handlePinComment(postId, comment.id)
                    }
                    className="text-[var(--accent)] hover:underline flex items-center gap-1"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <span>{comment.pinned ? 'Unpin' : 'Pin'}</span>
                  </motion.button>
                )}

              {hasReplies && (
                <motion.button
                  onClick={toggleCollapse}
                  className="text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--secondary-bg)]"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-expanded={!isCollapsed}
                  aria-controls={`replies-${postId}-${comment.id}`}
                >
                  <ChevronDownIcon
                    className={`w-4 h-4 transform ${isCollapsed ? '' : 'rotate-180'}`}
                  />
                  <span>
                    {isCollapsed ? 'Show' : 'Hide'} {comment.replies.length}{' '}
                    {comment.replies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                </motion.button>
              )}
            </div>

            <AnimatePresence>
              {showReplyInput[`${postId}-${comment.id}`] && (
                <motion.div
                  className="mt-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <textarea
                    value={newReply[`${postId}-${comment.id}`] || ''}
                    onChange={(e) =>
                      setNewReply((prev) => ({
                        ...prev,
                        [`${postId}-${comment.id}`]: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Write your reply..."
                    rows="2"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <motion.button
                      onClick={() =>
                        setShowReplyInput((prev) => ({
                          ...prev,
                          [`${postId}-${comment.id}`]: false,
                        }))
                      }
                      className="px-4 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--primary-bg)]"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={() => handleCommentSubmit(postId, comment.id)}
                      className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-opacity-90 disabled:bg-gray-400"
                      disabled={!newReply[`${postId}-${comment.id}`]?.trim()}
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

        <AnimatePresence>
          {hasReplies && !isCollapsed && (
            <motion.div
              id={`replies-${postId}-${comment.id}`}
              className="mt-3 space-y-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {sortComments(comment.replies, commentSort[postId] || 'newest').map((reply) =>
                renderComment(reply, postId, depth + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 relative">
      <div ref={feedTopRef} />
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          className="text-3xl font-bold text-[var(--text-primary)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Community Feed
        </motion.h1>
        <AnimatePresence>
          {showRefreshButton && !newPostsAvailable && (
            <motion.button
              onClick={handleManualRefresh}
              className="p-2 bg-[var(--secondary-bg)] text-[var(--text-primary)] rounded-full shadow hover:bg-[var(--primary-bg)]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowPathIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={handleManualRefresh}
              className="p-2 bg-gradient-to-r from-[var(--accent)] to-purple-600 text-white rounded-full shadow hover:bg-opacity-90"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowUpIcon className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full space-y-6">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="glass rounded-xl overflow-hidden p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="skeleton w-10 h-10 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-32 rounded"></div>
                    <div className="skeleton h-3 w-24 rounded"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="skeleton h-6 w-3/4 rounded"></div>
                  <div className="skeleton h-4 w-full rounded"></div>
                  <div className="skeleton h-4 w-5/6 rounded"></div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="skeleton h-6 w-6 rounded-full"></div>
                  <div className="skeleton h-6 w-6 rounded-full"></div>
                  <div className="skeleton h-6 w-6 rounded-full"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-lg text-[var(--text-secondary)] mb-4">No posts yet</p>
          {user && (
            <motion.button
              onClick={() => navigate('/create-post')}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-opacity-90"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create First Post
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {posts.map((post) => (
            <motion.article
              key={post.id}
              className="glass-card rounded-xl overflow-hidden shadow-lg border border-[var(--border)]"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                transition: { duration: 0.3 },
              }}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${post.user_id}`}>
                    <motion.img
                      src={post.profile_picture || '/default-avatar.png'}
                      alt="Profile"
                      className="w-10 h-10 rounded-full hover:opacity-90 transition"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onError={(e) => (e.target.src = '/default-avatar.png')}
                    />
                  </Link>
                  <div>
                    <Link
                      to={`/profile/${post.user_id}`}
                      className="font-semibold hover:underline text-[var(--text-primary)]"
                    >
                      {post.username}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-2">
                    {user.id !== post.user_id && (
                      <motion.button
                        onClick={() => handleFollow(post.user_id, post.isFollowing, post.username)}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                          post.isFollowing
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-[var(--accent)] text-white hover:bg-opacity-90'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {post.isFollowing ? (
                          <>
                            <UserMinusIcon className="w-4 h-4" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlusIcon className="w-4 h-4" />
                            <span>Follow</span>
                          </>
                        )}
                      </motion.button>
                    )}

                    <div className="relative" ref={(el) => (dropdownRef.current[post.id] = el)}>
                      <motion.button
                        onClick={() =>
                          setShowDropdown((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="p-1 rounded-full hover:bg-[var(--secondary-bg)] text-[var(--text-secondary)]"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </motion.button>
                      <AnimatePresence>
                        {showDropdown[post.id] && (
                          <motion.div
                            className="absolute right-0 mt-2 w-56 bg-[var(--primary-bg)] border border-[var(--border)] rounded-md shadow-lg z-10"
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            {(!post.shared_from_post_id && user.id === post.user_id) ||
                            (post.shared_from_post_id && user.id === post.originalPoster?.user_id) ? (
                              <>
                                <motion.button
                                  onClick={() => {
                                    navigate(`/edit-post/${post.id}`);
                                    setShowDropdown((prev) => ({ ...prev, [post.id]: false }));
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--secondary-bg)] flex items-center gap-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <PencilIcon className="w-4 h-4" />
                                  Edit Post
                                </motion.button>
                                <motion.button
                                  onClick={() => {
                                    handleDeletePost(post.id);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--secondary-bg)] flex items-center gap-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Delete Post
                                </motion.button>
                              </>
                            ) : null}
                            {post.shared_from_post_id && user.id === post.user_id && (
                              <motion.button
                                onClick={() => {
                                  handleDeletePost(post.id);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--secondary-bg)] flex items-center gap-2"
                                whileHover={{ x: 5 }}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete Shared Post
                              </motion.button>
                            )}
                            <motion.button
                              onClick={() => {
                                handleMutePost(post.id);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--secondary-bg)] flex items-center gap-2"
                              whileHover={{ x: 5 }}
                            >
                              {mutedPosts[post.id] ? (
                                <>
                                  <BellIcon className="w-4 h-4" />
                                  Unmute Notifications
                                </>
                              ) : (
                                <>
                                  <BellSlashIcon className="w-4 h-4" />
                                  Mute Notifications
                                </>
                              )}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 pb-3">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{post.title}</h2>
                <p className="text-[var(--text-secondary)] whitespace-pre-line">{post.content}</p>
                {post.shared_from_post_id && post.originalPoster && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                    Shared from{' '}
                    <Link
                      to={`/profile/${post.originalPoster.user_id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {post.originalPoster.username}
                    </Link>
                  </p>
                )}
              </div>

              {post.media?.length > 0 && (
                <div className="border-t border-b border-[var(--border)] p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {post.media.map((media, index) => (
                      <div key={index} className="relative">
                        {media.type === 'image' ? (
                          <motion.img
                            src={media.url}
                            alt={`Post media ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg cursor-pointer"
                            onClick={() => {
                              setSelectedMedia(post.media);
                              setSelectedMediaIndex(index);
                            }}
                            onError={(e) => (e.target.src = '/default-image.png')}
                            whileHover={{ opacity: 0.9, scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {likedPosts[post.id] ? (
                      <HeartIconSolid className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartIcon className="w-6 h-6" />
                    )}
                    <span>{post.likes || 0}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChatBubbleLeftIcon className="w-6 h-6" />
                    <span>{comments[post.id]?.length || 0}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => handleShare(post.id)}
                    className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ShareIcon className="w-6 h-6" />
                    <span>Share</span>
                  </motion.button>
                </div>
                <motion.div
                  className="flex items-center gap-1 text-[var(--text-secondary)]"
                  whileHover={{ scale: 1.1 }}
                >
                  {mutedPosts[post.id] ? (
                    <BellSlashIcon className="w-6 h-6 text-gray-500" />
                  ) : (
                    <BellIcon className="w-6 h-6" />
                  )}
                </motion.div>
              </div>

              {user && (
                <div className="p-4 border-b border-[var(--border)]">
                  <textarea
                    value={newComment[post.id] || ''}
                    onChange={(e) =>
                      setNewComment((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] transition-all"
                    placeholder="Write a comment..."
                    rows="2"
                  />
                  <div className="mt-2 flex justify-end">
                    <motion.button
                      onClick={() => handleCommentSubmit(post.id)}
                      className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!newComment[post.id]?.trim()}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Post Comment
                    </motion.button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {showComments[post.id] && (
                  <motion.div
                    className="bg-[var(--secondary-bg)]"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-4 space-y-4">
                      {comments[post.id]?.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div className="relative">
                              <select
                                value={commentSort[post.id] || 'newest'}
                                onChange={(e) =>
                                  setCommentSort((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value,
                                  }))
                                }
                                className="appearance-none pl-4 pr-8 py-1.5 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                              >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                                <option value="most_liked">Most Liked</option>
                              </select>
                              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                            </div>
                            <span className="text-sm text-[var(--text-secondary)]">
                              {comments[post.id].length} comments
                            </span>
                          </div>
                          <div className="space-y-4 overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--accent)] scrollbar-track-[var(--secondary-bg)] md:overflow-x-hidden">
                            {comments[post.id].find((c) => c.pinned && !c.parent_comment_id) && (
                              <div>
                                {renderComment(
                                  comments[post.id].find((c) => c.pinned && !c.parent_comment_id),
                                  post.id
                                )}
                              </div>
                            )}
                            {sortComments(
                              comments[post.id].filter((c) => !c.parent_comment_id && !c.pinned),
                              commentSort[post.id] || 'newest'
                            )
                              .slice(0, visibleComments[post.id] || 5)
                              .map((comment) => (
                                <div key={comment.id}>{renderComment(comment, post.id)}</div>
                              ))}
                          </div>
                          {visibleComments[post.id] <
                            comments[post.id].filter((c) => !c.parent_comment_id).length && (
                            <div className="text-center">
                              <motion.button
                                onClick={() => handleLoadMoreComments(post.id)}
                                className="text-[var(--accent)] hover:underline text-sm"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Load more comments
                              </motion.button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center text-[var(--text-secondary)] py-4">
                          No comments yet
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          ))}
        </motion.div>
      )}

      {user && (
        <motion.div
          className="fixed bottom-8 right-8 z-40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <button
            onClick={() => navigate('/create-post')}
            className="p-4 bg-gradient-to-r from-[var(--accent)] to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-6 h-6" />
            <span className="hidden sm:inline">New Post</span>
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              setSelectedMedia(null);
              setSelectedMediaIndex(0);
              setZoomLevel(1);
            }}
          >
            <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
              {selectedMedia[selectedMediaIndex].type === 'image' ? (
                <motion.img
                  src={selectedMedia[selectedMediaIndex].url}
                  alt={`Media ${selectedMediaIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                  onWheel={handleMediaZoom}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: zoomLevel }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  drag
                  dragConstraints={{
                    top: -50,
                    left: -50,
                    right: 50,
                    bottom: 50,
                  }}
                />
              ) : (
                <video
                  src={selectedMedia[selectedMediaIndex].url}
                  controls
                  className="w-full max-h-[80vh] rounded-lg"
                />
              )}
              <motion.button
                className="absolute top-4 right-4 bg-[var(--primary-bg)] p-2 rounded-full shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMedia(null);
                  setSelectedMediaIndex(0);
                  setZoomLevel(1);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="w-6 h-6 text-[var(--text-primary)]" />
              </motion.button>
              {selectedMedia.length > 1 && (
                <>
                  <motion.button
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-[var(--primary-bg)] p-2 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevMedia(selectedMedia);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChevronLeftIcon className="w-6 h-6 text-[var(--text-primary)]" />
                  </motion.button>
                  <motion.button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-[var(--primary-bg)] p-2 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMedia(selectedMedia);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChevronRightIcon className="w-6 h-6 text-[var(--text-primary)]" />
                  </motion.button>
                </>
              )}
              {selectedMedia[selectedMediaIndex].type === 'image' && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel((prev) => Math.min(prev + 0.1, 3));
                    }}
                    className="bg-[var(--primary-bg)] p-2 rounded-full shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <PlusIcon className="w-5 h-5 text-[var(--text-primary)]" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
                    }}
                    className="bg-[var(--primary-bg)] p-2 rounded-full shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <MinusIcon className="w-5 h-5 text-[var(--text-primary)]" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel(1);
                    }}
                    className="bg-[var(--primary-bg)] px-4 py-2 rounded-full shadow-lg text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Reset Zoom
                  </motion.button>
                </div>
              )}
              {selectedMedia.length > 1 && (
                <div className="absolute top-4 left-4 text-white text-sm">
                  {selectedMediaIndex + 1} / {selectedMedia.length}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.text}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Feed;
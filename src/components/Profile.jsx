import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PostList from './PostList';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlusIcon,
  UserMinusIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilIcon,
  UsersIcon,
  UserGroupIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    profilePicture: null,
    coverImage: null,
    themeColor: '#3b82f6',
  });
  const [previewProfilePic, setPreviewProfilePic] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const { user, login, logout } = useContext(AuthContext);
  const { userId } = useParams();
  const navigate = useNavigate();

  // Centralized message clearing
  useEffect(() => {
    if (message) {
      const timeoutId = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [message]);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (previewProfilePic) URL.revokeObjectURL(previewProfilePic);
      if (previewCover) URL.revokeObjectURL(previewCover);
    };
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Please log in to view profiles');
        navigate('/login');
        return;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data;
      setProfile(data.user);
      setStats(data.stats);
      setEditForm({
        username: data.user.username || '',
        email: data.user.email || '',
        profilePicture: null,
        coverImage: null,
        themeColor: data.user.theme_color || '#3b82f6',
      });
      setPreviewProfilePic(null);
      setPreviewCover(null);
      setIsFollowing(data.isFollowing || false);
      setIsBlocked(data.isBlocked || false);
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to load profile');
      if (error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', editForm.username);
    formData.append('email', editForm.email);
    if (editForm.profilePicture) {
      formData.append('profilePicture', editForm.profilePicture);
    }
    if (editForm.coverImage) {
      formData.append('coverImage', editForm.coverImage);
    }
    formData.append('themeColor', editForm.themeColor);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        }
      );
      setMessage('Profile updated!');
      setIsEditing(false);
      const updatedUser = response.data.user || response.data;
      setProfile(updatedUser);
      login(token, updatedUser);
      setEditForm({
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        profilePicture: null,
        coverImage: null,
        themeColor: updatedUser.theme_color || '#3b82f6',
      });
      setPreviewProfilePic(null);
      setPreviewCover(null);
      await fetchProfile();
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to update profile');
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'profilePicture' && previewProfilePic) {
        URL.revokeObjectURL(previewProfilePic);
      } else if (type === 'coverImage' && previewCover) {
        URL.revokeObjectURL(previewCover);
      }
      setEditForm((prev) => ({ ...prev, [type]: file }));
      const previewUrl = URL.createObjectURL(file);
      if (type === 'profilePicture') {
        setPreviewProfilePic(previewUrl);
      } else {
        setPreviewCover(previewUrl);
      }
    }
  };

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/followers/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowers(response.data);
      setShowFollowers(true);
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to load followers');
    }
  };

  const fetchFollowing = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/following/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowing(response.data);
      setShowFollowing(true);
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to load following');
    }
  };

  const fetchBlocked = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/blocked`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedUsers(response.data);
      setShowBlocked(true);
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to load blocked users');
    }
  };

  const handleFollow = async () => {
    try {
      const token = localStorage.getItem('token');
      if (isFollowing) {
        await axios.delete(
          `${import.meta.env.VITE_BACKEND_URL}/api/follow/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsFollowing(false);
        setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
        setMessage('Unfollowed user');
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/follow`,
          { followedId: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFollowing(true);
        setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
        setMessage('Followed user');
      }
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to update follow status');
    }
  };

  const handleBlock = async () => {
    try {
      const token = localStorage.getItem('token');
      if (isBlocked) {
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/block/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBlocked(false);
        setMessage('Unblocked user');
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/block`,
          { blockedId: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsBlocked(true);
        setMessage('Blocked user');
      }
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to update block status');
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/block/${blockedUserId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBlockedUsers(blockedUsers.filter((u) => u.id !== blockedUserId));
      setMessage('Unblocked user');
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to unblock user');
    }
  };

  const handleDeleteProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { password: deletePassword },
        }
      );
      setMessage(response.data.message);
      setShowDeleteModal(false);
      setDeletePassword('');
      logout();
      navigate('/login');
    } catch (error) {
      setMessage(error.response?.data.message || 'Failed to delete profile');
    }
  };

  if (!profile) {
    return (
      <div className="text-center mt-8 animate-pulse text-[var(--text-primary)]">
        Loading profile...
      </div>
    );
  }

  const isOwnProfile = user && user.id === parseInt(userId);

  return (
    <motion.div
      className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative rounded-[var(--radius-lg)] overflow-hidden"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="h-40 sm:h-48"
          style={{ backgroundColor: profile.theme_color || 'var(--accent)' }}
        >
          <img
            src={previewCover || profile.cover_image || '/default-cover.png'}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => (e.target.src = '/default-cover.png')}
          />
        </div>
        <div className="absolute top-24 sm:top-28 left-4 sm:left-6">
          <img
            src={previewProfilePic || profile.profile_picture || '/default-avatar.png'}
            alt="Profile"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[var(--secondary-bg)]"
          />
        </div>
        <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-6 bg-[var(--secondary-bg)]">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {profile.username || 'Unknown User'}
          </h1>
          <p className="text-[var(--text-secondary)]">{profile.email || 'No email provided'}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Joined: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[var(--text-primary)]">
            <motion.button
              onClick={fetchFollowers}
              className="flex items-center space-x-1 hover:text-[var(--accent)]"
              whileTap={{ scale: 0.95 }}
            >
              <UsersIcon className="w-5 h-5" />
              <span>{stats.followers || 0} Followers</span>
            </motion.button>
            <motion.button
              onClick={fetchFollowing}
              className="flex items-center space-x-1 hover:text-[var(--accent)]"
              whileTap={{ scale: 0.95 }}
            >
              <UserGroupIcon className="w-5 h-5" />
              <span>{stats.following || 0} Following</span>
            </motion.button>
            <div className="flex items-center space-x-1 text-[var(--text-primary)]">
              <span>{stats.posts || 0} Posts</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
            {isOwnProfile ? (
              <>
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] border border-[var(--accent)] flex items-center space-x-2 hover:bg-opacity-90"
                  whileTap={{ scale: 0.95 }}
                >
                  <PencilIcon className="w-5 h-5" />
                  <span>Edit Profile</span>
                </motion.button>
                <motion.button
                  onClick={fetchBlocked}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-[var(--radius-md)] border border-gray-300 dark:border-gray-600 flex items-center space-x-2"
                  whileTap={{ scale: 0.95 }}
                >
                  <LockClosedIcon className="w-5 h-5" />
                  <span>Blocked Users</span>
                </motion.button>
                <motion.button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-[var(--radius-md)] border border-red-300 dark:border-red-600 flex items-center space-x-2"
                  whileTap={{ scale: 0.95 }}
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Delete Profile</span>
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-[var(--radius-md)] flex items-center space-x-2 ${
                    isFollowing
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600'
                      : 'bg-[var(--accent)] bg-opacity-10 text-purple-200 border border-[var(--accent)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {isFollowing ? (
                    <>
                      <UserMinusIcon className="w-5 h-5" />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-5 h-5" />
                      <span>Follow</span>
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={handleBlock}
                  className={`px-4 py-2 rounded-[var(--radius-md)] flex items-center space-x-2 ${
                    isBlocked
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                      : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {isBlocked ? (
                    <>
                      <LockOpenIcon className="w-5 h-5" />
                      <span>Unblock</span>
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="w-5 h-5" />
                      <span>Block</span>
                    </>
                  )}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PostList userId={userId} setParentMessage={setMessage} />
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] p-6 w-full max-w-md"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Edit Profile
              </h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Username
                  </label>
                  <motion.input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, username: e.target.value }))
                    }
                    className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-[var(--accent)]"
                    required
                    whileFocus={{ scale: 1.02 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Email
                  </label>
                  <motion.input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-[var(--accent)]"
                    required
                    whileFocus={{ scale: 1.02 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'profilePicture')}
                    className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)] file:mr-4 file:py-1 file:px-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--accent)] file:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Cover Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'coverImage')}
                    className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)] file:mr-4 file:py-1 file:px-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--accent)] file:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Theme Color
                  </label>
                  <motion.input
                    type="color"
                    value={editForm.themeColor}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, themeColor: e.target.value }))
                    }
                    className="w-full h-10 rounded-[var(--radius-sm)]"
                    whileFocus={{ scale: 1.02 }}
                  />
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] hover:bg-opacity-90"
                    whileTap={{ scale: 0.95 }}
                  >
                    Save
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setPreviewProfilePic(null);
                      setPreviewCover(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-[var(--radius-md)] hover:bg-gray-600"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Profile Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] p-6 w-full max-w-md"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Delete Profile
              </h2>
              <p className="text-[var(--text-secondary)] mb-4">
                This action is irreversible and will delete all your data, including posts, comments, and follows. Please enter your password to confirm.
              </p>
              <form onSubmit={handleDeleteProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Password
                  </label>
                  <motion.input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full p-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--secondary-bg)] text-[var(--text-primary)] focus:ring-[var(--accent)]"
                    required
                    whileFocus={{ scale: 1.02 }}
                  />
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-[var(--radius-md)] hover:bg-red-600"
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-[var(--radius-md)] hover:bg-gray-600"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowers && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] p-6 w-full max-w-md"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Followers
              </h2>
              {followers.length > 0 ? (
                <ul className="space-y-2">
                  {followers.map((follower) => (
                    <motion.li
                      key={follower.id}
                      className="flex items-center space-x-2 text-[var(--text-primary)] hover:bg-[var(--primary-bg)] p-2 rounded-[var(--radius-sm)] cursor-pointer"
                      onClick={() => {
                        navigate(`/profile/${follower.id}`);
                        setShowFollowers(false);
                      }}
                    >
                      <img
                        src={follower.profile_picture || '/default-avatar.png'}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                        onError={(e) => (e.target.src = '/default-avatar.png')}
                      />
                      <span>{follower.username}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-secondary)]">No followers yet.</p>
              )}
              <motion.button
                onClick={() => setShowFollowers(false)}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-[var(--radius-md)] hover:bg-gray-600"
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Following Modal */}
      <AnimatePresence>
        {showFollowing && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] p-6 w-full max-w-md"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Following
              </h2>
              {following.length > 0 ? (
                <ul className="space-y-2">
                  {following.map((followed) => (
                    <motion.li
                      key={followed.id}
                      className="flex items-center space-x-2 text-[var(--text-primary)] hover:bg-[var(--primary-bg)] p-2 rounded-[var(--radius-sm)] cursor-pointer"
                      onClick={() => {
                        navigate(`/profile/${followed.id}`);
                        setShowFollowing(false);
                      }}
                    >
                      <img
                        src={followed.profile_picture || '/default-avatar.png'}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                        onError={(e) => (e.target.src = '/default-avatar.png')}
                      />
                      <span>{followed.username}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-secondary)]">Not following anyone yet.</p>
              )}
              <motion.button
                onClick={() => setShowFollowing(false)}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-[var(--radius-md)] hover:bg-gray-600"
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocked Users Modal */}
      <AnimatePresence>
        {showBlocked && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[var(--secondary-bg)] rounded-[var(--radius-lg)] p-6 w-full max-w-md"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Blocked Users
              </h2>
              {blockedUsers.length > 0 ? (
                <ul className="space-y-2">
                  {blockedUsers.map((blocked) => (
                    <motion.li
                      key={blocked.id}
                      className="flex items-center justify-between text-[var(--text-primary)] p-2 rounded-[var(--radius-sm)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center space-x-2">
                        <img
                          src={blocked.profile_picture || '/default-avatar.png'}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full"
                          onError={(e) => (e.target.src = '/default-avatar.png')}
                        />
                        <span>{blocked.username}</span>
                      </div>
                      <motion.button
                        onClick={() => handleUnblock(blocked.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-[var(--radius-sm)] hover:bg-red-600"
                        whileTap={{ scale: 0.95 }}
                      >
                        Unblock
                      </motion.button>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-secondary)]">No blocked users.</p>
              )}
              <motion.button
                onClick={() => setShowBlocked(false)}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-[var(--radius-md)] hover:bg-gray-600"
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
export default Profile;
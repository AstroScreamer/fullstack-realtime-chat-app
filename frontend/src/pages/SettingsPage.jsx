import { Send, Trash2, AlertTriangle, Eye, EyeOff, Lock, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useState } from 'react';


const PREVIEW_MESSAGES = [
  {id: 1, content: "Hey! How's it going?", isSent: false},
  {id: 2, content: "I'm doing great! Just working on a project.", isSent: true},
]

const DeleteAccountSection = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1); // 1: warning, 2: confirmation

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE ACCOUNT' || !password) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/delete-account', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        window.location.href = '/login';
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert('An error occurred while deleting your account');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetModal = () => {
    setShowDeleteModal(false);
    setConfirmationText('');
    setPassword('');
    setShowPassword(false);
    setStep(1);
  };

  return (
    <div className="bg-base-200 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-2">Danger Zone</h3>
      <p className="text mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      
      <div className="flex items-center justify-center gap-2 mb-4">  
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text rounded-md hover:bg-red-700 transition-colors"
        >
          <Trash2 size={18} />
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-200 rounded-lg p-6 w-full max-w-md mx-4">
            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Delete Account</h3>
                </div>

                <div className="mb-6">
                  <p className="text mb-4">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="font-medium text-red-800 mb-2">What will be deleted:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• Your profile and account information</li>
                      <li>• All your chat messages and conversations</li>
                      <li>• Your contacts and friend connections</li>
                      <li>• Any uploaded files or media</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={resetModal}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    I understand, continue
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Final Confirmation</h3>
                </div>

                <div className="mb-6">
                  <div className="mb-4">
                    <label className="label text-sm font-medium mb-2">
                      Type "DELETE ACCOUNT" to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleDeleteAccount();
                        }
                      }}
                      className="w-full px-3 py-2 input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Type DELETE ACCOUNT"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="label text-sm font-medium mb-2">
                      Enter your password to confirm:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDeleteAccount();
                          }
                        }}
                        className="w-full px-3 py-2 pr-10 input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-800 text-sm font-medium">
                      ⚠️ This action is permanent and cannot be reversed
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isDeleting}
                  >
                    Back
                  </button>
                  <button
                    onClick={resetModal}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDeleteAccount();
                      }
                    }}
                    onClick={handleDeleteAccount}
                    disabled={confirmationText !== 'DELETE ACCOUNT' || !password || isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ChangePasswordSection = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    // frontend validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    // Check if new password is same as current
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setSuccess('');
        }, 5000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="text-primary" size={24} />
        <h3 className="text-lg font-semibold">Change Password</h3>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {success && (
        <div className="alert alert-success mb-4">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* All your input fields */}
        <div className="space-y-4">
          {/* Current Password */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Current Password</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.currentPassword && formData.newPassword && formData.confirmPassword) {
                    handleSubmit(e);
                  }
                }}
                className="w-full px-3 py-2 pr-10 input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePassword('current')}
                className="absolute inset-y-0 right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">New Password</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.currentPassword && formData.newPassword && formData.confirmPassword) {
                    handleSubmit(e);
                  }
                }}
                className="w-full px-3 py-2 pr-10 input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePassword('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt">Must be at least 6 characters long</span>
            </label>
          </div>

          {/* Confirm Password */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Confirm New Password</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.currentPassword && formData.newPassword && formData.confirmPassword) {
                    handleSubmit(e);
                  }
                }}
                className="w-full px-3 py-2 pr-10 input input-bordered rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => togglePassword('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              className="px-6 py-2 bg-primary rounded-md hover:bg-primary/90 hover:text-white-500"
            >
              {isLoading && <span className="loading loading-spinner"></span>}
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="container mx-auto px-4 pt-20 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              {/* Mock Chat UI */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      J
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">John Doe</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>
          
                {/* Chat Messages */}
                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        max-w-[80%] rounded-xl p-3 shadow-sm
                        ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                      `}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`
                          text-[10px] mt-1.5
                          ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                        `}
                      >
                        12:00 PM
                      </p>
                    </div>
                  </div>
                  ))}
                </div>
          
                {/* Chat Input */}
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1 text-sm h-10"
                      placeholder="Type a message..."
                      value="This is a preview"
                      readOnly
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-base-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-primary" size={24} />
            <h3 className="text-lg font-semibold">Security</h3>
          </div>        
          <div className="space-y-6">
            <ChangePasswordSection/>
          </div>
        </div>
        <DeleteAccountSection/>
      </div>
    </div>
  );
};

export default SettingsPage;
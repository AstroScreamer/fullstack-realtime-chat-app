import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            token,
            newPassword: formData.newPassword 
        })
      });

      if (response.ok) {
        alert('Password reset successful!');
        navigate('/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-center mb-4">
            <Lock size={48} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">New Password</span></label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input input-bordered w-full"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-3"
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label"><span className="label-text font-medium">Confirm Password</span></label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input input-bordered w-full"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-3"
              >
                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn btn-primary mt-4"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
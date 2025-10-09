'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { Profile } from '@/types/profile';
import { timezones } from '@/constants/timezones';

type EditProfileFormProps = {
  profile: Profile;
  onClose: () => void;
  onUpdate: () => void;
};

export default function EditProfileForm({ profile, onClose, onUpdate }: EditProfileFormProps) {
  const [formData, setFormData] = useState({
    username: profile.username || '',
    full_name: profile.full_name || '',
    timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications_enabled: profile.notifications_enabled,
    dark_mode_enabled: profile.dark_mode_enabled,
    glucose_unit: profile.glucose_unit,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let avatar_url = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split('.').pop();
          const filePath = `${profile.id}/avatar${fileExt ? `.${fileExt}` : ''}`;

          // Try to upload directly to avatars bucket
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, {
              upsert: true,
              cacheControl: '3600',
              contentType: avatarFile.type,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            
            // Check if it's a bucket issue
            const { data: buckets, error: bucketsError } = await supabase
              .storage
              .listBuckets();

            if (bucketsError) {
              throw new Error(`Storage system error: ${bucketsError.message}`);
            }

            // Attempt to create bucket if it doesn't exist
            if (!buckets?.some(b => b.id === 'avatars')) {
              const { error: createError } = await supabase
                .storage
                .createBucket('avatars', {
                  public: true,
                  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                  fileSizeLimit: 5242880, // 5MB
                });

              if (createError) {
                throw new Error(`Failed to initialize avatar storage: ${createError.message}`);
              }

              // Retry upload after creating bucket
              const { error: retryError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, {
                  upsert: true,
                  cacheControl: '3600',
                  contentType: avatarFile.type,
                });

              if (retryError) {
                throw new Error(`Failed to upload after bucket creation: ${retryError.message}`);
              }
            } else {
              throw new Error(`Upload failed: ${uploadError.message}`);
            }
          }

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          avatar_url = publicUrl;
        } catch (error) {
          console.error('Avatar upload error:', error);
          if (error instanceof Error) {
            throw new Error(error.message);
          }
          throw new Error('Failed to upload avatar');
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...formData,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
      if (avatarPreview && avatarPreview !== profile.avatar_url) {
        URL.revokeObjectURL(avatarPreview);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Avatar Section */}
      <div className="flex items-center space-x-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Profile avatar"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-semibold text-white">
                {formData.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">Profile Photo</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Upload a new profile photo
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Full Name
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="glucose_unit"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >
            Glucose Unit
          </label>
          <select
            id="glucose_unit"
            name="glucose_unit"
            value={formData.glucose_unit}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="mg/dL">mg/dL</option>
            <option value="mmol/L">mmol/L</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifications_enabled"
            name="notifications_enabled"
            checked={formData.notifications_enabled}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <label
            htmlFor="notifications_enabled"
            className="ml-2 block text-sm text-gray-700 dark:text-slate-300"
          >
            Enable Notifications
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="dark_mode_enabled"
            name="dark_mode_enabled"
            checked={formData.dark_mode_enabled}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <label
            htmlFor="dark_mode_enabled"
            className="ml-2 block text-sm text-gray-700 dark:text-slate-300"
          >
            Enable Dark Mode
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
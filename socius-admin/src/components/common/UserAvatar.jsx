import React, { useState } from 'react';
import { baseURL } from '../../services/api/client';

export const resolveProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  const s = String(profileImage).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const origin = String(baseURL || '').replace(/\/api\/?$/i, '');
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${origin}${path}`;
};

const initialsFromName = (name) => {
  const t = String(name || '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
};

const sizeMap = {
  sm: 'h-9 w-9 min-w-[2.25rem] text-xs',
  md: 'h-12 w-12 min-w-[3rem] text-sm',
  lg: 'h-16 w-16 min-w-[4rem] text-base',
  xl: 'h-24 w-24 min-w-[6rem] text-2xl',
};

/**
 * Avatar: image or initials fallback.
 * @param {'circle' | 'rounded'} shape — circle (default) or square with light radius
 * sizes: sm | md | lg | xl
 */
const UserAvatar = ({ src, name, size = 'md', className = '', shape = 'circle' }) => {
  const [imgErr, setImgErr] = useState(false);
  const url = resolveProfileImageUrl(src);
  const showImg = url && !imgErr;
  const dim = sizeMap[size] || sizeMap.md;
  const radiusClass = shape === 'rounded' ? 'rounded-md' : 'rounded-full';

  return (
    <div
      className={`relative inline-flex items-center justify-center ${radiusClass} bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-100 font-semibold overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-sm ${dim} ${className}`}
      title={name || ''}
    >
      {showImg ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <span className="select-none">{initialsFromName(name)}</span>
      )}
    </div>
  );
};

export default UserAvatar;

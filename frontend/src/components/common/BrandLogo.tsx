import React, { useState } from 'react';
import { useBranding } from '../../context/BrandingContext';

interface BrandLogoProps {
  variant?: 'sidebar' | 'sidebar-collapsed' | 'navbar' | 'login' | 'public' | 'footer' | 'header' | 'preview';
  customUrl?: string;
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  imageOnly?: boolean;
  fallbackLetter?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'navbar',
  customUrl,
  className = '',
  imageClassName = '',
  showText = false,
  imageOnly = false,
  fallbackLetter,
}) => {
  const { branding } = useBranding();
  const [imageError, setImageError] = useState(false);

  // Determine active logo URL based on variant priority
  const activeLogoUrl = (() => {
    if (customUrl !== undefined) return customUrl;
    if (variant === 'login' && branding.login_logo_url) return branding.login_logo_url;
    if ((variant === 'public' || variant === 'footer') && branding.public_logo_url) return branding.public_logo_url;
    return branding.logo_url || '';
  })();

  const initial = (fallbackLetter || branding.foundation_name?.[0] || 'F').toUpperCase();
  const name = branding.foundation_name || 'Al-Khair Foundation';
  const tagline = branding.tagline || 'Interest-Free Benevolence & Microfinance';

  const renderFallbackIcon = () => {
    switch (variant) {
      case 'sidebar-collapsed':
        return (
          <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-violet-500/30 ${className}`}>
            {initial}
          </div>
        );
      case 'sidebar':
        return (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-violet-500/30 flex-shrink-0 ${className}`}>
            {initial}
          </div>
        );
      case 'login':
        return (
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-extrabold text-2xl shadow-xl shadow-violet-500/20 flex items-center justify-center ${className}`}>
            {initial}
          </div>
        );
      case 'public':
        return (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-base md:text-xl shadow-md flex-shrink-0 group-hover:scale-105 transition-transform ${className}`}>
            {initial}
          </div>
        );
      case 'footer':
        return (
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md flex-shrink-0 ${className}`}>
            {initial}
          </div>
        );
      default:
        return (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md flex-shrink-0 ${className}`}>
            {initial}
          </div>
        );
    }
  };

  const renderImage = () => {
    switch (variant) {
      case 'sidebar-collapsed':
        return (
          <div className={`flex items-center justify-center w-full ${className}`}>
            <img
              src={activeLogoUrl}
              alt={name}
              onError={() => setImageError(true)}
              className={`h-8 w-8 max-w-full max-h-full object-contain bg-transparent border-0 outline-none shadow-none ${imageClassName}`}
            />
          </div>
        );
      case 'sidebar':
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`h-8 sm:h-9 w-auto max-w-[120px] max-h-9 object-contain bg-transparent border-0 outline-none shadow-none flex-shrink-0 ${className} ${imageClassName}`}
          />
        );
      case 'login':
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`max-h-16 sm:max-h-20 max-w-[240px] w-auto object-contain bg-transparent border-0 outline-none shadow-none mx-auto ${className} ${imageClassName}`}
          />
        );
      case 'public':
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`h-8 sm:h-10 md:h-11 max-h-11 w-auto max-w-[130px] sm:max-w-[170px] md:max-w-[210px] object-contain bg-transparent border-0 outline-none shadow-none flex-shrink-0 group-hover:scale-105 transition-transform ${className} ${imageClassName}`}
          />
        );
      case 'footer':
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`h-8 sm:h-10 max-h-10 w-auto max-w-[180px] object-contain bg-transparent border-0 outline-none shadow-none flex-shrink-0 ${className} ${imageClassName}`}
          />
        );
      case 'preview':
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`max-h-full max-w-full object-contain bg-transparent border-0 outline-none shadow-none ${className} ${imageClassName}`}
          />
        );
      default:
        return (
          <img
            src={activeLogoUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={`h-8 max-h-8 w-auto max-w-[140px] object-contain bg-transparent border-0 outline-none shadow-none flex-shrink-0 ${className} ${imageClassName}`}
          />
        );
    }
  };

  const hasValidImage = Boolean(activeLogoUrl && !imageError);

  if (imageOnly) {
    return hasValidImage ? renderImage() : renderFallbackIcon();
  }

  // Composed presentation with typography
  if (variant === 'sidebar') {
    return (
      <div className="flex items-center gap-3 min-w-0">
        {hasValidImage ? renderImage() : renderFallbackIcon()}
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-snug truncate">
            {name}
          </h1>
          <p className="text-[0.65rem] text-indigo-500/70 dark:text-indigo-400/80 font-medium tracking-wide truncate">
            Management System
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'public') {
    return (
      <div className={`flex items-center space-x-2 sm:space-x-3 group min-w-0 ${className}`}>
        {hasValidImage ? renderImage() : renderFallbackIcon()}
        {showText && (
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase truncate">
              {name}
            </span>
            {tagline && (
              <span className="hidden md:block text-[10px] md:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase truncate">
                {tagline}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex items-center space-x-2.5 sm:space-x-3 min-w-0 ${className}`}>
        {hasValidImage ? renderImage() : renderFallbackIcon()}
        {showText && (
          <div className="min-w-0">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase truncate block">
              {name}
            </span>
            {tagline && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase truncate block">
                {tagline}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {hasValidImage ? renderImage() : renderFallbackIcon()}
      {showText && (
        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
          {name}
        </span>
      )}
    </div>
  );
};

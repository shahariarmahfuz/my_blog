import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandingApi } from '../api/client';
import { PublicBrandingOut } from '../types';

interface BrandingContextType {
  branding: PublicBrandingOut;
  loading: boolean;
  refreshBranding: () => Promise<void>;
  updateBrandingState: (newData: Partial<PublicBrandingOut>) => void;
}

const DEFAULT_BRANDING: PublicBrandingOut = {
  foundation_name: 'Al-Khair Foundation',
  tagline: 'Empowering Communities through Islamic Microfinance & Sadaqah',
  logo_url: '',
  favicon_url: '',
  apple_touch_icon_url: '',
  login_logo_url: '',
  public_logo_url: '',
};

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  loading: false,
  refreshBranding: async () => {},
  updateBrandingState: () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PublicBrandingOut>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync favicon and apple touch icon in HTML head
  const updateHtmlHead = useCallback((data: PublicBrandingOut) => {
    try {
      // 1. Favicon link
      if (data.favicon_url) {
        let linkIcon = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!linkIcon) {
          linkIcon = document.createElement('link');
          linkIcon.rel = 'icon';
          document.head.appendChild(linkIcon);
        }
        linkIcon.href = data.favicon_url;
      }

      // 2. Apple touch icon link
      if (data.apple_touch_icon_url || data.favicon_url) {
        let linkApple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
        if (!linkApple) {
          linkApple = document.createElement('link');
          linkApple.rel = 'apple-touch-icon';
          document.head.appendChild(linkApple);
        }
        linkApple.href = data.apple_touch_icon_url || data.favicon_url || '';
      }
    } catch (e) {
      // Ignore DOM exceptions if SSR or headless
    }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const res = await brandingApi.getPublic();
      if (res.data) {
        const merged: PublicBrandingOut = {
          foundation_name: res.data.foundation_name || DEFAULT_BRANDING.foundation_name,
          tagline: res.data.tagline || DEFAULT_BRANDING.tagline,
          logo_url: res.data.logo_url || '',
          favicon_url: res.data.favicon_url || '',
          apple_touch_icon_url: res.data.apple_touch_icon_url || '',
          login_logo_url: res.data.login_logo_url || res.data.logo_url || '',
          public_logo_url: res.data.public_logo_url || res.data.logo_url || '',
          updated_at: res.data.updated_at,
        };
        setBranding(merged);
        updateHtmlHead(merged);
      }
    } catch (err) {
      // Fallback gracefully without breaking UI
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, [updateHtmlHead]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const updateBrandingState = useCallback((newData: Partial<PublicBrandingOut>) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newData };
      updateHtmlHead(updated);
      return updated;
    });
  }, [updateHtmlHead]);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        loading,
        refreshBranding: fetchBranding,
        updateBrandingState,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

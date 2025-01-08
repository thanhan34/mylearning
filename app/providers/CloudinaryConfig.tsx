'use client';

import { useEffect } from 'react';

interface CloudinaryUploadWidgetResult {
  event: string;
  info: {
    secure_url?: string;
    public_id?: string;
  };
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: any,
        callback: (error: any, result: CloudinaryUploadWidgetResult) => void
      ) => any;
      applyUploadWidget: (options: { cloudName: string }) => void;
    };
  }
}

export default function CloudinaryConfig() {
  useEffect(() => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!document.getElementById('cloudinary-upload-widget-script')) {
      const script = document.createElement('script');
      script.id = 'cloudinary-upload-widget-script';
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      
      script.onload = () => {
        if (window.cloudinary) {
          window.cloudinary.applyUploadWidget?.({ cloudName: cloudName || '' });
        }
      };
      
      document.body.appendChild(script);
    }
    
    return () => {
      const script = document.getElementById('cloudinary-upload-widget-script');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return null;
}

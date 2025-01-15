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
    };
  }
}

export default function CloudinaryConfig() {
  useEffect(() => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!document.getElementById('cloudinary-upload-widget-script')) {
      const script = document.createElement('script');
      script.id = 'cloudinary-upload-widget-script';
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      
      script.onload = () => {
        // Create a container element for the widget
        const container = document.createElement('div');
        container.id = 'cloudinary-widget-container';
        container.style.display = 'none';
        document.body.appendChild(container);
        
        if (window.cloudinary && cloudName && uploadPreset) {
          window.cloudinary.createUploadWidget(
            {
              cloudName: cloudName,
              uploadPreset: uploadPreset,
              sources: ['local', 'url', 'camera'],
              multiple: false,
              maxFiles: 1,
              showAdvancedOptions: false,
              cropping: false,
              showSkipCropButton: false,
              styles: {
                palette: {
                  window: '#FFFFFF',
                  windowBorder: '#fc5d01',
                  tabIcon: '#fd7f33',
                  menuIcons: '#fd7f33',
                  textDark: '#000000',
                  textLight: '#FFFFFF',
                  link: '#fc5d01',
                  action: '#fc5d01',
                  inactiveTabIcon: '#fdbc94',
                  error: '#ff0000',
                  inProgress: '#fd7f33',
                  complete: '#fc5d01',
                  sourceBg: '#fedac2'
                }
              }
            },
            (error, result) => {
              if (!error && result && result.event === "success") {
                const event = new CustomEvent('cloudinaryUploadSuccess', {
                  detail: {
                    url: result.info.secure_url,
                    publicId: result.info.public_id
                  }
                });
                window.dispatchEvent(event);
              }
            }
          );
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

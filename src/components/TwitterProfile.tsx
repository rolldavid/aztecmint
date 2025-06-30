'use client'
import Image from 'next/image';
import { useRef } from 'react';
import * as htmlToImage from 'html-to-image';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  profileImage: string;
}

interface TwitterProfileProps {
  user: TwitterUser;
  onDisconnect: () => void;
}

export default function TwitterProfile({ user, onDisconnect }: TwitterProfileProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${user.username}_card.png`;
    link.click();
  };

  return (
    <>
      <div ref={cardRef} className="p-6 border-2" 
           style={{ 
             backgroundColor: '#001F18',
             borderColor: '#1DA1F2',
             boxShadow: '0 10px 30px rgba(29, 161, 242, 0.2)',
             borderRadius: 0
           }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: '#F2EEE1' }}>
            Twitter Profile
          </h3>
          <button
            onClick={onDisconnect}
            className="px-3 py-1 text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#2e0700', color: '#F2EEE1', borderRadius: 0 }}
          >
            Disconnect
          </button>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 border-2 overflow-hidden" 
               style={{ borderColor: '#1DA1F2', borderRadius: 0 }}>
            <Image 
              src={user.profileImage} 
              alt={user.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-bold text-lg" style={{ color: '#F2EEE1' }}>
                {user.name}
              </h4>
              <span className="text-sm px-2 py-1" 
                    style={{ backgroundColor: '#1DA1F2', color: '#FFFFFF', borderRadius: 0 }}>
                @{user.username}
              </span>
            </div>
            
            {user.bio && (
              <p className="text-sm mb-3" style={{ color: '#2BFAE9' }}>
                {user.bio}
              </p>
            )}
            
            <div className="text-xs" style={{ color: '#D4FF28' }}>
              Twitter ID: {user.id}
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={handleDownload}
        className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
        style={{ borderRadius: 0 }}
      >
        Download Card as PNG
      </button>
    </>
  );
} 
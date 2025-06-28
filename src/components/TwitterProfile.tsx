'use client'
import Image from 'next/image';

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
  return (
    <div className="p-6 rounded-2xl border-2" 
         style={{ 
           backgroundColor: '#001F18',
           borderColor: '#1DA1F2',
           boxShadow: '0 10px 30px rgba(29, 161, 242, 0.2)'
         }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold" style={{ color: '#F2EEE1' }}>
          Twitter Profile
        </h3>
        <button
          onClick={onDisconnect}
          className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1' }}
        >
          Disconnect
        </button>
      </div>
      
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 rounded-full border-2 overflow-hidden" 
             style={{ borderColor: '#1DA1F2' }}>
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
            <span className="text-sm px-2 py-1 rounded-full" 
                  style={{ backgroundColor: '#1DA1F2', color: '#FFFFFF' }}>
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
  );
} 
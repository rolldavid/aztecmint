'use client'
import Image from 'next/image';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  profileImage: string;
}

interface TwitterGreetingProps {
  user: TwitterUser;
  onDisconnect: () => void;
}

export default function TwitterGreeting({ user, onDisconnect }: TwitterGreetingProps) {
  return (
    <div className="p-6 border-2" 
         style={{ 
           backgroundColor: '#001F18',
           borderColor: '#1DA1F2',
           boxShadow: '0 10px 30px rgba(29, 161, 242, 0.2)',
           borderRadius: 0
         }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 border-2 overflow-hidden" 
               style={{ borderColor: '#1DA1F2', borderRadius: 0 }}>
            <Image 
              src={user.profileImage} 
              alt={user.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#F2EEE1' }}>
              Hey, {user.name}! 👋
            </h3>
            <p className="text-sm" style={{ color: '#2BFAE9' }}>
              Connected with Twitter
            </p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{ backgroundColor: '#2e0700', color: '#F2EEE1', borderRadius: 0 }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
} 
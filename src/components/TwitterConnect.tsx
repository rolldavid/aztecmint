'use client'
import { useState } from 'react';

interface TwitterConnectProps {
  onLogin: () => Promise<void>;
  isLoading?: boolean;
}

export default function TwitterConnect({ onLogin, isLoading = false }: TwitterConnectProps) {
  const [error, setError] = useState<string | null>(null);

  const handleTwitterLogin = async () => {
    setError(null);
    try {
      await onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Twitter');
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleTwitterLogin}
        disabled={isLoading}
        className="w-full py-3 px-6 font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
        style={{ 
          background: 'linear-gradient(135deg, #1DA1F2 0%, #0D8BD9 100%)',
          color: '#FFFFFF',
          borderRadius: 0
        }}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Connect with Twitter
          </>
        )}
      </button>
      
      {error && (
        <div className="text-sm p-3" style={{ backgroundColor: '#FF1A1A', color: '#F2EEE1', borderRadius: 0 }}>
          {error}
        </div>
      )}
      
      <p className="text-xs text-center" style={{ color: '#2BFAE9' }}>
        Click to authenticate with your Twitter account
      </p>
    </div>
  );
} 
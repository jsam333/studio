import React from 'react';

interface SupportScreenProps {
  onBack: () => void;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ onBack }) => {
  return (
    <div style={{
      fontFamily: 'var(--font-inter), Arial, sans-serif',
      color: '#000000',
      backgroundImage: 'url(/images/bbubg2.png)',
      backgroundRepeat: 'repeat',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold' }}>Support the Game</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        Thank you for considering supporting Brick Blast Ultimate!
      </p>
      {/* Placeholder for future content */}
      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); onBack(); }}
        style={{ 
          marginTop: '40px', 
          fontSize: '18px', 
          color: '#0000FF', 
          textDecoration: 'underline' 
        }}
      >
        Back to Menu
      </a>
    </div>
  );
}; 
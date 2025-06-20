import React from 'react';
import { GameSessionData } from '../utils/localStorage';

interface GameMenuProps {
  onStartGame: (mode: 'main') => void; 
  onContinueGame: () => void;
  savedSession: GameSessionData | null;
  onShowSupport: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onStartGame, onContinueGame, savedSession, onShowSupport }) => {
  return (
    <div style={{
      fontFamily: 'var(--font-inter), Arial, sans-serif',
      color: '#000000',
      padding: '20px 20px 0px 20px', // Reduced bottom padding to 0
      backgroundImage: 'url(/images/bbubg2.png)',
      backgroundRepeat: 'repeat',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000000', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0' }}>Fun Games Zone - Welcome!</h1>
        <p style={{ fontSize: '14px', marginTop: '5px' }}>Your #1 source for brick-blasting action</p>
      </header>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', maxWidth: '1000px', margin: '0 auto' }}>
        <nav style={{ textAlign: 'left', marginTop: '10px', padding: '15px', borderRadius: '5px', maxWidth: '700px' }}>
          <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
            <li style={{ marginBottom: '0px' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); /* Dead link */ }}
                style={{ fontSize: '20px', color: '#000000', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', cursor: 'default' }}
              >
                Brick Blast
              </a>
            </li>
            <li style={{ marginBottom: '0px' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); /* Dead link */ }}
                style={{ fontSize: '20px', color: '#000000', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', cursor: 'default' }}
              >
                Brick Blast 2
              </a>
            </li>
            <li style={{ marginBottom: '0px' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); /* Dead link */ }}
                style={{ fontSize: '20px', color: '#000000', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', cursor: 'default' }}
              >
                Brick Blast 3
              </a>
            </li>
            <li style={{ marginBottom: '0px' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); onStartGame('main'); }}
                style={{ fontSize: '20px', color: '#0000FF', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block' }}
              >
                Brick Blast Ultimate
              </a>
              <span style={{ fontSize: '20px', color: '#000000', marginLeft: '10px' }}>&lt;- new!</span>
              {savedSession && (
                <span style={{ fontSize: '20px', color: '#000000', marginLeft: '10px' }}>
                    or <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); onContinueGame(); }}
                        style={{ color: '#0000FF', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                        Continue at Level {savedSession.level}
                    </a>
                </span>
              )}
              <div style={{ textAlign: 'left', marginTop: '0px', padding: '0px', borderRadius: '5px' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.6', maxWidth: '700px', margin: '0' }}>
                  The main game. Destroy all the bricks using your paddle and ball. Clear all levels to win!
                </p>
                <p style={{ fontSize: '14px', lineHeight: '1.6', maxWidth: '600px', margin: '0' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onShowSupport(); }} style={{color: '#0000FF', textDecoration: 'underline'}}>
                    Enjoy the game? Support it here
                  </a> (Pay-What-You-Want).
                </p>
              </div>
            </li>
          </ul>
        </nav>
        <img src="/images/brick blast 2.png" alt="Brick Blast 2" style={{ marginTop: '10px', maxHeight: '150px' }}/>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '0px', paddingTop: '5px', borderTop: '1px dashed #555555', fontSize: '12px', marginBottom: '0px' }}>
        <img src="https://www.thegeocitiesgallery.com/images/blinking-construction.gif" alt="Or try out the sandbox mode down here :-)" style={{marginTop: '5px', display: 'block', marginBottom: '0px'}}/>
      </footer>
    </div>
  );
};

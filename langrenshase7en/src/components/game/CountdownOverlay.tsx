import { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  count: number;
}

const CountdownOverlay = ({ count }: CountdownOverlayProps) => {
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    setDisplayCount(count);
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
      {/* 背景光效 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      </div>

      {/* 倒计时文字 */}
      <div className="relative text-center">
        <p className="text-muted-foreground text-lg mb-4 font-display tracking-wider">
          游戏即将开始
        </p>
        
        <div 
          key={displayCount}
          className="relative animate-countdown"
        >
          <span className="text-9xl font-display font-bold text-gradient-gold">
            {displayCount}
          </span>
          
          {/* 光环效果 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-primary/30 animate-ping" />
          </div>
        </div>

        <p className="text-muted-foreground/60 text-sm mt-8 animate-pulse">
          准备好迎接黑夜...
        </p>
      </div>
    </div>
  );
};

export default CountdownOverlay;

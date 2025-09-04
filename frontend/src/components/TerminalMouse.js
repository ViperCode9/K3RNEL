import React, { useEffect, useState } from 'react';

const TerminalMouse = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [trails, setTrails] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newPos = { x: e.clientX, y: e.clientY };
      setMousePos(newPos);
      
      // Update CSS custom properties for glow effect
      document.documentElement.style.setProperty('--mouse-x', `${(e.clientX / window.innerWidth) * 100}%`);
      document.documentElement.style.setProperty('--mouse-y', `${(e.clientY / window.innerHeight) * 100}%`);
      
      // Add trail effect
      const trailId = Date.now();
      setTrails(prev => [...prev.slice(-8), { id: trailId, x: e.clientX, y: e.clientY }]);
      
      // Remove trail after animation
      setTimeout(() => {
        setTrails(prev => prev.filter(trail => trail.id !== trailId));
      }, 1000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="terminal-mouse-system">
      {trails.map((trail, index) => (
        <div
          key={trail.id}
          className="motion-trail"
          style={{
            left: trail.x - 2,
            top: trail.y - 2,
            animationDelay: `${index * 50}ms`,
            zIndex: 999 - index
          }}
        />
      ))}
    </div>
  );
};

export default TerminalMouse;
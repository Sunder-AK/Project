import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: fine)');
    if (!media.matches) return undefined;

    const updatePosition = (event) => {
      const interactive = event.target.closest('a, button, input, textarea, select, [role="button"], .cursor-hover');
      setPosition({ x: event.clientX, y: event.clientY });
      setHovering(Boolean(interactive));
      setVisible(true);
    };

    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);
    const handleLeave = () => setVisible(false);
    const handleEnter = () => setVisible(true);

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
    };
  }, []);

  return (
    <>
      <div
        className={`app-cursor-ring ${hovering ? 'is-hovering' : ''} ${clicking ? 'is-clicking' : ''} ${visible ? 'is-visible' : ''}`}
        style={{ left: position.x, top: position.y }}
      />
      <div
        className={`app-cursor-dot ${hovering ? 'is-hovering' : ''} ${clicking ? 'is-clicking' : ''} ${visible ? 'is-visible' : ''}`}
        style={{ left: position.x, top: position.y }}
      />
    </>
  );
}
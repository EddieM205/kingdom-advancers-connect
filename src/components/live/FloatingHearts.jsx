import React, { useState, useEffect } from 'react';

function FloatingHeart({ id, emoji, onDone }) {
  const left = 10 + Math.random() * 80;
  const duration = 2000 + Math.random() * 1000;

  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  return (
    <div
      className="absolute pointer-events-none select-none text-3xl"
      style={{
        left: `${left}%`,
        bottom: '60px',
        animation: `floatUp ${duration}ms ease-out forwards`,
      }}
    >
      {emoji || '❤️'}
    </div>
  );
}

export default function FloatingHearts({ reactions }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    reactions.forEach((reaction, index) => {
      const particleId = reaction.id + '_' + index + '_' + Date.now();
      setParticles((prev) => [...prev, { id: particleId, emoji: reaction.emoji }]);
    });
  }, [reactions]);

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-300px) scale(1.2); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <FloatingHeart key={p.id} id={p.id} emoji={p.emoji} onDone={() => removeParticle(p.id)} />
        ))}
      </div>
    </>
  );
}
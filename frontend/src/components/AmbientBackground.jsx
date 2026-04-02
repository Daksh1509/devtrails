import React from 'react';

export default function AmbientBackground() {
  return (
    <div className="clean-ambient" aria-hidden="true">
      <div className="clean-ambient-orb clean-ambient-orb--blue" />
      <div className="clean-ambient-orb clean-ambient-orb--coral" />
      <div className="clean-ambient-orb clean-ambient-orb--paper" />
      <div className="clean-ambient-grid" />
    </div>
  );
}

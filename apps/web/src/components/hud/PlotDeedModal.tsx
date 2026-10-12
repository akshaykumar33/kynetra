'use client';

import React from 'react';
import type { WorldPlot } from '@kynetra/contracts';
import { sounds } from './SoundEffects';

interface PlotDeedModalProps {
  plot: WorldPlot | null;
  allPlots: WorldPlot[];
  onSelectPlot: (plot: WorldPlot) => void;
  onClose: () => void;
  onTeleportToPlot: (plot: WorldPlot) => void;
  onEnterWorkspace: () => void;
}

export function PlotDeedModal({
  plot,
  allPlots,
  onSelectPlot,
  onClose,
  onTeleportToPlot,
  onEnterWorkspace,
}: PlotDeedModalProps) {
  if (!plot) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          background: 'linear-gradient(145deg, #0f172a 0%, #090d16 100%)',
          border: '2px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.15)',
          color: '#f8fafc',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              📜
            </div>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#fbbf24',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '2px',
                }}
              >
                <span>MUNICIPAL LAND REGISTRY</span>
                <span>•</span>
                <span>PLOT CERTIFICATE</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {plot.name} (PLOT #{plot.plotNumber})
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playKeyClick();
              onClose();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Plot Selector Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {allPlots.map((p) => {
            const isSelected = p.id === plot.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  sounds.playKeyClick();
                  onSelectPlot(p);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  color: isSelected ? '#fbbf24' : '#cbd5e1',
                  whiteSpace: 'nowrap',
                }}
              >
                Plot {p.plotNumber} {p.plotNumber === 1 ? '📍 (Spawn)' : ''}
              </button>
            );
          })}
        </div>

        {/* Certificate Card Body */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Plot Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background:
                    plot.status === 'occupied'
                      ? '#10b981'
                      : plot.status === 'reserved'
                      ? '#f59e0b'
                      : '#38bdf8',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>
                {plot.status}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Registered Owner / Entity
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
              {plot.ownerName}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Dimensions & Parcel Area
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
              {plot.dimensions.width}m × {plot.dimensions.depth}m ({plot.areaSquareMeters || plot.dimensions.width * plot.dimensions.depth} m²)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Zoning Classification
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa', marginTop: '4px' }}>
              {plot.zoningType}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Linked Property / Building
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
              {plot.assignedBuilding || 'Open Parcel (Ready for Development)'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Cryptographic Deed Hash
            </div>
            <div
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: '#64748b',
                marginTop: '4px',
                wordBreak: 'break-all',
              }}
            >
              {plot.deedId}
            </div>
          </div>
        </div>

        {/* Visual Map / Deed Footer Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px dashed rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '12px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                Spatial Navigation Flow: Plots ➔ Company ➔ Workspace
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Spawned at Plot #1. Walking along the central road leads directly to the Company Headquarters & Workspace.
              </div>
            </div>
          </div>

          {/* Official Wax Seal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #b45309 0%, #78350f 100%)',
              border: '2px solid #f59e0b',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontSize: '18px',
            }}
            title="Official Kynetra Municipal Deed Seal"
          >
            🛡️
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            onClick={() => {
              sounds.playDockSound();
              onTeleportToPlot(plot);
              onClose();
            }}
            className="btn-secondary"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📍</span> Spawn / Teleport to Plot {plot.plotNumber}
          </button>

          <button
            onClick={() => {
              sounds.playDockSound();
              onEnterWorkspace();
              onClose();
            }}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
              border: '1px solid #14b8a6',
              boxShadow: '0 4px 15px rgba(20, 184, 166, 0.4)',
            }}
          >
            <span>🏢</span> Enter Company Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

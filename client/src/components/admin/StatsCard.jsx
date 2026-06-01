import { useTheme } from '../../context/ThemeContext';
import React from 'react';
import { Icon } from '../ui/index.jsx';
import { HS } from '../../tokens';

export default function StatsCard({ label, value, delta, color, bgColor, icon, good = false }) {
  const { theme } = useTheme();
  return (
    <div style={{
      padding: '20px 18px',
      borderRadius: 16,
      background: `linear-gradient(135deg, ${bgColor || color}20, ${bgColor || color}10)`,
      border: `1px solid ${color}30`,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Top Row: Icon + Label */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.textDim }}>{label}</div>
        {icon && (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon d={icon} size={20} color={color} />
          </div>
        )}
      </div>

      {/* Value + Delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: theme.chocolate }}>
          {value}
        </div>
        {delta && (
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: good ? theme.safe : theme.danger,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span>{good ? '↑' : '↓'} {delta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

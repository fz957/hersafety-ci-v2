import { useTheme } from '../../context/ThemeContext';
import React from 'react';
import { HS } from '../../tokens';

export default function AlertRow({ alert }) {
  const { theme } = useTheme();
  const levelNames = {
    '1': 'Méfiance',
    '2': 'Malaise',
    '3': 'Danger',
    '4': 'SOS',
  };

  const levelColors = {
    '1': { c: theme.safe, bg: theme.safeSoft },
    '2': { c: '#C4914A', bg: '#F4E5CF' },
    '3': { c: '#C97B3B', bg: '#F4E5CF' },
    '4': { c: theme.danger, bg: theme.dangerSoft },
  };

  const statusMap = {
    active: { c: '#D97706', bg: '#FEF3C7', l: 'En cours' },
    resolved: { c: theme.safe, bg: theme.safeSoft, l: 'Résolu' },
    false_alarm: { c: theme.textMute, bg: '#F3F4F6', l: 'Fausse alerte' },
  };

  const levelColor = levelColors[alert.level] || levelColors['3'];
  const statusColor = statusMap[alert.status] || statusMap.resolved;

  const formatTime = (date) => {
    const now = new Date();
    const alertTime = new Date(date);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return alertTime.toLocaleDateString('fr-FR');
  };

  return (
    <tr style={{
      borderBottom: `1px solid ${theme.border}`,
      height: 56,
      fontSize: 13,
    }}>
      {/* ID */}
      <td style={{ padding: '0 12px', fontWeight: 700, color: theme.chocolate }}>
        AL-{String(alert.id).substring(0, 4).toUpperCase()}
      </td>

      {/* User */}
      <td style={{ padding: '0 12px', color: theme.text }}>
        {alert.full_name || 'Anon.'}
      </td>

      {/* Location */}
      <td style={{ padding: '0 12px', color: theme.textDim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {alert.location_label || '—'}
      </td>

      {/* Level (Color Badge) */}
      <td style={{ padding: '0 12px' }}>
        <span style={{
          background: levelColor.bg,
          color: levelColor.c,
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          display: 'inline-block',
        }}>
          {levelNames[alert.level]}
        </span>
      </td>

      {/* Time */}
      <td style={{ padding: '0 12px', color: theme.textMute, fontSize: 12 }}>
        {formatTime(alert.created_at)}
      </td>

      {/* Status */}
      <td style={{ padding: '0 12px' }}>
        <span style={{
          background: statusColor.bg,
          color: statusColor.c,
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          display: 'inline-block',
        }}>
          {statusColor.l}
        </span>
      </td>
    </tr>
  );
}

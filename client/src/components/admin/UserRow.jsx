import { useTheme } from '../../context/ThemeContext';
import React from 'react';
import { HS } from '../../tokens';

export default function UserRow({ user }) {
  const { theme } = useTheme();
  const statusMap = {
    active: { c: theme.safe, bg: theme.safeSoft, l: 'Actif' },
    inactive: { c: theme.danger, bg: theme.dangerSoft, l: 'Inactif' },
  };

  const getStatus = (user) => {
    return user.is_active ? 'active' : 'inactive';
  };

  const status = getStatus(user);
  const statusColor = statusMap[status];

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  return (
    <tr style={{
      borderBottom: `1px solid ${theme.border}`,
      height: 56,
      fontSize: 13,
    }}>
      {/* Name */}
      <td style={{ padding: '0 12px', fontWeight: 700, color: theme.chocolate }}>
        {user.full_name}
      </td>

      {/* Email */}
      <td style={{ padding: '0 12px', color: theme.textDim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.email}
      </td>

      {/* Last Location */}
      <td style={{ padding: '0 12px', color: theme.textDim, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.last_location || '—'}
      </td>

      {/* Alerts Count */}
      <td style={{ padding: '0 12px', fontWeight: 700, color: theme.chocolate }}>
        {user.alerts_count || 0}
      </td>

      {/* Since */}
      <td style={{ padding: '0 12px', color: theme.textMute, fontSize: 12 }}>
        {formatDate(user.created_at)}
      </td>

      {/* Status Badge */}
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

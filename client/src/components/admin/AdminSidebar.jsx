import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo, Avatar, Icon } from '../ui/index.jsx';
import { ICONS, HS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AdminSidebar({ activeTab, user, stats = {} }) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: ICONS.shield, badge: null },
    { id: 'alerts', label: 'Alertes récentes', icon: ICONS.alert, badge: null },
    { id: 'users', label: 'Utilisatrices', icon: ICONS.user, badge: null },
    { id: 'reports', label: 'Signalements', icon: ICONS.flag, badge: null },
    { id: 'moderation', label: 'Modération', icon: ICONS.comment, badge: null },
    { id: 'cartography', label: 'Cartographie', icon: ICONS.loc, badge: null },
    { id: 'admins', label: 'Gestion des admins', icon: ICONS.user, badge: null },
    { id: 'settings', label: 'Paramètres', icon: ICONS.gear, badge: null },
  ];

  const handleNavClick = (tabId) => {
    if (tabId === 'dashboard') navigate('/admin');
    else navigate(`/admin/${tabId}`);
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      // Rediriger quand même
      navigate('/');
    }
  };

  return (
    <aside style={{
      width: 248,
      background: theme.surface,
      borderRight: `1px solid ${theme.border}`,
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={18} />
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.chocolate }}>HerSafety</span>
      </div>

      {/* User Profile Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        marginBottom: 16,
        background: theme.mistyRose,
        borderRadius: 12,
        border: 'none',
      }}>
        <Avatar size={34} name="A" color={theme.sakuraDeep} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.chocolate, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Admin
          </div>
          <div style={{ fontSize: 10, color: theme.textMute }}>
            Admin
          </div>
        </div>
      </div>

      {/* Navigation Section Label */}
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.4,
        color: theme.textMute,
        padding: '4px 10px',
        marginBottom: 8,
      }}>
        OPÉRATIONS
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id || (activeTab === null && item.id === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                background: isActive ? theme.chocolate : 'transparent',
                border: 'none',
                color: isActive ? theme.bg : theme.textDim,
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.target.style.background = `rgba(139, 14, 79, 0.1)`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.target.style.background = 'transparent';
              }}
            >
              <Icon d={item.icon} size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: isActive ? theme.sakura : theme.dangerSoft,
                  color: isActive ? theme.chocolate : theme.danger,
                  padding: '1px 7px',
                  borderRadius: 100,
                  fontSize: 10,
                  fontWeight: 800,
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div style={{
        padding: 12,
        marginTop: 16,
        background: 'transparent',
        borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{ fontSize: 11, color: theme.textDim, fontWeight: 700, marginBottom: 8 }}>Statut système</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.safe, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.safe }}></span>
          En ligne
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 12,
            background: theme.dangerSoft,
            border: 'none',
            color: theme.danger,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = theme.danger;
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = theme.dangerSoft;
            e.target.style.color = theme.danger;
          }}
        >
          <Icon d={ICONS.logout} size={14} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

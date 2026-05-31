import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo, Avatar, Icon } from '../ui/index.jsx';
import { ICONS, HS } from '../../tokens';
import api from '../../services/api';

export default function AdminSidebar({ activeTab, user, stats = {} }) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: ICONS.shield, badge: null },
    { id: 'alerts', label: 'Alertes', icon: ICONS.alert, badge: null },
    { id: 'users', label: 'Utilisatrices', icon: ICONS.user, badge: null },
    { id: 'reports', label: 'Signalements', icon: ICONS.flag, badge: stats?.pendingReports },
    { id: 'moderation', label: 'Modération', icon: ICONS.comment, badge: stats?.pendingTestimonies },
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
      background: HS.surface,
      borderRight: `1px solid ${HS.border}`,
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
        <span style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>HerSafety</span>
      </div>

      {/* User Profile Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        marginBottom: 16,
        background: HS.mistyRose,
        borderRadius: 12,
        border: 'none',
      }}>
        <Avatar size={34} name={user?.full_name?.charAt(0) || 'A'} color={HS.sakuraDeep} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: HS.chocolate, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name || 'Admin'}
          </div>
          <div style={{ fontSize: 10, color: HS.textMute }}>
            {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </div>
        </div>
      </div>

      {/* Navigation Section Label */}
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.4,
        color: HS.textMute,
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
                background: isActive ? HS.chocolate : 'transparent',
                border: 'none',
                color: isActive ? HS.bg : HS.textDim,
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
                  background: isActive ? HS.sakura : HS.dangerSoft,
                  color: isActive ? HS.chocolate : HS.danger,
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
        borderTop: `1px solid ${HS.border}`,
      }}>
        <div style={{ fontSize: 11, color: HS.textDim, fontWeight: 700, marginBottom: 8 }}>Statut système</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: HS.safe, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: HS.safe }}></span>
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
            background: HS.dangerSoft,
            border: 'none',
            color: HS.danger,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = HS.danger;
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = HS.dangerSoft;
            e.target.style.color = HS.danger;
          }}
        >
          <Icon d={ICONS.logout} size={14} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

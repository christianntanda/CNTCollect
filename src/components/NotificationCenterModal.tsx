import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Calendar,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  DollarSign,
  FileText,
  ExternalLink,
  Sliders,
  Filter,
  Check,
  X,
  RefreshCw,
  Search,
  Eye,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  Organization,
  User as TeamUser,
  AppNotification,
  NotificationCategory,
  NotificationType
} from '../types';
import { formatCurrency } from '../services/calculations';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  currentUser?: TeamUser;
  onNavigateToRecord: (targetTab: string, entityId?: string) => void;
  onOpenPreferences: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentUser,
  onNavigateToRecord,
  onOpenPreferences,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const userId = currentUser?.id || 'usr-1';
  const userRole = currentUser?.role || 'admin';

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/notifications?orgId=${organization.id}&userId=${userId}&userRole=${userRole}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, organization.id, userId, userRole]);

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      const allIds = notifications.map((n) => n.id);
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds: allIds }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (unreadOnly && n.isRead) return false;
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        const matchesEntity = n.targetEntityName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesEntity) return false;
      }
      return true;
    });
  }, [notifications, unreadOnly, filterCategory, searchQuery]);

  if (!isOpen) return null;

  const isViewer = userRole === 'viewer' || userRole === 'auditor';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>In-App Notification Centre</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Part 22
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Authorized alerts for delinquent receivables, active disputes, payment evidence, and security events.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenPreferences}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1.5"
              title="Configure delivery channels, email addresses, and thresholds"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Preferences</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              onClick={fetchNotifications}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confidentiality Warning for Viewers/Auditors (Section 22) */}
        {isViewer && (
          <div className="bg-indigo-950/40 border-b border-indigo-500/30 px-5 py-2.5 flex items-center space-x-2 text-xs text-indigo-300">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Confidentiality Safeguard Active:</strong> Customer identities and sensitive financial details are sanitized for your role ({userRole.toUpperCase()}) pursuant to Section 22.
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-slate-900/80 border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search alerts by title, entity, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Select */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="delinquency">Delinquency & Receivables</option>
              <option value="disputes_promises">Disputes & Payment Promises</option>
              <option value="cash_recon">Cash Operations & Recon</option>
              <option value="integrations">Integrations & Systems</option>
              <option value="subscription">Subscription & Limits</option>
              <option value="security">Security & Governance</option>
            </select>

            {/* Unread Only Toggle */}
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-1.5 rounded-lg font-medium transition border flex items-center space-x-1.5 ${
                unreadOnly
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-semibold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${unreadOnly ? 'bg-indigo-400' : 'bg-slate-500'}`} />
              <span>Unread Only ({unreadCount})</span>
            </button>
          </div>

          <div className="text-slate-400 text-xs">
            Showing {filteredNotifications.length} of {notifications.length} alerts
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {loading && notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
              <p className="text-slate-400">Loading authorized notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-800/20 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold text-white">All Clear — No Notifications Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {unreadOnly
                  ? 'You have zero unread notifications. Toggle "Unread Only" to see historical alerts.'
                  : 'There are no active alerts matching your current filter criteria.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              // Severity styling
              const severityBadge =
                notif.severity === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : notif.severity === 'urgent'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : notif.severity === 'warning'
                  ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    notif.isRead
                      ? 'bg-slate-900/60 border-slate-800/80 opacity-75 hover:opacity-100'
                      : 'bg-slate-800/60 border-indigo-500/30 shadow-sm'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    {/* Top Row: Severity, Category, Title, Timestamp */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${severityBadge}`}>
                        {notif.severity}
                      </span>

                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {notif.category?.replace(/_/g, ' ')}
                      </span>

                      <span className="text-slate-600">•</span>

                      <span className="text-[11px] text-slate-400 font-mono">{notif.timestamp}</span>

                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white tracking-tight">{notif.title}</h4>

                    <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>

                    {/* Metadata & Direct Link Target Pill */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {notif.targetEntityName && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700 flex items-center space-x-1">
                          <FileText className="w-2.5 h-2.5 text-indigo-400" />
                          <span>
                            {notif.targetEntityType || 'Record'}: {notif.targetEntityName}
                          </span>
                        </span>
                      )}

                      {notif.amount !== undefined && notif.currency && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px] border border-slate-700">
                          {formatCurrency(notif.amount, notif.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: View Record & Mark Read */}
                  <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        onNavigateToRecord(notif.targetTab, notif.targetEntityId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5"
                    >
                      <span>View Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {!notif.isRead ? (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        Mark as Read
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <Check className="w-3 h-3 text-slate-600" />
                        <span>Read</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Real-time polling active • Syncs with audit log</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Close Notification Centre
          </button>
        </div>
      </div>
    </div>
  );
};

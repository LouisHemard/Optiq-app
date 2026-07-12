import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  UserPlus,
  UserCheck,
  MessageCircle,
  Loader2,
  X,
  User as UserIcon,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  getFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  type NotificationItem,
  type FollowRequestItem,
} from '../services/api';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const ICON_MAP: Record<string, typeof UserPlus> = {
  FOLLOW_REQUEST: UserPlus,
  FOLLOW_ACCEPTED: UserCheck,
  NEW_REVIEW: MessageCircle,
};

export function NotificationDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'notifs' | 'requests'>('notifs');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getUnreadCount().then(setUnread).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('optiq_token');
    if (!token) return;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const es = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);
    es.onmessage = () => {
      setUnread((c) => c + 1);
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [user]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getNotifications(), getFollowRequests()])
      .then(([n, r]) => {
        setNotifications(n);
        setRequests(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsRead().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    });
  };

  const handleAccept = (reqId: string) => {
    acceptFollowRequest(reqId).then(() => {
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    });
  };

  const handleDecline = (reqId: string) => {
    declineFollowRequest(reqId).then(() => {
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    });
  };

  const bellLabel =
    unread > 0
      ? `Notifications (${unread} non lue${unread > 1 ? 's' : ''})`
      : 'Notifications';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={bellLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Centre de notifications"
          className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] rounded-xl bg-gray-800 border border-gray-700 shadow-2xl shadow-black/40 overflow-hidden z-50 flex flex-col"
        >
          <div role="tablist" aria-label="Catégories" className="flex items-center border-b border-gray-700">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'notifs'}
              aria-controls="notifs-panel"
              onClick={() => setTab('notifs')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                tab === 'notifs' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Notifications
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'requests'}
              aria-controls="requests-panel"
              onClick={() => setTab('requests')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                tab === 'requests' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Demandes
              {requests.length > 0 && (
                <span
                  aria-label={`${requests.length} demande${requests.length > 1 ? 's' : ''} en attente`}
                  className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold"
                >
                  {requests.length}
                </span>
              )}
            </button>
          </div>

          <div
            id={tab === 'notifs' ? 'notifs-panel' : 'requests-panel'}
            role="tabpanel"
            className="overflow-y-auto flex-1"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" aria-hidden="true" />
                <span className="sr-only">Chargement des notifications</span>
              </div>
            ) : tab === 'notifs' ? (
              notifications.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-12">Aucune notification</p>
              ) : (
                <div>
                  {notifications.some((n) => !n.isRead) && (
                    <div className="px-4 py-2 border-b border-gray-700 flex justify-end">
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Tout marquer comme lu
                      </button>
                    </div>
                  )}
                  {notifications.map((n) => {
                    const Icon = ICON_MAP[n.type] || Bell;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-700/50 transition-colors ${
                          n.isRead ? 'opacity-60' : 'bg-gray-750/30'
                        }`}
                      >
                        <div
                          aria-hidden="true"
                          className="shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                        >
                          <Icon className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {n.relatedId && (n.type === 'FOLLOW_REQUEST' || n.type === 'FOLLOW_ACCEPTED') ? (
                            <Link
                              to={`/profile/${n.relatedId}`}
                              onClick={() => setOpen(false)}
                              className="text-sm text-gray-200 hover:text-white transition-colors"
                            >
                              {n.message}
                            </Link>
                          ) : (
                            <p className="text-sm text-gray-200">{n.message}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <span
                            aria-label="Non lue"
                            className="shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : requests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">Aucune demande en attente</p>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50"
                >
                  {req.follower.avatarUrl ? (
                    <img
                      src={req.follower.avatarUrl}
                      alt={`Avatar de ${req.follower.username}`}
                      className="w-10 h-10 rounded-full object-cover border border-gray-600 shrink-0"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={`Avatar par défaut de ${req.follower.username}`}
                      className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0"
                    >
                      <UserIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${req.follower.id}`}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-white hover:text-indigo-400 transition-colors"
                    >
                      {req.follower.username}
                    </Link>
                    <p className="text-xs text-gray-500">{timeAgo(req.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAccept(req.id)}
                      aria-label={`Accepter la demande d'abonnement de ${req.follower.username}`}
                      title="Accepter"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(req.id)}
                      aria-label={`Refuser la demande d'abonnement de ${req.follower.username}`}
                      title="Refuser"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

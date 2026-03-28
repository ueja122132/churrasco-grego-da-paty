import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Activity, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Notification, NotificationType } from '../types';

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 min-w-[300px] backdrop-blur-md",
                n.type === 'success' && "bg-green-50/90 border-green-200 text-green-900",
                n.type === 'error' && "bg-red-50/90 border-red-200 text-red-900",
                n.type === 'warning' && "bg-orange-50/90 border-orange-200 text-orange-900",
                n.type === 'info' && "bg-blue-50/90 border-blue-200 text-blue-900"
              )}
            >
              {n.type === 'success' && <CheckCircle2 className="text-green-600" size={20} />}
              {n.type === 'error' && <AlertCircle className="text-red-600" size={20} />}
              {n.type === 'warning' && <AlertCircle className="text-orange-600" size={20} />}
              {n.type === 'info' && <Activity className="text-blue-600" size={20} />}
              <p className="font-bold text-sm tracking-tight">{n.message}</p>
              <button
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-full"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
};

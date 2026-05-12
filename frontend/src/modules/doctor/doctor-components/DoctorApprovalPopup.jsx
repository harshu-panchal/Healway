import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmarkCircle, IoCloseOutline, IoSparklesOutline, IoArrowForwardOutline } from 'react-icons/io5';
import { getSocket } from '../../../utils/socketClient';
import confetti from 'canvas-confetti';

const DoctorApprovalPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationData, setNotificationData] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data) => {
      const notification = data.notification;
      if (
        notification &&
        notification.title === 'Account Approved' &&
        notification.type === 'system'
      ) {
        setNotificationData(notification);
        setIsOpen(true);
        
        // Trigger confetti effect for a "Wow" experience
        triggerConfetti();
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, []);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reload to refresh the dashboard status from pending to approved
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100"
          >
            {/* Header Decoration */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10" />
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors z-10"
            >
              <IoCloseOutline className="text-xl" />
            </button>

            <div className="relative p-8 flex flex-col items-center text-center">
              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-inner"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                  <IoCheckmarkCircle className="text-5xl" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
                  Account Approved! <IoSparklesOutline className="text-amber-500" />
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Congratulations! Your professional profile has been verified and approved. You are now officially part of the Healway medical team.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <div className="w-full space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 group"
                >
                  Start Practicing <IoArrowForwardOutline className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <p className="text-xs text-slate-400 font-medium italic">
                  Refreshing your dashboard to enable all features...
                </p>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DoctorApprovalPopup;

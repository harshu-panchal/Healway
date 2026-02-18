import { toast as rtToast } from 'react-toastify';

/**
 * Enhanced toast utility to manage toast visibility and prevent duplicates.
 * Ensures only one toast is displayed at a time by dismissing existing ones.
 */
const toast = {
  success: (message, options = {}) => {
    rtToast.dismiss();
    return rtToast.success(message, {
      ...options,
      toastId: options.toastId || 'global-success', // Use ID to prevent duplicates if called rapidly
    });
  },
  error: (message, options = {}) => {
    rtToast.dismiss();
    return rtToast.error(message, {
      ...options,
      toastId: options.toastId || 'global-error',
    });
  },
  info: (message, options = {}) => {
    rtToast.dismiss();
    return rtToast.info(message, {
      ...options,
      toastId: options.toastId || 'global-info',
    });
  },
  warning: (message, options = {}) => {
    rtToast.dismiss();
    return rtToast.warning(message, {
      ...options,
      toastId: options.toastId || 'global-warning',
    });
  },
  dismiss: (id) => rtToast.dismiss(id),
  clearWaitingQueue: () => rtToast.clearWaitingQueue(),
};

export default toast;

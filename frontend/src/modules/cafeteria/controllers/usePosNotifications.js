// src/modules/cafeteria/controllers/usePosNotifications.js
import { useState, useCallback } from 'react';

export const usePosNotifications = () => {
  const [notification, setNotification] = useState(null);
  
  const triggerNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type, show: true });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  return { notification, triggerNotification };
};
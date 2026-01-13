// Storage API wrapper - uses backend API in production, localStorage in development
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

export const storage = {
  get: async (key) => {
    try {
      // Try API first
      const response = await fetch(`${API_BASE}/api/storage/${key}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error(`Storage API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error reading from storage:', error);
      // Fallback to localStorage in case API is unavailable
      try {
        const value = localStorage.getItem(key);
        return value ? { value } : null;
      } catch {
        return null;
      }
    }
  },

  set: async (key, value) => {
    try {
      const response = await fetch(`${API_BASE}/api/storage/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        return true;
      } else {
        throw new Error(`Storage API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error writing to storage:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  },

  remove: async (key) => {
    try {
      const response = await fetch(`${API_BASE}/api/storage/${key}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        return true;
      } else {
        throw new Error(`Storage API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting from storage:', error);
      // Fallback to localStorage
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  }
};

// Make it globally available
if (typeof window !== 'undefined') {
  // @ts-ignore - Adding custom storage property
  window.storage = storage;
}

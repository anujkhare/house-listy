// Simple event emitter for extension data
class ExtensionDataReceiver {
  constructor() {
    this.listeners = [];
    this.setupMessageListener();
  }

  setupMessageListener() {
    // Listen for postMessage from extension
    window.addEventListener('message', (event) => {
      // Only accept messages from our extension or same origin
      if (event.data.source === 'house-hunter-extension') {
        console.log('Received data from extension:', event.data.payload);
        this.notifyListeners(event.data.payload);
      }
    });
  }

  onData(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(listener => listener(data));
  }
}

export const extensionReceiver = new ExtensionDataReceiver();

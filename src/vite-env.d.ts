/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
    };
  }
}
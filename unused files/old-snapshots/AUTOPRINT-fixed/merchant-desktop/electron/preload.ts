/**
 * Electron Preload Script
 * Exposes a secure, context-isolated IPC bridge between React Renderer and Electron Main Process.
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getPrinters: () => Promise<any[]>;
  getJobs: () => Promise<any[]>;
  getMetrics: () => Promise<any>;
  submitJob: (jobData: any) => Promise<any>;
  cancelJob: (jobId: string) => Promise<boolean>;
  retryJob: (jobId: string) => Promise<boolean>;
  reorderQueue: (jobIds: string[]) => Promise<boolean>;
  pauseQueue: () => Promise<boolean>;
  resumeQueue: () => Promise<boolean>;
  purgeCompleted: () => Promise<boolean>;
  setPrinterStatus: (printerId: string, status: string) => Promise<boolean>;
  triggerTestPrint: (printerId: string, testType: string) => Promise<any>;
  executeNativePrint: (htmlContent: string, options: any) => Promise<boolean>;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  platform: string;
  isElectron: boolean;
}

const electronAPI: ElectronAPI = {
  getPrinters: () => ipcRenderer.invoke('printer:get-printers'),
  getJobs: () => ipcRenderer.invoke('printer:get-jobs'),
  getMetrics: () => ipcRenderer.invoke('printer:get-metrics'),
  submitJob: (jobData) => ipcRenderer.invoke('printer:submit-job', jobData),
  cancelJob: (jobId) => ipcRenderer.invoke('printer:cancel-job', jobId),
  retryJob: (jobId) => ipcRenderer.invoke('printer:retry-job', jobId),
  reorderQueue: (jobIds) => ipcRenderer.invoke('printer:reorder-queue', jobIds),
  pauseQueue: () => ipcRenderer.invoke('printer:pause-queue'),
  resumeQueue: () => ipcRenderer.invoke('printer:resume-queue'),
  purgeCompleted: () => ipcRenderer.invoke('printer:purge-completed'),
  setPrinterStatus: (printerId, status) => ipcRenderer.invoke('printer:set-status', { printerId, status }),
  triggerTestPrint: (printerId, testType) => ipcRenderer.invoke('printer:trigger-test', { printerId, testType }),
  executeNativePrint: (htmlContent, options) => ipcRenderer.invoke('printer:execute-native-print', { htmlContent, options }),
  
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'spooler:job-updated',
      'spooler:printer-updated',
      'spooler:event',
      'spooler:metrics-updated',
      'spooler:hardware-alert',
    ];
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
  
  platform: process.platform,
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

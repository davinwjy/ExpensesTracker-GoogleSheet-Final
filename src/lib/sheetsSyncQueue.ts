import { googleSheetsService, SHEET_TAB_NAMES } from './googleSheetsService';

export interface SyncQueueItem {
  id: string;
  tabName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  recordId: string;
  rowValues?: any[];
  timestamp: string;
}

const SHEETS_QUEUE_STORAGE_KEY = 'wealthtrack_sheets_sync_queue';

export class SheetsSyncQueueManager {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;

  constructor() {
    this.loadQueue();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(SHEETS_QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(SHEETS_QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wealthtrack:sheets_queue_change', {
            detail: { count: this.queue.length },
          })
        );
      }
    } catch {
      // ignore
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };

    // Replace previous queued mutations for the same recordId if applicable
    this.queue = this.queue.filter((q) => !(q.tabName === item.tabName && q.recordId === item.recordId));
    this.queue.push(queueItem);
    this.saveQueue();
  }

  async processQueue(spreadsheetId: string, accessToken: string): Promise<{ success: boolean; syncedCount: number; errors: any[] }> {
    if (this.isProcessing || this.queue.length === 0 || !spreadsheetId || !accessToken) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    this.isProcessing = true;
    const errors: any[] = [];
    let syncedCount = 0;

    const currentItems = [...this.queue];

    for (const item of currentItems) {
      try {
        if (item.action === 'CREATE') {
          if (item.rowValues) {
            // Use updateRowById (upsert) to protect against duplicate row appends if recordId already exists
            await googleSheetsService.updateRowById(spreadsheetId, accessToken, item.tabName, item.recordId, item.rowValues);
          }
        } else if (item.action === 'UPDATE') {
          if (item.rowValues) {
            await googleSheetsService.updateRowById(spreadsheetId, accessToken, item.tabName, item.recordId, item.rowValues);
          }
        } else if (item.action === 'DELETE') {
          await googleSheetsService.deleteRowById(spreadsheetId, accessToken, item.tabName, item.recordId);
        }

        // Successfully executed, remove from queue
        this.queue = this.queue.filter((q) => q.id !== item.id);
        this.saveQueue();
        syncedCount++;
      } catch (err: any) {
        console.warn(`Queue sync failed for item ${item.id}:`, err);
        errors.push({ item, error: err?.message || 'Sync error' });
      }
    }

    this.isProcessing = false;
    return { success: errors.length === 0, syncedCount, errors };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const sheetsSyncQueue = new SheetsSyncQueueManager();

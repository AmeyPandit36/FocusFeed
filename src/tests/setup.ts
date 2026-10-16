import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock chrome API for unit tests
const storageMock: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (!keys) return { ...storageMock };
        if (typeof keys === 'string') {
          return { [keys]: storageMock[keys] };
        }
        if (Array.isArray(keys)) {
          const res: Record<string, unknown> = {};
          for (const k of keys) res[k] = storageMock[k];
          return res;
        }
        return { ...keys, ...storageMock };
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageMock, items);
      }),
      clear: vi.fn(async () => {
        for (const k of Object.keys(storageMock)) {
          delete storageMock[k];
        }
      })
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
} as unknown as typeof chrome;

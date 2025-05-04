// Vitest setup file
import { expect, afterEach, vi } from 'vitest';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

// No need for cleanup as we're using Puppeteer for testing

// Global mocks
global.fetch = vi.fn();

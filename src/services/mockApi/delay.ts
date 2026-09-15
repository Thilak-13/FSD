// src/services/mockApi/delay.ts

let delayEnabled = true;

/**
 * Configure whether artificial latency simulation is active
 */
export const setMockDelayEnabled = (enabled: boolean): void => {
  delayEnabled = enabled;
};

/**
 * Simulates asynchronous network latency between min and max milliseconds (default 150-500ms).
 */
export const simulateDelay = (min = 150, max = 500): Promise<void> => {
  if (!delayEnabled || max <= 0) {
    return Promise.resolve();
  }
  const actualMin = Math.max(0, min);
  const actualMax = Math.max(actualMin, max);
  const ms = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

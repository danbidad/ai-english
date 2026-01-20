import { jest } from '@jest/globals';

// Mock UsageDB before importing the module under test
jest.unstable_mockModule('./usagedb.js', () => ({
    UsageDB: {
        resetAndArchiveForPSTMidnight: jest.fn(),
    },
}));

// Dynamic imports to ensure mock is applied
const { nextMidnightInPST, SetScheduleResetUsageDB } = await import('./reset_usage.js');
const { UsageDB } = await import('./usagedb.js');

describe('reset_usage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('nextMidnightInPST', () => {
        it('should calculate the next midnight in PST correctly from a given UTC time', () => {
            // 2024-01-01 12:00:00 UTC
            // PST is UTC-8 (Standard Time)
            // So 12:00 UTC is 04:00 PST.
            // Next midnight PST should be 2024-01-02 00:00:00 PST
            // which is 2024-01-02 08:00:00 UTC.

            const now = new Date('2024-01-01T12:00:00Z');
            const expected = new Date('2024-01-02T08:00:00Z'); // 00:00 PST is 08:00 UTC

            const result = nextMidnightInPST(now);

            // Allow a small margin of error (e.g., 1 second) due to the binary search approximation
            expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(2000);
        });

        it('should calculate next midnight when currently in PDT (Daylight Saving)', () => {
            // 2024-06-01 12:00:00 UTC
            // PDT is UTC-7
            // So 12:00 UTC is 05:00 PDT.
            // Next midnight PDT should be 2024-06-02 00:00:00 PDT
            // which is 2024-06-02 07:00:00 UTC.

            const now = new Date('2024-06-01T12:00:00Z');
            const expected = new Date('2024-06-02T07:00:00Z');

            const result = nextMidnightInPST(now);

            expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(2000);
        });
    });

    describe('SetScheduleResetUsageDB', () => {
        it('should schedule the reset task', async () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // Invoke the scheduler
            SetScheduleResetUsageDB();

            // Fast-forward time to next midnight
            // We don't know exact ms, but we can advance timers

            expect(UsageDB.resetAndArchiveForPSTMidnight).not.toHaveBeenCalled();

            // Advance time by a large amount to ensure we cross the boundary
            // Max delay is 24 hours (86400000 ms)
            jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

            expect(UsageDB.resetAndArchiveForPSTMidnight).toHaveBeenCalledTimes(1);

            logSpy.mockRestore();
            errorSpy.mockRestore();
        });
    });
});

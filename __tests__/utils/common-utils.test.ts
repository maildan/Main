import { formatBytes } from '../../src/app/utils/common-utils';

describe('Common Utilities', () => {
    describe('formatBytes', () => {
        test('formats 0 bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
        });

        test('formats bytes correctly', () => {
            expect(formatBytes(100)).toBe('100 Bytes');
        });

        test('formats kilobytes correctly', () => {
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(2048)).toBe('2 KB');
        });

        test('formats megabytes correctly', () => {
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(2097152)).toBe('2 MB');
        });

        test('formats gigabytes correctly', () => {
            expect(formatBytes(1073741824)).toBe('1 GB');
        });

        test('handles decimal places correctly', () => {
            expect(formatBytes(1500)).toBe('1.46 KB');
            expect(formatBytes(1500000)).toBe('1.43 MB');
        });
    });
});

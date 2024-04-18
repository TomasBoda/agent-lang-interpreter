import { performance } from "node:perf_hooks";

type PerformanceFunction = (start: number, end: number) => number;

export class Performance {

    private static entries: number[] = [];

    public static now(): number {
        const value = performance.now();
        Performance.entries.push(value);
        return value;
    }

    public static milliseconds(start: number, end: number): number {
        const milliseconds = end - start;
        return Performance.elapsed(milliseconds);
    }

    public static seconds(start: number, end: number): number {
        const seconds = (end - start) / 1000;
        return Performance.elapsed(seconds);
    }

    public static lastElapsed(func: PerformanceFunction = Performance.milliseconds): number {
        if (Performance.entries.length < 2) {
            return 0;
        }

        const start = Performance.entries[Performance.entries.length - 2];
        const end = Performance.entries[Performance.entries.length - 1];

        return func(start, end);
    }

    public static allElapsed(func: PerformanceFunction = Performance.seconds): number {
        if (Performance.entries.length < 2) {
            return 0;
        }

        const start = Performance.entries[0];
        const end = Performance.entries[Performance.entries.length - 1];

        return func(start, end);
    }

    public static slowdown(expected: number, actual: number): number {
        return Performance.elapsed(actual / expected);
    }

    private static elapsed(value: number): number {
        return Math.round(value * 100) / 100;
    }

    public static getEntries(): number[] {
        return Performance.entries;
    }
}
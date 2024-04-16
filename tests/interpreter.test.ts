import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Subscription } from "rxjs";
import { Interpreter, InterpreterConfiguration, InterpreterOutput } from "../src";

const INTERPRETER_STEP_TESTING_DATA = [
    { steps: 10, delay: 50 },
    { steps: 10, delay: 100 },
    { steps: 10, delay: 200 },
    { steps: 10, delay: 500 },
]

describe("Interpreter", () => {

    let subscription: Subscription;

    let interpreter: Interpreter;

    let config: InterpreterConfiguration = { width: 500, height: 500, steps: 10000, delay: 200 };
    let sourceCode = "agent person 10 { property age: random(0, 10) = age + 1; }";

    let result: InterpreterOutput;

    beforeEach(() => {
        initialize();
    });

    afterEach(() => {
        subscription.unsubscribe();
    });

    test("should pause, step through and resume the interpreter", async () => {
        interpreter.start();
        await wait(config.delay);
        expect(result.output?.step).toBe(0);
        await wait(config.delay);
        expect(result.output?.step).toBe(1);
        interpreter.pause();
        await wait(config.delay);
        expect(result.output?.step).toBe(1);

        for (let i = 0; i < 10; i++) {
            interpreter.step();
            expect(result.output?.step).toBe(1 + i + 1);
        }

        expect(result.output?.step).toBe(11);
        interpreter.resume();
        await wait(config.delay);
        expect(result.output?.step).toBe(12);
        await wait(config.delay);
        expect(result.output?.step).toBe(13);
    });

    test("should reset the interpreter", async () => {
        interpreter.start();
        await wait(config.delay * 5 + config.delay / 2);
        expect(result.output?.step).toBe(4);

        interpreter.reset();
        interpreter.start();

        await wait(config.delay);
        expect(result.output?.step).toBe(0);
        await wait(config.delay * 3);
        expect(result.output?.step).toBe(3);
    });

    test.each(INTERPRETER_STEP_TESTING_DATA)
    ("should emit output on every step (%#)", async entry => {
        const { steps, delay } = entry;

        config.steps = steps;
        config.delay = delay;
        initialize();
        interpreter.start();

        for (let i = 0; i < steps; i++) {
            await wait(delay);
            expect(result.output?.step).toBe(i);
        }
    });

    function initialize(): void {
        interpreter = new Interpreter();
        subscription = interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
            result = output;
        });
    }

    async function wait(miliseconds: number): Promise<void> {
        await Bun.sleep(miliseconds);
    }
});
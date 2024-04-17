import { readFileSync, writeFileSync } from "node:fs";
import { exit } from "node:process";
import { Interpreter, InterpreterConfiguration, InterpreterOutput, Output } from "./index.ts";
import commandLineArgs from "command-line-args";

class Logger {
    
    static error(message: string): void {
        console.log("%cError: %c" + message, "color: red;", "color: white;");
    }

    static warn(message: string): void {
        console.log("%cWarn: %c" + message, "color: orange;", "color: white;");
    }

    static info(message: string): void {
        console.log("Info: " + message);
    }
}

interface RunnerData {
    sourceCode: string;
    outputFile: string;
    config: InterpreterConfiguration;
}

class Runner {

    public static DEFAULT_CONFIG: InterpreterConfiguration = { steps: 10, delay: 200, width: 500, height: 500 };

    private static cmdOptions = [
        { name: "steps", alias: "s", type: Number },
        { name: "delay", alias: "d", type: Number },
        { name: "width", alias: "w", type: Number },
        { name: "height", alias: "h", type: Number },
        { name: "in", alias: "i", type: String },
        { name: "out", alias: "o", type: String },
    ];

    static async initialize(): Promise<RunnerData> {
        const options = commandLineArgs(Runner.cmdOptions);

        let inputFile: string;
        let outputFile: string;
        let config = Runner.DEFAULT_CONFIG;

        if (options.in === undefined) {
            Logger.error("--input file must be defined");
            exit(1);
        }

        inputFile = options.in;

        if (options.out === undefined) {
            Logger.error("--output file must be defined");
            exit(1);
        }

        outputFile = options.out;

        if (options.steps === undefined || isNaN(options.steps)) {
            Logger.warn("--steps is not defined, using default value " + config.steps);
        } else {
            config.steps = options.steps;
        }

        if (options.delay === undefined || isNaN(options.delay)) {
            Logger.warn("--delay is not defined, using default value " + config.delay);
        } else {
            config.delay = options.delay;
        }

        if (options.width === undefined || isNaN(options.width)) {
            Logger.warn("--width is not defined, using default value " + config.width);
        } else {
            config.width = options.width;
        }

        if (options.height === undefined || isNaN(options.height)) {
            Logger.warn("--height is not defined, using default value " + config.height);
        } else {
            config.height = options.height;
        }

        let sourceCode = "";

        try {
            sourceCode = readFileSync(inputFile, "utf-8");
        } catch (e) {
            Logger.error("--input file does not exist");
        }

        try {
            readFileSync(outputFile, "utf-8");
        } catch (e) {
            await Deno.create(outputFile);
        }

        return { sourceCode, outputFile, config };
    }
}

const { sourceCode, outputFile, config } = await Runner.initialize();

interface ProgramOutput {
    steps: Output[];
}

const interpreter: Interpreter = new Interpreter();
const programOtput: ProgramOutput = { steps: [] };
writeFileSync(outputFile, JSON.stringify(programOtput));

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    if (output.status.code !== 0 || !output.output) {
        Logger.error(output.status.message ?? "Unknown");
        exit(1);
    }

    programOtput.steps.push(output.output);
    writeFileSync(outputFile, JSON.stringify(programOtput));
});

Logger.info("Running AgentLang...");
interpreter.start();
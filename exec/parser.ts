import { readFileSync } from "node:fs";
import commandLineArgs from "command-line-args";
import { InterpreterConfiguration } from "../src/index.ts";
import { Logger } from "./logger.ts";
import { Process } from "./process.ts";

interface Data {
    sourceCode: string;
    outputFile: string;
    config: InterpreterConfiguration;
    debug: boolean;
}

export class Parser {

    public static DEFAULT_CONFIG: InterpreterConfiguration = { steps: 10, delay: 200, width: 500, height: 500 };
    public static DEFAULT_OUTPUT_FILE = "output.json";

    private static OPTIONS = [
        { name: "steps", alias: "s", type: Number },
        { name: "delay", alias: "d", type: Number },
        { name: "width", alias: "w", type: Number },
        { name: "height", alias: "h", type: Number },
        { name: "in", alias: "i", type: String },
        { name: "out", alias: "o", type: String },
        { name: "debug", type: Boolean },
    ];

    static async initialize(): Promise<Data> {
        const options = commandLineArgs(Parser.OPTIONS);

        let inputFile: string;
        let outputFile = this.DEFAULT_OUTPUT_FILE;
        let config = Parser.DEFAULT_CONFIG;
        let debug = false;

        if (options.in === undefined) {
            Logger.error("--input file was not provided");
            Process.exit(1);
        }
        
        inputFile = options.in;

        if (options.out === undefined) {
            Logger.warn(`--output file was not provided, using default value ${outputFile}`);
        } else {
            outputFile = options.out;
        }

        if (options.steps === undefined || isNaN(options.steps)) {
            Logger.warn(`--steps was not provided, using default value ${config.steps}`);
        } else {
            config.steps = options.steps;
        }

        if (options.delay === undefined || isNaN(options.delay)) {
            Logger.warn(`--delay was not provided, using default value ${config.delay}`);
        } else {
            config.delay = options.delay;
        }

        if (options.width === undefined || isNaN(options.width)) {
            Logger.warn(`--width was not provided, using default value ${config.width}`);
        } else {
            config.width = options.width;
        }

        if (options.height === undefined || isNaN(options.height)) {
            Logger.warn(`--height was not provided, using default value ${config.height}`);
        } else {
            config.height = options.height;
        }

        if (options.debug !== undefined) {
            debug = options.debug;
        }

        let sourceCode = Parser.getSourceCode(inputFile);
        await Parser.createOutputFile(outputFile);

        return { sourceCode, outputFile, config, debug };
    }

    private static getSourceCode(filename: string): string {
        let sourceCode = "";

        try {
            sourceCode = readFileSync(filename, "utf-8");
        } catch (e) {
            Logger.error("--input file does not exist");
            Process.exit(1);
        }

        return sourceCode;
    }

    private static async createOutputFile(filename: string): Promise<void> {
        try {
            readFileSync(filename, "utf-8");
        } catch (e) {
            // @ts-ignore
            await Deno.create(filename);
        }
    }
}

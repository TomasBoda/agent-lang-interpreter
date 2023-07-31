import { Observable, interval, map, take } from "rxjs";
import { Lexer } from "./lexer/lexer";
import { Token } from "./lexer/lexer.types";
import { Program } from "./parser/ast.types";
import { Parser } from "./parser/parser";
import { Environment } from "./runtime/environment";
import { Runtime } from "./runtime/runtime";
import { BooleanValue, NullValue, RuntimeValue } from "./runtime/values";
import { writeFileSync } from "fs";

export interface InterpreterConfiguration {
    agents: number;
    steps: number;
    delay: number;
}

export class Interpreter {

    private config: InterpreterConfiguration = { agents: 5, steps: 10, delay: 200 };

    private tokens: Token[];
    private program: Program;
    private environment: Environment;

    constructor(sourceCode: string) {
        const lexer: Lexer = new Lexer(sourceCode);
        this.tokens = lexer.tokenize();
        //console.log(this.tokens);

        const parser: Parser = new Parser(this.tokens);
        this.program = parser.parse();
        //console.log(this.program);
        writeFileSync("ast.json", JSON.stringify(this.program), "utf-8");

        this.environment = new Environment();
        this.environment.declareVariable("NULL", { type: "null", value: null } as NullValue);
        this.environment.declareVariable("TRUE", { type: "boolean", value: true } as BooleanValue);
        this.environment.declareVariable("FALSE", { type: "boolean", value: false } as BooleanValue);
    }

    public run(config?: InterpreterConfiguration): Observable<RuntimeValue> {
        if (config) this.config = config;

        const runtime: Runtime = new Runtime(this.program);

        console.log(runtime.interpret(this.environment, this.config, 0));

        return interval(this.config.delay).pipe(
            take(this.config.steps),
            map(step => runtime.interpret(this.environment, this.config, step))
        );
    }
}
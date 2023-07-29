import { Observable, interval, map, take } from "rxjs";
import { Lexer } from "./lexer/lexer";
import { Token } from "./lexer/lexer.types";
import { Program } from "./parser/ast.types";
import { Parser } from "./parser/parser";
import { Environment } from "./runtime/environment";
import { Runtime } from "./runtime/runtime";
import { BooleanValue, NullValue, RuntimeValue } from "./runtime/values";

type AgentVariableValue = number | boolean;

interface Agent {
    identifier: string;
    variables: Map<string, AgentVariableValue>;
}

interface Output {
    step: number;
    agents: Agent[];
}

export interface InterpreterConfiguration {
    agents: number;
    steps: number;
    delay: number;
}

export class Interpreter {

    private tokens: Token[];
    private program: Program;

    private environment: Environment;

    constructor(sourceCode: string) {
        const lexer: Lexer = new Lexer(sourceCode);
        this.tokens = lexer.tokenize();

        const parser: Parser = new Parser(this.tokens);
        this.program = parser.parse();

        this.environment = new Environment();
        this.environment.declareVariable("NULL", { type: "null", value: null } as NullValue);
        this.environment.declareVariable("TRUE", { type: "boolean", value: true } as BooleanValue);
        this.environment.declareVariable("FALSE", { type: "boolean", value: false } as BooleanValue);
    }

    public run(config: InterpreterConfiguration): Observable<RuntimeValue> {
        const runtime: Runtime = new Runtime(this.program);

        return interval(config.delay).pipe(
            take(config.steps),
            map(step => runtime.interpret(this.environment, step))
        );
    }
}
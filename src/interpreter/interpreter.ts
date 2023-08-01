import { Observable, interval, map, take } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { Token } from "../lexer/lexer.types";
import { Program } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { writeFileSync } from "fs";
import { InterpreterConfiguration, InterpreterOutput } from "./interpreter.types";

export class Interpreter {

    private tokens: Token[];
    private program: Program;

    constructor(sourceCode: string) {
        const lexer: Lexer = new Lexer(sourceCode);
        this.tokens = lexer.tokenize();

        const parser: Parser = new Parser(this.tokens);
        this.program = parser.parse();

        writeFileSync("ast.json", JSON.stringify(this.program), "utf-8");
    }

    public interpret(config: InterpreterConfiguration): Observable<InterpreterOutput> {
        const runtime: Runtime = new Runtime(this.program);

        return interval(config.delay).pipe(
            take(config.steps),
            map(step => runtime.run(config, step))
        );
    }
}
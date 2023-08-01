import { Observable, interval, map, take } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { Token } from "../lexer/lexer.types";
import { Program } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { writeFileSync } from "fs";
import { Agent, InterpreterConfiguration, InterpreterOutput, RuntimeAgent, RuntimeOutput } from "./interpreter.types";

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
            map(step => this.mapRuntimeOutput(runtime.run(config, step)))
        );
    }

    
    private mapRuntimeAgent(agent: RuntimeAgent): Agent {
        const variables: { [key: string]: number | boolean } = {};
        agent.variables.forEach((value, key) => variables[key] = value);
    
        return {identifier: agent.identifier, variables } as Agent;
    }
    
    private mapRuntimeOutput(output: RuntimeOutput): InterpreterOutput {
        return {
            step: output.step,
            agents: output.agents.map((agent: RuntimeAgent) => this.mapRuntimeAgent(agent))
        } as InterpreterOutput;
    }
}
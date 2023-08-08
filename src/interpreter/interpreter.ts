import { Observable, interval, map, of, take } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { LexerOutput } from "../lexer/lexer.types";
import { NodeType, ParserError, ParserValue, Program } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { Agent, InterpreterConfiguration, InterpreterOutput } from "./interpreter.types";
import { AgentVariableValue, RuntimeAgent, RuntimeError, RuntimeOutput, RuntimeValue, ValueType } from "../runtime/runtime.types";
import { Environment } from "../runtime/environment";
import { Error } from "../utils/error";

export class Interpreter {

    private environment: Environment = Environment.createGlobalEnvironment();

    public interpret(sourceCode: string, config: InterpreterConfiguration): Observable<InterpreterOutput> {
        const lexer: Lexer = new Lexer(sourceCode);
        const lexerOutput: LexerOutput = lexer.tokenize();

        if (lexerOutput.status.code !== 0 || !lexerOutput.tokens) {
            return of(Error.interpreter(lexerOutput.status.message ?? ""));
        }

        const parser: Parser = new Parser(lexerOutput.tokens);
        const program: ParserValue = parser.parse();

        if (program.type === NodeType.Error) {
            return of(Error.interpreter((program as ParserError).message));
        }

        const runtime: Runtime = new Runtime(program as Program, this.environment);

        return interval(config.delay).pipe(
            take(config.steps),
            map(step => {
                const value: RuntimeValue = runtime.run(step);

                if (value.type === ValueType.Error) {
                    return Error.interpreter((value as RuntimeError).message);
                }

                return this.mapRuntimeOutput(value as RuntimeOutput);
            })
        );
    }
    
    private mapRuntimeAgent(agent: RuntimeAgent): Agent {
        const variables: { [key: string]: RuntimeValue } = {};
        agent.variables.forEach((value, key) => variables[key] = value);
    
        return { identifier: agent.identifier, variables } as Agent;
    }
    
    private mapRuntimeOutput(output: RuntimeOutput): InterpreterOutput {
        return {
            status: { code: 0 },
            output: {
                step: output.step,
                agents: output.agents.map((agent: RuntimeAgent) => this.mapRuntimeAgent(agent))
            }
        } as InterpreterOutput;
    }
}
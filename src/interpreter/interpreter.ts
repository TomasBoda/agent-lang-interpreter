import { Observable, interval, map, of, take } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { LexerOutput } from "../lexer/lexer.types";
import { NodeType, ParserError, ParserValue, Program } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { Agent, InterpreterConfiguration, InterpreterOutput } from "./interpreter.types";
import {
    FunctionCall, NumberValue,
    RuntimeAgent,
    RuntimeError,
    RuntimeOutput,
    RuntimeValue,
    ValueType
} from "../runtime/runtime.types";
import { Environment } from "../runtime/environment";
import { Error } from "../utils/error";
import { createGlobalFunction } from "../utils/functions";
import { Symbolizer } from "../symbolizer/symbolizer";
import { Symbol } from "../symbolizer/symbolizer.types";

export class Interpreter {

    private environment: Environment = Environment.createGlobalEnvironment();

    public interpret(sourceCode: string, config: InterpreterConfiguration): Observable<InterpreterOutput> {
        const symbolizer: Symbolizer = new Symbolizer(sourceCode);
        const symbols: Symbol[] = symbolizer.symbolize();

        const lexer: Lexer = new Lexer(symbols);
        const lexerOutput: LexerOutput = lexer.tokenize();

        if (lexerOutput.status.code !== 0 || !lexerOutput.tokens) {
            return of(Error.interpreter(lexerOutput.status.message ?? ""));
        }

        const parser: Parser = new Parser(lexerOutput.tokens);
        const program: ParserValue = parser.parse();

        if (program.type === NodeType.Error) {
            return of(Error.interpreter((program as ParserError).message));
        }

        this.environment.declareVariable("width", createGlobalFunction(this.createWidthFunction(config.width)));
        this.environment.declareVariable("height", createGlobalFunction(this.createHeightFunction(config.height)));

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

    private createWidthFunction(width: number): FunctionCall {
        function widthFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                return Error.runtime(`Function 'width' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: width } as NumberValue;
        }

        return widthFunction;
    }

    private createHeightFunction(height: number): FunctionCall {
        function heightFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                return Error.runtime(`Function 'height' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: height } as NumberValue;
        }

        return heightFunction;
    }
}
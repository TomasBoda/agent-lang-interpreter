import { Observable, interval, map, of, take, takeWhile } from "rxjs";
import { Lexer } from "../lexer/lexer";
import { Token } from "../lexer/lexer.types";
import { ParserValue, Program } from "../parser/parser.types";
import { Parser } from "../parser/parser";
import { Runtime } from "../runtime/runtime";
import { Agent, InterpreterConfiguration, InterpreterOutput } from "./interpreter.types";
import { FunctionCall, NumberValue, RuntimeAgent, RuntimeOutput, RuntimeValue, ValueType } from "../runtime/runtime.types";
import { Environment } from "../runtime/environment";
import { createGlobalFunction } from "../utils/functions";
import { Symbolizer } from "../symbolizer/symbolizer";
import { Symbol } from "../symbolizer/symbolizer.types";
import { ErrorLexer, ErrorModel, ErrorParser, ErrorRuntime } from "../utils/errors";

export class Interpreter {

    public interpret(sourceCode: string, config: InterpreterConfiguration): Observable<InterpreterOutput> {
        const symbolizer: Symbolizer = new Symbolizer(sourceCode);
        const symbols: Symbol[] = symbolizer.symbolize();

        const lexer: Lexer = new Lexer(symbols);
        let tokens: Token[];

        try { tokens = lexer.tokenize(); } catch (error) {
            return of(this.getRuntimeError(error as ErrorLexer));
        }

        const parser: Parser = new Parser(tokens);
        let program: ParserValue;

        try { program = parser.parse(); } catch (error) {
            return of(this.getRuntimeError(error as ErrorParser));
        }

        const environment: Environment = Environment.createGlobalEnvironment();
        environment.declareVariable("width", createGlobalFunction(this.createWidthFunction(config.width)));
        environment.declareVariable("height", createGlobalFunction(this.createHeightFunction(config.height)));

        const runtime: Runtime = new Runtime(program as Program, environment);

        return interval(config.delay).pipe(
            take(config.steps),
            map(step => {
                try {
                    const value: RuntimeValue = runtime.run(step);
                    return this.getRuntimeOutput(value as RuntimeOutput);
                } catch (error) {
                    return this.getRuntimeError(error as ErrorRuntime)
                }
            }),
            takeWhile(output => output.status.code === 0),
        );
    }

    private getRuntimeOutput(output: RuntimeOutput): InterpreterOutput {
        return {
            status: { code: 0 },
            output: {
                step: output.step,
                agents: this.getAgents(output.agents)
            }
        } as InterpreterOutput;
    }

    private getRuntimeError(error: ErrorModel): InterpreterOutput {
        return {
            status: {
                code: 1,
                message: (error as ErrorRuntime).toString()
            }
        };
    }

    private getAgents(agents: RuntimeAgent[]): Agent[] {
        return agents.map((agent: RuntimeAgent) => this.getAgent(agent));
    }

    private getAgent(agent: RuntimeAgent): Agent {
        const variables: { [key: string]: RuntimeValue } = {};
        agent.variables.forEach((value, key) => variables[key] = value);
    
        return { identifier: agent.identifier, variables } as Agent;
    }

    private createWidthFunction(width: number): FunctionCall {
        function widthFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'width' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: width } as NumberValue;
        }

        return widthFunction;
    }

    private createHeightFunction(height: number): FunctionCall {
        function heightFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'height' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: height } as NumberValue;
        }

        return heightFunction;
    }
}
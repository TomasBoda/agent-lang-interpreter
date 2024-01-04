import { RuntimeValue } from "./model/values";
import { ErrorRuntime } from "../utils";
import { ABS, CEIL, CHOICE, COS, COUNT, EMPTY, FILTER, FLOOR, PI, PROB, RANDOM, ROUND, SIN, SQRT, TAN, createGlobalFunction, MIN, MAX, DIST } from "./functions";

export class Environment {

    private parent?: Environment;
    private variables: Map<string, RuntimeValue>;

    constructor(parent?: Environment) {
        this.parent = parent;
        this.variables = new Map();
    }

    public static createGlobalEnvironment(): Environment {
        const environment = new Environment();

        environment.declareVariable("random", createGlobalFunction(RANDOM));
        environment.declareVariable("choice", createGlobalFunction(CHOICE));
        environment.declareVariable("sqrt", createGlobalFunction(SQRT));
        environment.declareVariable("abs", createGlobalFunction(ABS));
        environment.declareVariable("floor", createGlobalFunction(FLOOR));
        environment.declareVariable("ceil", createGlobalFunction(CEIL));
        environment.declareVariable("round", createGlobalFunction(ROUND));
        environment.declareVariable("sin", createGlobalFunction(SIN));
        environment.declareVariable("cos", createGlobalFunction(COS));
        environment.declareVariable("tan", createGlobalFunction(TAN));
        environment.declareVariable("pi", createGlobalFunction(PI));
        environment.declareVariable("prob", createGlobalFunction(PROB));
        environment.declareVariable("dist", createGlobalFunction(DIST));

        environment.declareVariable("count", createGlobalFunction(COUNT));
        environment.declareVariable("filter", createGlobalFunction(FILTER));
        environment.declareVariable("empty", createGlobalFunction(EMPTY));
        environment.declareVariable("min", createGlobalFunction(MIN));
        environment.declareVariable("max", createGlobalFunction(MAX));

        return environment;
    }

    public declareVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        if (this.variables?.has(identifier)) {
            this.assignVariable(identifier, value);
            return value;
        }

        this.variables.set(identifier, value);
        return value;
    }

    public assignVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        const env = this.resolve(identifier);

        if (!env) {
            throw new ErrorRuntime(`Variable ${identifier} does not exist`);
        }

        env.variables.set(identifier, value);
        return value;
    }

    public lookupVariable(identifier: string): RuntimeValue | undefined {
        const env = this.resolve(identifier);

        if (!env) {
            return undefined;
        }

        return env.variables.get(identifier) as RuntimeValue;
    }

    public resolve(identifier: string): Environment | undefined {
        if (this.variables.has(identifier)) {
            return this;
        }

        if (this.parent === undefined) {
            return undefined;
        }

        return this.parent.resolve(identifier);
    }
}
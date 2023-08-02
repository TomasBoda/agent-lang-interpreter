import { NumberValue, RuntimeValue } from "./runtime.types";
import { Error } from "../utils/error";
import { ABS, CEIL, CHOICE, COS, FLOOR, RANDOM, ROUND, SIN, SQRT, TAN, createGlobalFunction } from "../utils/functions";

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

        return environment;
    }

    public declareVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        if (this.variables?.has(identifier)) {
            Error.runtime(null, `Cannot declare variable '${identifier}' as it has already been declared`);
            return {} as RuntimeValue;
        }

        this.variables.set(identifier, value);
        return value;
    }

    public assignVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        const env = this.resolve(identifier);
        env.variables.set(identifier, value);
        return value;
    }

    public lookupVariable(identifier: string): RuntimeValue {
        const env = this.resolve(identifier);
        return env.variables.get(identifier) as RuntimeValue;
    }

    public resolve(identifier: string): Environment {
        if (this.variables.has(identifier)) {
            return this;
        }

        if (this.parent === undefined) {
            Error.parse(null, `Cannot resolve variable ${identifier} as it does not exist`);
            return {} as Environment;
        }

        return this.parent.resolve(identifier);
    }
}
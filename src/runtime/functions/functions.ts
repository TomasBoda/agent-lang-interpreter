import { ErrorRuntime } from "../../utils";
import { AgentsValue, BooleanValue, LambdaValue, NumberValue, RuntimeAgent, RuntimeValue, ValueType } from "../model";
import { createAgentValue, createAgentsValue, createBooleanValue, createNullValue, createNumberValue, expectArgumentCount, expectArgumentType } from "./utils";

export function FIND_BY_COORDINATES(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("find_by_coordinates", 3, args.length);
    expectArgumentType("find_by_coordinates", args[0], ValueType.Agents);
    expectArgumentType("find_by_coordinates", args[1], ValueType.Number);
    expectArgumentType("find_by_coordinates", args[2], ValueType.Number);

    const agents = args[0] as AgentsValue;
    const x = args[1] as NumberValue;
    const y = args[2] as NumberValue;

    for (const agent of agents.value) {
        const xAgent = agent.variables.get("x");
        const yAgent = agent.variables.get("y");

        if (!xAgent) {
            throw new ErrorRuntime(`Property 'x' in agent does not exist while using the 'find_by_coordinates' function`);
        }

        if (!yAgent) {
            throw new ErrorRuntime(`Property 'y' in agent does not exist while using the 'find_by_coordinates' function`);
        }

        if (xAgent.type !== ValueType.Number) {
            throw new ErrorRuntime(`Property 'x' in agent is not of type number while using the 'find_by_coordinates' function`);
        }

        if (yAgent.type !== ValueType.Number) {
            throw new ErrorRuntime(`Property 'y' in agent is not of type number while using the 'find_by_coordinates' function`);
        }

        const xValue = xAgent as NumberValue;
        const yValue = yAgent as NumberValue;

        if (x.value === xValue.value && y.value === yValue.value) {
            return createAgentValue(agent);
        }
    }   

    return createNullValue();
}

export function SUM(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("sum", 1, args.length);
    expectArgumentType("sum", args[0], ValueType.Lambda);

    const lambda: LambdaValue = args[0] as LambdaValue;

    let sum = 0;

    for (const result of lambda.results) {
        if (result.type !== ValueType.Number) {
            throw new ErrorRuntime(`Function 'sum' requires a lambda expression that returns numeric values`);
        }

        const number: NumberValue = result as NumberValue;
        sum += number.value;
    }

    return createNumberValue(sum);
}

export function DIST(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("dist", 4, args.length);
    expectArgumentType("dist", args[0], ValueType.Number);
    expectArgumentType("dist", args[1], ValueType.Number);
    expectArgumentType("dist", args[2], ValueType.Number);
    expectArgumentType("dist", args[3], ValueType.Number);

    const x1: NumberValue = args[0] as NumberValue;
    const y1: NumberValue = args[1] as NumberValue;
    const x2: NumberValue = args[2] as NumberValue;
    const y2: NumberValue = args[3] as NumberValue;

    const result = Math.sqrt((x1.value - x2.value) * (x1.value - x2.value) + (y1.value - y2.value) * (y1.value - y2.value));

    return createNumberValue(result);
}

export function PROB(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("prob", 1, args.length);
    expectArgumentType("prob", args[0], ValueType.Number);

    const probability: NumberValue = args[0] as NumberValue;

    if (probability.value < 0 || probability.value > 1) {
        throw new ErrorRuntime(`Function 'prob' expected a number between 0 and 1, ${probability.value} provided`);
    }

    const result = Math.random() < probability.value;

    return createBooleanValue(result);
}

export function PI(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("pi", 0, args.length);

    return createNumberValue(Math.PI);
}

export function EMPTY(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("empty", 0, args.length);

    return createAgentsValue([]);
}

export function MIN(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("min", 1, args.length);
    expectArgumentType("min", args[0], ValueType.Lambda);

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'min' function.`);
    }

    for (let i = 0; i < lambda.results.length; i++) {
        const result: RuntimeValue = lambda.results[i];

        if (result.type !== ValueType.Number) {
            throw new ErrorRuntime(`Function 'min' requires a lambda expression that returns numeric values`);
        }
    }

    const results = lambda.results.map((result: RuntimeValue) => (result as NumberValue).value);
    const minValue = Math.min(...results);

    for (let i = 0; i < results.length; i++) {
        if (results[i] === minValue) {
            const agent: RuntimeAgent = lambda.agents[i];
            return createAgentValue(agent);
        }
    }

    return createNullValue();
}

export function MAX(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("max", 1, args.length);
    expectArgumentType("max", args[0], ValueType.Lambda);

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'max' function.`);
    }

    for (let i = 0; i < lambda.results.length; i++) {
        const result: RuntimeValue = lambda.results[i];

        if (result.type !== ValueType.Number) {
            throw new ErrorRuntime(`Function 'max' requires a lambda expression that returns numeric values`);
        }
    }

    const results = lambda.results.map((result: RuntimeValue) => (result as NumberValue).value);
    const maxValue = Math.max(...results);

    for (let i = 0; i < results.length; i++) {
        if (results[i] === maxValue) {
            const agent: RuntimeAgent = lambda.agents[i];
            return createAgentValue(agent);
        }
    }

    return createNullValue();
}

export function FILTER(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("filter", 1, args.length);
    expectArgumentType("filter", args[0], ValueType.Lambda);

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'filter' function.`);
    }

    const agents: RuntimeAgent[] = [];

    for (let i = 0; i < lambda.agents.length; i++) {
        if (lambda.results[i].type !== ValueType.Boolean) {
            throw new ErrorRuntime(`Function 'filter' requires lambda expression with boolean return value`);
        }

        const result: BooleanValue = lambda.results[i] as BooleanValue;

        if (result.value) {
            agents.push(lambda.agents[i] as RuntimeAgent);
        }
    }

    return createAgentsValue(agents);
}

export function COUNT(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("count", 1, args.length);
    expectArgumentType("count", args[0], ValueType.Agents);

    const agents: AgentsValue = args[0] as AgentsValue;
    const result = agents.value.length;

    return createNumberValue(result);
}

export function RANDOM(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("random", 2, args.length);
    expectArgumentType("random", args[0], ValueType.Number);
    expectArgumentType("random", args[1], ValueType.Number);

    const min: NumberValue = args[0] as NumberValue;
    const max: NumberValue = args[1] as NumberValue;

    if (min.value >= max.value) {
        throw new ErrorRuntime("In function call RANDOM the first argument must be less than the second argument");
    }

    const result = Math.random() * (max.value - min.value) + min.value;

    return createNumberValue(result);
}

export function CHOICE(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("choice", 2, args.length);

    if (args[0].type === ValueType.Number && args[1].type === ValueType.Number) {
        const first: NumberValue = args[0] as NumberValue;
        const second: NumberValue = args[1] as NumberValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;
        return createNumberValue(result);
    }

    if (args[0].type === ValueType.Boolean && args[1].type === ValueType.Boolean) {
        const first: BooleanValue = args[0] as BooleanValue;
        const second: BooleanValue = args[1] as BooleanValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;
        return createBooleanValue(result);
    }

    throw new ErrorRuntime("Function 'choice' requires arguments of type 'number' or 'boolean'");
}

export function SQRT(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("sqrt", 1, args.length);
    expectArgumentType("sqrt", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.sqrt(number.value);

    return createNumberValue(result);
}

export function ABS(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("abs", 1, args.length);
    expectArgumentType("abs", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.abs(number.value);

    return createNumberValue(result);
}

export function FLOOR(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("floor", 1, args.length);
    expectArgumentType("floor", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.floor(number.value);

    return createNumberValue(result);
}

export function CEIL(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("ceil", 1, args.length);
    expectArgumentType("ceil", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.ceil(number.value);

    return createNumberValue(result);
}

export function ROUND(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("round", 1, args.length);
    expectArgumentType("round", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.round(number.value);

    return createNumberValue(result);
}

export function SIN(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("sin", 1, args.length);
    expectArgumentType("sin", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.sin(number.value);

    return createNumberValue(result);
}

export function COS(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("cos", 1, args.length);
    expectArgumentType("cos", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.cos(number.value);

    return createNumberValue(result);
}

export function TAN(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("tan", 1, args.length);
    expectArgumentType("tan", args[0], ValueType.Number);

    const number: NumberValue = args[0] as NumberValue;
    const result = Math.tan(number.value);

    return createNumberValue(result);
}

export function ATAN(args: RuntimeValue[]): RuntimeValue {
    expectArgumentCount("atan", 2, args.length);
    expectArgumentType("atan", args[0], ValueType.Number);
    expectArgumentType("atan", args[1], ValueType.Number);

    const number1: NumberValue = args[0] as NumberValue;
    const number2: NumberValue = args[1] as NumberValue;

    const result = Math.atan2(number1.value, number2.value);

    return createNumberValue(result);
}
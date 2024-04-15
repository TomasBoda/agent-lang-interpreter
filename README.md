<img src="./assets/agent-lang-interpreter-logo-black.png#gh-light-mode-only" width="400">
<img src="./assets/agent-lang-interpreter-logo-white.png#gh-dark-mode-only" width="400">

![Version Badge](https://img.shields.io/badge/version-1.0.0-blue?style=flat)
![Contributors Badge](https://img.shields.io/badge/contributors-1-green?style=flat)
![License Badge](https://img.shields.io/badge/license-MIT-red?style=flat)

## About
Interpreter for the **AgentLang** programming language written in TypeScript.

## Installation
To integrate the AgentLang interpreter into your TypeScript project, add it as a git submodule and install all the necessary packages.
```bash
git submodule add https://github.com/TomasBoda/agent-lang-interpreter.git
cd agent-lang-interpreter
npm install
```

## Usage
Below is an example usage of the AgentLang interpreter in a TypeScript project.
```ts
import {
    Interpreter,
    InterpreterConfiguration,
    InterpreterOutput
} from "@/agent-lang-interpreter";

const filename = "code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const config: InterpreterConfiguration = { steps: 10, delay: 500, width: 500, height: 500 };
const interpreter: Interpreter = new Interpreter();

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    console.log(output);
});
```

## Tests
To run the AgentLang interpreter's unit tests, run the following in the command line:
```bash
bun test
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](/LICENSE.md)

Made by [Tomas Boda](https://github.com/TomasBoda)

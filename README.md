<img src="./assets/agent-lang-interpreter-logo-black.png#gh-light-mode-only" width="400">
<img src="./assets/agent-lang-interpreter-logo-white.png#gh-dark-mode-only" width="400">

![Version Badge](https://img.shields.io/badge/version-1.0.0-blue?style=flat)
![Contributors Badge](https://img.shields.io/badge/contributors-1-green?style=flat)
![License Badge](https://img.shields.io/badge/license-MIT-red?style=flat)

## About
Interpreter for the **AgentLang** programming language written in TypeScript.

## AgentLang
AgentLang is an interpreted programming language designed for agent-based modeling. Below is an example AgentLang source code.
```
agent snowflake 200 {

    const speed = random(8, 15);

    property x: random(0, width()) = x;
    property y: random(0, height()) = (y + speed) % height();
    
    const w = 10;
    const h = 10;
}
```

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

const filename = "source-code.txt";
const sourceCode = readFileSync(filename, "utf-8");

const config: InterpreterConfiguration = { steps: 10, delay: 500, width: 500, height: 500 };
const interpreter: Interpreter = new Interpreter();

interpreter.get(sourceCode, config).subscribe((output: InterpreterOutput) => {
    console.log(output);
});
```

## Building Binary Executables
AgentLang interpreter can also be built as a binary executable runnable on various platforms. To build the binary executables of the interpreter, run the following in the project root.
```bash
npm run build-all
```

> [!WARNING]
> The build script uses [Deno](https://deno.com/) for compiling the TypeScript files into an executable binary. Before running the script, be sure to have Deno installed on your system and change the Deno installation path in the `package.json` file in the project root.

The script will build executable binaries for supported platforms into the `./prod` folder. To run the binary file, run the following.
```bash
./prod/current-platform/agent-lang --input source-code.txt --output output.json
```
The interpreter will run the AgentLang code from the `source-code.txt` file and store the output of each step into the `output.json` file.

## Running Example Program
To run an example program of the AgentLang interpreter, run the following command in your terminal.
```bash
npm run start
```
The example program with the example source code from the `./example` folder will compile and run.

## Tests
To run the AgentLang interpreter's unit tests, run the following in the command line:
```bash
npm run test
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](/LICENSE.md)

Made by [Tomas Boda](https://github.com/TomasBoda)

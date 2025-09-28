export interface RunResult{
    output : any;
    logs : string[];
}

export function get_compiler(language: string): Compiler {
    switch (language.toLowerCase()) {
        case 'javascript':
            return new JavaScript();
        case 'python':
            return new Python();
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

abstract class Compiler {
    /**
     * Abstract method to run code.
     * @param code - The code to execute.
     * @param args - Optional arguments to pass to the code.
     * @returns the result of the execution
     */
    abstract run(code: string, func : string, args?: any): Promise<RunResult>;
}

class JavaScript extends Compiler {
  async run(code: string, func: string, args: any): Promise<RunResult> {
    return new Promise((resolve) => {
      const worker = new Worker("/js-worker.js");

      // Set a 1-second timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve({
          output: null,
          logs: ["Error: Execution timed out after 1000ms"]
        });
      }, 1000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data);
        worker.terminate();
      };

      worker.postMessage({ code, func, args });
    });
  }
}


class Python extends Compiler {
    async run(code: string, func: string, args?: any): Promise<RunResult> {
        if (typeof window === 'undefined') {
            throw new Error("Python sandbox can only run in the browser (client-side)");
        }

        // Load Brython if not already loaded
        if (!(window as any).__BRYTHON__) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/brython@3.10.5/brython.min.js';
                script.onload = () => {
                    (window as any).brython(); // initialize Brython
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
            logs.push(args.join(' '));
            originalLog.apply(console, args);
        };

        const executeCode = () => new Promise<RunResult>((resolve) => {
            let output: any = null;
            try {
                // Load the user code
                (window as any).__BRYTHON__.run_script(code);

                // Call the specified function with arguments
                output = (window as any).__BRYTHON__.builtins[func](...(args || []));
            } catch (err: any) {
                logs.push(err.toString());
                output = null;
            } finally {
                console.log = originalLog;
            }
            resolve({ output, logs });
        });

        // Run the code with timeout
        return Promise.race([
            executeCode(),
            new Promise<RunResult>((resolve) => {
                setTimeout(() => resolve({ output: null, logs: [...logs, 'Execution timed out'] }), 2000);
            })
        ]);
    }
}

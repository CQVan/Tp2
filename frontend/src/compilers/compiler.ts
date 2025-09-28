import IsolatedVM from "isolated-vm";

interface RunResult{
    output : any;
    logs : string[];
}

abstract class Compiler {
    /**
     * Abstract method to run code.
     * @param code - The code to execute.
     * @param args - Optional arguments to pass to the code.
     * @returns An object of type `any`.
     */
    abstract run(code: string, func : string,args?: any[]): Promise<RunResult>;
}

class JavaScript extends Compiler {
    async run(code: string, func: string, args: any[] = []): Promise<RunResult> {
        const logs: string[] = [];

        // Create isolate
        const isolate = new IsolatedVM.Isolate({ memoryLimit: 128 });
        const context = await isolate.createContext();
        const jail = context.global;

        // Expose console.log
        await jail.set('console', {
            log: new IsolatedVM.Reference((...messages: any[]) => {
                logs.push(messages.map(m => m?.toString() ?? '').join(' '));
            })
        });

        // Evaluate the user code in the isolate
        await context.eval(code);

        try {
            // Get a reference to the function
            const fnRef = await context.eval(`typeof ${func} === 'function' ? ${func} : undefined`);
            if (!fnRef) throw new Error(`Function "${func}" not found`);

            // Call the function with args, with timeout
            const result = await fnRef.apply(undefined, args.map(a => a), { timeout: 1000 });

            return { output: result, logs };
        } catch (e: any) {
            return { output: null, logs: [...logs, `Error: ${e.message}`] };
        }
    }
}

class Python extends Compiler {
    async run(code: string, func: string, args?: any[], timeoutMs = 2000): Promise<RunResult> {
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
                setTimeout(() => resolve({ output: null, logs: [...logs, 'Execution timed out'] }), timeoutMs);
            })
        ]);
    }
}

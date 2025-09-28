self.onmessage = async (e) => {
  const { code, func, args } = e.data;
  const logs = [];

  // Override console.log
  const originalConsoleLog = console.log;
  console.log = (...messages) => {
    logs.push(messages.map(m => m?.toString() ?? '').join(' '));
    originalConsoleLog(...messages);
  };

  try {
    // Evaluate the user code
    eval(code);

    // Check if function exists
    if (typeof self[func] !== 'function') {
      throw new Error(`Function "${func}" not found`);
    }

    // Call the function with arguments
    const result = await self[func](...args);

    self.postMessage({ output: result, logs });
  } catch (err) {
    self.postMessage({ output: null, logs: [...logs, `Error: ${err.message}`] });
  }
};

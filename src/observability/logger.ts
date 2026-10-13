const level = process.env.LOG_LEVEL ?? "info";

export const log = {
  info: (...args: unknown[]) => {
    if (level !== "silent") console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (level === "debug") console.error(...args);
  },
};
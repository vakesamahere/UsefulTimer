declare global {
  interface Window {
    variables: {
      helperTaskId: number;
    },
    config: {
      helperTimeout: number;
    }
  }
}
export {};
export const registerInterval = (
  fn: () => void | Promise<void>,
  interval?: number,
) => {
  const handler = setInterval(() => {
    fn();
  }, interval);
  return () => {
    clearInterval(handler);
  };
};

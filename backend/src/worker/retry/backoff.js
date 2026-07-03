export const calculateNextRun = (policy, currentRetries) => {
  if (currentRetries >= policy.max_retries) {
    return null; // Signals it should go to Dead Letter Queue
  }

  const { type, delay_ms, multiplier } = policy;
  
  let delay = delay_ms;

  if (type === 'linear') {
    delay = delay_ms * (currentRetries + 1);
  } else if (type === 'exponential') {
    delay = delay_ms * Math.pow(multiplier, currentRetries);
  }

  return new Date(Date.now() + delay);
};

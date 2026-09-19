export const localServiceBoundary = {
  name: 'local-service',
} as const;

// Entry point пока объявляет только local application boundary из ADR-002.
// Он не открывает HTTP endpoint и не выполняет privileged operations до выбора transport в следующем STEP.
console.log(`${localServiceBoundary.name} bootstrap`);

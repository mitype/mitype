import type { Module } from './types';
import { COTTAGE_MODULES_A } from './cottageModulesA';
import { COTTAGE_MODULES_B } from './cottageModulesB';
import { COTTAGE_MODULES_C } from './cottageModulesC';
import { COTTAGE_MODULES_D } from './cottageModulesD';

// Final order: rules and business basics, food safety, menu, equipment,
// labels, pricing, selling, operations, planning and orders, extra income,
// templates, and the 90 day launch plan as the closing module.
const launchPlan = COTTAGE_MODULES_C.filter((m) => m.id === 'launch-plan');
const restOfC = COTTAGE_MODULES_C.filter((m) => m.id !== 'launch-plan');

export const COTTAGE_MODULES: Module[] = [
  ...COTTAGE_MODULES_A,
  ...COTTAGE_MODULES_B,
  ...restOfC,
  ...COTTAGE_MODULES_D,
  ...launchPlan,
];

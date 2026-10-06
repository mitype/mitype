import type { Module } from './types';
import { COTTAGE_MODULES_A } from './cottageModulesA';
import { COTTAGE_MODULES_B } from './cottageModulesB';
import { COTTAGE_MODULES_C } from './cottageModulesC';

export const COTTAGE_MODULES: Module[] = [
  ...COTTAGE_MODULES_A,
  ...COTTAGE_MODULES_B,
  ...COTTAGE_MODULES_C,
];

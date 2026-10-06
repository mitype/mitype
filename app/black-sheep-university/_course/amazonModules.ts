import type { Module } from './types';
import { AMAZON_MODULES_A } from './amazonModulesA';
import { AMAZON_MODULES_B } from './amazonModulesB';
import { AMAZON_MODULES_C } from './amazonModulesC';

export const AMAZON_MODULES: Module[] = [
  ...AMAZON_MODULES_A,
  ...AMAZON_MODULES_B,
  ...AMAZON_MODULES_C,
];

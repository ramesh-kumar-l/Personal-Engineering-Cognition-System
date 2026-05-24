#!/usr/bin/env node
import { Command } from 'commander';
import { registerSearch } from './commands/search';
import { registerRecord } from './commands/record';
import { registerStatus } from './commands/status';
import { registerSync } from './commands/sync';
import { registerWorkflow } from './commands/workflow';

const program = new Command();

program
  .name('pecs')
  .description('PECS CLI — Personal Engineering Cognition System')
  .version('0.7.0');

registerSearch(program);
registerRecord(program);
registerStatus(program);
registerSync(program);
registerWorkflow(program);

program.parse();

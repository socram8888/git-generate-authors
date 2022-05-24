
const readline = require('node:readline');
const { program } = require('commander');
const { spawn } = require('node:child_process');

program
	.name('git-update-authors')
	.description("Generate AUTHORS file based on Git's history")
	.option('-o, --output <file>', 'write result to this file', 'AUTHORS');
program.parse();
const options = program.opts();

#!/usr/bin/env node

import fs from 'fs';
import { program, Option } from 'commander';
import { gitGetAuthors, GitGetAuthorsOptions, GitAuthor } from './index';
import { Writable } from 'stream';

interface ProgramOptions extends GitGetAuthorsOptions {
	output: string;
}

(async () => {
	program
		.name('git-generate-authors')
		.description("Generate AUTHORS file based on Git's history")
		.option('-o, --output <file>', 'write result to this file', 'AUTHORS')
		.option('-r, --repo <dir>', 'repository path')
		.addOption(
			new Option('-s, --sort <sorting>', 'sorting parameter')
				.choices(['first-commit', 'last-commit', 'commits', 'name', 'email'])
				.default('first-commit')
		)
		.option('--keep-bots', 'keep bots in history')
		.option('--skip-mailmap', 'do not use mailmap');
	program.parse();
	const options: ProgramOptions = program.opts();

	const allAuthors = await gitGetAuthors(options);
	console.log(`Found ${allAuthors.length} author(s)`);

	let output: Writable;
	if (options.output == '-') {
		output = process.stdout;
	} else {
		output = fs.createWriteStream(options.output);
	}

	const readableOrder = {
		'first-commit': 'by first commit',
		'last-commit': 'by last commit',
		commits: 'by number of commits',
		name: 'alphabetically by name',
		email: 'alphabetically by email',
	}[options.sort!];

	output.write(`# Authors ordered ${readableOrder}.\n\n`);
	for (const author of allAuthors) {
		output.write(`${author.name} <${author.email}>\n`);
	}
	output.end('\n# Generated by git-generate-authors.\n');
})();

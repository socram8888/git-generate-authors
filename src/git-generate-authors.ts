import fs from 'fs';
import { program, Option } from 'commander';
import { gitGetAuthors, GitGetAuthorOptions, GitAuthor } from './index';
import { Writable } from 'stream';

interface ProgramOptions extends GitGetAuthorOptions {
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
				.choices(['time', 'commits', 'name', 'email'])
				.default('time')
		)
		.option('--keep-bots', 'keep bots in history');
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
		time: 'by first commit',
		commits: 'by number of commits',
		name: 'alphabetically by name',
		email: 'alphabetically by email',
	}[options.sort!];

	output.write(`# Authors ordered ${readableOrder}.\n\n`);
	for (const author of allAuthors) {
		output.write(`${author.name} <${author.email}>\n`);
	}
	output.end('\n# Generated by git-generate-authors\n');
})();

import readline from 'node:readline';
import { program } from 'commander';
import { spawn } from 'node:child_process';

program
	.name('git-update-authors')
	.description("Generate AUTHORS file based on Git's history")
	.option('-o, --output <file>', 'write result to this file', 'AUTHORS');
program.parse();
const options = program.opts();

const log = spawn(
	'git',
	// Inspect author name/email and body.
	['log', '--reverse', '--format=Author: %aN <%aE>\n%b'],
	{
		stdio: ['ignore', 'pipe', 'inherit'],
	}
);
const rl = readline.createInterface({ input: log.stdout });

const allAuthors = [];
const authorRe = /(^Author:|^Co-authored-by:)\s+(?<name>.+)\s+<(?<email>.+)>/i;
for await (const line of rl) {
	const match = line.match(authorRe);
	if (!match) continue;

	let author;
	let { name, email } = match.groups;
	email = email.toLowerCase();

	const byName = allAuthors.findIndex((x) => x.knownNames.has(name.toLowerCase()));
	const byEmail = allAuthors.findIndex((x) => x.knownEmails.has(email));

	if (byName >= 0 && byEmail >= 0 && byName != byEmail) {
		/*
		 * We've found two different registers, so we'll need to merge them.
		 * We'll keep the oldest one, and remove the newer.
		 */
		const oldest = Math.min(byName, byEmail);
		const newest = Math.max(byName, byEmail);

		author = allAuthors[oldest];
		let [duplicate] = allAuthors.splice(newest, 1);

		duplicate.knownNames.forEach(author.knownNames.add, author.knownNames);
		duplicate.knownEmails.forEach(author.knownEmails.add, author.knownEmails);
		author.commits += duplicate.commits;
	} else if (byName >= 0) {
		author = allAuthors[byName];
	} else if (byEmail >= 0) {
		author = allAuthors[byEmail];
	} else {
		author = {
			knownNames: new Set(),
			knownEmails: new Set(),
			commits: 0,
		};
		allAuthors.push(author);
	}

	author.name = name;
	author.knownNames.add(name);
	author.email = email;
	author.knownEmails.add(email);
	author.commits++;
}

console.log(allAuthors);

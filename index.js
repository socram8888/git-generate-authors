import readline from 'node:readline';
import { spawn } from 'node:child_process';

export async function gitGetAuthors(options) {
	const log = spawn(
		'git',
		// Inspect author name/email and body.
		['log', '--reverse', '--format=Author: %aN <%aE>\n%b'],
		{
			cwd: options.repo,
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
		const lowerName = name.toLowerCase();
		const lowerEmail = email.toLowerCase();

		const byName = allAuthors.findIndex((x) => x.knownNames.has(lowerName));
		const byEmail = allAuthors.findIndex((x) => x.knownEmails.has(lowerEmail));

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

			if (byEmail < 0) {
				author.knownEmails.add(lowerEmail);
			}
		} else if (byEmail >= 0) {
			author = allAuthors[byEmail];
			author.knownNames.add(lowerName);
		} else {
			author = {
				knownNames: new Set([lowerName]),
				knownEmails: new Set([lowerEmail]),
				commits: 0,
			};
			allAuthors.push(author);
		}

		author.name = name;
		author.email = email;
		author.commits++;
	}

	switch (options.sort) {
		case 'commits':
			allAuthors.sort((a, b) => a.commits - b.commits);
			break;

		case 'name':
			allAuthors.sort((a, b) => a.name.localeCompare(b.name));
			break;

		case 'email':
			allAuthors.sort((a, b) => a.email.localeCompare(b.email));
			break;
	}

	return allAuthors;
}

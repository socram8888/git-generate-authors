import readline from 'readline';
import { spawn } from 'child_process';

/**
 * Options for generating the author list.
 */
export interface GitGetAuthorOptions {
	/**
	 * Optional path to repository.
	 */
	repo?: string;

	/**
	 * Optional sorting.
	 */
	sort?: 'time' | 'commits' | 'name' | 'email';

	/**
	 * Set to disable bot filtering logic.
	 */
	keepBots?: boolean;
}

/**
 * A Git author.
 */
export interface GitAuthor {
	/**
	 * Last known name.
	 */
	name: string;

	/**
	 * Last known email.
	 */
	email: string;

	/**
	 * Number of commits.
	 */
	commits: number;

	/**
	 * List of all known names, in lowercase.
	 */
	knownNames: Set<string>;

	/**
	 * List of all known emails, in lowercase.
	 */
	knownEmails: Set<string>;
}

/**
 * Calculates a list of all Git authors for the given repo's current branch.
 *
 * @param options options for the algorithm
 * @returns an array of authors
 */
export async function gitGetAuthors(options?: GitGetAuthorOptions): Promise<GitAuthor[]> {
	const log = spawn(
		'git',
		// Inspect author name/email and body.
		['log', '--reverse', '--format=Author: %aN <%aE>\n%b'],
		{
			cwd: options?.repo,
			stdio: ['ignore', 'pipe', 'inherit'],
		}
	);
	const rl = readline.createInterface({ input: log.stdout });

	let allAuthors: GitAuthor[] = [];
	const authorRe = /(^Author:|^Co-authored-by:)\s+(?<name>.+)\s+<(?<email>.+)>/i;
	for await (const line of rl) {
		const match = line.match(authorRe);
		if (!match) continue;

		let { name, email } = match.groups!;
		const lowerName = name.toLowerCase();
		const lowerEmail = email.toLowerCase();

		const nameIndex = allAuthors.findIndex((x) => x.knownNames.has(lowerName));
		const emailIndex = allAuthors.findIndex((x) => x.knownEmails.has(lowerEmail));

		const foundByName = nameIndex >= 0;
		const foundByEmail = emailIndex >= 0;

		if (!foundByName && !foundByEmail) {
			allAuthors.push({
				name,
				email,
				knownNames: new Set([lowerName]),
				knownEmails: new Set([lowerEmail]),
				commits: 1,
			});
		} else {
			let author: GitAuthor;

			if (foundByName && foundByEmail && nameIndex != emailIndex) {
				/*
				 * We've found two different entries, so we'll need to merge them.
				 * We'll keep the oldest one, and remove the newer.
				 */
				const oldest = Math.min(nameIndex, emailIndex);
				const newest = Math.max(nameIndex, emailIndex);

				author = allAuthors[oldest];
				let [duplicate] = allAuthors.splice(newest, 1);

				duplicate.knownNames.forEach(author.knownNames.add, author.knownNames);
				duplicate.knownEmails.forEach(author.knownEmails.add, author.knownEmails);
				author.commits += duplicate.commits;
			} else if (foundByName) {
				author = allAuthors[nameIndex];

				if (!foundByEmail) {
					author.knownEmails.add(lowerEmail);
				}
			} else {
				author = allAuthors[emailIndex];
				author.knownNames.add(lowerName);
			}

			author.name = name;
			author.email = email;
			author.commits++;
		}
	}

	if (!options?.keepBots) {
		allAuthors = allAuthors.filter((author) => !author.name.match(/-bot|\[bot\]$/));
	}

	switch (options?.sort) {
		case 'commits':
			allAuthors.sort((a, b) => b.commits - a.commits);
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

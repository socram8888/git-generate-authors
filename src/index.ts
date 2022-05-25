import readline from 'readline';
import { spawn } from 'child_process';

// ASCII "field separator" character
const FIELD_SEPARATOR = '\x1F';

/**
 * Options for generating the author list.
 */
export interface GitGetAuthorsByEmailOptions {
	/**
	 * Optional path to repository.
	 */
	repo?: string;

	/**
	 * Set to disable bot filtering logic.
	 */
	keepBots?: boolean;

	/**
	 * Set to skip passing mailmap flag to Git.
	 */
	skipMailmap?: boolean;
}

/**
 * Options for generating the author list.
 */
export interface GitGetAuthorsOptions extends GitGetAuthorsByEmailOptions {
	/**
	 * Optional sorting.
	 */
	sort?: 'first-commit' | 'last-commit' | 'commits' | 'name' | 'email';
}

/**
 * A Git author.
 */
export interface GitAuthor {
	/**
	 * Author's name.
	 */
	name: string;

	/**
	 * Author's email.
	 */
	email: string;

	/**
	 * Number of commits.
	 */
	commits: number;

	/**
	 * First commit date.
	 */
	firstCommit: Date;

	/**
	 * Last commit date.
	 */
	lastCommit: Date;
}

/**
 * Calculates a list of all Git authors for the given repo's current branch.
 *
 * @param options options for the data extraction
 * @returns author information by email
 */
export async function gitGetAuthorsByEmail(
	options?: GitGetAuthorsByEmailOptions
): Promise<Record<string, GitAuthor>> {
	const log = spawn(
		'git',
		// Inspect author name/email and body.
		[
			'log',
			'--reverse',
			options?.skipMailmap ? '--no-mailmap' : '--mailmap',
			`--format=%aN${FIELD_SEPARATOR}%aE${FIELD_SEPARATOR}%aD`,
		],
		{
			cwd: options?.repo,
			stdio: ['ignore', 'pipe', 'inherit'],
		}
	);
	const rl = readline.createInterface({ input: log.stdout });

	const authorsMap: Record<string, GitAuthor> = {};
	for await (const line of rl) {
		const parts = line.split(FIELD_SEPARATOR);
		if (parts.length != 3) {
			continue;
		}

		const name = parts[0];
		const email = parts[1].toLowerCase();
		const date = new Date(parts[2]);

		if (!options?.keepBots && name.match(/-bot|\[bot\]$/i)) {
			continue;
		}

		const author = authorsMap[email];
		if (author) {
			author.commits++;
			author.lastCommit = date;
		} else {
			authorsMap[email] = {
				name,
				email,
				commits: 1,
				firstCommit: date,
				lastCommit: date,
			};
		}
	}

	return authorsMap;
}

/**
 * Calculates a list of all Git authors for the given repo's current branch.
 *
 * @param options options for the data extraction
 * @returns a sorted array of authors
 */
export async function gitGetAuthors(options?: GitGetAuthorsOptions): Promise<GitAuthor[]> {
	const authorsMap = await gitGetAuthorsByEmail(options);
	const allAuthors = Object.values(authorsMap);

	switch (options?.sort) {
		case 'first-commit':
			allAuthors.sort((a, b) => a.firstCommit.getTime() - b.firstCommit.getTime());
			break;

		case 'last-commit':
			allAuthors.sort((a, b) => a.lastCommit.getTime() - b.lastCommit.getTime());
			break;

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

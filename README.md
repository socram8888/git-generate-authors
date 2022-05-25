# git-generate-authors

Generate AUTHORS file based on Git's history

## Usage

You can run this on any machine with node and Git installed, using:

`npx git-generate-authors [options]`

### Options

| Short | Long             | Description                                                                           | Default                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| `-o`  | `--output`       | Output file                                                                           | `AUTHORS`                 |
| `-r`  | `--repo`         | Repository path                                                                       | Current working directory |
| `-s`  | `--sort`         | Sorting parameter. Can be `first-commit`, `last-commit`, `commits`, `name` or `email` | `first-commit`            |
|       | `--keep-bots`    | If passed, the bots will not be removed from the history                              |                           |
|       | `--skip-mailmap` | If passed, Git will not use the .mailmap file for aliasing users                      |                           |

## Known issues

The error handling is not poor - it's entirely missing. Thus, if Git is missing or finds a problem
half-way, you will just get an empty or half-filled list of authors.

The bot filtering is pretty simple and naïve, so it's possible not all bots get removed.

import * as fs from 'fs/promises';
import * as path from 'path';
import {
	type ExistingFolderNote,
	type FolderNotesCoreSettings,
	buildFolderNoteResolution,
	candidateFolderNotePaths,
	detachFolderInSettings,
	mergeCoreSettings,
	normalizeVaultPath,
	reattachFolderInSettings,
} from '../core/folderNotesCore';

interface CliOptions {
	command: string;
	vault?: string;
	folder?: string;
	file?: string;
	to?: string;
	name?: string;
	dryRun: boolean;
	force: boolean;
	permanent: boolean;
	extension?: string;
}

interface CommandContext {
	vault: string;
	settingsPath: string;
	settings: FolderNotesCoreSettings;
	rawSettings: Record<string, unknown>;
	options: CliOptions;
}

const PLUGIN_SETTINGS_PATH = '.obsidian/plugins/folder-notes/data.json';

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	printJson({ ok: false, error: { code: 'unexpected_error', message } });
	process.exitCode = 1;
});

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	if (options.command === 'help' || options.command === '--help' || options.command === '-h') {
		printHelp();
		return;
	}

	const context = await createContext(options);

	switch (options.command) {
		case 'get':
			return getCommand(context);
		case 'ensure':
			return ensureCommand(context);
		case 'list':
			return listCommand(context);
		case 'attach':
			return attachCommand(context);
		case 'delete':
			return deleteCommand(context);
		case 'detach':
			return detachCommand(context);
		case 'reattach':
			return reattachCommand(context);
		case 'move-folder':
			return moveFolderCommand(context);
		case 'rename-folder':
			return renameFolderCommand(context);
		default:
			throw new Error(`Unknown command: ${options.command}`);
	}
}

function parseArgs(args: string[]): CliOptions {
	const [command = 'help', ...rest] = args;
	const options: CliOptions = {
		command,
		dryRun: false,
		force: false,
		permanent: false,
	};

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		switch (arg) {
			case '--vault':
				options.vault = requireValue(rest, ++i, arg);
				break;
			case '--folder':
				options.folder = requireValue(rest, ++i, arg);
				break;
			case '--file':
				options.file = requireValue(rest, ++i, arg);
				break;
			case '--to':
				options.to = requireValue(rest, ++i, arg);
				break;
			case '--name':
				options.name = requireValue(rest, ++i, arg);
				break;
			case '--extension':
				options.extension = requireValue(rest, ++i, arg);
				break;
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--force':
				options.force = true;
				break;
			case '--permanent':
				options.permanent = true;
				break;
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}

	return options;
}

function requireValue(args: string[], index: number, option: string): string {
	const value = args[index];
	if (!value || value.startsWith('--')) {
		throw new Error(`${option} requires a value`);
	}
	return value;
}

async function createContext(options: CliOptions): Promise<CommandContext> {
	if (!options.vault) {
		throw new Error('--vault is required');
	}
	const vault = path.resolve(options.vault);
	const stat = await fs.stat(vault).catch(() => null);
	if (!stat?.isDirectory()) {
		throw new Error(`Vault does not exist or is not a directory: ${vault}`);
	}

	const settingsPath = path.join(vault, PLUGIN_SETTINGS_PATH);
	const rawSettings = await readJson(settingsPath);
	const settings = mergeCoreSettings(rawSettings as Partial<FolderNotesCoreSettings>);
	return {
		vault,
		settingsPath,
		settings,
		rawSettings,
		options,
	};
}

async function getCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const existing = await findExistingFolderNote(context, folder);
	printJson({
		ok: true,
		command: 'get',
		vault: context.vault,
		folder,
		exists: Boolean(existing),
		notePath: existing?.notePath ?? buildFolderNoteResolution(folder, context.settings).notePath,
	});
}

async function ensureCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	await assertFolderExists(context, folder);
	const existing = await findExistingFolderNote(context, folder);
	if (existing) {
		printJson({
			ok: true,
			command: 'ensure',
			vault: context.vault,
			folder,
			notePath: existing.notePath,
			actions: [],
		});
		return;
	}

	const resolution = buildFolderNoteResolution(folder, context.settings, context.options.extension);
	const absoluteNotePath = vaultAbsolutePath(context, resolution.notePath);
	const actions = [{ type: 'create', path: resolution.notePath }];
	if (!context.options.dryRun) {
		await fs.mkdir(path.dirname(absoluteNotePath), { recursive: true });
		await fs.writeFile(absoluteNotePath, await initialContent(context, resolution.notePath));
	}

	printJson({
		ok: true,
		command: 'ensure',
		vault: context.vault,
		folder,
		notePath: resolution.notePath,
		actions,
		dryRun: context.options.dryRun,
	});
}

async function listCommand(context: CommandContext): Promise<void> {
	const folders = await listFolders(context.vault);
	const items = [];
	for (const folder of folders) {
		const existing = await findExistingFolderNote(context, folder);
		if (existing) {
			items.push({
				folder,
				notePath: existing.notePath,
				storageLocation: existing.storageLocation,
			});
		}
	}
	printJson({
		ok: true,
		command: 'list',
		vault: context.vault,
		count: items.length,
		items,
	});
}

async function attachCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const file = requireOption(context.options.file, '--file');
	await assertFolderExists(context, folder);
	const filePath = normalizeVaultPath(file);
	const absoluteFilePath = vaultAbsolutePath(context, filePath);
	const fileStat = await fs.stat(absoluteFilePath).catch(() => null);
	if (!fileStat?.isFile()) {
		throw new Error(`File does not exist in vault: ${filePath}`);
	}

	const extension = path.extname(filePath) || context.settings.folderNoteType;
	const resolution = buildFolderNoteResolution(folder, context.settings, extension);
	const existing = await findExistingFolderNote(context, folder);
	const actions = [];
	if (existing && existing.notePath !== filePath && !context.options.force) {
		throw new Error(`Folder already has a note: ${existing.notePath}. Use --force to replace it.`);
	}

	if (existing && existing.notePath !== filePath) {
		actions.push({ type: 'delete-existing', path: existing.notePath });
		if (!context.options.dryRun) {
			await removePath(context, existing.notePath, context.options.permanent);
		}
	}

	actions.push({ type: 'move', from: filePath, to: resolution.notePath });
	if (!context.options.dryRun && filePath !== resolution.notePath) {
		await fs.mkdir(path.dirname(vaultAbsolutePath(context, resolution.notePath)), { recursive: true });
		await fs.rename(absoluteFilePath, vaultAbsolutePath(context, resolution.notePath));
	}

	printJson({
		ok: true,
		command: 'attach',
		vault: context.vault,
		folder,
		notePath: resolution.notePath,
		actions,
		dryRun: context.options.dryRun,
	});
}

async function deleteCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const existing = await findExistingFolderNote(context, folder);
	if (!existing) {
		throw new Error(`Folder has no folder note: ${folder}`);
	}
	const action = context.options.permanent ? 'delete' : 'trash';
	if (!context.options.dryRun) {
		await removePath(context, existing.notePath, context.options.permanent);
	}
	printJson({
		ok: true,
		command: 'delete',
		vault: context.vault,
		folder,
		notePath: existing.notePath,
		actions: [{ type: action, path: existing.notePath }],
		dryRun: context.options.dryRun,
	});
}

async function detachCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const existing = await findExistingFolderNote(context, folder);
	if (!existing) {
		throw new Error(`Folder has no folder note to detach: ${folder}`);
	}

	const settings = detachFolderInSettings(context.settings, folder, existing.notePath);
	if (!context.options.dryRun) {
		await writeSettings(context, settings);
	}
	printJson({
		ok: true,
		command: 'detach',
		vault: context.vault,
		folder,
		notePath: existing.notePath,
		actions: [{ type: 'update-settings', path: PLUGIN_SETTINGS_PATH }],
		dryRun: context.options.dryRun,
	});
}

async function reattachCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const settings = reattachFolderInSettings(context.settings, folder);
	if (!context.options.dryRun) {
		await writeSettings(context, settings);
	}
	printJson({
		ok: true,
		command: 'reattach',
		vault: context.vault,
		folder,
		actions: [{ type: 'update-settings', path: PLUGIN_SETTINGS_PATH }],
		dryRun: context.options.dryRun,
	});
}

async function moveFolderCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const to = normalizeVaultPath(requireOption(context.options.to, '--to'));
	await assertFolderExists(context, folder);
	if (await pathExists(vaultAbsolutePath(context, to))) {
		throw new Error(`Target folder already exists: ${to}`);
	}
	const existing = await findExistingFolderNote(context, folder);
	const actions = [{ type: 'move-folder', from: folder, to }];
	let movedNotePath: string | null = null;
	if (existing && context.settings.storageLocation !== 'insideFolder') {
		const movedResolution = buildFolderNoteResolution(to, context.settings, existing.matchedExtension);
		movedNotePath = movedResolution.notePath;
		if (
			movedNotePath !== existing.notePath &&
			await pathExists(vaultAbsolutePath(context, movedNotePath)) &&
			!context.options.force
		) {
			throw new Error(`Target folder note already exists: ${movedNotePath}. Use --force to replace it.`);
		}
		actions.push({ type: 'move-note', from: existing.notePath, to: movedResolution.notePath });
	}
	if (!context.options.dryRun) {
		await fs.mkdir(path.dirname(vaultAbsolutePath(context, to)), { recursive: true });
		await fs.rename(vaultAbsolutePath(context, folder), vaultAbsolutePath(context, to));
		if (existing && movedNotePath && movedNotePath !== existing.notePath) {
			await fs.mkdir(path.dirname(vaultAbsolutePath(context, movedNotePath)), { recursive: true });
			if (context.options.force && await pathExists(vaultAbsolutePath(context, movedNotePath))) {
				await removePath(context, movedNotePath, context.options.permanent);
			}
			await fs.rename(vaultAbsolutePath(context, existing.notePath), vaultAbsolutePath(context, movedNotePath));
		}
	}
	printJson({
		ok: true,
		command: 'move-folder',
		vault: context.vault,
		folder: to,
		actions,
		dryRun: context.options.dryRun,
	});
}

async function renameFolderCommand(context: CommandContext): Promise<void> {
	const folder = requireFolder(context);
	const name = requireOption(context.options.name, '--name');
	if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
		throw new Error('--name must be a folder name, not a path');
	}
	const parent = path.posix.dirname(folder);
	const target = parent === '.' ? name : `${parent}/${name}`;
	if (await pathExists(vaultAbsolutePath(context, target))) {
		throw new Error(`Target folder already exists: ${target}`);
	}
	const before = await findExistingFolderNote(context, folder);
	const actions = [{ type: 'rename-folder', from: folder, to: target }];
	let renamedNotePath: string | null = null;
	if (before) {
		const after = buildFolderNoteResolution(target, context.settings, before.matchedExtension);
		renamedNotePath = after.notePath;
		if (
			context.settings.storageLocation !== 'insideFolder' &&
			renamedNotePath !== before.notePath &&
			await pathExists(vaultAbsolutePath(context, renamedNotePath)) &&
			!context.options.force
		) {
			throw new Error(`Target folder note already exists: ${renamedNotePath}. Use --force to replace it.`);
		}
		actions.push({ type: 'rename-note', from: before.notePath, to: after.notePath });
	}
	if (!context.options.dryRun) {
		await fs.rename(vaultAbsolutePath(context, folder), vaultAbsolutePath(context, target));
		if (
			before &&
			renamedNotePath &&
			context.settings.storageLocation !== 'insideFolder' &&
			renamedNotePath !== before.notePath
		) {
			if (context.options.force && await pathExists(vaultAbsolutePath(context, renamedNotePath))) {
				await removePath(context, renamedNotePath, context.options.permanent);
			}
			await fs.rename(vaultAbsolutePath(context, before.notePath), vaultAbsolutePath(context, renamedNotePath));
		}
	}
	printJson({
		ok: true,
		command: 'rename-folder',
		vault: context.vault,
		folder: target,
		actions,
		dryRun: context.options.dryRun,
	});
}

async function findExistingFolderNote(
	context: CommandContext,
	folderPath: string,
): Promise<ExistingFolderNote | null> {
	for (const candidate of candidateFolderNotePaths(folderPath, context.settings)) {
		const absolutePath = vaultAbsolutePath(context, candidate.notePath);
		const stat = await fs.stat(absolutePath).catch(() => null);
		if (stat?.isFile()) {
			return {
				...candidate,
				exists: true,
				matchedExtension: candidate.extension,
			};
		}
	}
	return null;
}

async function initialContent(context: CommandContext, notePath: string): Promise<string> {
	const extension = path.extname(notePath);
	if (context.settings.templatePath) {
		const templatePath = normalizeVaultPath(context.settings.templatePath);
		if (path.extname(templatePath) === extension) {
			return fs.readFile(vaultAbsolutePath(context, templatePath), 'utf8').catch(() => '');
		}
	}
	if (extension === '.canvas') return '{}';
	return '';
}

async function removePath(
	context: CommandContext,
	vaultPath: string,
	permanent: boolean,
): Promise<void> {
	const absolutePath = vaultAbsolutePath(context, vaultPath);
	if (permanent) {
		await fs.unlink(absolutePath);
		return;
	}

	const trashPath = normalizeVaultPath(`.trash/folder-notes/${Date.now()}-${path.basename(vaultPath)}`);
	const absoluteTrashPath = vaultAbsolutePath(context, trashPath);
	await fs.mkdir(path.dirname(absoluteTrashPath), { recursive: true });
	await fs.rename(absolutePath, absoluteTrashPath);
}

async function listFolders(vault: string): Promise<string[]> {
	const result: string[] = [];
	async function visit(relativePath: string): Promise<void> {
		const absolutePath = path.join(vault, relativePath);
		const entries = await fs.readdir(absolutePath, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			if (entry.name === '.obsidian' || entry.name === '.trash' || entry.name === '.git') continue;
			const child = normalizeVaultPath(relativePath ? `${relativePath}/${entry.name}` : entry.name);
			result.push(child);
			await visit(child);
		}
	}
	await visit('');
	return result;
}

async function assertFolderExists(context: CommandContext, folder: string): Promise<void> {
	const stat = await fs.stat(vaultAbsolutePath(context, folder)).catch(() => null);
	if (!stat?.isDirectory()) {
		throw new Error(`Folder does not exist in vault: ${folder}`);
	}
}

function requireFolder(context: CommandContext): string {
	return normalizeVaultPath(requireOption(context.options.folder, '--folder'));
}

function requireOption(value: string | undefined, name: string): string {
	if (!value) throw new Error(`${name} is required`);
	return value;
}

function vaultAbsolutePath(context: CommandContext, vaultPath: string): string {
	const absolutePath = path.resolve(context.vault, normalizeVaultPath(vaultPath));
	if (absolutePath !== context.vault && !absolutePath.startsWith(`${context.vault}${path.sep}`)) {
		throw new Error(`Path escapes vault: ${vaultPath}`);
	}
	return absolutePath;
}

async function pathExists(absolutePath: string): Promise<boolean> {
	return Boolean(await fs.stat(absolutePath).catch(() => null));
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
	const content = await fs.readFile(filePath, 'utf8').catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT') return '{}';
		throw error;
	});
	return JSON.parse(content) as Record<string, unknown>;
}

async function writeSettings(
	context: CommandContext,
	settings: FolderNotesCoreSettings,
): Promise<void> {
	const content = {
		...context.rawSettings,
		...settings,
	};
	await fs.mkdir(path.dirname(context.settingsPath), { recursive: true });
	await fs.writeFile(context.settingsPath, `${JSON.stringify(content, null, 2)}\n`);
}

function printJson(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(): void {
	process.stdout.write(`folder-notes CLI

Usage:
  folder-notes <command> --vault <path> [options]

Commands:
  get --folder <folder>
  ensure --folder <folder> [--extension <ext>] [--dry-run]
  list
  attach --folder <folder> --file <file> [--force] [--dry-run]
  delete --folder <folder> [--permanent] [--dry-run]
  detach --folder <folder> [--dry-run]
  reattach --folder <folder> [--dry-run]
  move-folder --folder <folder> --to <folder> [--force] [--dry-run]
  rename-folder --folder <folder> --name <name> [--dry-run]
`);
}

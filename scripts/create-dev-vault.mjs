import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { developmentGuide, generateFixtures } from './dev-vault-fixtures.mjs';
import { json, registryName, rejectSymlink, reloadPluginId, syncPluginBuild } from './dev-vault-sync.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultName = 'Folder Notes Dev';
const pluginSettings = {
	enableCollapsing: false, stopWhitespaceCollapsing: false,
	openByClick: true, openWithCtrl: false, openWithAlt: false, hideFolderNote: true,
	folderNoteName: '{{folder_name}}', folderNoteType: '.md', storageLocation: 'insideFolder',
	excludeFolders: [], whitelistFolders: [],
	frontMatterTitle: { enabled: false, explorer: true, path: true },
};

function validateName(name) {
	if (typeof name !== 'string' || !name.trim() || /[<>:"/\\|?*\u0000-\u001f]/.test(name)
		|| /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
		throw new Error('Use a vault name without path separators or characters reserved by Windows.');
	}
}

function seedFile(filePath, content) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	try {
		writeFileSync(filePath, content, { flag: 'wx' });
	} catch (error) {
		if (error.code !== 'EEXIST') throw error;
	}
}

function validatePlan(plan) {
	if (plan.version !== 1 || !Array.isArray(plan.directories) || !plan.files || typeof plan.files !== 'object'
		|| Array.isArray(plan.files) || !plan.samples) throw new Error('Invalid development vault fixture registry.');
	for (const relative of [...plan.directories, ...Object.keys(plan.files), ...Object.values(plan.samples)]) {
		if (typeof relative !== 'string') throw new Error('Invalid fixture path.');
		for (const segment of relative.split('/')) validateName(segment);
	}
	if (!Object.values(plan.files).every((content) => typeof content === 'string')) throw new Error('Invalid fixture contents.');
	if (!['mainFolder', 'nestedFolder', 'controlFolder'].every((key) => plan.directories.includes(plan.samples[key]))
		|| !(plan.samples.ordinaryNote in plan.files)) throw new Error('Invalid fixture samples.');
}

function fixtureParents(vaultPath, plan) {
	const parents = new Set();
	for (const relative of [...plan.directories, ...Object.keys(plan.files)]) {
		let current = path.join(vaultPath, relative);
		while (current !== vaultPath) {
			parents.add(current);
			current = path.dirname(current);
		}
	}
	return parents;
}

function archiveLegacyFixtures(vaultPath, configPath) {
	const guidePath = path.join(vaultPath, 'Start here.md');
	if (!existsSync(guidePath) || !readFileSync(guidePath, 'utf8').includes('[[TEST-folder/Child|Child]]')) return;
	const backup = path.join(configPath, 'dev-vault-backups', `original-fixtures-${Date.now()}`);
	rejectSymlink(path.dirname(backup));
	mkdirSync(backup, { recursive: true });
	for (const name of ['TEST-folder', 'No folder note', 'Start here.md']) {
		const source = path.join(vaultPath, name);
		if (existsSync(source)) renameSync(source, path.join(backup, name));
	}
}

export function createDevVault({ repoRoot = repositoryRoot, name = defaultName } = {}) {
	validateName(name);
	const vaultPath = path.join(repoRoot, 'dev-vaults', name);
	const configPath = path.join(vaultPath, '.obsidian');
	const pluginPath = path.join(configPath, 'plugins', 'folder-notes');
	const communityPath = path.join(configPath, 'community-plugins.json');
	const registryPath = path.join(vaultPath, registryName);
	const isNewLayout = !existsSync(registryPath);
	const plan = isNewLayout ? generateFixtures() : JSON.parse(readFileSync(registryPath, 'utf8'));
	validatePlan(plan);
	for (const destination of [
		path.dirname(vaultPath), vaultPath, configPath, path.dirname(pluginPath), communityPath, registryPath,
		path.join(vaultPath, 'Start here.md'), ...fixtureParents(vaultPath, plan),
	]) rejectSymlink(destination);
	const enabledPlugins = existsSync(communityPath) ? JSON.parse(readFileSync(communityPath, 'utf8')) : [];
	if (!Array.isArray(enabledPlugins) || !enabledPlugins.every((id) => typeof id === 'string')) {
		throw new Error('Expected community-plugins.json to contain a list of plugin IDs.');
	}
	// Validate and install the build before altering any notes.
	syncPluginBuild({ repoRoot, vaultPath });
	if (isNewLayout) archiveLegacyFixtures(vaultPath, configPath);
	seedFile(registryPath, json(plan));
	writeFileSync(communityPath, json([...new Set([...enabledPlugins, 'folder-notes', reloadPluginId])]));
	seedFile(path.join(configPath, 'app.json'), json({}));
	seedFile(path.join(configPath, 'core-plugins.json'), json({
		'file-explorer': true, 'global-search': true, 'switcher': true,
		'command-palette': true, 'page-preview': true, 'outline': true,
	}));
	seedFile(path.join(pluginPath, 'data.json'), json(pluginSettings));
	for (const directory of plan.directories) mkdirSync(path.join(vaultPath, directory), { recursive: true });
	for (const [file, content] of Object.entries(plan.files)) seedFile(path.join(vaultPath, file), content);
	seedFile(path.join(vaultPath, 'Start here.md'), developmentGuide(plan.samples));
	return { vaultPath, pluginPath };
}

function main(args) {
	let name = defaultName;
	let once = false;
	if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
		console.log('Usage: npm run dev:vault -- [--name "Vault name"] [--once]');
		return;
	}
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--once') once = true;
		else if (args[i] === '--name' && args[i + 1]) name = args[++i];
		else throw new Error('Usage: npm run dev:vault -- [--name "Vault name"] [--once]');
	}
	validateName(name);
	if (!existsSync(path.join(repositoryRoot, 'src/obsidian-folder-overview/src/FolderOverview.ts'))) {
		console.log('Initializing the Folder Overview submodule…');
		execFileSync('git', ['submodule', 'update', '--init', '--recursive'], { cwd: repositoryRoot, stdio: 'inherit' });
	}
	const npmCli = process.env.npm_execpath;
	if (!npmCli) throw new Error('Run this command with npm run dev:vault.');
	execFileSync(process.execPath, [npmCli, 'run', 'fn-build'], { cwd: repositoryRoot, stdio: 'inherit' });
	const { vaultPath } = createDevVault({ name });
	console.log(`\nDevelopment vault ready: ${vaultPath}`);
	console.log('Open this folder as a vault in Obsidian, then open "Start here".');
	console.log('Reopen an existing vault once to activate Folder Notes dev reload.');
	if (once) return;
	console.log('Watching source, styles, and manifest changes. Keep this terminal open; Ctrl+C stops watching.');
	const watcher = spawn(process.execPath, [path.join(repositoryRoot, 'esbuild.config.mjs')], {
		cwd: repositoryRoot, stdio: 'inherit',
	});
	const stop = () => { watcher.kill('SIGTERM'); };
	process.once('SIGINT', stop);
	process.once('SIGTERM', stop);
	watcher.once('exit', (code, signal) => {
		process.removeListener('SIGINT', stop);
		process.removeListener('SIGTERM', stop);
		process.exitCode = signal ? 0 : code ?? 1;
	});
	watcher.once('error', (error) => {
		console.error(`Could not start the development watcher: ${error.message}`);
		process.exitCode = 1;
	});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main(process.argv.slice(2));
	} catch (error) {
		console.error(`Dev vault setup failed: ${error.message}`);
		process.exitCode = 1;
	}
}

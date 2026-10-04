import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const registryName = '.folder-notes-dev-vault.json';
export const reloadPluginId = 'folder-notes-dev-reload';
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export function json(value) {
	return JSON.stringify(value, null, '\t') + '\n';
}

export function rejectSymlink(filePath) {
	try {
		if (lstatSync(filePath).isSymbolicLink()) throw new Error(`Cannot update a symbolic link: ${filePath}`);
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
}

function atomicWrite(filePath, content) {
	if (existsSync(filePath) && readFileSync(filePath).equals(Buffer.from(content))) return;
	const temporary = `${filePath}.${randomUUID()}.tmp`;
	try {
		writeFileSync(temporary, content);
		renameSync(temporary, filePath);
	} finally {
		rmSync(temporary, { force: true });
	}
}

export function syncPluginBuild({ repoRoot = repositoryRoot, vaultPath }) {
	const configPath = path.join(vaultPath, '.obsidian');
	const pluginPath = path.join(configPath, 'plugins', 'folder-notes');
	const reloadPath = path.join(configPath, 'plugins', reloadPluginId);
	const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
	if (manifest.id !== 'folder-notes') throw new Error('Expected the Folder Notes plugin manifest.');
	const assets = {
		'main.js': readFileSync(path.join(repoRoot, 'main.js')),
		'styles.css': readFileSync(path.join(repoRoot, 'styles.css')),
		'manifest.json': json({ ...manifest, name: 'Folder notes (dev)' }),
	};
	const reloadAssets = {
		'main.js': readFileSync(new URL('./dev-reload-plugin.cjs', import.meta.url)),
		'manifest.json': json({
			id: reloadPluginId, name: 'Folder Notes dev reload', version: '1.0.0',
			minAppVersion: manifest.minAppVersion, author: manifest.author,
			description: 'Automatically reloads the local Folder Notes development build.', isDesktopOnly: true,
		}),
	};
	for (const destination of [
		path.dirname(vaultPath), vaultPath, configPath, path.dirname(pluginPath), pluginPath, reloadPath,
		...Object.keys(assets).map((file) => path.join(pluginPath, file)),
		...Object.keys(reloadAssets).map((file) => path.join(reloadPath, file)),
		path.join(pluginPath, 'dev-build.json'),
	]) rejectSymlink(destination);
	mkdirSync(pluginPath, { recursive: true });
	mkdirSync(reloadPath, { recursive: true });
	for (const [file, contents] of Object.entries(assets)) atomicWrite(path.join(pluginPath, file), contents);
	for (const [file, contents] of Object.entries(reloadAssets)) atomicWrite(path.join(reloadPath, file), contents);
	const hash = createHash('sha256');
	for (const contents of Object.values(assets)) hash.update(contents);
	// Publish only after every asset is complete; the reload helper watches this small marker.
	atomicWrite(path.join(pluginPath, 'dev-build.json'), json({ hash: hash.digest('hex') }));
	return { pluginPath };
}

export function syncDevVaults({ repoRoot = repositoryRoot } = {}) {
	const root = path.join(repoRoot, 'dev-vaults');
	if (!existsSync(root)) return 0;
	rejectSymlink(root);
	let synced = 0;
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const vaultPath = path.join(root, entry.name);
		if (!existsSync(path.join(vaultPath, registryName))) continue;
		syncPluginBuild({ repoRoot, vaultPath });
		synced++;
	}
	return synced;
}

export function devVaultBuildPlugin({ repoRoot = repositoryRoot } = {}) {
	return {
		name: 'folder-notes-dev-vaults',
		setup(build) {
			build.onLoad({ filter: /[/\\]src[/\\]main\.ts$/ }, (args) => ({
				contents: readFileSync(args.path, 'utf8'), loader: 'ts', resolveDir: path.dirname(args.path),
				watchFiles: ['styles.css', 'manifest.json'].map((file) => path.join(repoRoot, file)),
			}));
			build.onEnd((result) => {
				if (result.errors.length) return;
				const count = syncDevVaults({ repoRoot });
				if (count) console.log(`Updated ${count} development vault${count === 1 ? '' : 's'}.`);
			});
		},
	};
}

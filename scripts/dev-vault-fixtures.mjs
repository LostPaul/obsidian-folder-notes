import { randomInt } from 'node:crypto';
import path from 'node:path';

const adjectives = ['Amber', 'Quiet', 'Lunar', 'Silver', 'Mossy', 'Hidden', 'Azure', 'Café', 'Copper', 'Violet', 'Autumn', 'Sunny'];
const nouns = ['Harbor', 'Atlas', 'Workshop', 'Garden', 'Archive', 'Observatory', 'Library', 'Orchard', 'Trail', 'Studio', 'Meadow', 'Notebook'];
const topics = ['Field notes', 'Ideas', 'Reading list', 'Sketch', 'Meeting notes', 'Plans', 'Research', 'Journal', 'References', 'Draft'];
const pick = (items) => items[randomInt(items.length)];

export function generateFixtures() {
	const directories = [];
	const files = {};
	const folderNotes = [];
	const controls = [];
	function folder(parent = '') {
		let candidate;
		do {
			const name = `${pick(adjectives)}${pick([' ', '-', '_'])}${pick(nouns)} ${randomInt(10, 100)}`;
			candidate = path.posix.join(parent, name);
		} while (directories.includes(candidate));
		directories.push(candidate);
		return candidate;
	}
	function file(parent, extension, content) {
		let candidate;
		do {
			candidate = path.posix.join(parent, `${pick(topics)} ${randomInt(1000, 10000)}.${extension}`);
		} while (candidate in files);
		files[candidate] = content;
		return candidate;
	}
	function parent() {
		return pick(folderNotes.filter((entry) => entry.split('/').length < 3));
	}
	for (let i = 0; i < 48; i++) {
		const entry = folder(i < 18 ? '' : parent());
		const name = path.posix.basename(entry);
		folderNotes.push(entry);
		files[`${entry}/${name}.md`] = `# ${name}\n\nThis is the folder note for **${name}**. Clicking its folder name should open this note.\n`;
		for (let j = 0; j < randomInt(2, 5); j++) {
			file(entry, 'md', `# ${pick(topics)}\n\nAn ordinary note in [[${entry}/${name}|${name}]].\n\n- A sample task\n- A reference to revisit\n`);
		}
	}
	for (let i = 0; i < 12; i++) {
		const entry = folder(i < 6 ? '' : parent());
		controls.push(entry);
		for (let j = 0; j < 3; j++) file(entry, 'md', '# Ordinary note\n\nThis folder has no folder note.\n');
	}
	for (let i = 0; i < 8; i++) folder(i < 4 ? '' : parent());
	for (let i = 0; i < 8; i++) file('', 'md', `# ${pick(topics)}\n\nA standalone note at the vault root.\n`);
	for (let i = 0; i < 10; i++) {
		const entry = pick([...folderNotes, ...controls]);
		file(entry, 'canvas', JSON.stringify({
			nodes: [{ id: `card-${i}`, type: 'text', text: 'A sample canvas card', x: 0, y: 0, width: 300, height: 180 }],
			edges: [],
		}, null, 2) + '\n');
		file(entry, 'svg', '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#768bc4"/><circle cx="80" cy="50" r="28" fill="#f6d58a"/></svg>\n');
		file(entry, 'txt', 'Sample attachment\n\nA plain text file for File Explorer testing.\n');
		file(entry, 'json', JSON.stringify({ title: pick(topics), status: 'draft', tags: ['sample', 'development'] }, null, 2) + '\n');
	}
	const mainFolder = folderNotes[0];
	return {
		version: 1,
		directories,
		files,
		samples: {
			mainFolder,
			ordinaryNote: Object.keys(files).find((entry) => entry.startsWith(`${mainFolder}/`) && !entry.endsWith(`/${path.posix.basename(mainFolder)}.md`)),
			nestedFolder: folderNotes.find((entry) => entry.includes('/')),
			controlFolder: controls[0],
		},
	};
}

export function developmentGuide(samples) {
	const mainName = path.posix.basename(samples.mainFolder);
	return `# Folder Notes development vault

This vault contains 48 randomly named folder notes, 12 folders without folder notes, eight empty folders, ordinary notes, canvases, SVG images, and text/JSON attachments. Names and notes stay the same when you rebuild.

## Live development

Keep \`npm run dev:vault\` running in the repository. Source, CSS, and manifest changes rebuild and update all generated dev vaults automatically. **Folder Notes dev reload** reloads the plugin in Obsidian after each successful update.

If you updated an existing vault, reopen it once so the reload helper starts. For a named vault, run \`npm run dev:vault -- --name "Vault name"\`. Use \`--once\` for setup without starting a watcher. Ctrl+C stops watching.

## Test folder clicks

The name-only opening and disable-collapsing options are enabled initially.

1. Open [[${samples.ordinaryNote}|an ordinary note]], then click **${mainName}** in File Explorer. Its folder note should open without changing expansion.
2. Click its collapse arrow. Expansion should change.
3. Open the ordinary note again and middle-click the folder name. One new tab should open. Right-click should show the context menu.
4. Repeat with **${samples.nestedFolder}** and other folders throughout the vault.
5. **${samples.controlFolder}** has no folder note and should collapse normally. Some other folders are entirely empty.

## Test initialization with a pop-out focused (issue #331)

1. Open [[${samples.ordinaryNote}|the ordinary note]] in a new window using its tab menu.
2. In that pop-out, open Developer Tools (Ctrl+Shift+I on Windows/Linux, Cmd+Option+I on macOS).
3. Reload the plugin there without changing the focused Obsidian window:

\`\`\`js
await app.plugins.disablePluginAndSave('folder-notes');
await app.plugins.enablePluginAndSave('folder-notes');
\`\`\`

4. Return to the main window, open an ordinary note, and click **${mainName}**. Its folder note should open.
5. Test File Explorer in existing and newly opened pop-outs too. Close and reopen windows and repeat to check cleanup.
`;
}

/* eslint-disable complexity */
/* eslint-disable max-len */
import type FolderNotesPlugin from '../main';
import ExistingFolderNoteModal from '../modals/ExistingNote';
import { applyTemplate } from '../template';
import {
	TFolder,
	TFile,
	Keymap,
	type TAbstractFile,
	type MarkdownView,
	type WorkspaceLeaf,
} from 'obsidian';
import DeleteConfirmationModal from '../modals/DeleteConfirmation';
import {
	addExcludedFolder,
	deleteExcludedFolder,
	getDetachedFolder,
	getExcludedFolder,
	updateExcludedFolder,
} from '../ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from '../ExcludeFolders/ExcludeFolder';
import { getDefaultTemplate, openExcalidrawView } from './excalidraw';
import { AskForExtensionModal } from 'src/modals/AskForExtension';
import {
	addCSSClassToFileExplorerEl,
	removeCSSClassFromFileExplorerEL,
	removeActiveFolder,
	setActiveFolder,
	updateCSSClassesForFolderNote,
} from 'src/functions/styleFunctions';
import {
	getFolderNameFromPathString,
	getFolderPathFromString,
	removeExtension,
} from 'src/functions/utils';



export async function createFolderNote(
	plugin: FolderNotesPlugin,
	folderPath: string,
	openFile: boolean,
	extension?: string,
	displayModal?: boolean,
	preexistingNote?: TFile,
): Promise<void> {
	let {
		leaf,
		fileName,
		folderNote,
		folderNoteType,
		detachedFolder,
		path,
	} = getArgs(plugin, folderPath, extension, preexistingNote);

	if (folderNoteType === '.excalidraw') {
		folderNoteType = '.md';
		extension = '.excalidraw';
	} else if (folderNoteType === '.ask') {
		if (plugin.askModalCurrentlyOpen) return;
		return new AskForExtensionModal(
			plugin,
			folderPath,
			openFile,
			folderNoteType,
			displayModal,
			preexistingNote,
		).open();
	}

	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = getFolderPathFromString(folderPath);
		if (parentFolderPath.trim() === '') {
			path = `${fileName}${folderNoteType}`;
		} else {
			path = `${parentFolderPath}/${fileName}${folderNoteType}`;
		}
	} else if (plugin.settings.storageLocation === 'vaultFolder') {
		path = `${fileName}${folderNoteType}`;
	} else {
		path = `${folderPath}/${fileName}${folderNoteType}`;
	}

	if (detachedFolder && folderNote?.extension !== extension && folderNote) {
		await handleTurnNoteIntoFolderNote(plugin, folderNote, detachedFolder, folderPath, fileName);
	}

	if (!extension) {
		extension = folderNoteType;
	}

	if (!folderNote) {
		folderNote = await handleCreateFolderNote(plugin, folderNoteType, openFile, leaf, folderNote, path, extension);
	} else {
		await plugin.app.fileManager.renameFile(folderNote, path);
	}

	if (openFile) {
		if (plugin.app.workspace.getActiveFile()?.path === path) {
			removeActiveFolder(plugin);

			const folder = getFolder(plugin, folderNote);
			if (!folder) { return; }

			setActiveFolder(folder.path, plugin);
		}
		await leaf.openFile(folderNote);
		if (plugin.settings.folderNoteType === '.excalidraw' || extension === '.excalidraw') {
			openExcalidrawView(plugin.app, folderNote);
		}
	}

	const matchingExtension =
		extension?.split('.').pop() ===
		plugin.settings.templatePath.split('.').pop();
	if (folderNote && matchingExtension && plugin.settings.folderNoteType !== '.excalidraw') {
		applyTemplate(plugin, folderNote, leaf, plugin.settings.templatePath);
	}

	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	addCSSClassToFileExplorerEl(path, 'is-folder-note', false, plugin, true);
	addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);
}

function getArgs(
	plugin: FolderNotesPlugin,
	folderPath: string,
	extension?: string,
	preexistingNote?: TFile,
): {
	leaf: WorkspaceLeaf;
	fileName: string;
	folderNote: TFile | null | undefined;
	folderNoteType: string;
	detachedFolder: ExcludedFolder | undefined;
	path: string | '';
} {
	const leaf = plugin.app.workspace.getLeaf(false);
	const folderName = getFolderNameFromPathString(folderPath);
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);
	let folderNote = getFolderNote(plugin, folderPath);
	if (preexistingNote) {
		folderNote = preexistingNote;
	}
	let folderNoteType = extension ?? plugin.settings.folderNoteType;
	const detachedFolder = getDetachedFolder(plugin, folderPath);
	let path = '';

	return {
		leaf,
		fileName,
		folderNote,
		folderNoteType,
		detachedFolder,
		path,
	};
}

async function handleCreateFolderNote(plugin: FolderNotesPlugin, folderNoteType: string, openFile: boolean, leaf: WorkspaceLeaf, folderNote: TFile | null | undefined, path: string, extension?: string): Promise<TFile> {
	let content = '';
	if (extension !== '.md' && extension) {
		if (
			plugin.settings.templatePath &&
			folderNoteType.split('.').pop() ===
			plugin.settings.templatePath.split('.').pop()
		) {
			const templateFile = plugin.app.vault.getAbstractFileByPath(
				plugin.settings.templatePath,
			);
			if (templateFile instanceof TFile) {
				if (['md', 'canvas', 'txt'].includes(templateFile.extension)) {
					content = await plugin.app.vault.read(templateFile);
					if (
						extension === '.excalidraw' &&
						!content.includes(
							'==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this activeDocument. ⚠==',
						)
					) {
						content = await getDefaultTemplate(plugin.app);
					}
				} else {
					plugin.app.vault.readBinary(templateFile).then(async (data) => {
						folderNote = await plugin.app.vault.createBinary(path, data);
						if (openFile) {
							await leaf.openFile(folderNote);
						}
						return folderNote;
					});
				}
			}
		} else if (
			plugin.settings.folderNoteType === '.excalidraw' ||
			extension === '.excalidraw'
		) {
			content = await getDefaultTemplate(plugin.app);
		} else if (plugin.settings.folderNoteType === '.canvas') {
			content = '{}';
		}
	}

	folderNote = await plugin.app.vault.create(path, content);
	return folderNote;
}

async function handleTurnNoteIntoFolderNote(
	plugin: FolderNotesPlugin,
	folderNote: TFile,
	detachedFolder: ExcludedFolder,
	folderPath: string,
	fileName: string,
): Promise<void> {
	deleteExcludedFolder(plugin, detachedFolder);
	removeCSSClassFromFileExplorerEL(folderNote?.path, 'is-folder-note', false, plugin);
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	if (!folderNote || folderNote.basename !== fileName) return;
	let count = 1;
	const baseName = removeExtension(folderNote.path);
	const ext = folderNote.path.split('.').pop();
	let newName = `${baseName} (${count}).${ext}`;
	const MAX_FOLDER_NOTE_RENAME_ATTEMPTS = 100;

	while (
		count < MAX_FOLDER_NOTE_RENAME_ATTEMPTS &&
		plugin.app.vault.getAbstractFileByPath(newName)
	) {
		count++;
		newName = `${baseName} (${count}).${ext}`;
	}
	const [
		excludedFolder,
		excludedFolderExisted,
		disabledSync,
	] = await tempDisableSync(plugin, folder);

	await plugin.app.fileManager.renameFile(folderNote, newName).then(() => {
		if (!excludedFolder) return;
		if (!excludedFolderExisted) {
			deleteExcludedFolder(plugin, excludedFolder);
		} else if (!disabledSync) {
			excludedFolder.disableSync = false;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		}
	});
}

export async function turnIntoFolderNote(
	plugin: FolderNotesPlugin,
	file: TFile,
	folder: TFolder,
	folderNote?: TFile | null | TAbstractFile,
	skipConfirmation?: boolean,
): Promise<void> {
	const { extension } = file;
	const detachedExcludedFolder = getDetachedFolder(plugin, folder.path);

	if (folderNote) {
		if (
			plugin.settings.showRenameConfirmation &&
			!skipConfirmation &&
			!detachedExcludedFolder
		) {
			return new ExistingFolderNoteModal(plugin.app, plugin, file, folder, folderNote).open();
		}
		removeCSSClassFromFileExplorerEL(folderNote.path, 'is-folder-note', false, plugin);

		const [
			excludedFolder,
			excludedFolderExisted,
			disabledSync,
		] = await tempDisableSync(plugin, folder);

		const CTIME_SLICE_START = 10;
		const RANDOM_SUFFIX_MAX = 1000;
		const randomSuffix = Math.floor(Math.random() * RANDOM_SUFFIX_MAX);
		const ctimeSuffix = file.stat.ctime.toString().slice(CTIME_SLICE_START);
		const newPath = `${folder.path}/${folder.name} (${ctimeSuffix}${randomSuffix}).${extension}`;

		plugin.app.fileManager.renameFile(folderNote, newPath).then(() => {
			if (!excludedFolder) return;
			if (!excludedFolderExisted) {
				deleteExcludedFolder(plugin, excludedFolder);
			} else if (!disabledSync) {
				excludedFolder.disableSync = false;
				updateExcludedFolder(plugin, excludedFolder, excludedFolder);
			}
		});
	}
	const folderName = folder.name;
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);

	let path = `${folder.path}/${fileName}.${extension}`;
	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = folder.parent?.path;
		if (!parentFolderPath) return;
		if (parentFolderPath.trim() === '') {
			path = `${fileName}.${extension}`;
		} else {
			path = `${parentFolderPath}/${fileName}.${extension}`;
		}
	}

	if (detachedExcludedFolder) {
		void deleteExcludedFolder(plugin, detachedExcludedFolder);
	}

	if (file.path !== path) {
		await plugin.app.fileManager.renameFile(file, path);
	}
	void addCSSClassToFileExplorerEl(path, 'is-folder-note', false, plugin, true);
	void addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);

	removeActiveFolder(plugin);
	setActiveFolder(folder.path, plugin);
}

export async function tempDisableSync(
	plugin: FolderNotesPlugin,
	folder: TFolder,
): Promise<
	[
		excludedFolder: ExcludedFolder | undefined,
		excludedFolderExisted: boolean,
		disabledSync: boolean
	]
> {
	let excludedFolder = getExcludedFolder(plugin, folder.path, false);
	let excludedFolderExisted = true;
	let disabledSync = false;

	if (!excludedFolder) {
		excludedFolderExisted = false;
		excludedFolder = new ExcludedFolder(
			folder.path,
			plugin.settings.excludeFolders.length,
			undefined,
			plugin,
		);
		excludedFolder.disableSync = true;
		addExcludedFolder(plugin, excludedFolder);
	} else if (!excludedFolder.disableSync) {
		disabledSync = false;
		excludedFolder.disableSync = true;
		updateExcludedFolder(plugin, excludedFolder, excludedFolder);
	}

	return [excludedFolder, excludedFolderExisted, disabledSync];
}

export async function openFolderNote(
	plugin: FolderNotesPlugin,
	file: TAbstractFile,
	evt?: MouseEvent,
): Promise<void> {
	const { path } = file;
	const focusExistingTab = plugin.settings.focusExistingTab && plugin.settings.openInNewTab;
	const activeFilePath = plugin.app.workspace.getActiveFile()?.path;

	// If already active and not opening in new tab, do nothing
	if (activeFilePath === path && !(Keymap.isModEvent(evt) === 'tab')) {
		return;
	}

	// Try to find an existing tab with this file open
	let foundLeaf = null;
	if (focusExistingTab && file instanceof TFile) {
		plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (
				leaf.getViewState().type === 'markdown' &&
				(leaf.view as MarkdownView).file?.path === path
			) {
				foundLeaf = leaf;
			}
		});
	}

	if (foundLeaf) {
		plugin.app.workspace.setActiveLeaf(foundLeaf, { focus: true });
	} else {
		const shouldOpenInNewTab = Keymap.isModEvent(evt) || plugin.settings.openInNewTab;
		const leaf = plugin.app.workspace.getLeaf(shouldOpenInNewTab);
		if (file instanceof TFile) {
			await leaf.openFile(file);
		}
	}
}

export async function deleteFolderNote(
	plugin: FolderNotesPlugin,
	file: TFile,
	displayModal: boolean,
): Promise<void> {
	if (plugin.settings.showDeleteConfirmation && displayModal) {
		return new DeleteConfirmationModal(plugin.app, plugin, file).open();
	}
	const folder = getFolder(plugin, file);
	if (!folder) return;

	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(excludedFolder) => (excludedFolder.path !== folder.path) || !excludedFolder.showFolderNote);
	plugin.saveSettings(false);

	removeCSSClassFromFileExplorerEL(folder.path, 'has-folder-note', false, plugin);
	switch (plugin.settings.deleteFilesAction) {
		case 'trash':
			await plugin.app.vault.trash(file, true);
			break;
		case 'obsidianTrash':
			await plugin.app.vault.trash(file, false);
			break;
		case 'delete':
			await plugin.app.vault.delete(file);
			break;
	}
}

export function extractFolderName(template: string, changedFileName: string): string | null {
	const [prefix, suffix] = template.split('{{folder_name}}');
	if (prefix.trim() === '' && suffix.trim() === '') {
		return changedFileName;
	}
	if (!changedFileName.startsWith(prefix) || !changedFileName.endsWith(suffix)) {
		return null;
	}
	if (changedFileName.startsWith(prefix) && prefix.trim() !== '') {
		return changedFileName.slice(prefix.length).replace(suffix, '');
	} else if (changedFileName.endsWith(suffix) && suffix.trim() !== '') {
		return changedFileName.slice(0, -suffix.length);
	}
	return null;
}

function findFolderNoteFile(
	plugin: FolderNotesPlugin,
	path: string,
	primaryType: string,
): TFile | null {
	let folderNote = plugin.app.vault.getAbstractFileByPath(path + primaryType);
	if (
		folderNote instanceof TFile &&
		plugin.settings.supportedFileTypes.includes(primaryType.replace('.', ''))
	) {
		return folderNote;
	}

	const supportedFileTypes = plugin.settings.supportedFileTypes.filter(
		(type) => type !== primaryType.replace('.', ''),
	);

	for (const type of supportedFileTypes) {
		for (const extension of getLookupExtensions(type)) {
			folderNote = plugin.app.vault.getAbstractFileByPath(path + extension);
			if (folderNote instanceof TFile) {
				return folderNote;
			}
		}
	}
	return null;
}

// Excalidraw drawings are normally kept as markdown, but the Excalidraw plugin can also
// be set up to store them as raw .excalidraw files, so both have to be looked up.
function getLookupExtensions(type: string): string[] {
	const extension = type.startsWith('.') ? type : '.' + type;
	return extension === '.excalidraw' ? ['.md', '.excalidraw'] : [extension];
}

export function getFolderNote(
	plugin: FolderNotesPlugin,
	folderPath: string,
	storageLocation?: string,
	file?: TFile,
	oldFolderNoteName?: string,
): TFile | null | undefined {
	const folder = getFolderInfo(folderPath);
	if (!folder) return null;

	const fileNames = resolveFileNames(plugin, folder, file, oldFolderNoteName);
	if (fileNames.length === 0) return null;

	adjustFolderPathForStorage(folder, folderPath, plugin, storageLocation);

	const primaryType = normalizeFolderNoteType(plugin.settings.folderNoteType);

	for (const fileName of fileNames) {
		const folderNote = findFolderNoteFile(plugin, buildFullPath(folder, fileName), primaryType);
		if (folderNote) return folderNote;
	}
	return null;
}

// All recognized folder note name templates, highest priority first: the folder note name
// template and then the alternative names in the order the user set them, or the alternatives
// first when they are preferred. New folder notes always get the folder note name template.
export function getFolderNoteNameTemplates(plugin: FolderNotesPlugin): string[] {
	const { folderNoteName } = plugin.settings;
	const alternatives = (plugin.settings.alternativeFolderNoteNames ?? [])
		.map((name) => name.trim())
		.filter((name) => name !== '' && name !== folderNoteName);
	return plugin.settings.preferAlternativeFolderNoteNames
		? [...alternatives, folderNoteName]
		: [folderNoteName, ...alternatives];
}

// True when the folder has a file for a template with a higher priority than the one fileName
// matches, so fileName is (or was) not the folder note even though its name fits.
export function hasPreferredFolderNote(
	plugin: FolderNotesPlugin,
	folderPath: string,
	fileName: string,
): boolean {
	const folderName = getFolderNameFromPathString(folderPath);
	const templates = getFolderNoteNameTemplates(plugin);
	const index = templates.findIndex(
		(template) => template.replace('{{folder_name}}', folderName) === fileName,
	);
	if (index <= 0) return false;
	return templates.slice(0, index).some(
		(template) => getFolderNote(plugin, folderPath, undefined, undefined, template),
	);
}

export function getMatchingFolderNoteNameTemplate(
	plugin: FolderNotesPlugin,
	folderName: string,
	fileName: string,
): string | null {
	return getFolderNoteNameTemplates(plugin).find(
		(template) => template.replace('{{folder_name}}', folderName) === fileName,
	) ?? null;
}

// Name of the folder a (possible) folder note belongs to. Falls back to the primary template
// when the file name matches none of the templates for that folder.
export function getFolderNameFromNoteName(
	plugin: FolderNotesPlugin,
	fileName: string,
	folder: TAbstractFile | null,
): string {
	if (folder && getMatchingFolderNoteNameTemplate(plugin, folder.name, fileName)) {
		return folder.name;
	}
	return extractFolderName(plugin.settings.folderNoteName, fileName) || fileName;
}


export function detachFolderNote(plugin: FolderNotesPlugin, file: TFile): void {
	const folder = getFolder(plugin, file);
	if (!folder) return;
	const excludedFolder = new ExcludedFolder(
		folder.path,
		plugin.settings.excludeFolders.length,
		undefined,
		plugin,
	);
	excludedFolder.showFolderNote = true;
	excludedFolder.hideInSettings = true;
	excludedFolder.disableFolderNote = true;
	excludedFolder.disableSync = true;
	excludedFolder.subFolders = false;
	excludedFolder.excludeFromFolderOverview = false;
	excludedFolder.detached = true;
	excludedFolder.detachedFilePath = file.path;
	addExcludedFolder(plugin, excludedFolder);
	void updateCSSClassesForFolderNote(file.path, plugin);
}


export function getFolder(
	plugin: FolderNotesPlugin,
	file: TFile,
	storageLocation?: string,
): TFolder | TAbstractFile | null {
	if (!file) return null;
	for (const template of getFolderNoteNameTemplates(plugin)) {
		let folderName = extractFolderName(template, file.basename);
		if (
			template === file.basename &&
			plugin.settings.storageLocation === 'insideFolder'
		) {
			folderName = file.parent?.name ?? '';
		}
		if (!folderName) continue;
		let folderPath = getFolderPathFromString(file.path);

		if (
			(plugin.settings.storageLocation === 'parentFolder' ||
				storageLocation === 'parentFolder') &&
			storageLocation !== 'insideFolder'
		) {
			if (folderPath.trim() === '' || folderPath === '/') {
				folderPath = folderName;
			} else {
				folderPath = `${folderPath}/${folderName}`;
			}
		}

		const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
		if (folder) { return folder; }
	}
	return null;
}

export function getFolderNoteFolder(
	plugin: FolderNotesPlugin,
	folderNote: TFile | string,
	fileName: string,
): TFolder | TAbstractFile | null {
	if (!folderNote) return null;
	let filePath = '';
	if (typeof folderNote === 'string') {
		filePath = folderNote;
	} else {
		fileName = folderNote.basename;
		filePath = folderNote.path;
	}
	if (!plugin.settings.folderNoteName.includes('{{folder_name}}') && plugin.settings.storageLocation === 'insideFolder') {
		if (folderNote instanceof TFile) {
			return folderNote.parent;
		}
		const file = plugin.app.vault.getAbstractFileByPath(filePath);
		return file instanceof TFile ? file.parent : null;
	}
	for (const template of getFolderNoteNameTemplates(plugin)) {
		const folderName = extractFolderName(template, fileName);
		if (!folderName) continue;
		let folderPath = getFolderPathFromString(filePath);
		if (plugin.settings.storageLocation === 'parentFolder') {
			if (folderPath.trim() === '') {
				folderPath = folderName;
			} else {
				folderPath = `${folderPath}/${folderName}`;
			}
		}
		const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
		if (folder) { return folder; }
	}
	return null;
}

function getFolderInfo(folderPath: string): { path: string; name: string } | null {
	if (!folderPath) return null;
	return {
		path: folderPath,
		name: getFolderNameFromPathString(folderPath),
	};
}

function resolveFileNames(
	plugin: FolderNotesPlugin,
	folder: { path: string; name: string },
	file?: TFile,
	oldFolderNoteName?: string,
): string[] {
	if (file || oldFolderNoteName) {
		const templateName = oldFolderNoteName ?? plugin.settings.folderNoteName;
		if (!templateName) return [];
		const nameSource = file ? file.basename : folder.name;
		return [templateName.replace('{{folder_name}}', nameSource)];
	}
	return getFolderNoteNameTemplates(plugin)
		.filter((template) => template)
		.map((template) => template.replace('{{folder_name}}', folder.name));
}

function adjustFolderPathForStorage(
	folder: { path: string; name: string },
	folderPath: string,
	plugin: FolderNotesPlugin,
	storageLocation?: string,
): void {
	if (
		(plugin.settings.storageLocation === 'parentFolder' ||
			storageLocation === 'parentFolder') &&
		storageLocation !== 'insideFolder'
	) {
		folder.path = getFolderPathFromString(folderPath);
	}
}

function buildFullPath(folder: { path: string }, fileName: string): string {
	return folder.path === '/' ? fileName : `${folder.path}/${fileName}`;
}

function normalizeFolderNoteType(type: string): string {
	return type === '.excalidraw' ? '.md' : type;
}

import FolderNotesPlugin from '../main';
import ExistingFolderNoteModal from '../modals/ExistingNote';
import { applyTemplate } from '../template';
import { TFolder, TFile, TAbstractFile, Keymap } from 'obsidian';
import DeleteConfirmationModal from '../modals/DeleteConfirmation';
import { addExcludedFolder, deleteExcludedFolder, getDetachedFolder, getExcludedFolder, updateExcludedFolder } from '../ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from '../ExcludeFolders/ExcludeFolder';
import { openExcalidrawView } from './excalidraw';
import { AskForExtensionModal } from 'src/modals/AskForExtension';
import { addCSSClassToFileExplorerEl, removeCSSClassFromFileExplorerEL, removeActiveFolder, setActiveFolder } from 'src/functions/styleFunctions';
import { getFolderNameFromPathString, getFolderPathFromString, removeExtension } from 'src/functions/utils';

const defaultExcalidrawTemplate = `---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==


%%
# Drawing
\`\`\`json
{'type":"excalidraw","version":2,"source":"https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/1.9.20","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff'}}
\`\`\`
%%`;

export async function createFolderNote(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, extension?: string, displayModal?: boolean, preexistingNote?: TFile) {
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

	if (folderNoteType === '.excalidraw') {
		folderNoteType = '.md';
		extension = '.excalidraw';
	} else if (folderNoteType === '.ask') {
		if (plugin.askModalCurrentlyOpen) return;
		return new AskForExtensionModal(plugin, folderPath, openFile, folderNoteType, displayModal, preexistingNote).open();
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
		deleteExcludedFolder(plugin, detachedFolder);
		removeCSSClassFromFileExplorerEL(folderNote?.path, 'is-folder-note', false, plugin);
		const folder = plugin.app.vault.getAbstractFileByPath(folderPath) as TFolder;
		if (!folderNote || folderNote.basename !== fileName) return;
		let count = 1;
		let newName = removeExtension(folderNote.path) + ` (${count}).${folderNote.path.split('.').pop()}`;
		while (count < 100 && plugin.app.vault.getAbstractFileByPath(newName)) {
			count++;
			newName = removeExtension(folderNote.path) + ` (${count}).${folderNote.path.split('.').pop()}`;
		}
		const [excludedFolder, excludedFolderExisted, disabledSync] = await tempDisableSync(plugin, folder);

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

	if (!extension) {
		extension = folderNoteType;
	}

	if (!folderNote) {
		let content = '';
		if (extension !== '.md' && extension) {
			if (plugin.settings.templatePath && folderNoteType.split('.').pop() === plugin.settings.templatePath.split('.').pop()) {
				const templateFile = plugin.app.vault.getAbstractFileByPath(plugin.settings.templatePath);
				if (templateFile instanceof TFile) {
					if (['md', 'canvas', 'txt'].includes(templateFile.extension)) {
						content = await plugin.app.vault.read(templateFile);
						if (extension === '.excalidraw' && !content.includes('==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==')) {
							content = defaultExcalidrawTemplate;
						}
					} else {
						return plugin.app.vault.readBinary(templateFile).then(async (data) => {
							folderNote = await plugin.app.vault.createBinary(path, data);
							if (openFile) {
								await leaf.openFile(folderNote);
							}
						});
					}
				}
			} else if (plugin.settings.folderNoteType === '.excalidraw' || extension === '.excalidraw') {
				content = defaultExcalidrawTemplate;
			} else if (plugin.settings.folderNoteType === '.canvas') {
				content = '{}';
			}
		}

		folderNote = await plugin.app.vault.create(path, content);
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
			openExcalidrawView(leaf);
		}
	}

	const matchingExtension = extension?.split('.').pop() === plugin.settings.templatePath.split('.').pop();
	if (folderNote && matchingExtension && plugin.settings.folderNoteType !== '.excalidraw') {
		applyTemplate(plugin, folderNote, leaf, plugin.settings.templatePath);
	}

	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	addCSSClassToFileExplorerEl(path, 'is-folder-note', false, plugin, true);
	addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);
}

export async function turnIntoFolderNote(plugin: FolderNotesPlugin, file: TFile, folder: TFolder, folderNote?: TFile | null | TAbstractFile, skipConfirmation?: boolean) {
	const extension = file.extension;
	const detachedExcludedFolder = getDetachedFolder(plugin, folder.path);

	if (folderNote) {
		if (plugin.settings.showRenameConfirmation && !skipConfirmation && !detachedExcludedFolder) {
			return new ExistingFolderNoteModal(plugin.app, plugin, file, folder, folderNote).open();
		}
		removeCSSClassFromFileExplorerEL(folderNote.path, 'is-folder-note', false, plugin);

		const [excludedFolder, excludedFolderExisted, disabledSync] = await tempDisableSync(plugin, folder);

		const newPath = `${folder.path}/${folder.name} (${file.stat.ctime.toString().slice(10) + Math.floor(Math.random() * 1000)}).${extension}`;
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
		deleteExcludedFolder(plugin, detachedExcludedFolder);
	}

	await plugin.app.fileManager.renameFile(file, path);
	addCSSClassToFileExplorerEl(path, 'is-folder-note', false, plugin, true);
	addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);

	removeActiveFolder(plugin);
	setActiveFolder(folder.path, plugin);
}

export async function tempDisableSync(plugin: FolderNotesPlugin, folder: TFolder): Promise<[excludedFolder: ExcludedFolder | undefined, excludedFolderExisted: boolean, disabledSync: boolean]> {
	let excludedFolder = getExcludedFolder(plugin, folder.path, false);
	let excludedFolderExisted = true;
	let disabledSync = false;

	if (!excludedFolder) {
		excludedFolderExisted = false;
		excludedFolder = new ExcludedFolder(folder.path, plugin.settings.excludeFolders.length, undefined, plugin);
		excludedFolder.disableSync = true;
		addExcludedFolder(plugin, excludedFolder);
	} else if (!excludedFolder.disableSync) {
		disabledSync = false;
		excludedFolder.disableSync = true;
		updateExcludedFolder(plugin, excludedFolder, excludedFolder);
	}

	return [excludedFolder, excludedFolderExisted, disabledSync];
}

export async function openFolderNote(plugin: FolderNotesPlugin, file: TAbstractFile, evt?: MouseEvent) {
	const path = file.path;
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
				(leaf.view as import('obsidian').MarkdownView).file?.path === path
			) {
				foundLeaf = leaf;
			}
		});
	}

	if (foundLeaf) {
		plugin.app.workspace.setActiveLeaf(foundLeaf, { focus: true });
	} else {
		const leaf = plugin.app.workspace.getLeaf(Keymap.isModEvent(evt) || plugin.settings.openInNewTab);
		if (file instanceof TFile) {
			await leaf.openFile(file);
		}
	}
}

export async function deleteFolderNote(plugin: FolderNotesPlugin, file: TFile, displayModal: boolean) {
	if (plugin.settings.showDeleteConfirmation && displayModal) {
		return new DeleteConfirmationModal(plugin.app, plugin, file).open();
	}
	const folder = getFolder(plugin, file);
	if (!folder) return;

	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(excludedFolder) => (excludedFolder.path !== folder.path) && excludedFolder.showFolderNote);
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

export function extractFolderName(template: string, changedFileName: string) {
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

export function getFolderNote(plugin: FolderNotesPlugin, folderPath: string, storageLocation?: string, file?: TFile, oldFolderNoteName?: string) {
	if (!folderPath) return null;
	const folder = {
		path: folderPath,
		name: getFolderNameFromPathString(folderPath),
	};
	const folderNoteName = oldFolderNoteName ?? plugin.settings.folderNoteName;

	let fileName = folderNoteName.replace('{{folder_name}}', folder.name);
	if (file) {
		fileName = folderNoteName.replace('{{folder_name}}', file.basename);
	}
	if (!fileName) return null;

	if ((plugin.settings.storageLocation === 'parentFolder' || storageLocation === 'parentFolder') && storageLocation !== 'insideFolder') {
		folder.path = getFolderPathFromString(folderPath);
	}


	let path = `${folder.path}/${fileName}`;
	folder.path === '/' ? path = fileName : path = `${folder.path}/${fileName}`;


	let folderNoteType = plugin.settings.folderNoteType;
	if (folderNoteType === '.excalidraw') {
		folderNoteType = '.md';
	}

	let folderNote = plugin.app.vault.getAbstractFileByPath(path + folderNoteType);
	if (folderNote instanceof TFile && plugin.settings.supportedFileTypes.includes(plugin.settings.folderNoteType.replace('.', ''))) {
		return folderNote;
	} else {
		const supportedFileTypes = plugin.settings.supportedFileTypes.filter((type) => type !== plugin.settings.folderNoteType.replace('.', ''));
		for (let type of supportedFileTypes) {
			if (type === 'excalidraw' || type === '.excalidraw') {
				type = '.md';
			}
			if (!type.startsWith('.')) {
				type = '.' + type;
			}
			folderNote = plugin.app.vault.getAbstractFileByPath(path + type);
			if (folderNote instanceof TFile) {
				return folderNote;
			}
		}
	}
}

export function detachFolderNote(plugin: FolderNotesPlugin, file: TFile) {
	const folder = getFolder(plugin, file);
	if (!folder) return;
	const excludedFolder = new ExcludedFolder(folder.path, plugin.settings.excludeFolders.length, undefined, plugin);
	excludedFolder.hideInSettings = true;
	excludedFolder.disableFolderNote = true;
	excludedFolder.disableSync = true;
	excludedFolder.subFolders = false;
	excludedFolder.excludeFromFolderOverview = false;
	excludedFolder.detached = true;
	excludedFolder.detachedFilePath = file.path;
	addExcludedFolder(plugin, excludedFolder);
}


export function getFolder(plugin: FolderNotesPlugin, file: TFile, storageLocation?: string) {
	if (!file) return null;
	let folderName = extractFolderName(plugin.settings.folderNoteName, file.basename);
	if (plugin.settings.folderNoteName === file.basename && plugin.settings.storageLocation === 'insideFolder') {
		folderName = file.parent?.name ?? '';
	}
	if (!folderName) return null;
	let folderPath = getFolderPathFromString(file.path);
	let folder: TFolder | TAbstractFile | null = null;
	if ((plugin.settings.storageLocation === 'parentFolder' || storageLocation === 'parentFolder') && storageLocation !== 'insideFolder') {
		if (folderPath.trim() === '' || folderPath === '/') {
			folderPath = folderName;
		} else {
			folderPath = `${folderPath}/${folderName}`;
		}
		folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	} else {
		folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	}
	if (!folder) { return null; }
	return folder;
}

export function getFolderNoteFolder(plugin: FolderNotesPlugin, folderNote: TFile | string, fileName: string) {
	if (!folderNote) return null;
	let filePath = '';
	if (typeof folderNote === 'string') {
		filePath = folderNote;
	} else {
		fileName = folderNote.basename;
		filePath = folderNote.path;
	}
	const folderName = extractFolderName(plugin.settings.folderNoteName, fileName);
	if (!folderName) return null;
	let folderPath = getFolderPathFromString(filePath);
	if (plugin.settings.storageLocation === 'parentFolder') {
		if (folderPath.trim() === '') {
			folderPath = folderName;
		} else {
			folderPath = `${folderPath}/${folderName}`;
		}
	} else {
		folderPath = getFolderPathFromString(filePath);
	}
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!folder) { return null; }
	return folder;
}

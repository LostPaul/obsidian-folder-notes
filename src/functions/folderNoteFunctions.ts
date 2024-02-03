import FolderNotesPlugin from '../main';
import ExistingFolderNoteModal from '../modals/ExistingNote';
import { applyTemplate } from '../template';
import { TFolder, TFile, TAbstractFile, Keymap } from 'obsidian';
import DeleteConfirmationModal from '../modals/DeleteConfirmation';
import { addExcludedFolder, deleteExcludedFolder, getExcludedFolder, ExcludedFolder, updateExcludedFolder } from '../excludedFolder';
import { openExcalidrawView } from './excalidraw';
import { AskForExtensionModal } from 'src/modals/AskForExtension';
import { getEl, addCSSClassToTitleEL, removeCSSClassFromEL } from 'src/functions/styleFunctions';
import { getFolderNameFromPathString, getFolderPathFromString } from 'src/functions/utils';

const defaultExcalidrawTemplate = `---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==


%%
# Drawing
\`\`\`json
{"type":"excalidraw","version":2,"source":"https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/1.9.20","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}
\`\`\`
%%`;

export async function createFolderNote(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, extension?: string, useModal?: boolean, existingNote?: TFile) {
	const leaf = plugin.app.workspace.getLeaf(false);
	const folderName = getFolderNameFromPathString(folderPath);
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);
	let folderNoteType = extension ?? plugin.settings.folderNoteType;

	if (folderNoteType === '.excalidraw') {
		folderNoteType = '.md';
		extension = '.excalidraw';
	} else if (folderNoteType === '.ask') {
		return new AskForExtensionModal(plugin, folderPath, openFile, folderNoteType, useModal, existingNote).open();
	}

	let path = '';

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

	let file: TFile;

	if (!existingNote) {
		let content = '';
		if (extension !== '.md') {
			if (plugin.settings.templatePath && folderNoteType.split('.').pop() == plugin.settings.templatePath.split('.').pop()) {
				const templateFile = plugin.app.vault.getAbstractFileByPath(plugin.settings.templatePath);
				if (templateFile instanceof TFile) {
					if (['md', 'canvas', 'txt'].includes(templateFile.extension)) {
						content = await plugin.app.vault.read(templateFile);
						if (extension === '.excalidraw' && !content.includes('==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==')) {
							content = defaultExcalidrawTemplate;
						}
					} else {
						return plugin.app.vault.readBinary(templateFile).then(async (data) => {
							file = await plugin.app.vault.createBinary(path, data);
							if (openFile) {
								await leaf.openFile(file);
							}
						});
					}
				}
			} else if (plugin.settings.folderNoteType === '.excalidraw' || extension === '.excalidraw') {
				content = defaultExcalidrawTemplate;
			} else if (plugin.settings.folderNoteType === '.canvas') {
				content = '{}'
			}
		}
		file = await plugin.app.vault.create(path, content);
	} else {
		file = existingNote;
		await plugin.app.fileManager.renameFile(existingNote, path).then(() => {
			file = existingNote;
		});
	}

	if (openFile) {
		if (plugin.app.workspace.getActiveFile()?.path === path) {
			if (plugin.activeFolderDom) {
				plugin.activeFolderDom.removeClass('fn-is-active');
				plugin.activeFolderDom = null;
			}

			const folder = getFolder(plugin, file);
			if (!folder) { return; }

			plugin.activeFolderDom = getEl(folder.path, plugin);
			if (plugin.activeFolderDom) plugin.activeFolderDom.addClass('fn-is-active');
		}
		await leaf.openFile(file);
		if (plugin.settings.folderNoteType === '.excalidraw' || extension === '.excalidraw') {
			openExcalidrawView(leaf);
		}
	}

	const matchingExtension = extension?.split('.').pop() == plugin.settings.templatePath.split('.').pop();
	if (file && !existingNote && matchingExtension && plugin.settings.folderNoteType !== '.excalidraw') {
		applyTemplate(plugin, file, leaf, plugin.settings.templatePath);
	}

	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	addCSSClassToTitleEL(path, 'is-folder-note', true);
	addCSSClassToTitleEL(folder.path, 'has-folder-note');
}

export async function turnIntoFolderNote(plugin: FolderNotesPlugin, file: TFile, folder: TFolder, folderNote?: TFile | null | TAbstractFile, skipConfirmation?: boolean) {
	const extension = file.extension
	if (folderNote) {
		if (plugin.settings.showRenameConfirmation && !skipConfirmation) {
			return new ExistingFolderNoteModal(plugin.app, plugin, file, folder, folderNote).open();
		}
		removeCSSClassFromEL(folderNote.path, 'is-folder-note');
		let excludedFolder = getExcludedFolder(plugin, folder.path);
		let excludedFolderExisted = true;
		let disabledSync = false;

		if (!excludedFolder) {
			excludedFolderExisted = false;
			excludedFolder = new ExcludedFolder(folder.path, plugin.settings.excludeFolders.length, plugin);
			addExcludedFolder(plugin, excludedFolder);
		} else if (!excludedFolder.disableSync) {
			disabledSync = false;
			excludedFolder.disableSync = true;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		}
		const newPath = `${folder.path}/${folder.name} (${file.stat.ctime.toString().slice(10) + Math.floor(Math.random() * 1000)}).${extension}`;
		plugin.app.fileManager.renameFile(folderNote, newPath).then(() => {
			if (!excludedFolder) { return; }
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

	await plugin.app.fileManager.renameFile(file, path);
	addCSSClassToTitleEL(path, 'is-folder-note', true);
	addCSSClassToTitleEL(folder.path, 'has-folder-note');
}

export async function openFolderNote(plugin: FolderNotesPlugin, file: TAbstractFile, evt?: MouseEvent) {
	const path = file.path;
	if (plugin.app.workspace.getActiveFile()?.path === path && !(Keymap.isModEvent(evt) == 'tab')) { return; }
	const leaf = plugin.app.workspace.getLeaf(Keymap.isModEvent(evt) || plugin.settings.openInNewTab);
	if (file instanceof TFile) {
		await leaf.openFile(file);
	}
}

export async function deleteFolderNote(plugin: FolderNotesPlugin, file: TFile) {
	if (plugin.settings.showDeleteConfirmation) {
		return new DeleteConfirmationModal(plugin.app, plugin, file).open();
	}
	const folder = getFolder(plugin, file);
	if (!folder) return;
	removeCSSClassFromEL(folder.path, 'has-folder-note');
	await plugin.app.vault.delete(file);
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

export function getFolderNote(plugin: FolderNotesPlugin, folderPath: string, storageLocation?: string, file?: TFile) {
	if (!folderPath) return null;
	const folder = {
		path: folderPath,
		name: getFolderNameFromPathString(folderPath),
	};

	let fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name);
	if (file) {
		fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.basename);
	}
	if (!fileName) return null;

	if ((plugin.settings.storageLocation === 'parentFolder' || storageLocation === 'parentFolder') && storageLocation !== 'insideFolder') {
		folder.path = getFolderPathFromString(folderPath);
	}

	let path = `${folder.path}/${fileName}`;
	if (folder.path.trim() === '') {
		folder.path = fileName;
		path = `${fileName}`;
	}

	let folderNoteType = plugin.settings.folderNoteType;
	if (folderNoteType === '.excalidraw') {
		folderNoteType = '.md';
	}

	let folderNote = plugin.app.vault.getAbstractFileByPath(path + folderNoteType);
	if (folderNote instanceof TFile) {
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
		if (folderPath.trim() === '') {
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

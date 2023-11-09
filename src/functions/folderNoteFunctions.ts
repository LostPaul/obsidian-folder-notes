import FolderNotesPlugin from '../main';
import ExistingFolderNoteModal from '../modals/ExistingNote';
import { applyTemplate } from '../template';
import { TFolder, TFile, TAbstractFile, Keymap } from 'obsidian';
import DeleteConfirmationModal from '../modals/DeleteConfirmation';
import { addExcludedFolder, deleteExcludedFolder, getExcludedFolder, ExcludedFolder, updateExcludedFolder } from '../excludedFolder';
import { openExcalidrawView } from './excalidraw';
import { AskForExtensionModal } from 'src/modals/AskForExtension';

export async function createFolderNote(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, extension?: string, useModal?: boolean, existingNote?: TFile) {
	const leaf = plugin.app.workspace.getLeaf(false);
	const folderName = plugin.getFolderNameFromPathString(folderPath);
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
		const parentFolderPath = plugin.getFolderPathFromString(folderPath);
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
			if (plugin.settings.templatePath && folderNoteType === '.' + plugin.settings.templatePath.split('.').pop()) {
				const templateFile = plugin.app.vault.getAbstractFileByPath(plugin.settings.templatePath);
				if (templateFile instanceof TFile) {
					if (['md', 'canvas', 'txt'].includes(templateFile.extension)) {
						content = await plugin.app.vault.read(templateFile);
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
				content =
					`---

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
			} else if (plugin.settings.folderNoteType === '.canvas') {
				content = '{}'
			}
		}
		file = await plugin.app.vault.create(path, content);
	} else {
		file = existingNote;
		plugin.app.fileManager.renameFile(existingNote, path);
	}
	if (openFile) {
		await leaf.openFile(file);
		if (plugin.settings.folderNoteType === '.excalidraw' || extension === '.excalidraw') {
			openExcalidrawView(leaf);
		}
	}
	if (file && !existingNote && plugin.settings.folderNoteType == '.excalidraw' && extension == plugin.settings.templatePath.split('.').pop()) {
		applyTemplate(plugin, file, leaf, plugin.settings.templatePath);
	}

	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	plugin.addCSSClassToTitleEL(path, 'is-folder-note', true);
	plugin.addCSSClassToTitleEL(folder.path, 'has-folder-note');
}

export async function turnIntoFolderNote(plugin: FolderNotesPlugin, file: TFile, folder: TFolder, folderNote?: TFile | null | TAbstractFile, skipConfirmation?: boolean) {
	const extension = file.extension
	if (folderNote) {
		if (plugin.settings.showRenameConfirmation && !skipConfirmation) {
			return new ExistingFolderNoteModal(plugin.app, plugin, file, folder, folderNote).open();
		}
		plugin.removeCSSClassFromEL(folderNote.path, 'is-folder-note');
		let excludedFolder = getExcludedFolder(plugin, folder.path);
		let excludedFolderExisted = true;
		let disabledSync = false;

		if (!excludedFolder) {
			excludedFolderExisted = false;
			excludedFolder = new ExcludedFolder(folder.path, plugin.settings.excludeFolders.length);
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
	plugin.addCSSClassToTitleEL(path, 'is-folder-note', true);
	plugin.addCSSClassToTitleEL(folder.path, 'has-folder-note');
}

export async function openFolderNote(plugin: FolderNotesPlugin, file: TAbstractFile, evt?: MouseEvent) {
	const path = file.path;
	if (plugin.app.workspace.getActiveFile()?.path === path) { return; }
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
	plugin.removeCSSClassFromEL(folder.path, 'has-folder-note');
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
		name: plugin.getFolderNameFromPathString(folderPath),
	};
	let fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name);
	if (file) {
		fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.basename);
	}

	if ((plugin.settings.storageLocation === 'parentFolder' || storageLocation === 'parentFolder') && storageLocation !== 'insideFolder') {
		folder.path = plugin.getFolderPathFromString(folderPath);
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
	let folderPath = plugin.getFolderPathFromString(file.path);
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
	let folderPath = plugin.getFolderPathFromString(filePath);
	if (plugin.settings.storageLocation === 'parentFolder') {
		if (folderPath.trim() === '') {
			folderPath = folderName;
		} else {
			folderPath = `${folderPath}/${folderName}`;
		}
	} else {
		folderPath = plugin.getFolderPathFromString(filePath);
	}
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!folder) { return null; }
	return folder;
}

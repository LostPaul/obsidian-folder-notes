import type { TAbstractFile } from 'obsidian';
import { TFile, TFolder, Notice } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import { extractFolderName, getFolderNote, getFolderNoteFolder } from '../functions/folderNoteFunctions';
import { getExcludedFolder, addExcludedFolder, updateExcludedFolder, deleteExcludedFolder, getDetachedFolder } from '../ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { removeCSSClassFromFileExplorerEL, addCSSClassToFileExplorerEl, markFileAsFolderNote, unmarkFileAsFolderNote, unmarkFolderAsFolderNote, markFolderWithFolderNoteClasses, hideFolderNoteInFileExplorer, removeActiveFolder, setActiveFolder } from 'src/functions/styleFunctions';
import { getFolderPathFromString, removeExtension, getFileNameFromPathString } from 'src/functions/utils';

export function handleRename(file: TAbstractFile, oldPath: string, plugin: FolderNotesPlugin) {
	const folder = file.parent;
	const oldFolder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(oldPath));

	if (folder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(folder) && getFolderNote(plugin, folder.path)) {
			addCSSClassToFileExplorerEl(folder.path, 'only-has-folder-note', true, plugin);
		} else {
			removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
		}
	}

	if (oldFolder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(oldFolder) && getFolderNote(plugin, oldFolder.path)) {
			addCSSClassToFileExplorerEl(oldFolder.path, 'only-has-folder-note', true, plugin);
		} else {
			removeCSSClassFromFileExplorerEL(oldFolder.path, 'only-has-folder-note', true, plugin);
		}
	}

	if (file instanceof TFolder) {
		const folder = file;
		plugin.tabManager.updateTab(folder.path);
		updateExcludedFolderPath(folder, oldPath, plugin);
		if (isFolderRename(folder, oldPath)) {
			return handleFolderRename(folder, oldPath, plugin);
		}
		return handleFolderMove(folder, oldPath, plugin);

	} else if (file instanceof TFile) {
		if (isFileRename(file, oldPath)) {
			return fmptUpdateFileName(file, oldPath, plugin);
		}
		return handleFileMove(file, oldPath, plugin);

	}
}

function isFileRename(file: TFile, oldPath: string): boolean {
	const oldFolderPath = getFolderPathFromString(oldPath);
	const newFolderPath = file.parent?.path;
	const oldName = getFileNameFromPathString(oldPath);
	const newName = file.name;

	return oldFolderPath === newFolderPath && oldName !== newName;
}


function isFolderRename(folder: TFolder, oldPath: string): boolean {
	const oldName = getFileNameFromPathString(oldPath);
	const newName = folder.name;
	const oldParent = getFolderPathFromString(oldPath);
	const newParent = folder.parent?.path;

	return oldParent === newParent && oldName !== newName;
}

export function handleFolderMove(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	if (plugin.settings.storageLocation === 'insideFolder') { return; }
	if (!plugin.settings.syncMove) { return; }
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation);
	if (!(file instanceof TFolder) || !folderNote) return;
	const newFolder = plugin.app.vault.getAbstractFileByPath(file.path);
	if (!(newFolder instanceof TFolder)) return;
	let newPath = folderNote.path;

	if (newFolder.path === '/') {
		newPath = folderNote.name;
	} else {
		newPath = `${newFolder.parent?.path}/${folderNote.name}`;
	}

	plugin.app.fileManager.renameFile(folderNote, newPath);
}

export async function handleFileMove(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename) || file.basename;
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	let excludedFolder = getExcludedFolder(plugin, newFolder?.path || '', true);
	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);


	const isFileNowFolderNoteInNewFolder = folderName === newFolder?.name;
	const isFileMovedFromOldFolderNote = oldFolder && oldFolder.name === oldFileName && newFolder?.path !== oldFolder.path;

	// this is for turning files into folder notes for folders that already have a folder note
	// e.g. Turn into folder note for "Folder name"
	const isFileNowFolderNoteWithExistingNote = folderName === newFolder?.name && folderNote;

	if (isFileNowFolderNoteWithExistingNote) {
		let excludedFolderExisted = true;
		let disabledSync = false;

		if (!excludedFolder) {
			excludedFolderExisted = false;
			excludedFolder = new ExcludedFolder(oldFolder?.path || '', plugin.settings.excludeFolders.length, undefined, plugin);
			addExcludedFolder(plugin, excludedFolder);
		} else if (!excludedFolder.disableSync) {
			disabledSync = false;
			excludedFolder.disableSync = true;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		}
		return plugin.app.fileManager.renameFile(file, oldPath).then(() => {
			if (!excludedFolder) { return; }
			if (!excludedFolderExisted) {
				deleteExcludedFolder(plugin, excludedFolder);
			} else if (!disabledSync) {
				excludedFolder.disableSync = false;
				updateExcludedFolder(plugin, excludedFolder, excludedFolder);
			}
		});
	} else if (isFileNowFolderNoteInNewFolder) {
		if (!excludedFolder?.disableFolderNote) {
			markFileAsFolderNote(file, plugin);
			if (newFolder instanceof TFolder) {
				markFolderWithFolderNoteClasses(newFolder, plugin);
				if (plugin.app.workspace.getActiveFile()?.path === file.path) {
					removeActiveFolder(plugin);
					setActiveFolder(newFolder.path, plugin);
				}
			}
			if (oldFolder instanceof TFolder) {
				hideFolderNoteInFileExplorer(oldFolder.path, plugin);
				unmarkFolderAsFolderNote(oldFolder, plugin);
			}
		}
	} else if (isFileMovedFromOldFolderNote) {
		unmarkFileAsFolderNote(file, plugin);
		if (oldFolder instanceof TFolder) {
			removeActiveFolder(plugin);
			hideFolderNoteInFileExplorer(oldFolder.path, plugin);
			unmarkFolderAsFolderNote(oldFolder, plugin);
		}
	}
}

export async function handleFolderRename(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.name);
	const oldFileName = plugin.settings.folderNoteName.replace('{{folder_name}}', getFileNameFromPathString(oldPath));

	if (fileName === oldFileName) { return; }

	const folderNote = getFolderNote(plugin, oldPath);
	if (!(folderNote instanceof TFile)) return;


	const excludedFolder = getExcludedFolder(plugin, file.path, true);
	if (excludedFolder?.disableSync && !folderNote) {
		return removeCSSClassFromFileExplorerEL(file.path, 'has-folder-note', false, plugin);
	}

	if (!plugin.settings.syncFolderName) { return; }

	let newPath = '';
	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = getFolderPathFromString(file.path);
		const oldParentFolderPath = getFolderPathFromString(oldPath);
		if (parentFolderPath !== oldParentFolderPath) {
			if (!plugin.settings.syncMove) { return; }
			newPath = `${parentFolderPath}/${fileName}.${folderNote.extension}`;
		} else if (parentFolderPath.trim() === '') {
			folderNote.path = `${folderNote.name}`;
			newPath = `${fileName}.${folderNote.extension}`;
		} else {
			folderNote.path = `${parentFolderPath}/${folderNote.name}`;
			newPath = `${parentFolderPath}/${fileName}.${folderNote.extension}`;
		}
	} else {
		folderNote.path = `${file.path}/${folderNote.name}`;
		newPath = `${file.path}/${fileName}.${folderNote.extension}`;
	}
	plugin.app.fileManager.renameFile(folderNote, newPath);
}

export async function fmptUpdateFileName(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFileName = file.basename;
	if (oldFileName === newFileName) { return; }

	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename) || file.basename;
	const oldFolderName = extractFolderName(plugin.settings.folderNoteName, oldFileName) || oldFileName;
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	const excludedFolder = getExcludedFolder(plugin, newFolder?.path || '', true);
	const detachedExcludedFolder = getDetachedFolder(plugin, newFolder?.path || '');
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);

	if (!excludedFolder?.disableFolderNote && folderName === newFolder?.name && !detachedExcludedFolder) {
		addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
		addCSSClassToFileExplorerEl(newFolder.path, 'has-folder-note', false, plugin);
		return;
	} else if (excludedFolder?.disableFolderNote || (folderName !== newFolder?.name)) {
		removeCSSClassFromFileExplorerEL(file.path, 'is-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(newFolder?.path || '', 'has-folder-note', false, plugin);
	}

	if (excludedFolder?.disableSync || !plugin.settings.syncFolderName) { return; }


	if (folderName === newFolder?.name) {
		addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(oldFolder?.path, 'has-folder-note', false, plugin);
		addCSSClassToFileExplorerEl(newFolder.path, 'has-folder-note', false, plugin);
		return;
	}

	// file matched folder name before rename
	// file hasnt moved just renamed
	// Need to rename the folder
	if (!oldFolder) return;
	if (oldFolderName === oldFolder.name && newFolder?.path === oldFolder.path) {
		return renameFolderOnFileRename(file, oldPath, oldFolder, plugin);
	} else if (folderNote && oldFolderName === oldFolder.name) {
		return renameFolderOnFileRename(file, oldPath, oldFolder, plugin);
	}
}

async function renameFolderOnFileRename(file: TFile, oldPath: string, oldFolder: TAbstractFile, plugin: FolderNotesPlugin) {
	const newFolderName = extractFolderName(plugin.settings.folderNoteName, file.basename);
	if (!newFolderName) {
		removeCSSClassFromFileExplorerEL(oldFolder.path, 'has-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(file.path, 'is-folder-note', false, plugin);
		return;
	} else if (newFolderName === oldFolder.name) {
		addCSSClassToFileExplorerEl(oldFolder.path, 'has-folder-note', false, plugin);
		addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
		return;
	}

	let newFolderPath = '';
	if (plugin.settings.storageLocation === 'insideFolder') {
		if (oldFolder.parent?.path === '/') {
			newFolderPath = `${newFolderName}`;
		} else {
			newFolderPath = oldFolder.parent?.path + '/' + newFolderName;
		}
	} else {
		const parentFolderPath = getFolderPathFromString(file.path);
		if (parentFolderPath.trim() === '' || parentFolderPath.trim() === '/') {
			newFolderPath = `${newFolderName}`;
		} else {
			newFolderPath = `${parentFolderPath}/${newFolderName}`;
		}
	}

	if (plugin.app.vault.getAbstractFileByPath(newFolderPath)) {
		await plugin.app.fileManager.renameFile(file, oldPath);
		return new Notice('A folder with the same name already exists');
	}
	plugin.app.fileManager.renameFile(oldFolder, newFolderPath);
}

function updateExcludedFolderPath(folder: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	const excludedFolders = plugin.settings.excludeFolders.filter(
		(excludedFolder) => excludedFolder.path?.includes(oldPath),
	);

	excludedFolders.forEach((excludedFolder) => {
		if (excludedFolder.path === oldPath) {
			excludedFolder.path = folder.path;
			return;
		}
		if (!excludedFolder.path) return;
		const folders = excludedFolder.path.split('/');
		if (folders.length < 1) {
			folders.push(excludedFolder.path);
		}

		folders[folders.indexOf(folder.name)] = folder.name;
		excludedFolder.path = folders.join('/');
	});
	plugin.saveSettings();
}

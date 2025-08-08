import { TFile, TFolder, Notice, type TAbstractFile } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import {
	extractFolderName, getFolderNote, getFolderNoteFolder,
} from '../functions/folderNoteFunctions';
import {
	getExcludedFolder, addExcludedFolder,
	updateExcludedFolder, deleteExcludedFolder, getDetachedFolder,
} from '../ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import {
	removeCSSClassFromFileExplorerEL, addCSSClassToFileExplorerEl,
	markFileAsFolderNote, unmarkFileAsFolderNote,
	unmarkFolderAsFolderNote, markFolderWithFolderNoteClasses,
	hideFolderNoteInFileExplorer, removeActiveFolder, setActiveFolder,
} from 'src/functions/styleFunctions';
import {
	getFolderPathFromString, removeExtension, getFileNameFromPathString,
} from 'src/functions/utils';

export function handleRename(
	file: TAbstractFile,
	oldPath: string,
	plugin: FolderNotesPlugin,
): void {
	let folder = file.parent;
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
		folder = file;
		plugin.tabManager.updateTab(folder.path);
		updateExcludedFolderPath(folder, oldPath, plugin);
		if (isFolderRename(folder, oldPath)) {
			handleFolderRename(folder, oldPath, plugin);
			return;
		}
		return handleFolderMove(folder, oldPath, plugin);

	} else if (file instanceof TFile) {
		if (isFileRename(file, oldPath)) {
			handleFileRename(file, oldPath, plugin);
			return;
		}
		handleFileMove(file, oldPath, plugin);
		return;

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

export function handleFolderMove(file: TFolder, oldPath: string, plugin: FolderNotesPlugin): void {
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

// eslint-disable-next-line complexity
export async function handleFileMove(
	file: TFile,
	oldPath: string,
	plugin: FolderNotesPlugin,
): Promise<void> {
	const { folderName, oldFileName, newFolder, excludedFolder, oldFolder, folderNote } = getArgs(
		plugin, file, oldPath,
	);

	const isFolderNoteInNewFolder = folderName === newFolder?.name;
	const fileMovedFromOldFolderNote = oldFolder && oldFolder.name === oldFileName
		&& newFolder?.path !== oldFolder.path;

	// this is for turning files into folder notes for folders that already have a folder note
	// e.g. Turn into folder note for "Folder name"
	const isFileWithExistingNote = folderName === newFolder?.name && folderNote;

	if (isFileWithExistingNote) {
		renameExistingFolderNote(
			file, oldPath, plugin, excludedFolder, oldFolder,
		);
	} else if (isFolderNoteInNewFolder) {
		if (excludedFolder?.disableFolderNote) { return; }
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
	} else if (fileMovedFromOldFolderNote) {
		unmarkFileAsFolderNote(file, plugin);
		if (oldFolder instanceof TFolder) {
			removeActiveFolder(plugin);
			hideFolderNoteInFileExplorer(oldFolder.path, plugin);
			unmarkFolderAsFolderNote(oldFolder, plugin);
		}
	}
}



function getArgs(plugin: FolderNotesPlugin, file: TFile, oldPath: string): {
	folderName: string;
	oldFileName: string;
	newFolder: TAbstractFile | null;
	excludedFolder: ExcludedFolder | undefined;
	oldFolder: TAbstractFile | null;
	folderNote: TFile | null | undefined;
} {
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename)
		|| file.basename;
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	let excludedFolder = getExcludedFolder(plugin, newFolder?.path || '', true);
	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);

	return {
		folderName,
		oldFileName,
		newFolder,
		excludedFolder,
		oldFolder,
		folderNote,
	};
}

function renameExistingFolderNote(
	file: TFile, oldPath: string, plugin: FolderNotesPlugin,
	excludedFolder: ExcludedFolder | undefined,
	oldFolder: TAbstractFile | null,
): void {
	let excludedFolderExisted = true;
	let disabledSync = false;

	if (!excludedFolder) {
		excludedFolderExisted = false;
		excludedFolder = new ExcludedFolder(
			oldFolder?.path || '',
			plugin.settings.excludeFolders.length,
			undefined,
			plugin,
		);
		addExcludedFolder(plugin, excludedFolder);
	} else if (!excludedFolder.disableSync) {
		disabledSync = false;
		excludedFolder.disableSync = true;
		updateExcludedFolder(plugin, excludedFolder, excludedFolder);
	}
	plugin.app.fileManager.renameFile(file, oldPath).then(() => {
		if (!excludedFolder) { return; }
		if (!excludedFolderExisted) {
			deleteExcludedFolder(plugin, excludedFolder);
		} else if (!disabledSync) {
			excludedFolder.disableSync = false;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		}
	});
}



export async function handleFolderRename(
	file: TFolder, oldPath: string, plugin: FolderNotesPlugin,
): Promise<void> {
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.name);
	const oldFileName = plugin.settings.folderNoteName
		.replace('{{folder_name}}', getFileNameFromPathString(oldPath));

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

// eslint-disable-next-line complexity
export async function handleFileRename(
	file: TFile,
	oldPath: string,
	plugin: FolderNotesPlugin,
): Promise<void> {
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFileName = file.basename;
	if (oldFileName === newFileName) { return; }

	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename)
		|| file.basename;
	const oldFolderName = extractFolderName(plugin.settings.folderNoteName, oldFileName)
		|| oldFileName;
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	const excludedFolder = getExcludedFolder(plugin, newFolder?.path || '', true);
	const detachedExcludedFolder = getDetachedFolder(plugin, newFolder?.path || '');
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);

	// Handle folder note creation
	if (shouldCreateFolderNote(excludedFolder, folderName, newFolder, detachedExcludedFolder)) {
		if (newFolder) {
			handleFolderNoteCreation(file, newFolder, plugin);
		}
		return;
	}

	// Handle folder note removal
	if (shouldRemoveFolderNoteClasses(excludedFolder, folderName, newFolder)) {
		handleFolderNoteRemoval(file, newFolder, plugin);
	}

	// Early return if sync is disabled
	if (excludedFolder?.disableSync || !plugin.settings.syncFolderName) {
		return;
	}

	// Handle same folder rename
	if (folderName === newFolder?.name && newFolder) {
		handleSameFolderRename(file, newFolder, oldFolder, plugin);
		return;
	}

	// Handle folder rename on file rename
	if (shouldRenameFolderOnFileRename(oldFolderName, oldFolder, newFolder, folderNote)) {
		return renameFolderOnFileRename(file, oldPath, oldFolder!, plugin);
	}
}

async function renameFolderOnFileRename(
	file: TFile,
	oldPath: string,
	oldFolder: TAbstractFile,
	plugin: FolderNotesPlugin,
): Promise<void> {
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
		new Notice('A folder with the same name already exists');
		return;
	}
	plugin.app.fileManager.renameFile(oldFolder, newFolderPath);
}

function updateExcludedFolderPath(
	folder: TFolder,
	oldPath: string,
	plugin: FolderNotesPlugin,
): void {
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


function shouldCreateFolderNote(
	excludedFolder: ExcludedFolder | undefined,
	folderName: string,
	newFolder: TAbstractFile | null,
	detachedExcludedFolder: ExcludedFolder | undefined,
): boolean {
	return !excludedFolder?.disableFolderNote
		&& folderName === (newFolder as TFolder)?.name
		&& !detachedExcludedFolder;
}

function shouldRemoveFolderNoteClasses(
	excludedFolder: ExcludedFolder | undefined,
	folderName: string,
	newFolder: TAbstractFile | null,
): boolean {
	return excludedFolder?.disableFolderNote || (folderName !== (newFolder as TFolder)?.name);
}

function handleFolderNoteCreation(
	file: TFile,
	newFolder: TAbstractFile,
	plugin: FolderNotesPlugin,
): void {
	addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
	addCSSClassToFileExplorerEl(newFolder.path, 'has-folder-note', false, plugin);
}

function handleFolderNoteRemoval(
	file: TFile,
	newFolder: TAbstractFile | null,
	plugin: FolderNotesPlugin,
): void {
	removeCSSClassFromFileExplorerEL(file.path, 'is-folder-note', false, plugin);
	removeCSSClassFromFileExplorerEL(newFolder?.path || '', 'has-folder-note', false, plugin);
}

function handleSameFolderRename(
	file: TFile,
	newFolder: TAbstractFile,
	oldFolder: TAbstractFile | null,
	plugin: FolderNotesPlugin,
): void {
	addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
	removeCSSClassFromFileExplorerEL(oldFolder?.path, 'has-folder-note', false, plugin);
	addCSSClassToFileExplorerEl(newFolder.path, 'has-folder-note', false, plugin);
}

function shouldRenameFolderOnFileRename(
	oldFolderName: string,
	oldFolder: TAbstractFile | null,
	newFolder: TAbstractFile | null,
	folderNote: TFile | null | undefined,
): boolean {
	if (!oldFolder) return false;

	const oldFolderAsFolder = oldFolder as TFolder;
	const newFolderAsFolder = newFolder as TFolder;

	return (oldFolderName === oldFolderAsFolder.name
		&& newFolderAsFolder?.path === oldFolderAsFolder.path)
		|| (folderNote !== null && oldFolderName === oldFolderAsFolder.name);
}

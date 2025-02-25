import { TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { extractFolderName, getFolderNote, getFolderNoteFolder } from '../functions/folderNoteFunctions';
import { getExcludedFolder, addExcludedFolder, updateExcludedFolder, deleteExcludedFolder, getDetachedFolder } from '../ExcludeFolders/functions/folderFunctions';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { removeCSSClassFromEL, addCSSClassToTitleEL } from 'src/functions/styleFunctions';
import { getFolderPathFromString, removeExtension, getFileNameFromPathString } from 'src/functions/utils';

export function handleRename(file: TAbstractFile, oldPath: string, plugin: FolderNotesPlugin) {
	const folder = file.parent;
	const oldFolder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(oldPath));
	const isRename = (file.parent?.path === getFolderPathFromString(oldPath));
	if (folder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(folder)) {
			addCSSClassToTitleEL(folder.path, 'only-has-folder-note', plugin);
		} else {
			removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
		}
	}

	if (oldFolder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(oldFolder)) {
			addCSSClassToTitleEL(oldFolder.path, 'only-has-folder-note', plugin);
		} else {
			removeCSSClassFromEL(oldFolder.path, 'only-has-folder-note', plugin);
		}
	}

	if (file instanceof TFolder) {
		plugin.tabManager.updateTab(file.path);
		updateExcludedFolderPath(file, oldPath, plugin);
		if (isRename) {
			return handleFolderRename(file, oldPath, plugin);
		} else {
			return handleFolderMove(file, oldPath, plugin);
		}
	} else if (file instanceof TFile) {
		if (isRename) {
			return handleFileRename(file, oldPath, plugin);
		} else {
			return handleFileMove(file, oldPath, plugin);
		}
	}
}


export function handleFolderMove(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	// Soon
	// Will be useful to move folder notes along with the folder
	// When the folder note is in the parent folder
}

export async function handleFileMove(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename) || file.basename;
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);
	let excludedFolder = await getExcludedFolder(plugin, newFolder?.path || '', true);
	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);

	// file has been moved into position where it can be a folder note!
	if (folderName === newFolder?.name && folderNote) {
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
	} else if (oldFolder && oldFolder.name === oldFileName && newFolder?.path !== oldFolder.path) {
		// the note has been moved somewhere and is no longer a folder note
		// cleanup css on the folder and note
		removeCSSClassFromEL(oldFolder.path, 'has-folder-note', plugin);
		removeCSSClassFromEL(file.path, 'is-folder-note', plugin);
		removeCSSClassFromEL(oldPath, 'is-folder-note', plugin);
	}
}

export async function handleFolderRename(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.name);
	const oldFileName = plugin.settings.folderNoteName.replace('{{folder_name}}', getFileNameFromPathString(oldPath));

	if (fileName === oldFileName) { return; }


	const folderNote = getFolderNote(plugin, oldPath);
	if (!(folderNote instanceof TFile)) return;


	const excludedFolder = await getExcludedFolder(plugin, file.path, true);
	if (excludedFolder?.disableSync && !folderNote) {
		return removeCSSClassFromEL(file.path, 'has-folder-note', plugin);
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

export async function handleFileRename(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const oldFileName = removeExtension(getFileNameFromPathString(oldPath));
	const newFileName = file.basename;
	if (oldFileName === newFileName) { return; }

	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename) || file.basename;
	const oldFolderName = extractFolderName(plugin.settings.folderNoteName, oldFileName) || oldFileName;
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	const excludedFolder = await getExcludedFolder(plugin, newFolder?.path || '', true);
	const detachedExcludedFolder = getDetachedFolder(plugin, newFolder?.path || '');
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);

	if (!excludedFolder?.disableFolderNote && folderName === newFolder?.name && !detachedExcludedFolder) {
		addCSSClassToTitleEL(file.path, 'is-folder-note', plugin);
		addCSSClassToTitleEL(newFolder.path, 'has-folder-note', plugin);
		return;
	} else if (excludedFolder?.disableFolderNote || (folderName !== newFolder?.name)) {
		removeCSSClassFromEL(file.path, 'is-folder-note', plugin);
		removeCSSClassFromEL(newFolder?.path || '', 'has-folder-note', plugin);
	}

	if (excludedFolder?.disableSync || !plugin.settings.syncFolderName) { return; }


	if (folderName === newFolder?.name) {
		addCSSClassToTitleEL(file.path, 'is-folder-note', plugin);
		removeCSSClassFromEL(oldFolder?.path, 'has-folder-note', plugin);
		addCSSClassToTitleEL(newFolder.path, 'has-folder-note', plugin);
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
		removeCSSClassFromEL(oldFolder.path, 'has-folder-note', plugin);
		removeCSSClassFromEL(file.path, 'is-folder-note', plugin);
		return;
	} else if (newFolderName === oldFolder.name) {
		addCSSClassToTitleEL(oldFolder.path, 'has-folder-note', plugin);
		addCSSClassToTitleEL(file.path, 'is-folder-note', plugin);
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
		(excludedFolder) => excludedFolder.path?.includes(oldPath)
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

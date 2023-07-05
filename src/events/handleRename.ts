import { TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { extractFolderName, getFolderNote, getFolderNoteFolder } from '../functions/folderNoteFunctions';
import { getExcludedFolder, ExcludedFolder, addExcludedFolder, updateExcludedFolder, deleteExcludedFolder } from '../excludedFolder';
export function handleFolderRename(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', file.name);
	const folder = plugin.app.vault.getAbstractFileByPath(file.path);
	const folderNote = getFolderNote(plugin, oldPath);
	if (!(folderNote instanceof TFile)) return;

	if (!(folder instanceof TFolder)) return;
	const excludedFolders = plugin.settings.excludeFolders.filter(
		(excludedFolder) => excludedFolder.path.includes(oldPath)
	);

	excludedFolders.forEach((excludedFolder) => {
		if (excludedFolder.path === oldPath) {
			excludedFolder.path = folder.path;
			return;
		}
		const folders = excludedFolder.path.split('/');
		if (folders.length < 1) {
			folders.push(excludedFolder.path);
		}

		folders[folders.indexOf(folder.name)] = folder.name;
		excludedFolder.path = folders.join('/');
	});
	plugin.saveSettings();

	const excludedFolder = getExcludedFolder(plugin, file.path);
	if (excludedFolder?.disableSync && !folderNote) {
		return plugin.removeCSSClassFromEL(file.path, 'has-folder-note');
	}

	let newPath = '';
	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = plugin.getFolderPathFromString(file.path);
		const oldParentFolderPath = plugin.getFolderPathFromString(oldPath);
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
	plugin.app.vault.rename(folderNote, newPath);
}

export function handleFileRename(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const oldFileName = plugin.removeExtension(plugin.getFileNameFromPathString(oldPath));
	const oldFolder = getFolderNoteFolder(plugin, oldPath, oldFileName);
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename) || file.basename;
	const oldFolderName = extractFolderName(plugin.settings.folderNoteName, oldFileName) || oldFileName;
	const newFolder = getFolderNoteFolder(plugin, file, file.basename);
	let excludedFolder = getExcludedFolder(plugin, newFolder?.path || '');
	const folderNote = getFolderNote(plugin, oldPath, plugin.settings.storageLocation, file);

	if (excludedFolder?.disableSync && folderName === newFolder?.name) {
		plugin.addCSSClassToTitleEL(file.path, 'is-folder-note');
		plugin.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
		return;
	} else if (excludedFolder?.disableSync) {
		plugin.removeCSSClassFromEL(file.path, 'is-folder-note');
		plugin.removeCSSClassFromEL(newFolder?.path || '', 'has-folder-note');
		return;
	}

	// file has been moved into position where it can be a folder note!
	if (folderName === newFolder?.name && folderNote) {
		new Notice('Folder with same name already exists!');
		let excludedFolderExisted = true;
		let disabledSync = false;

		if (!excludedFolder) {
			excludedFolderExisted = false;
			excludedFolder = new ExcludedFolder(oldFolder?.path || '', plugin.settings.excludeFolders.length);
			addExcludedFolder(plugin, excludedFolder);
		} else if (!excludedFolder.disableSync) {
			disabledSync = false;
			excludedFolder.disableSync = true;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		}
		return plugin.app.vault.rename(file, oldPath).then(() => {
			if (!excludedFolder) { return; }
			if (!excludedFolderExisted) {
				deleteExcludedFolder(plugin, excludedFolder);
			} else if (!disabledSync) {
				excludedFolder.disableSync = false;
				updateExcludedFolder(plugin, excludedFolder, excludedFolder);
			}
		});
	}
	if (folderName === newFolder?.name) {
		plugin.addCSSClassToTitleEL(file.path, 'is-folder-note');
		plugin.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
		plugin.removeCSSClassFromEL(oldFolder?.path, 'has-folder-note');
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

	// the note has been moved somewhere and is no longer a folder note
	// cleanup css on the folder and note
	if (oldFolder.name === oldFileName && newFolder?.path !== oldFolder.path) {
		plugin.removeCSSClassFromEL(oldFolder.path, 'has-folder-note');
		plugin.removeCSSClassFromEL(file.path, 'is-folder-note');
		plugin.removeCSSClassFromEL(oldPath, 'is-folder-note');
	}
}

async function renameFolderOnFileRename(file: TFile, oldPath: string, oldFolder: TAbstractFile, plugin: FolderNotesPlugin) {
	const newFolderName = extractFolderName(plugin.settings.folderNoteName, file.basename);
	if (!newFolderName) {
		plugin.removeCSSClassFromEL(oldFolder.path, 'has-folder-note');
		plugin.removeCSSClassFromEL(file.path, 'is-folder-note');
		return;
	} else if (newFolderName === oldFolder.name) {
		plugin.addCSSClassToTitleEL(oldFolder.path, 'has-folder-note');
		plugin.addCSSClassToTitleEL(file.path, 'is-folder-note');
		return;
	}
	let newFolderPath = '';
	if (plugin.settings.storageLocation === 'insideFolder') {
		newFolderPath = oldFolder.parent?.path + '/' + newFolderName;
	} else {
		const parentFolderPath = plugin.getFolderPathFromString(file.path);
		if (parentFolderPath.trim() === '') {
			newFolderPath = `${newFolderName}`;
		} else {
			newFolderPath = `${parentFolderPath}/${newFolderName}`;
		}
	}
	if (plugin.app.vault.getAbstractFileByPath(newFolderPath) || plugin.app.vault.getAbstractFileByPath(newFolderName || '')) {
		await plugin.app.vault.rename(file, oldPath);
		return new Notice('A folder with the same name already exists');
	}
	await plugin.app.vault.rename(oldFolder, newFolderPath);
}

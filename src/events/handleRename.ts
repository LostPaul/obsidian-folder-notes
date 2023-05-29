import { TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { extractFolderName, getFolderNote } from '../folderNoteFunctions';
export function handleFolderRename(file: TFolder, oldPath: string, plugin: FolderNotesPlugin) {
	const oldFileName = plugin.getFileNameFromPathString(oldPath);
	const folder = plugin.app.vault.getAbstractFileByPath(file.path);
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

		folders[folders.indexOf(oldFileName)] = folder.name;
		excludedFolder.path = folders.join('/');
	});
	plugin.saveSettings();
	const excludedFolder = plugin.getExcludedFolderByPath(file.path);
	const folderNote = getFolderNote(plugin, oldPath);
	if (excludedFolder?.disableSync && !folderNote) {
		return plugin.removeCSSClassFromEL(file.path, 'has-folder-note');
	}

	if (!(folderNote instanceof TFile)) return;
	const newPath = folder.path + '/' + plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name) + '.' + folderNote.extension;
	plugin.app.vault.rename(folderNote, newPath);
}

export function handleFileRename(file: TFile, oldPath: string, plugin: FolderNotesPlugin) {
	const oldFileName = plugin.getFileNameFromPathString(oldPath);
	const oldFilePath = plugin.getFolderPathFromString(oldPath);
	const fileExtension = plugin.getExtensionFromPathString(oldPath);
	const oldFolder = plugin.app.vault.getAbstractFileByPath(oldFilePath);
	const newFilePath = plugin.getFolderPathFromString(file.path);
	const newFolder = plugin.app.vault.getAbstractFileByPath(newFilePath);
	const excludedFolder = plugin.getExcludedFolderByPath(newFolder?.path || '');

	if (excludedFolder?.disableSync && extractFolderName(plugin.settings.folderNoteName, file.name.slice(0, file.name.lastIndexOf('.'))) === newFolder?.name) {
		plugin.addCSSClassToTitleEL(file.path, 'is-folder-note');
		plugin.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
		return;
	} else if (excludedFolder?.disableSync) {
		plugin.removeCSSClassFromEL(file.path, 'is-folder-note');
		plugin.removeCSSClassFromEL(newFolder?.path || '', 'has-folder-note');
		return;
	}

	// file has been moved into position where it can be a folder note!
	if (extractFolderName(plugin.settings.folderNoteName, file.name.slice(0, file.name.lastIndexOf('.'))) === newFolder?.name) {
		plugin.addCSSClassToTitleEL(file.path, 'is-folder-note');
		plugin.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
		return;
	}

	// file matched folder name before rename
	// file hasnt moved just renamed
	// Need to rename the folder
	if (!oldFolder) return;
	if (plugin.settings.folderNoteName.replace('{{folder_name}}', oldFolder.name) + fileExtension === oldFileName && newFilePath === oldFilePath) {
		return renameFolderOnFileRename(file, oldPath, oldFolder, plugin);
	} else if (plugin.settings.folderNoteName.replace('{{folder_name}}', oldFolder.name) + fileExtension === file.name && newFilePath === oldFilePath) {
		return renameFolderOnFileRename(file, oldPath, oldFolder, plugin);
	}

	// the note has been moved somewhere and is no longer a folder note
	// cleanup css on the folder and note
	if (oldFolder.name + plugin.getExtensionFromPathString(oldFilePath) === oldFileName && newFilePath !== oldFilePath) {
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
	const newFolderPath = oldFolder.parent.path + '/' + extractFolderName(plugin.settings.folderNoteName, file.basename);
	if (plugin.app.vault.getAbstractFileByPath(newFolderPath) || plugin.app.vault.getAbstractFileByPath(extractFolderName(plugin.settings.folderNoteName, file.basename) || '')) {
		await plugin.app.vault.rename(file, oldPath);
		return new Notice('A folder with the same name already exists');
	}
	await plugin.app.vault.rename(oldFolder, newFolderPath);
}

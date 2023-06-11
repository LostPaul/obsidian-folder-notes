import FolderNotesPlugin from './main';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { TFolder, TFile, TAbstractFile, Keymap } from 'obsidian';
import DeleteConfirmationModal from './modals/deleteConfirmation';
import { addExcludedFolder, deleteExcludedFolder, getExcludedFolder, ExcludedFolder, updateExcludedFolder } from './excludedFolder';

export async function createFolderNote(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, useModal?: boolean) {
	const leaf = plugin.app.workspace.getLeaf(false);
	const folderName = plugin.getFolderNameFromPathString(folderPath);
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);
	let path = `${folderPath}/${fileName}${plugin.settings.folderNoteType}`;
	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = plugin.getFolderPathFromString(folderPath);
		if (parentFolderPath.trim() === '') {
			path = `${fileName}${plugin.settings.folderNoteType}`;
		} else {
			path = `${parentFolderPath}/${fileName}${plugin.settings.folderNoteType}`;
		}
	} else if (plugin.settings.storageLocation === 'vaultFolder') {
		path = `${fileName}${plugin.settings.folderNoteType}`;
	}
	const file = await plugin.app.vault.create(path, '');
	if (openFile) {
		await leaf.openFile(file);
	}
	if (file) {
		applyTemplate(this, file, plugin.settings.templatePath);
	}

	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	plugin.addCSSClassToTitleEL(path, 'is-folder-note', true);
	plugin.addCSSClassToTitleEL(folder.path, 'has-folder-note');

	if (!plugin.settings.autoCreate) return;
	if (!useModal) return;
	const modal = new FolderNameModal(plugin.app, plugin, folder);
	modal.open();
}

export async function turnIntoFolderNote(plugin: FolderNotesPlugin, file: TFile, folder: TFolder, folderNote?: TFile | null | TAbstractFile) {
	if (folderNote) {
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
		const newPath = `${folder.path}/${folder.name} (${file.stat.ctime.toString().slice(10) + Math.floor(Math.random() * 1000)})${plugin.settings.folderNoteType}`;
		plugin.app.vault.rename(folderNote, newPath).then(() => {
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
	let path = `${folder.path}/${fileName}${plugin.settings.folderNoteType}`;
	if (plugin.settings.storageLocation === 'parentFolder') {
		const parentFolderPath = folder.parent.path;
		if (parentFolderPath.trim() === '') {
			path = `${fileName}${plugin.settings.folderNoteType}`;
		} else {
			path = `${parentFolderPath}/${fileName}${plugin.settings.folderNoteType}`;
		}
	}
	await plugin.app.vault.rename(file, path);
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

export function getFolderNote(plugin: FolderNotesPlugin, folderPath: string, storageLocation?: string) {
	if (!folderPath) return null;
	const folder = {
		path: folderPath,
		name: plugin.getFolderNameFromPathString(folderPath),
	};
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name);

	if ((plugin.settings.storageLocation === 'parentFolder' || storageLocation === 'parentFolder') && storageLocation !== 'insideFolder') {
		folder.path = plugin.getFolderPathFromString(folderPath);
	}
	let path = `${folder.path}/${fileName}`;
	if (folder.path.trim() === '') {
		folder.path = fileName;
		path = `${fileName}`;
	}

	let folderNote = plugin.app.vault.getAbstractFileByPath(path + plugin.settings.folderNoteType);
	if (folderNote instanceof TFile) {
		return folderNote;
	} else {
		if (plugin.settings.folderNoteType === '.canvas') {
			folderNote = plugin.app.vault.getAbstractFileByPath(path + '.md');
		} else {
			folderNote = plugin.app.vault.getAbstractFileByPath(path + '.canvas');
		}
		return folderNote;
	}
}

export function getFolder(plugin: FolderNotesPlugin, file: TFile, storageLocation?: string) {
	if (!file) return null;
	const folderName = extractFolderName(plugin.settings.folderNoteName, file.basename);
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

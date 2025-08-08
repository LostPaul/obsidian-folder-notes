import { TFolder, TFile, type TAbstractFile } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import {
	createFolderNote,
	getFolder,
	getFolderNote,
	turnIntoFolderNote,
} from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import {
	removeCSSClassFromFileExplorerEL,
	addCSSClassToFileExplorerEl,
} from 'src/functions/styleFunctions';

export async function handleCreate(file: TAbstractFile, plugin: FolderNotesPlugin): Promise<void> {
	if (!plugin.app.workspace.layoutReady) return;

	const folder = file.parent;
	if (folder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(folder) && getFolderNote(plugin, folder.path)) {
			addCSSClassToFileExplorerEl(folder.path, 'only-has-folder-note', true, plugin);
		} else {
			removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
		}
	}

	if (file instanceof TFile) {
		handleFileCreation(file, plugin);
	} else if (file instanceof TFolder && plugin.settings.autoCreate) {
		handleFolderCreation(file, plugin);
	}
}

async function handleFileCreation(file: TFile, plugin: FolderNotesPlugin): Promise<void> {
	const folder = getFolder(plugin, file);

	if (!(folder instanceof TFolder) && plugin.settings.autoCreateForFiles) {
		if (!file.parent) { return; }
		const newFolder = await plugin.app.fileManager.createNewFolder(file.parent);
		turnIntoFolderNote(plugin, file, newFolder);
	} else if (folder instanceof TFolder) {
		if (folder.children.length >= 1) {
			removeCSSClassFromFileExplorerEL(folder.path, 'fn-empty-folder', false, plugin);
		}

		const detachedFolder = getExcludedFolder(plugin, folder.path, true);
		if (detachedFolder) { return; }
		const folderNote = getFolderNote(plugin, folder.path);

		if (folderNote && folderNote.path === file.path) {
			addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);
			addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
		} else if (plugin.settings.autoCreateForFiles) {
			if (!file.parent) { return; }
			const newFolder = await plugin.app.fileManager.createNewFolder(file.parent);
			turnIntoFolderNote(plugin, file, newFolder);
		}
	}
}

async function handleFolderCreation(folder: TFolder, plugin: FolderNotesPlugin): Promise<void> {
	let openFile = plugin.settings.autoCreateFocusFiles;

	const attachmentFolderPath = plugin.app.vault.getConfig('attachmentFolderPath') as string;
	const cleanAttachmentFolderPath = attachmentFolderPath?.replace('./', '') || '';
	const attachmentsAreInRootFolder = attachmentFolderPath === './' || attachmentFolderPath === '';
	addCSSClassToFileExplorerEl(folder.path, 'fn-empty-folder', false, plugin);

	if (!plugin.settings.autoCreateForAttachmentFolder) {
		if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === folder.name) return;
	} else if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === folder.name) {
		openFile = false;
	}

	const excludedFolder = getExcludedFolder(plugin, folder.path, true);
	if (excludedFolder?.disableAutoCreate) return;

	const folderNote = getFolderNote(plugin, folder.path);
	if (folderNote) return;

	createFolderNote(plugin, folder.path, openFile, undefined, true);
	addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);
}

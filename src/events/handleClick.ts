import { Keymap, Platform, type TFile } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import { openFolderNote, createFolderNote, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import {
	addCSSClassToFileExplorerEl,
	removeCSSClassFromFileExplorerEL,
} from 'src/functions/styleFunctions';



export async function handleViewHeaderClick(
	event: MouseEvent,
	plugin: FolderNotesPlugin,
): Promise<void> {
	if (!plugin.settings.openFolderNoteOnClickInPath) return;
	event.stopImmediatePropagation();
	event.preventDefault();
	event.stopPropagation();
	if (!(event.target instanceof HTMLElement)) return;

	const folderPath = event.target.getAttribute('data-path');
	if (!folderPath) { return; }

	if (await isExcludedFolder(event, plugin, folderPath)) return;

	const folderNote = getFolderNote(plugin, folderPath);
	if (folderNote) {
		await openFolderNote(plugin, folderNote, event).then(() =>
			handleFolderNoteReveal(plugin, folderNote),
		);
		return;
	} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
		if (await handleFolderNoteCreation(event, plugin, folderPath)) return;
	}
	(event.target as HTMLElement).onclick = null;
	(event.target as HTMLElement).click();
}

async function isExcludedFolder(
	event: MouseEvent,
	plugin: FolderNotesPlugin,
	folderPath: string,
): Promise<boolean> {
	const excludedFolder = getExcludedFolder(plugin, folderPath, true);
	if (excludedFolder?.disableFolderNote) {
		(event.target as HTMLElement).onclick = null;
		(event.target as HTMLElement).click();
		return true;
	} else if (excludedFolder?.enableCollapsing || plugin.settings.enableCollapsing) {
		(event.target as HTMLElement).onclick = null;
		(event.target as HTMLElement).click();
	}
	return false;
}

async function handleFolderNoteReveal(plugin: FolderNotesPlugin, folderNote: TFile): Promise<void> {
	const fileExplorerPlugin = plugin.app.internalPlugins.getEnabledPluginById('file-explorer');
	if (fileExplorerPlugin && Platform.isMobile && plugin.settings.openSidebar.mobile) {
		const OPEN_SIDEBAR_DELAY = 200;
		setTimeout(() => { fileExplorerPlugin.revealInFolder(folderNote); }, OPEN_SIDEBAR_DELAY);
	} else if (fileExplorerPlugin && Platform.isDesktop && plugin.settings.openSidebar.desktop) {
		fileExplorerPlugin.revealInFolder(folderNote);
	}
}

async function handleFolderNoteCreation(
	event: MouseEvent,
	plugin: FolderNotesPlugin,
	folderPath: string,
): Promise<boolean> {
	const usedCtrl = Platform.isMacOS ? event.metaKey : event.ctrlKey;
	if ((plugin.settings.altKey && event.altKey) ||
		(usedCtrl && Keymap.isModEvent(event) === 'tab')) {
		await createFolderNote(plugin, folderPath, true, undefined, true);
		addCSSClassToFileExplorerEl(folderPath, 'has-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(folderPath, 'has-not-folder-note', false, plugin);
		return true;
	}
	return false;
}

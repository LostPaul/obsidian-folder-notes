import { Keymap } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { openFolderNote, createFolderNote, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { addCSSClassToTitleEL, removeCSSClassFromEL } from 'src/functions/styleFunctions';

export async function handleViewHeaderClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	if (!(event.target instanceof HTMLElement)) return;
	if (!plugin.settings.openFolderNoteOnClickInPath) return;

	const folderPath = event.target.getAttribute('data-path');
	if (!folderPath) { return; }
	const excludedFolder = getExcludedFolder(plugin, folderPath);
	if (excludedFolder?.disableFolderNote) {
		event.target.onclick = null;
		event.target.click();
		return;
	} else if (excludedFolder?.enableCollapsing || plugin.settings.enableCollapsing) {
		event.target.onclick = null;
		event.target.click();
	}
	const folderNote = getFolderNote(plugin, folderPath);
	if (folderNote) {
		return openFolderNote(plugin, folderNote, event);
	} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
		if ((plugin.settings.altKey && event.altKey) || (plugin.settings.ctrlKey && Keymap.isModEvent(event) === 'tab')) {
			await createFolderNote(plugin, folderPath, true, undefined, true);
			addCSSClassToTitleEL(folderPath, 'has-folder-note');
			removeCSSClassFromEL(folderPath, 'has-not-folder-note');
			return;
		}
	}
	event.target.onclick = null;
	event.target.click();
}

export async function handleFolderClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	if (!(event.target instanceof HTMLElement)) return;
	if (!event || !event.target) return;
	event.stopImmediatePropagation();

	const folderPath = event.target.parentElement?.getAttribute('data-path');
	if (!folderPath) { return; }

	const excludedFolder = getExcludedFolder(plugin, folderPath);
	if (excludedFolder?.disableFolderNote) {
		event.target.onclick = null;
		event.target.click();
		return;
	} else if (excludedFolder?.enableCollapsing || plugin.settings.enableCollapsing) {
		event.target.onclick = null;
		event.target.click();
	}

	const folderNote = getFolderNote(plugin, folderPath);

	if (folderNote) {
		if (plugin.settings.openByClick) {
			return openFolderNote(plugin, folderNote, event);
		} else if (plugin.settings.openWithCtrl && Keymap.isModEvent(event) === 'tab') {
			return openFolderNote(plugin, folderNote, event);
		} else if (plugin.settings.openWithAlt && event.altKey) {
			return openFolderNote(plugin, folderNote, event);
		} else {
			if (plugin.settings.enableCollapsing) return;
			event.target.parentElement?.click()
			return;
		}
	} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
		if ((plugin.settings.altKey && event.altKey) || (plugin.settings.ctrlKey && Keymap.isModEvent(event) === 'tab')) {
			await createFolderNote(plugin, folderPath, true, undefined, true);
			addCSSClassToTitleEL(folderPath, 'has-folder-note');
			removeCSSClassFromEL(folderPath, 'has-not-folder-note');
			return;
		}
	} else if (!folderNote) {
		if (plugin.settings.enableCollapsing) return;
		return event.target.parentElement?.click();
	}
	
	event.target.onclick = null;
	event.target.click();
}

import { Keymap } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { openFolderNote, createFolderNote, getFolderNote } from 'src/folderNoteFunctions';
export async function handleViewHeaderClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	if (!(event.target instanceof HTMLElement)) return;
	if (!plugin.settings.openFolderNoteOnClickInPath) return;

	const folderPath = event.target.getAttribute('data-path');
	if (!folderPath) { return; }
	const excludedFolder = plugin.getExcludedFolderByPath(folderPath);
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
			await createFolderNote(plugin, folderPath, true, true);
			plugin.addCSSClassToTitleEL(folderPath, 'has-folder-note');
			plugin.removeCSSClassFromEL(folderPath, 'has-not-folder-note');
			return;
		}
	}
	event.target.onclick = null;
	event.target.click();
}

export async function handleFolderClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	if (!(event.target instanceof HTMLElement)) return;
	event.stopImmediatePropagation();

	const folderPath = event.target.parentElement?.getAttribute('data-path');
	if (!folderPath) { return; }
	const excludedFolder = plugin.getExcludedFolderByPath(folderPath);
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
			await createFolderNote(plugin, folderPath, true, true);
			plugin.addCSSClassToTitleEL(folderPath, 'has-folder-note');
			plugin.removeCSSClassFromEL(folderPath, 'has-not-folder-note');
			return;
		}
	}
	event.target.onclick = null;
	event.target.click();
}

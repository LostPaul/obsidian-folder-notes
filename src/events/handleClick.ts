import { Keymap, Platform } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { openFolderNote, createFolderNote, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { addCSSClassToFileExplorerEl, removeCSSClassFromFileExplorerEL } from 'src/functions/styleFunctions';

export async function handleViewHeaderClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	event.stopImmediatePropagation();
	event.preventDefault();
	event.stopPropagation();
	if (!(event.target instanceof HTMLElement)) return;
	if (!plugin.settings.openFolderNoteOnClickInPath) return;

	const folderPath = event.target.getAttribute('data-path');
	if (!folderPath) { return; }
	const excludedFolder = getExcludedFolder(plugin, folderPath, true);
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
		await openFolderNote(plugin, folderNote, event).then(async () => {
			// @ts-ignore
			const fileExplorerPlugin = plugin.app.internalPlugins.getEnabledPluginById('file-explorer');
			if (fileExplorerPlugin && Platform.isMobile && plugin.settings.openSidebar.mobile) {
				setTimeout(() => { fileExplorerPlugin.revealInFolder(folderNote); }, 200);
			} else if (fileExplorerPlugin && Platform.isDesktop && plugin.settings.openSidebar.desktop) {
				fileExplorerPlugin.revealInFolder(folderNote);
			}
		});
		return;
	} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
		if ((plugin.settings.altKey && event.altKey) || (plugin.settings.ctrlKey && Keymap.isModEvent(event) === 'tab')) {
			await createFolderNote(plugin, folderPath, true, undefined, true);
			addCSSClassToFileExplorerEl(folderPath, 'has-folder-note', false, plugin);
			removeCSSClassFromFileExplorerEL(folderPath, 'has-not-folder-note', false, plugin);
			return;
		}
	}
	event.target.onclick = null;
	event.target.click();
}

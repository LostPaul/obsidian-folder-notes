import FolderNotesPlugin from './main';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { TFolder, TFile, TAbstractFile, Keymap } from 'obsidian';
import DeleteConfirmationModal from './modals/deleteConfirmation';

export async function createFolderNote(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, useModal?: boolean) {
	const leaf = plugin.app.workspace.getLeaf(false);
	const folderName = plugin.getFolderNameFromPathString(folderPath);
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);
	const path = `${folderPath}/${fileName}${plugin.settings.folderNoteType}`;
	const file = await plugin.app.vault.create(path, '');
	if (openFile) {
		await leaf.openFile(file);
	}
	if (file) {
		applyTemplate(this, file, plugin.settings.templatePath);
	}
	plugin.addCSSClassToTitleEL(path, 'is-folder-note', true);
	plugin.addCSSClassToTitleEL(file.parent.path, 'has-folder-note');
	if (!plugin.settings.autoCreate) return;
	if (!useModal) return;
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!(folder instanceof TFolder)) return;
	const modal = new FolderNameModal(plugin.app, plugin, folder);
	modal.open();
}

export async function openFolderNote(plugin: FolderNotesPlugin, file: TAbstractFile, evt: MouseEvent) {
	const path = file.path;
	if (plugin.app.workspace.getActiveFile()?.path === path) { return; }
	const leaf = plugin.app.workspace.getLeaf(Keymap.isModEvent(evt) || plugin.settings.openInNewTab);
	if (file instanceof TFile) {
		await leaf.openFile(file);
	}
}

export async function deleteFolderNote(plugin: FolderNotesPlugin, file: TFile) {
	if (plugin.settings.showDeleteConfirmation) {
		return new DeleteConfirmationModal(plugin.app, this, file).open();
	}
	plugin.removeCSSClassFromEL(file.parent.path, 'has-folder-note');
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

export function getFolderNote(plugin: FolderNotesPlugin, folderPath: string) {
	if (!folderPath) return null;
	const folder = {
		path: folderPath,
		name: plugin.getFolderNameFromPathString(folderPath),
	};
	const fileName = plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name);
	let path = `${folder.path}/${fileName}${plugin.settings.folderNoteType}`;
	let folderNote = plugin.app.vault.getAbstractFileByPath(path);

	if (folderNote instanceof TFile) {
		return folderNote;
	} else {
		if (plugin.settings.folderNoteType === '.canvas') {
			folderNote = plugin.app.vault.getAbstractFileByPath(`${folder.path}/${fileName}.md`);
		} else {
			folderNote = plugin.app.vault.getAbstractFileByPath(`${folder.path}/${fileName}.canvas`);
		}
		if (!(folderNote instanceof TFile)) {
			path = `${folder.path}/${folder.name}${plugin.settings.folderNoteType}`;
			folderNote = plugin.app.vault.getAbstractFileByPath(path);
			if (!(folderNote instanceof TFile)) {
				if (plugin.settings.folderNoteType === '.canvas') {
					folderNote = plugin.app.vault.getAbstractFileByPath(`${folder.path}/${folder.name}.md`);
				} else {
					folderNote = plugin.app.vault.getAbstractFileByPath(`${folder.path}/${folder.name}.canvas`);
				}
				return folderNote;
			}
		} else {
			return folderNote;
		}
	}
}

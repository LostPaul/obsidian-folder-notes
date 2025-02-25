import BackupWarningModal from './BackupWarning';
import FolderNotesPlugin from 'src/main';
import { Setting } from 'obsidian';

export default class RenameFolderNotesModal extends BackupWarningModal {
	constructor(plugin: FolderNotesPlugin, title: string, description: string, callback: (...args: any[]) => void, args: any[] = []) {
		super(plugin, title, description, callback, args);
	}

	insertCustomHtml(): void {
		const { contentEl } = this;
		new Setting(contentEl)
			.setName('Old Folder Note Name')
			.setDesc('Every folder note that matches this name will be renamed to the new folder note name.')
			.addText((text) => text
				.setPlaceholder('Enter the old folder note name')
				.setValue(this.plugin.settings.oldFolderNoteName || '')
				.onChange(async (value) => {
					this.plugin.settings.oldFolderNoteName = value;
				})
			);

		new Setting(contentEl)
			.setName('New Folder Note Name')
			.setDesc('Every folder note that matches the old folder note name will be renamed to this name.')
			.addText((text) => text
				.setPlaceholder('Enter the new folder note name')
				.setValue(this.plugin.settings.folderNoteName || '')
				.onChange(async (value) => {
					this.plugin.settings.folderNoteName = value;
					this.plugin.settingsTab.display();
				})
			);
	}
}

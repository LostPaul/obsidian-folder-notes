import { Plugin, TFile, TFolder, TAbstractFile, Notice, Keymap } from 'obsidian';
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { Commands } from './commands';
import DeleteConfirmationModal from './modals/deleteConfirmation';

export default class FolderNotesPlugin extends Plugin {
	observer: MutationObserver;
	settings: FolderNotesSettings;
	settingsTab: SettingsTab;

	async onload() {
		console.log('loading folder notes plugin');
		await this.loadSettings();
		this.settingsTab = new SettingsTab(this.app, this);
		this.addSettingTab(this.settingsTab);

		// Add CSS Classes
		document.body.classList.add('folder-notes-plugin');
		if (this.settings.hideFolderNote) { document.body.classList.add('hide-folder-note'); }
		if (this.settings.underlineFolder) { document.body.classList.add('folder-note-underline'); }
		if (!this.settings.allowWhitespaceCollapsing) { document.body.classList.add('fn-whitespace-stop-collapsing'); }

		new Commands(this.app, this).registerCommands();

		this.observer = new MutationObserver((mutations: MutationRecord[]) => {
			mutations.forEach((rec) => {
				if (rec.type === 'childList') {
					(<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
						.forEach((element: HTMLElement) => {
							if (element.onclick) return;
							element.onclick = (event: MouseEvent) => this.handleFolderClick(event);
							if (!this.settings.underlineFolder) return;
							if (element.classList.contains('has-folder-note') || element.classList.contains('has-not-folder-note')) return;
							const folder = this.app.vault.getAbstractFileByPath(element.parentElement?.getAttribute('data-path') as string);
							if (!folder) return element.classList.add('has-not-folder-note');
							if (this.app.vault.getAbstractFileByPath(folder.path + '/' + folder.name + '.md')) {
								element.classList.add('has-folder-note');
							}
						});
				}
			});
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
		this.registerEvent(this.app.vault.on('create', (folder: TAbstractFile) => {
			if (!this.app.workspace.layoutReady) return;
			if (!this.settings.autoCreate) return;
			if (!(folder instanceof TFolder)) return;

			const excludedFolder = this.getExcludedFolderByPath(folder.path)
			if (excludedFolder?.disableAutoCreate) return;

			const path = folder.path + '/' + folder.name + '.md';
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file) return;
			this.createFolderNote(path, true, true);

		}));

		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			if (!this.settings.syncFolderName) return;
			if (file instanceof TFolder) {
				this.handleFolderRename(file, oldPath)
			} else if (file instanceof TFile) {
				this.handleFileRename(file, oldPath)
			}
		}));
	}

	async handleFolderClick(event: MouseEvent) {
		if (!(event.target instanceof HTMLElement)) return;
		event.stopImmediatePropagation();

		const folder = event.target.parentElement?.getAttribute('data-path');
		if(!folder) { return }
		const excludedFolder = this.getExcludedFolderByPath(folder);
		if (excludedFolder?.disableFolderNote) {
			event.target.onclick = null;
			event.target.click();
			event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
				.forEach((element: HTMLElement) => {
					if (element.innerText === (event.target as HTMLElement)?.innerText && element.classList.contains('is-folder-note')) {
						element.removeClass('is-folder-note');
					}
				});
			return;
		} else if (excludedFolder?.enableCollapsing || this.settings.enableCollapsing) {
			event.target.onclick = null;
			event.target.click();
		}
		const path = folder + '/' + event.target.innerText + '.md';

		if (this.app.vault.getAbstractFileByPath(path)) {
			event.target.classList.remove('has-not-folder-note');
			event.target.classList.add('has-folder-note');
			this.openFolderNote(path);
			if (!this.settings.hideFolderNote) return;
			event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
				.forEach((element: HTMLElement) => {
					if (element.innerText === (event.target as HTMLElement)?.innerText && !element.classList.contains('is-folder-note')) {
						element.addClass('is-folder-note');
					}
				});

		} else if (event.altKey || Keymap.isModEvent(event) == 'tab') {
			if ((this.settings.altKey && event.altKey) || (this.settings.ctrlKey && Keymap.isModEvent(event) == 'tab')) {
				this.createFolderNote(path, true, true);
				event.target.classList.remove('has-not-folder-note');
				event.target.classList.add('has-folder-note');
				if (!this.settings.hideFolderNote) return;
				event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
					.forEach((element: HTMLElement) => {
						if (element.innerText === (event.target as HTMLElement)?.innerText && !element.classList.contains('is-folder-note')) {
							element.addClass('is-folder-note');
						}
					});
			} else {
				event.target.classList.remove('has-folder-note');
				event.target.onclick = null;
				event.target.click();
			}
		} else {
			event.target.classList.remove('has-folder-note');
			event.target.onclick = null;
			event.target.click();
		}
	}

	handleFolderRename(file: TFolder, oldPath: string) {
		const oldFileName = this.getNameFromPathString(oldPath)
		const folder = this.app.vault.getAbstractFileByPath(file.path);
		if (!folder) return;
		const excludedFolders = this.settings.excludeFolders.filter(
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
		this.saveSettings();
		const excludedFolder = this.getExcludedFolderByPath(oldPath)
		if (excludedFolder?.disableSync) return;

		const newPath = folder.path + '/' + folder.name + '.md';
		if (!(folder instanceof TFolder)) return;
		const note = this.app.vault.getAbstractFileByPath(oldPath + '/' + oldFileName + '.md');
		if (!note) return;
		(note as TFile).path = folder.path + '/' + oldFileName + '.md';
		this.app.vault.rename(note, newPath);
	}

	handleFileRename(file: TFile, oldPath: string) {
		const oldFileName = this.getNameFromPathString(oldPath)
		const oldFilePath = this.getPathFromString(oldPath)
		const folder = this.app.vault.getAbstractFileByPath(oldFilePath);
		if (!folder) return;
		if (folder.name === file.basename) return;

		const excludedFolder = this.getExcludedFolderByPath(folder.path)
		if (excludedFolder?.disableSync) return;
		if (oldFileName !== folder.name + '.md') return;
		let newFolderPath = this.getPathFromString(file.path);
		if (newFolderPath.lastIndexOf('/') > 0) {
			newFolderPath = newFolderPath.slice(0, newFolderPath.lastIndexOf('/')) + '/';
		} else {
			newFolderPath = '';
		}
		newFolderPath += file.name.replace('.md', '');
		if (this.app.vault.getAbstractFileByPath(newFolderPath)) {
			this.app.vault.rename(file, oldPath);
			return new Notice('A folder with the same name already exists');
		}
		if (folder instanceof TFolder) {
			let newPath = file.basename;
			if (folder.path.indexOf('/') >= 0) {
				newPath = this.getPathFromString(folder.path) + '/' + newPath;
			}
			this.app.vault.rename(folder, newPath);
		}
	}

	async createFolderNote(path: string, openFile: boolean, useModal?: boolean) {
		const leaf = this.app.workspace.getLeaf(false);
		const file = await this.app.vault.create(path, '');
		if (openFile) {
			await leaf.openFile(file);
		}
		if (file) {
			applyTemplate(this, file, this.settings.templatePath);
		}
		if (!this.settings.autoCreate) return;
		if (!useModal) return;
		const folder = this.app.vault.getAbstractFileByPath(this.getPathFromString(path));
		if (!(folder instanceof TFolder)) return;
		const modal = new FolderNameModal(this.app, this, folder);
		modal.open();
	}

	async openFolderNote(path: string) {
		const leaf = this.app.workspace.getLeaf(false);
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			await leaf.openFile(file);
		}
	}

	async deleteFolderNote(file: TFile) {
		if (this.settings.showDeleteConfirmation) {
			return new DeleteConfirmationModal(this.app, this, file).open();
		}
		await this.app.vault.delete(file);
	}

	getNameFromPathString(path: string): string {
		return path.substring(path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/' || '\\') + 1 : 0)
	}

	getPathFromString(path: string): string {
		const subString = path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/') : path.length;
		return path.substring(0, subString)
	}

	getExcludedFolderByPath(path: string): ExcludedFolder | undefined {
		return this.settings.excludeFolders.find((excludedFolder) => {
			if(excludedFolder.path === path) { return true }
			if(!excludedFolder.subFolders) { return false }
			return this.getPathFromString(path).startsWith(excludedFolder.path)
		})
	}

	onunload() {
		console.log('unloading folder notes plugin');
		this.observer.disconnect();
		document.body.classList.remove('folder-notes-plugin');
		document.body.classList.remove('folder-note-underline');
		document.body.classList.remove('hide-folder-note');
		document.body.classList.remove('fn-whitespace-stop-collapsing');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

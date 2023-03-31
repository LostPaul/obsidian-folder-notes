import { Plugin, TFile, TFolder, TAbstractFile, Notice, Keymap } from 'obsidian';
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { Commands } from './commands';
import DeleteConfirmationModal from './modals/deleteConfirmation';
export default class FolderNotesPlugin extends Plugin {
	observer: MutationObserver;
	folders: TFolder[] = [];
	settings: FolderNotesSettings;
	settingsTab: SettingsTab;
	async onload() {
		console.log('loading folder notes plugin');
		await this.loadSettings();
		this.settingsTab = new SettingsTab(this.app, this);
		this.addSettingTab(this.settingsTab);
		document.body.classList.add('folder-notes-plugin');
		if (this.settings.hideFolderNote) {
			document.body.classList.add('hide-folder-note');
		} else {
			document.body.classList.remove('hide-folder-note');
		}
		if (this.settings.underlineFolder) {
			document.body.classList.add('folder-note-underline');
		} else {
			document.body.classList.remove('folder-note-underline');
		}
		if (this.settings.enableCollapsing) {
			document.body.classList.add('fn-whitespace-collapsing');
		} else {
			document.body.classList.remove('fn-whitespace-collapsing');
		}
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

			const excludedFolder = this.settings.excludeFolders.find(
				(excludedFolder) => (excludedFolder.path === folder.path) ||
					(excludedFolder.path === folder.path?.slice(0, folder?.path.lastIndexOf('/') >= 0 ?
						folder.path?.lastIndexOf('/') : folder.path.length)
						&& excludedFolder.subFolders));
			if (excludedFolder?.disableAutoCreate) return;

			const path = folder.path + '/' + folder.name + '.md';
			if (!path) return;
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file) return;
			this.createFolderNote(path, true, true);

		}));

		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			if (!this.settings.syncFolderName) return;
			if (file instanceof TFolder) {
				const folder = this.app.vault.getAbstractFileByPath(file?.path);
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

					const oldName = oldPath.substring(oldPath.lastIndexOf('/' || '\\') >= 0 ? oldPath.lastIndexOf('/') : 0);
					folders[folders.indexOf(oldName.replace('/', ''))] = folder.name;
					excludedFolder.path = folders.join('/');
				});
				this.saveSettings();
				const excludedFolder = this.settings.excludeFolders.find(
					(excludedFolder) => (excludedFolder.path === oldPath) ||
						(excludedFolder.path === oldPath?.slice(0, oldPath.lastIndexOf('/') >= 0 ?
							oldPath.lastIndexOf('/') : oldPath.length)
							&& excludedFolder.subFolders));
				if (excludedFolder?.disableSync) return;

				const oldName = oldPath.substring(oldPath.lastIndexOf('/' || '\\')).replace('/', '');
				const newPath = folder?.path + '/' + folder?.name + '.md';
				if (!(folder instanceof TFolder)) return;
				const note = this.app.vault.getAbstractFileByPath(oldPath + '/' + oldName + '.md');
				if (!note) return;
				(note as any).path = folder.path + '/' + oldName + '.md';
				this.app.vault.rename(note, newPath);

			} else if (file instanceof TFile) {
				const folder = this.app.vault.getAbstractFileByPath(oldPath.substring(0,
					oldPath.lastIndexOf('/' || '\\') >= 0 ? oldPath.lastIndexOf('/') : oldPath.length));
				if (folder?.name + '.md' === file.name) return;
				const oldFileName = oldPath.substring(oldPath.lastIndexOf('/' || '\\') >= 0 ? oldPath.lastIndexOf('/') + 1 : oldPath.length);

				if (!folder) return;

				const excludedFolder = this.settings.excludeFolders.find(
					(excludedFolder) => (excludedFolder.path === folder.path) ||
						(excludedFolder.path === folder.path?.slice(0, folder?.path.lastIndexOf('/') >= 0 ?
							folder.path?.lastIndexOf('/') : folder.path.length)
							&& excludedFolder.subFolders));
				if (excludedFolder?.disableSync) return;
				if (oldFileName !== folder?.name + '.md') return;
				let newFolderPath = file.path.slice(0, file.path.lastIndexOf('/') >= 0 ? file.path.lastIndexOf('/') : file.path.length);
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
					if (folder.path.indexOf('/') >= 0) {
						this.app.vault.rename(folder, folder.path.substring(0,
							folder.path.lastIndexOf('/' || '\\') >= 0 ? folder.path.lastIndexOf('/') : folder.path.length) + '/' +
							file.name.substring(0, file.name.lastIndexOf('.')));
					} else {
						this.app.vault.rename(folder, file.name.substring(0, file.name.lastIndexOf('.')));
					}
				}
			}
		}));
	}

	async handleFolderClick(event: MouseEvent) {
		if (!(event.target instanceof HTMLElement)) return;
		event.stopImmediatePropagation();
		if (!document.body.classList.contains('folder-notes-plugin')) {
			event.target.onclick = null;
			event.target.click();
			return;
		}

		const folder = event.target.parentElement?.getAttribute('data-path');
		const excludedFolder = this.settings.excludeFolders.find(
			(excludedFolder) => (excludedFolder.path === folder) ||
				(excludedFolder.path === folder?.slice(0, folder?.lastIndexOf('/') >= 0 ? folder?.lastIndexOf('/') : folder.length)
					&& excludedFolder.subFolders));
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
		const folder = this.app.vault.getAbstractFileByPath(path.substring(0,
			path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/') : path.length));
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
			new DeleteConfirmationModal(this.app, this, file).open();
		} else {
			await this.app.vault.delete(file);
		}
	}

	onunload() {
		console.log('unloading folder notes plugin');
		this.observer.disconnect();
		document.body.classList.remove('folder-notes-plugin');
		document.body.classList.remove('folder-note-underline');
		document.body.classList.remove('hide-folder-note');
		document.body.classList.remove('fn-whitespace-collapsing');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

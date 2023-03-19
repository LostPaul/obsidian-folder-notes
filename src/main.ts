import { Plugin, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { Commands } from './commands';
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
		new Commands(this.app, this).registerCommands();
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
				const excludedFolder = this.settings.excludeFolders.find(
					(excludedFolder) => (excludedFolder.path === folder.path) ||
						(excludedFolder.path === folder.path?.slice(0, folder?.path.lastIndexOf('/') >= 0 ?
							folder.path?.lastIndexOf('/') : folder.path.length)
							&& excludedFolder.subFolders));
				if (excludedFolder?.disableSync) return;
				const excludedFolders = this.settings.excludeFolders.filter(
					(excludedFolder) => excludedFolder.path.includes(oldPath)
				);

				excludedFolders.forEach((excludedFolder) => {
					const folders = excludedFolder.path.split('/');
					if (folders.length < 1) {
						folders.push(excludedFolder.path);
					}

					const oldName = oldPath.substring(oldPath.lastIndexOf('/' || '\\'));
					folders[folders.indexOf(oldName.replace('/', ''))] = folder.name;
					excludedFolder.path = folders.join('/');
				});
				this.saveSettings();

				const oldName = oldPath.substring(oldPath.lastIndexOf('/' || '\\'));
				const newPath = folder?.path + '/' + folder?.name + '.md';
				if (!(folder instanceof TFolder)) return;
				const note = this.app.vault.getAbstractFileByPath(oldPath + '/' + oldName + '.md');
				if (!note) return;
				(note as any).path = folder.path + '/' + oldName + '.md';
				this.app.vault.rename(note, newPath);

			} else if (file instanceof TFile) {
				const folder = this.app.vault.getAbstractFileByPath(oldPath.substring(0, oldPath.lastIndexOf('/' || '\\')));
				if (folder?.name + '.md' === file.name) return;
				const oldFileName = oldPath.substring(oldPath.lastIndexOf('/' || '\\') + 1);
				if (!folder) return;

				const excludedFolder = this.settings.excludeFolders.find(
					(excludedFolder) => (excludedFolder.path === folder.path) ||
						(excludedFolder.path === folder.path?.slice(0, folder?.path.lastIndexOf('/') >= 0 ?
							folder.path?.lastIndexOf('/') : folder.path.length)
							&& excludedFolder.subFolders));
				if (excludedFolder?.disableSync) return;
				if (oldFileName !== folder?.name + '.md') return;
				let newFolderPath = file.path.slice(0, file.path.lastIndexOf('/'));
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
					this.app.vault.rename(folder, folder.path.substring(0, folder.path.lastIndexOf('/' || '\\')) + '/' +
						file.name.substring(0, file.name.lastIndexOf('.')));
				}
			}
		}));

		this.observer = new MutationObserver((mutations: MutationRecord[]) => {
			mutations.forEach((rec) => {
				if (rec.type === 'childList') {
					(<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
						.forEach((element: HTMLElement) => {
							if (element.onclick) return;
							element.onclick = (event: MouseEvent) => this.handleFolderClick(event);
						});
				}
			});
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
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
			this.openFolderNote(path);
			if (!this.settings.hideFolderNote) return;
			event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
				.forEach((element: HTMLElement) => {
					if (element.innerText === (event.target as HTMLElement)?.innerText && !element.classList.contains('is-folder-note')) {

						element.addClass('is-folder-note');
					}
				});

		} else if (event.altKey || event.ctrlKey) {
			if ((this.settings.altKey && event.altKey) || (this.settings.ctrlKey && event.ctrlKey)) {
				this.createFolderNote(path, true, true);
				if (!this.settings.hideFolderNote) return;
				event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
					.forEach((element: HTMLElement) => {
						if (element.innerText === (event.target as HTMLElement)?.innerText && !element.classList.contains('is-folder-note')) {
							element.addClass('is-folder-note');
						}
					});
			} else {
				event.target.onclick = null;
				event.target.click();
			}
		} else {
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
		const folder = this.app.vault.getAbstractFileByPath(path.substring(0, path.lastIndexOf('/' || '\\')));
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

	onunload() {
		console.log('unloading folder notes plugin');
		this.observer.disconnect();
		document.body.classList.remove('folder-notes-plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

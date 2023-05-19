import { Plugin, TFile, TFolder, TAbstractFile, Notice, Keymap } from 'obsidian';
import { DEFAULT_SETTINGS, ExcludedFolder, FolderNotesSettings, SettingsTab } from './settings';
import FolderNameModal from './modals/folderName';
import { applyTemplate } from './template';
import { Commands } from './commands';
import DeleteConfirmationModal from './modals/deleteConfirmation';
import { FileExplorerWorkspaceLeaf } from './globals';

export default class FolderNotesPlugin extends Plugin {
	observer: MutationObserver;
	settings: FolderNotesSettings;
	settingsTab: SettingsTab;
	activeFolderDom: HTMLElement | null;
	activeFileExplorer: FileExplorerWorkspaceLeaf;

	async onload() {
		console.log('loading folder notes plugin');
		await this.loadSettings();
		this.settingsTab = new SettingsTab(this.app, this);
		this.addSettingTab(this.settingsTab);
		this.settings.oldFolderNoteName = this.settings.folderNoteName;
		this.saveSettings();

		// Add CSS Classes
		document.body.classList.add('folder-notes-plugin');
		if (this.settings.hideFolderNote) { document.body.classList.add('hide-folder-note'); }
		if (this.settings.underlineFolder) { document.body.classList.add('folder-note-underline'); }
		if (this.settings.underlineFolderInPath) { document.body.classList.add('folder-note-underline-path'); }
		if (!this.settings.allowWhitespaceCollapsing) { document.body.classList.add('fn-whitespace-stop-collapsing'); }

		new Commands(this.app, this).registerCommands();

		this.observer = new MutationObserver((mutations: MutationRecord[]) => {
			mutations.forEach((rec) => {
				if (rec.type === 'childList') {
					(<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
						.forEach((element: HTMLElement) => {
							if (element.onclick) return;
							element.onclick = (event: MouseEvent) => this.handleFolderClick(event);
						});
					(<Element>rec.target).querySelectorAll('span.view-header-breadcrumb')
						.forEach((element: HTMLElement) => {
							const breadcrumbs = element.parentElement?.querySelectorAll('span.view-header-breadcrumb');
							if (!breadcrumbs) return;
							let path = '';
							breadcrumbs.forEach((breadcrumb: HTMLElement) => {
								path += breadcrumb.innerText.trim() + '/';
								breadcrumb.setAttribute('data-path', path.slice(0, -1));
								const folderNotePath = path + this.settings.folderNoteName.replace('{{folder_name}}', this.getNameFromPathString(path.slice(0, -1))) + '.md';
								if (this.app.vault.getAbstractFileByPath(folderNotePath) || this.app.vault.getAbstractFileByPath(folderNotePath.slice(0, -3) + '.canvas')) {
									breadcrumb.classList.add('has-folder-note');
								}
							});
							element.parentElement?.setAttribute('data-path', path.slice(0, -1));
							if (breadcrumbs.length > 0) {
								breadcrumbs.forEach((breadcrumb: HTMLElement) => {
									if (breadcrumb.onclick) return;
									breadcrumb.onclick = (event: MouseEvent) => this.handleViewHeaderClick(event);
								});
							}
						});
				}
			});
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
		this.registerEvent(this.app.workspace.on('layout-change', () => { this.loadFileClasses(); }));
		this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
			if (!(file instanceof TFile)) { return; }
			// parent is null here even if the parent exists
			// not entirely sure why
			const parentPath = this.getFolderPathFromString(file.path);
			const parentName = this.getNameFromPathString(parentPath);
			if (parentName !== file.basename) { return; }
			this.removeCSSClassFromEL(parentPath, 'has-folder-note');
		}));
		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			if (!this.app.workspace.layoutReady) return;
			if (file instanceof TFile) { return this.handleFileCreate(file); }
			if (!this.settings.autoCreate) return;
			if (!(file instanceof TFolder)) return;

			const excludedFolder = this.getExcludedFolderByPath(file.path);
			if (excludedFolder?.disableAutoCreate) return;

			const path = file.path + '/' + file.name + this.settings.folderNoteType;
			const folderNote = this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.md') || this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.canvas');
			if (folderNote) return;
			this.createFolderNote(path, true, true);
			this.addCSSClassToTitleEL(file.path, 'has-folder-note');

		}));

		this.registerEvent(this.app.workspace.on('file-open', (openFile: TFile | null) => {
			if (this.activeFolderDom) {
				this.activeFolderDom.removeClass('is-active');
				this.activeFolderDom = null;
			}
			if (!openFile || !openFile.basename) { return; }
			if (openFile.basename !== openFile.parent.name) { return; }
			this.activeFolderDom = this.getEL(openFile.parent.path);
			if (this.activeFolderDom) this.activeFolderDom.addClass('is-active');
		}));

		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			if (!this.settings.syncFolderName) {
				// cleanup after ourselves
				this.removeCSSClassFromEL(file.path, 'has-folder-note');
				this.removeCSSClassFromEL(file.path, 'is-folder-note');
				return;
			}
			if (file instanceof TFolder) {
				return this.handleFolderRename(file, oldPath);
			} else if (file instanceof TFile) {
				return this.handleFileRename(file, oldPath);
			}
		}));

		if (this.app.workspace.layoutReady) {
			this.loadFileClasses();
		} else {
			this.app.workspace.onLayoutReady(async () => this.loadFileClasses());
		}
	}

	async handleFolderClick(event: MouseEvent) {
		if (!(event.target instanceof HTMLElement)) return;
		event.stopImmediatePropagation();

		const folderPath = event.target.parentElement?.getAttribute('data-path');
		if (!folderPath) { return; }
		const excludedFolder = this.getExcludedFolderByPath(folderPath);
		if (excludedFolder?.disableFolderNote) {
			event.target.onclick = null;
			event.target.click();
			return;
		} else if (excludedFolder?.enableCollapsing || this.settings.enableCollapsing) {
			event.target.onclick = null;
			event.target.click();
		}

		const path = folderPath + '/' + this.settings.folderNoteName.replace('{{folder_name}}', event.target.innerText) + this.settings.folderNoteType;
		let folderNote = this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.md') || this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.canvas');
		if (!folderNote) {
			folderNote = this.app.vault.getAbstractFileByPath(`${folderPath}/${event.target.innerText}.md`) || this.app.vault.getAbstractFileByPath(`${folderPath}/${event.target.innerText}.canvas`);
		}
		if (folderNote) {
			return this.openFolderNote(folderNote, event);
		} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
			if ((this.settings.altKey && event.altKey) || (this.settings.ctrlKey && Keymap.isModEvent(event) === 'tab')) {
				await this.createFolderNote(path, true, true);
				this.addCSSClassToTitleEL(folderPath, 'has-folder-note');
				this.removeCSSClassFromEL(folderPath, 'has-not-folder-note');
				return;
			}
		}
		event.target.onclick = null;
		event.target.click();
	}

	async handleViewHeaderClick(event: MouseEvent) {
		if (!(event.target instanceof HTMLElement)) return;
		if (!this.settings.openFolderNoteOnClickInPath) return;

		const folder = event.target.getAttribute('data-path');
		if (!folder) { return; }
		const excludedFolder = this.getExcludedFolderByPath(folder);
		if (excludedFolder?.disableFolderNote) {
			event.target.onclick = null;
			event.target.click();
			return;
		} else if (excludedFolder?.enableCollapsing || this.settings.enableCollapsing) {
			event.target.onclick = null;
			event.target.click();
		}
		const path = folder + '/' + event.target.innerText + this.settings.folderNoteType;
		let folderNote = this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.md') || this.app.vault.getAbstractFileByPath(path.slice(0, -this.settings.folderNoteType.length) + '.canvas');
		if (!folderNote) {
			folderNote = this.app.vault.getAbstractFileByPath(`${folder}/${event.target.innerText}.md`) || this.app.vault.getAbstractFileByPath(`${folder}/${event.target.innerText}.canvas`);
		}
		if (folderNote) {
			return this.openFolderNote(folderNote, event);
		} else if (event.altKey || Keymap.isModEvent(event) === 'tab') {
			if ((this.settings.altKey && event.altKey) || (this.settings.ctrlKey && Keymap.isModEvent(event) === 'tab')) {
				await this.createFolderNote(path, true, true);
				this.addCSSClassToTitleEL(folder, 'has-folder-note');
				this.removeCSSClassFromEL(folder, 'has-not-folder-note');
				return;
			}
		}
		event.target.onclick = null;
		event.target.click();
	}

	handleFolderRename(file: TFolder, oldPath: string) {
		const oldFileName = this.getNameFromPathString(oldPath);
		const folder = this.app.vault.getAbstractFileByPath(file.path);
		if (!(folder instanceof TFolder)) return;
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
		const excludedFolder = this.getExcludedFolderByPath(file.path);

		const folderNotePath = oldPath + '/' + this.settings.folderNoteName.replace('{{folder_name}}', oldFileName) + '.md';
		let note = this.app.vault.getAbstractFileByPath(folderNotePath) || this.app.vault.getAbstractFileByPath(folderNotePath.slice(0, -3) + '.canvas');
		if (!(note instanceof TFile)) {
			note = this.app.vault.getAbstractFileByPath(`${oldPath}/${oldFileName}.md`) || this.app.vault.getAbstractFileByPath(`${oldPath}/${oldFileName}.canvas`);
			if (!(note instanceof TFile)) { return; }
			note.path = folder.path + '/' + oldFileName + this.getExtensionFromPathString(note.path);
		} else {
			note.path = folder.path + '/' + this.settings.folderNoteName.replace('{{folder_name}}', oldFileName) + this.getExtensionFromPathString(note.path);
		}

		const newPath = folder.path + '/' + this.settings.folderNoteName.replace('{{folder_name}}', folder.name) + this.getExtensionFromPathString(note.path);
		if (excludedFolder?.disableSync && !this.app.vault.getAbstractFileByPath(newPath)) {
			return this.removeCSSClassFromEL(file.path, 'has-folder-note');
		}

		this.app.vault.rename(note, newPath);
	}

	handleFileRename(file: TFile, oldPath: string) {
		const oldFileName = this.getNameFromPathString(oldPath);
		const oldFilePath = this.getFolderPathFromString(oldPath);
		const fileExtension = this.getExtensionFromPathString(oldPath);
		const oldFolder = this.app.vault.getAbstractFileByPath(oldFilePath);
		const newFilePath = this.getFolderPathFromString(file.path);
		const newFolder = this.app.vault.getAbstractFileByPath(newFilePath);
		const excludedFolder = this.getExcludedFolderByPath(newFolder?.path || '');

		if (excludedFolder?.disableSync && this.extractFolderName(this.settings.folderNoteName, file.name.slice(0, file.name.lastIndexOf('.'))) === newFolder?.name) {
			this.addCSSClassToTitleEL(file.path, 'is-folder-note');
			this.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
			return;
		} else if (excludedFolder?.disableSync) {
			this.removeCSSClassFromEL(file.path, 'is-folder-note');
			this.removeCSSClassFromEL(newFolder?.path || '', 'has-folder-note');
			return;
		}

		// file has been moved into position where it can be a folder note!
		if (newFolder && newFolder.name === file.basename) {
			this.addCSSClassToTitleEL(newFolder.path, 'has-folder-note');
			this.addCSSClassToTitleEL(file.path, 'is-folder-note', true);
		}

		// file matched folder name before rename
		// file hasnt moved just renamed
		// Need to rename the folder
		if (!oldFolder) return;
		if (this.settings.folderNoteName.replace('{{folder_name}}', oldFolder.name) + fileExtension === oldFileName && newFilePath === oldFilePath) {
			return this.renameFolderOnFileRename(file, oldPath, oldFolder);
		} else if (this.settings.folderNoteName.replace('{{folder_name}}', oldFolder.name) + fileExtension === file.name && newFilePath === oldFilePath) {
			return this.renameFolderOnFileRename(file, oldPath, oldFolder);
		}

		// the note has been moved somewhere and is no longer a folder note
		// cleanup css on the folder and note
		if (oldFolder.name + this.getExtensionFromPathString(oldFilePath) === oldFileName && newFilePath !== oldFilePath) {
			this.removeCSSClassFromEL(oldFolder.path, 'has-folder-note');
			this.removeCSSClassFromEL(file.path, 'is-folder-note');
			this.removeCSSClassFromEL(oldPath, 'is-folder-note');
		}
	}

	async renameFolderOnFileRename(file: TFile, oldPath: string, oldFolder: TAbstractFile) {
		const newFolderName = this.extractFolderName(this.settings.folderNoteName, file.basename);
		if (!newFolderName) {
			this.removeCSSClassFromEL(oldFolder.path, 'has-folder-note');
			this.removeCSSClassFromEL(file.path, 'is-folder-note');
			return;
		} else if (newFolderName === oldFolder.name) {
			this.addCSSClassToTitleEL(oldFolder.path, 'has-folder-note');
			this.addCSSClassToTitleEL(file.path, 'is-folder-note');
			return;
		}
		const newFolderPath = oldFolder.parent.path + '/' + this.extractFolderName(this.settings.folderNoteName, file.basename);
		if (this.app.vault.getAbstractFileByPath(newFolderPath) || this.app.vault.getAbstractFileByPath(this.extractFolderName(this.settings.folderNoteName, file.basename) || '')) {
			await this.app.vault.rename(file, oldPath);
			return new Notice('A folder with the same name already exists');
		}
		await this.app.vault.rename(oldFolder, newFolderPath);
	}

	extractFolderName(template: string, changedFileName: string) {
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

	handleFileCreate(file: TFile) {
		if (file.basename !== file.parent.name) { return; }
		this.addCSSClassToTitleEL(file.parent.path, 'has-folder-note');
		this.addCSSClassToTitleEL(file.path, 'is-folder-note', true);
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
		this.addCSSClassToTitleEL(path, 'is-folder-note', true);
		this.addCSSClassToTitleEL(file.parent.path, 'has-folder-note');
		if (!this.settings.autoCreate) return;
		if (!useModal) return;
		const folder = this.app.vault.getAbstractFileByPath(this.getFolderPathFromString(path));
		if (!(folder instanceof TFolder)) return;
		const modal = new FolderNameModal(this.app, this, folder);
		modal.open();
	}

	async openFolderNote(file: TAbstractFile, evt: MouseEvent) {
		const path = file.path;
		if (this.app.workspace.getActiveFile()?.path === path) { return; }
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(evt) || this.settings.openInNewTab);
		if (file instanceof TFile) {
			await leaf.openFile(file);
		}
	}

	async deleteFolderNote(file: TFile) {
		if (this.settings.showDeleteConfirmation) {
			return new DeleteConfirmationModal(this.app, this, file).open();
		}
		this.removeCSSClassFromEL(file.parent.path, 'has-folder-note');
		await this.app.vault.delete(file);
	}

	getNameFromPathString(path: string): string {
		return path.substring(path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/' || '\\') + 1 : 0);
	}

	getFolderNameFromPathString(path: string): string {
		return path.split('/').slice(-2)[0];
	}

	getExtensionFromPathString(path: string): string {
		return path.slice(path.lastIndexOf('.') >= 0 ? path.lastIndexOf('.') : 0);
	}

	getFolderPathFromString(path: string): string {
		const subString = path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/') : path.length;
		return path.substring(0, subString);
	}

	getExcludedFolderByPath(path: string): ExcludedFolder | undefined {
		return this.settings.excludeFolders.find((excludedFolder) => {
			if (excludedFolder.path === path) { return true; }
			if (!excludedFolder.subFolders) { return false; }
			return this.getFolderPathFromString(path).startsWith(excludedFolder.path);
		});
	}

	getFileExplorer() {
		return this.app.workspace.getLeavesOfType('file-explorer')[0] as FileExplorerWorkspaceLeaf;
	}

	getFileExplorerView() {
		return this.getFileExplorer().view;
	}

	async addCSSClassToTitleEL(path: string, cssClass: string, waitForCreate = false, count = 0) {
		const fileExplorerItem = this.getEL(path);
		if (!fileExplorerItem) {
			if (waitForCreate && count < 5) {
				// sleep for a second for the file-explorer event to catch up
				// this is annoying as in most scanarios our plugin recieves the event before file explorer
				// If we could guarrantee load order it wouldn't be an issue but we can't
				// realise this is racey and needs to be fixed.
				await new Promise((r) => setTimeout(r, 500));
				this.addCSSClassToTitleEL(path, cssClass, waitForCreate, count + 1);
				return;
			}
			return;
		}
		fileExplorerItem.addClass(cssClass);
		const viewHeaderItems = document.querySelectorAll(`[data-path="${path}"]`);
		viewHeaderItems.forEach((item) => {
			item.addClass(cssClass);
		});
	}

	removeCSSClassFromEL(path: string, cssClass: string) {
		const fileExplorerItem = this.getEL(path);
		const viewHeaderItems = document.querySelectorAll(`[data-path="${path}"]`);
		viewHeaderItems.forEach((item) => {
			item.removeClass(cssClass);
		});
		if (!fileExplorerItem) { return; }
		fileExplorerItem.removeClass(cssClass);
	}

	getEL(path: string): HTMLElement | null {
		const fileExplorer = this.getFileExplorer();
		if (!fileExplorer) { return null; }
		const fileExplorerItem = fileExplorer.view.fileItems[path];
		if (!fileExplorerItem) { return null; }
		if (fileExplorerItem.selfEl) return fileExplorerItem.selfEl;
		return fileExplorerItem.titleEl;
	}

	loadFileClasses(forceReload = false) {
		if (this.activeFileExplorer === this.getFileExplorer() && !forceReload) { return; }
		this.activeFileExplorer = this.getFileExplorer();
		this.app.vault.getFiles().forEach((file) => {
			if (this.extractFolderName(this.settings.folderNoteName, file.basename) !== file.parent.name) { return; }
			const excludedFolder = this.getExcludedFolderByPath(file.parent.path);
			// cleanup after ourselves
			// Incase settings have changed
			if (excludedFolder?.disableFolderNote) {
				this.removeCSSClassFromEL(file.path, 'is-folder-note');
				this.removeCSSClassFromEL(file.parent.path, 'has-folder-note');
				return;
			}
			this.addCSSClassToTitleEL(file.parent.path, 'has-folder-note');
			this.addCSSClassToTitleEL(file.path, 'is-folder-note');
		});
	}

	onunload() {
		console.log('unloading folder notes plugin');
		this.observer.disconnect();
		document.body.classList.remove('folder-notes-plugin');
		document.body.classList.remove('folder-note-underline');
		document.body.classList.remove('hide-folder-note');
		document.body.classList.remove('fn-whitespace-stop-collapsing');
		if (this.activeFolderDom) { this.activeFolderDom.removeClass('is-active'); }
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// cleanup any css if we need too
		this.loadFileClasses(true);
	}
}

import { Plugin, TFile, TFolder, TAbstractFile, MarkdownPostProcessorContext, parseYaml } from 'obsidian';
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings';
import { Commands } from './commands';
import { FileExplorerWorkspaceLeaf } from './globals';
import { handleViewHeaderClick, handleFolderClick } from './events/handleClick';
import { handleFileRename, handleFolderRename } from './events/handleRename';
import { createFolderNote, extractFolderName, getFolderNote, getFolder } from './functions/folderNoteFunctions';
import { getExcludedFolder } from './excludedFolder';
// import { FrontMatterTitlePluginHandler } from './events/frontMatterTitle';
import { createOverview as createFolderOverview } from './folderOverview';
import { FolderOverviewSettings } from './modals/folderOverview';
import './functions/ListComponent';
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
		this.saveSettings();

		// Add CSS Classes
		document.body.classList.add('folder-notes-plugin');
		if (this.settings.hideFolderNote) { document.body.classList.add('hide-folder-note'); }
		if (this.settings.underlineFolder) { document.body.classList.add('folder-note-underline'); }
		if (this.settings.underlineFolderInPath) { document.body.classList.add('folder-note-underline-path'); }
		if (!this.settings.allowWhitespaceCollapsing) { document.body.classList.add('fn-whitespace-stop-collapsing'); }

		new Commands(this.app, this).registerCommands();

		// new FrontMatterTitlePluginHandler(this.app, this);

		this.observer = new MutationObserver((mutations: MutationRecord[]) => {
			mutations.forEach((rec) => {
				if (rec.type === 'childList') {
					(<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
						.forEach((element: HTMLElement) => {
							if (element.onclick) return;
							element.onclick = (event: MouseEvent) => handleFolderClick(event, this);
						});
					if (!this.settings.openFolderNoteOnClickInPath) { return; }
					(<Element>rec.target).querySelectorAll('span.view-header-breadcrumb')
						.forEach((element: HTMLElement) => {
							const breadcrumbs = element.parentElement?.querySelectorAll('span.view-header-breadcrumb');
							if (!breadcrumbs) return;
							let path = '';
							breadcrumbs.forEach((breadcrumb: HTMLElement) => {
								path += breadcrumb.innerText.trim() + '/';
								const folderPath = path.slice(0, -1);
								breadcrumb.setAttribute('data-path', folderPath);
								const folderNote = getFolderNote(this, folderPath);
								if (folderNote) {
									breadcrumb.classList.add('has-folder-note');
								}
							});
							element.parentElement?.setAttribute('data-path', path.slice(0, -1));
							if (breadcrumbs.length > 0) {
								breadcrumbs.forEach((breadcrumb: HTMLElement) => {
									if (breadcrumb.onclick) return;
									breadcrumb.onclick = (event: MouseEvent) => handleViewHeaderClick(event, this);
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
			const parentName = this.getFileNameFromPathString(parentPath);
			if (parentName !== file.basename) { return; }
			this.removeCSSClassFromEL(parentPath, 'has-folder-note');
		}));
		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			if (file instanceof TFile) {
				const folderName = extractFolderName(this.settings.folderNoteName, file.basename);
				const folder = getFolder(this, file);
				if (!folder) { return; }
				if (folderName !== folder.name) { return; }
				this.addCSSClassToTitleEL(folder.path, 'has-folder-note');
				this.addCSSClassToTitleEL(file.path, 'is-folder-note');
			}
			if (!this.app.workspace.layoutReady) return;
			if (!this.settings.autoCreate) return;
			if (!(file instanceof TFolder)) return;
			const excludedFolder = getExcludedFolder(this, file.path);
			if (excludedFolder?.disableAutoCreate) return;
			const folderNote = getFolderNote(this, file.path);
			if (folderNote) return;
			createFolderNote(this, file.path, true, true);
			this.addCSSClassToTitleEL(file.path, 'has-folder-note');

		}));

		this.registerEvent(this.app.workspace.on('file-open', (openFile: TFile | null) => {
			if (this.activeFolderDom) {
				this.activeFolderDom.removeClass('is-active');
				this.activeFolderDom = null;
			}
			if (!openFile || !openFile.basename) { return; }
			const folder = getFolder(this, openFile);
			if (!folder) { return; }
			if (extractFolderName(this.settings.folderNoteName, openFile.basename) !== folder.name) { return; }
			this.activeFolderDom = this.getEL(folder.path);
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
				return handleFolderRename(file, oldPath, this);
			} else if (file instanceof TFile) {
				return handleFileRename(file, oldPath, this);
			}
		}));

		this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
			if (file instanceof TFile) {
				const folder = getFolder(this, file);
				if (!folder) { return; }
				this.removeCSSClassFromEL(folder.path, 'has-folder-note');
			}
			if (!(file instanceof TFolder)) { return; }
			const folderNote = getFolderNote(this, file.path);
			if (!folderNote) { return; }
			this.removeCSSClassFromEL(folderNote.path, 'is-folder-note');
			if (!this.settings.syncDelete) { return; }
			this.app.vault.delete(folderNote);
		}));
		this.registerMarkdownCodeBlockProcessor('folder-overview', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const observer = new MutationObserver(() => {
				const editButton = el.parentElement?.childNodes.item(1);
				if (editButton) {
					editButton.addEventListener('click', (e) => {
						e.stopImmediatePropagation();
						e.preventDefault();
						e.stopPropagation();
						new FolderOverviewSettings(this.app, this, parseYaml(source), ctx, el).open();
					}, { capture: true });
				}
			});
			observer.observe(el, {
				childList: true,
				subtree: true,
			});
			createFolderOverview(this, source, el, ctx);
		});
		if (this.app.workspace.layoutReady) {
			this.loadFileClasses();
		} else {
			this.app.workspace.onLayoutReady(async () => this.loadFileClasses());
		}
	}

	getFileNameFromPathString(path: string): string {
		return path.substring(path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/' || '\\') + 1 : 0);
	}

	getFolderNameFromPathString(path: string): string {
		if (path.endsWith('.md') || path.endsWith('.canvas')) {
			return path.split('/').slice(-2)[0];
		} else {
			return path.split('/').slice(-1)[0];
		}
	}

	removeExtension(name: string): string {
		return name.replace(/\.[^/.]+$/, '');
	}

	getExtensionFromPathString(path: string): string {
		return path.slice(path.lastIndexOf('.') >= 0 ? path.lastIndexOf('.') : 0);
	}

	getFolderPathFromString(path: string): string {
		const subString = path.lastIndexOf('/' || '\\') >= 0 ? path.lastIndexOf('/') : 0;
		return path.substring(0, subString);
	}

	getParentFolderPath(path: string): string {
		return this.getFolderPathFromString(this.getFolderPathFromString(path));
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

	removeCSSClassFromEL(path: string | undefined, cssClass: string) {
		if (!path) return;
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
		this.app.vault.getAllLoadedFiles().forEach((file) => {
			if (!(file instanceof TFolder)) { return; }
			const folderNote = getFolderNote(this, file.path);
			if (!folderNote) {
				this.removeCSSClassFromEL(file?.path, 'has-folder-note');
				return;
			}

			const excludedFolder = getExcludedFolder(this, file.path);
			// cleanup after ourselves
			// Incase settings have changed
			if (excludedFolder?.disableFolderNote) {
				this.removeCSSClassFromEL(folderNote.path, 'is-folder-note');
				this.removeCSSClassFromEL(file.path, 'has-folder-note');
			} else {
				this.addCSSClassToTitleEL(folderNote.path, 'is-folder-note');
				this.addCSSClassToTitleEL(file.path, 'has-folder-note');
			}
		});
	}

	reloadHandlers() {
		document.querySelectorAll('div.nav-folder-title-content')
			.forEach((element: HTMLElement) => {
				if (element.onclick) return;
				element.onclick = (event: MouseEvent) => handleFolderClick(event, this);
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

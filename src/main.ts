import { Plugin, TFile, TFolder, TAbstractFile, MarkdownPostProcessorContext, parseYaml, Notice, Keymap } from 'obsidian';
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings/SettingsTab';
import { Commands } from './Commands';
import { FileExplorerWorkspaceLeaf } from './globals';
import { handleFolderClick } from './events/handleClick';
import { addObserver } from './events/MutationObserver';
import { handleRename } from './events/handleRename';
import { getFolderNote, getFolder } from './functions/folderNoteFunctions';
import { handleCreate } from './events/handleCreate';
import { FrontMatterTitlePluginHandler } from './events/FrontMatterTitle';
import { FolderOverviewSettings } from './folderOverview/ModalSettings';
import { FolderOverview } from './folderOverview/FolderOverview';
import { TabManager } from './events/TabManager';
import './functions/ListComponent';
import { handleDelete } from './events/handleDelete';
import { getEl, loadFileClasses, removeCSSClassFromEL } from './functions/styleFunctions';
export default class FolderNotesPlugin extends Plugin {
	observer: MutationObserver;
	settings: FolderNotesSettings;
	settingsTab: SettingsTab;
	activeFolderDom: HTMLElement | null;
	activeFileExplorer: FileExplorerWorkspaceLeaf;
	fmtpHandler: FrontMatterTitlePluginHandler | null = null;
	hoveredElement: HTMLElement | null = null;
	mouseEvent: MouseEvent | null = null;
	hoverLinkTriggered = false;
	tabManager: TabManager;
	settingsOpened = false;
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
		if (this.settings.boldName) { document.body.classList.add('folder-note-bold'); }
		if (this.settings.cursiveName) { document.body.classList.add('folder-note-cursive'); }
		if (this.settings.boldNameInPath) { document.body.classList.add('folder-note-bold-path'); }
		if (this.settings.cursiveNameInPath) { document.body.classList.add('folder-note-cursive-path'); }
		if (this.settings.underlineFolderInPath) { document.body.classList.add('folder-note-underline-path'); }
		if (this.settings.stopWhitespaceCollapsing) { document.body.classList.add('fn-whitespace-stop-collapsing'); }
		if (this.settings.hideCollapsingIcon) { document.body.classList.add('fn-hide-collapse-icon'); }

		new Commands(this.app, this).registerCommands();

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.frontMatterTitle.enabled) {
				this.fmtpHandler = new FrontMatterTitlePluginHandler(this);
			}
			this.tabManager = new TabManager(this);
			this.tabManager.updateTabs();
		});

		await addObserver(this);

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		this.registerDomEvent(window, 'keydown', (event: KeyboardEvent) => {
			const hoveredElement = this.hoveredElement;
			if (this.hoverLinkTriggered) return;
			if (!hoveredElement) return;
			if (!Keymap.isModEvent(event)) return;

			const folderPath = hoveredElement?.parentElement?.getAttribute('data-path') || '';
			const folderNote = getFolderNote(this, folderPath);
			if (!folderNote) return;

			this.app.workspace.trigger('hover-link', {
				event: this.mouseEvent,
				source: 'preview',
				hoverParent: {
					file: folderNote,
				},
				targetEl: hoveredElement,
				linktext: folderNote?.basename,
				sourcePath: folderNote?.path,
			});
			this.hoverLinkTriggered = true;
		});

		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			handleCreate(file, this);
		}));

		this.registerEvent(this.app.workspace.on('file-open', (openFile: TFile | null) => {
			if (this.activeFolderDom) {
				this.activeFolderDom.removeClass('fn-is-active');
				this.activeFolderDom = null;
			}

			if (!openFile || !openFile.basename) { return; }

			const folder = getFolder(this, openFile);
			if (!folder) { return; }
			const folderNote = getFolderNote(this, folder.path);
			if (!folderNote) { return; }
			if (folderNote.path !== openFile.path) { return; }
			this.activeFolderDom = getEl(folder.path);
			if (this.activeFolderDom) this.activeFolderDom.addClass('fn-is-active');
		}));

		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			handleRename(file, oldPath, this);
		}));

		this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
			handleDelete(file, this);
		}));

		this.registerMarkdownCodeBlockProcessor('folder-overview', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			this.handleOverviewBlock(source, el, ctx);
		});

		if (this.app.workspace.layoutReady) {
			loadFileClasses(undefined, this);
			this.registerEvent(this.app.workspace.on('layout-change', () => {
				loadFileClasses(undefined, this);
				this.tabManager?.updateTabs();
			}));
		} else {
			this.app.workspace.onLayoutReady(async () => {
				loadFileClasses(undefined, this)
				this.registerEvent(this.app.workspace.on('layout-change', () => {
					loadFileClasses(undefined, this);
					this.tabManager?.updateTabs();
				}));
			});
		}
	}

	handleOverviewBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
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
		try {
			const folderOverview = new FolderOverview(this, ctx, source, el);
			folderOverview.create(this, parseYaml(source), el, ctx);
		} catch (e) {
			new Notice('Error creating folder overview (folder notes plugin) - check console for more details');
			console.error(e);
		}
	}

	isEmptyFolderNoteFolder(folder: TFolder): boolean {
		let attachmentFolderPath = this.app.vault.getConfig('attachmentFolderPath') as string;
		const cleanAttachmentFolderPath = attachmentFolderPath?.replace('./', '') || '';
		const attachmentsAreInRootFolder = attachmentFolderPath === './' || attachmentFolderPath === '';
		const threshold = this.settings.storageLocation === 'insideFolder' ? 1 : 0;

		if (folder.children.length == threshold) {
			return true;
		} else if (folder.children.length > threshold) {
			if (attachmentsAreInRootFolder) {
				return false;
			} else if (this.settings.ignoreAttachmentFolder && this.app.vault.getAbstractFileByPath(`${folder.path}/${cleanAttachmentFolderPath}`)) {
				const folderPath = `${folder.path}/${cleanAttachmentFolderPath}`
				const attachmentFolder = this.app.vault.getAbstractFileByPath(folderPath);
				if (attachmentFolder instanceof TFolder && folder.children.length <= threshold + 1) {
					if (!folder.collapsed) {
						getEl(folder.path)?.click();
					}
				}
				return folder.children.length <= threshold + 1;
			} else {
				return false;
			}
		}
		return true;
	}

	async changeName(folder: TFolder, name: string | null | undefined, replacePath: boolean, waitForCreate = false, count = 0) {
		if (!name) name = folder.name;
		let fileExplorerItem = getEl(folder.path);
		if (!fileExplorerItem) {
			if (waitForCreate && count < 5) {
				await new Promise((r) => setTimeout(r, 500));
				this.changeName(folder, name, replacePath, waitForCreate, count + 1);
				return;
			}
			return;
		}
		fileExplorerItem = fileExplorerItem.querySelector('div.nav-folder-title-content')
		if (!fileExplorerItem) { return; }
		if (this.settings.frontMatterTitle.explorer && this.settings.frontMatterTitle.enabled) {
			fileExplorerItem.innerText = name;
			fileExplorerItem.setAttribute('old-name', folder.name);
		} else {
			fileExplorerItem.innerText = folder.name;
			fileExplorerItem.removeAttribute('old-name');
		}
		if (replacePath) {
			this.updateBreadcrumbs();
		}
	}

	updateBreadcrumbs(remove?: boolean) {
		if (!this.settings.frontMatterTitle.path && !remove) { return; }
		const viewHeaderItems = document.querySelectorAll('span.view-header-breadcrumb');
		const files = this.app.vault.getAllLoadedFiles().filter((file) => file instanceof TFolder);
		viewHeaderItems.forEach((item) => {
			if (!item.hasAttribute('data-path')) { return; }
			const path = item.getAttribute('data-path');
			const folder = files.find((file) => file.path === path);
			if (!(folder instanceof TFolder)) { return; }
			if (remove) {
				item.textContent = folder.name;
				item.removeAttribute('old-name');
			} else {
				item.textContent = folder.newName || folder.name;
				item.setAttribute('old-name', folder.name);
				item.setAttribute('data-path', folder.path);
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
		if (this.fmtpHandler) {
			this.fmtpHandler.deleteEvent();
		}

	}

	async loadSettings() {
		const data = await this.loadData();
		if (data) {
			if (data.allowWhitespaceCollapsing === true) {
				data.stopWhitespaceCollapsing = false;
				delete data.allowWhitespaceCollapsing;
			} else if (data.allowWhitespaceCollapsing === false) {
				data.stopWhitespaceCollapsing = true;
				delete data.allowWhitespaceCollapsing;
			}
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		if (!data) { return; }
		const overview = (data as any).defaultOverview;
		if (!overview) { return; }
		this.settings.defaultOverview = Object.assign({}, DEFAULT_SETTINGS.defaultOverview, overview);
	}

	async saveSettings(reloadStyles?: boolean) {
		await this.saveData(this.settings);
		// cleanup any css if we need too
		if (!this.settingsOpened || reloadStyles === true) {
			loadFileClasses(true, this);
		}
	}

}

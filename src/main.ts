import {
	type TAbstractFile,
	type MarkdownPostProcessorContext,
	type WorkspaceLeaf,
	Plugin, TFile, TFolder,
	parseYaml, Notice, Keymap,
	requireApiVersion, Platform, debounce,
} from 'obsidian';
import {
	type FolderNotesSettings, DEFAULT_SETTINGS, SettingsTab,
} from './settings/SettingsTab';
import { Commands } from './Commands';
import type { FileExplorerWorkspaceLeaf } from './globals';
import {
	registerFileExplorerObserver, unregisterFileExplorerObserver,
} from './events/MutationObserver';
import { handleRename } from './events/handleRename';
import {
	getFolderNote, getFolder, openFolderNote, createFolderNote,
} from './functions/folderNoteFunctions';
import { handleCreate } from './events/handleCreate';
import { FrontMatterTitlePluginHandler } from './events/FrontMatterTitle';
import { FolderOverviewSettings } from './obsidian-folder-overview/src/modals/Settings';
import { FolderOverview } from './obsidian-folder-overview/src/FolderOverview';
import { TabManager } from './events/TabManager';
import './functions/ListComponent';
import { handleDelete } from './events/handleDelete';
import {
	addCSSClassToFileExplorerEl, getFileExplorerElement, removeCSSClassFromFileExplorerEL,
	refreshAllFolderStyles, setActiveFolder, removeActiveFolder,
} from './functions/styleFunctions';
import { getExcludedFolder } from './ExcludeFolders/functions/folderFunctions';
import { FOLDER_OVERVIEW_VIEW, FolderOverviewView } from './obsidian-folder-overview/src/view';
import { registerOverviewCommands } from './obsidian-folder-overview/src/Commands';
import { updateOverviewView, updateViewDropdown } from './obsidian-folder-overview/src/main';
import { FvIndexDB } from './obsidian-folder-overview/src/utils/IndexDB';
import { updateAllOverviews } from './obsidian-folder-overview/src/utils/functions';

export default class FolderNotesPlugin extends Plugin {
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
	askModalCurrentlyOpen = false;
	fvIndexDB: FvIndexDB;

	async onload(): Promise<void> {
		console.log('loading folder notes plugin');
		await this.loadSettings();
		this.settingsTab = new SettingsTab(this.app, this);
		this.addSettingTab(this.settingsTab);
		this.saveSettings();
		this.fvIndexDB = new FvIndexDB(this);

		// Add CSS Classes
		document.body.classList.add('folder-notes-plugin');
		if (this.settings.hideFolderNote) { document.body.classList.add('hide-folder-note'); }
		if (this.settings.hideCollapsingIconForEmptyFolders) {
			document.body.classList.add('fn-hide-empty-collapse-icon');
		}
		if (this.settings.underlineFolder) { document.body.classList.add('folder-note-underline'); }
		if (this.settings.boldName) { document.body.classList.add('folder-note-bold'); }
		if (this.settings.cursiveName) { document.body.classList.add('folder-note-cursive'); }
		if (this.settings.boldNameInPath) { document.body.classList.add('folder-note-bold-path'); }
		if (this.settings.cursiveNameInPath) {
			document.body.classList.add('folder-note-cursive-path');
		}
		if (this.settings.underlineFolderInPath) {
			document.body.classList.add('folder-note-underline-path');
		}
		if (this.settings.stopWhitespaceCollapsing) {
			document.body.classList.add('fn-whitespace-stop-collapsing');
		}
		if (this.settings.hideCollapsingIcon) {
			document.body.classList.add('fn-hide-collapse-icon');
		}
		if (this.settings.ignoreAttachmentFolder) {
			document.body.classList.add('fn-ignore-attachment-folder');
		}
		if (!this.settings.highlightFolder) {
			document.body.classList.add('disable-folder-highlight');
		}

		if (requireApiVersion('1.7.2')) {
			document.body.classList.add('version-1-7-2');
		}

		new Commands(this.app, this).registerCommands();
		registerOverviewCommands(this);

		this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this));

		if (!this.settings.persistentSettingsTab.afterRestart) {
			this.settings.settingsTab = 'general';
		}

		this.registerDomEvent(window, 'keydown', (event: KeyboardEvent) => {
			const { hoveredElement } = this;
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

		this.registerEvent(this.app.workspace.on('file-open', async (openFile: TFile | null) => {
			removeActiveFolder(this);

			if (!openFile || !openFile.basename) { return; }

			const folder = getFolder(this, openFile);
			if (!folder) { return; }
			const excludedFolder = getExcludedFolder(this, folder.path, true);
			if (excludedFolder?.disableFolderNote) return;
			const folderNote = getFolderNote(this, folder.path);
			if (!folderNote) { return; }
			if (folderNote.path !== openFile.path) { return; }
			setActiveFolder(folder.path, this);
		}));

		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			handleCreate(file, this);
			this.handleVaultChange();
		}));

		this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
			handleRename(file, oldPath, this);
			this.handleVaultChange();
		}));

		this.registerEvent(this.app.vault.on('delete', (file: TAbstractFile) => {
			handleDelete(file, this);
			this.handleVaultChange();
		}));

		this.registerMarkdownCodeBlockProcessor(
			'folder-overview',
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				this.handleOverviewBlock(source, el, ctx);
			},
		);
	}

	onLayoutReady(): void {
		if (!this._loaded) {
			return;
		}

		registerFileExplorerObserver(this);
		this.registerView(FOLDER_OVERVIEW_VIEW, (leaf: WorkspaceLeaf) => {
			return new FolderOverviewView(leaf, this);
		});

		this.app.workspace.on('layout-change', () => {
			this.tabManager.updateTabs();
		});

		if (this.app.plugins.getPlugin('obsidian-front-matter-title-plugin')) {
			this.fmtpHandler = new FrontMatterTitlePluginHandler(this);
		}
		this.tabManager = new TabManager(this);
		this.tabManager.updateTabs();

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			this.handleFileExplorerClick(evt);
		}, true);

		// Handle middle mouse button clicks
		this.registerDomEvent(document, 'auxclick', (evt: MouseEvent) => {
			this.handleFileExplorerClick(evt);
		}, true);

		const fileExplorerPlugin = this.app.internalPlugins.getEnabledPluginById('file-explorer');
		if (fileExplorerPlugin) {
			const originalRevealInFolder = fileExplorerPlugin.revealInFolder
				.bind(fileExplorerPlugin);
			fileExplorerPlugin.revealInFolder = (file: TAbstractFile): void => {
				if (file instanceof TFile) {
					const folder = getFolder(this, file);
					if (folder instanceof TFolder) {
						const folderNote = getFolderNote(this, folder.path);
						if (!folderNote || folderNote.path !== file.path) {
							return originalRevealInFolder.call(fileExplorerPlugin, file);
						}
						document.body.classList.remove('hide-folder-note');
						originalRevealInFolder.call(fileExplorerPlugin, folder);
						const FOLDER_REVEAL_DELAY = 100;
						setTimeout(() => {
							document.body.classList.add('hide-folder-note');
						}, FOLDER_REVEAL_DELAY);
						return;
					}
				}
				return originalRevealInFolder.call(fileExplorerPlugin, file);
			};
		}

		const leaf = this.app.workspace.getLeavesOfType('markdown').first();
		const view = leaf?.view;

		if (!view) { return; }

		// @ts-expect-error use internal API
		const editMode = view.editMode ?? view.sourceMode
			// @ts-expect-error use internal API
			?? this.app.workspace.activeEditor?.editMode;

		const plugin = this;
		if (!editMode) { return; }

		const clipboardProto = editMode.clipboardManager.constructor.prototype;

		const originalHandleDragOver = clipboardProto.handleDragOver;
		const originalHandleDrop = clipboardProto.handleDrop;

		clipboardProto.handleDragOver = function (evt: DragEvent, ...args: unknown[]): void {
			const { dragManager } = this.app;
			const draggable = dragManager?.draggable;

			if (draggable?.file instanceof TFolder) {
				const folderNote = getFolderNote(plugin, draggable.file.path);
				if (folderNote) {
					dragManager.setAction(
						window.i18next.t('interface.drag-and-drop.insert-link-here'),
					);
					return;
				}
			}

			return originalHandleDragOver.call(this, evt, ...args);
		};

		clipboardProto.handleDrop = function (evt: DragEvent, ...args: unknown[]): void {
			const { dragManager } = this.app;
			const draggable = dragManager?.draggable;

			if (draggable?.file instanceof TFolder) {
				const folderNote = getFolderNote(plugin, draggable.file.path);
				if (folderNote) {
					draggable.file = folderNote;
					draggable.type = 'file';
				}
			}

			return originalHandleDrop.call(this, evt, ...args);
		};

		if (this.settings.fvGlobalSettings.autoUpdateLinks) {
			this.fvIndexDB.init(false);
		}
	}

	handleVaultChange(): void {
		if (!this.settings.fvGlobalSettings.autoUpdateLinks) return;
		const DEBOUNCE_DELAY = 2000;
		debounce(() => {
			updateAllOverviews(this);
		}, DEBOUNCE_DELAY, true)();
	}

	handleFileExplorerClick(evt: MouseEvent): void {
		const target = evt.target as HTMLElement;
		if (evt.shiftKey) return;
		if (this.isMobileClickDisabled()) return;

		const { folderTitleEl, onlyClickedOnFolderTitle } = this.getFolderTitleInfo(target);
		if (!folderTitleEl) return;
		if (this.shouldIgnoreClickByWhitespaceOrCollapse(target, onlyClickedOnFolderTitle)) return;

		const folderPath = this.getValidFolderPath(folderTitleEl);
		if (!folderPath) return;

		const usedCtrl = this.isCtrlUsed(evt);
		const folderNote = getFolderNote(this, folderPath);

		if (!folderNote && this.shouldCreateNote(evt, usedCtrl)) {
			this.createNoteAndMark(folderPath);
			return;
		}
		if (!(folderNote instanceof TFile)) return;
		if (!this.shouldOpenNote(usedCtrl, evt)) return;

		if (!this.settings.enableCollapsing || usedCtrl) {
			evt.preventDefault();
			evt.stopImmediatePropagation();
		}

		openFolderNote(this, folderNote, evt);
	}

	private isMobileClickDisabled(): boolean {
		return Platform.isMobile && this.settings.disableOpenFolderNoteOnClick;
	}

	private getFolderTitleInfo(target: HTMLElement): {
		folderTitleEl: HTMLElement | null;
		onlyClickedOnFolderTitle: boolean;
	} {
		const folderTitleEl = target.closest('.nav-folder-title') as HTMLElement | null;
		const onlyClickedOnFolderTitle = !!target.closest('.nav-folder-title-content');
		return { folderTitleEl, onlyClickedOnFolderTitle };
	}

	private shouldIgnoreClickByWhitespaceOrCollapse(
		target: HTMLElement,
		onlyClickedOnFolderTitle: boolean,
	): boolean {
		if (!this.settings.stopWhitespaceCollapsing && !onlyClickedOnFolderTitle) return true;
		if (target.closest('.collapse-icon')) return true;
		return false;
	}

	private getValidFolderPath(folderTitleEl: HTMLElement): string | null {
		const folderPath = folderTitleEl.getAttribute('data-path');
		if (!folderPath) return null;
		const excludedFolder = getExcludedFolder(this, folderPath, true);
		if (excludedFolder?.disableFolderNote) return null;
		return folderPath;
	}

	private isCtrlUsed(evt: MouseEvent): boolean {
		return Platform.isMacOS ? evt.metaKey : evt.ctrlKey;
	}

	private shouldCreateNote(evt: MouseEvent, usedCtrl: boolean): boolean {
		const isTabMod = Keymap.isModEvent(evt) === 'tab';
		if (!(evt.altKey || isTabMod)) return false;
		return (this.settings.altKey && evt.altKey) || (usedCtrl && this.settings.ctrlKey);
	}

	private createNoteAndMark(folderPath: string): void {
		createFolderNote(this, folderPath, true, undefined, true);
		addCSSClassToFileExplorerEl(folderPath, 'has-folder-note', false, this);
		removeCSSClassFromFileExplorerEL(folderPath, 'has-not-folder-note', false, this);
	}

	private shouldOpenNote(usedCtrl: boolean, evt: MouseEvent): boolean {
		if (this.settings.openWithCtrl && !usedCtrl) return false;
		if (this.settings.openWithAlt && !evt.altKey) return false;
		return true;
	}

	handleOverviewBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const observer = new MutationObserver(() => {
			const editButton = el.parentElement?.childNodes.item(1);
			if (editButton) {
				editButton.addEventListener('click', (e) => {
					e.stopImmediatePropagation();
					e.preventDefault();
					e.stopPropagation();
					new FolderOverviewSettings(
						this.app,
						this,
						parseYaml(source),
						ctx,
						el,
						this.settings.defaultOverview,
					).open();
				}, { capture: true });
			}
		});

		observer.observe(el, {
			childList: true,
			subtree: true,
		});

		try {
			if (this.app.workspace.layoutReady) {
				const { defaultOverview } = this.settings;
				const folderOverview = new FolderOverview(
					this,
					ctx,
					source,
					el,
					defaultOverview,
				);
				folderOverview.create(this, el, ctx);
			} else {
				this.app.workspace.onLayoutReady(() => {
					const folderOverview = new FolderOverview(
						this,
						ctx,
						source,
						el,
						this.settings.defaultOverview,
					);
					folderOverview.create(this, el, ctx);
				});
			}
		} catch (e) {
			// eslint-disable-next-line max-len
			new Notice('Error creating folder overview (folder notes plugin) - check console for more details');
			console.error(e);
		}
	}

	async activateOverviewView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(FOLDER_OVERVIEW_VIEW);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: FOLDER_OVERVIEW_VIEW, active: true });
		}

		if (!leaf) return;
		workspace.revealLeaf(leaf);
	}

	updateOverviewView: typeof updateOverviewView = updateOverviewView;
	updateViewDropdown: typeof updateViewDropdown = updateViewDropdown;

	isEmptyFolderNoteFolder(folder: TFolder): boolean {
		let attachmentFolderPath = this.app.vault.getConfig('attachmentFolderPath') as string;
		const cleanAttachmentFolderPath = attachmentFolderPath?.replace('./', '') || '';
		const attachmentsAreInRootFolder = attachmentFolderPath === './'
			|| attachmentFolderPath === '';
		const threshold = this.settings.storageLocation === 'insideFolder' ? 1 : 0;
		if (folder.children.length === 0) {
			addCSSClassToFileExplorerEl(folder.path, 'fn-empty-folder', false, this);
		}
		attachmentFolderPath = `${folder.path}/${cleanAttachmentFolderPath}`;

		if (folder.children.length === threshold) {
			addCSSClassToFileExplorerEl(folder.path, 'fn-empty-folder', false, this);
			return true;
		} else if (folder.children.length > threshold) {
			if (attachmentsAreInRootFolder) {
				return false;
			} else if (
				this.app.vault.getAbstractFileByPath(attachmentFolderPath) instanceof TFolder
			) {
				const attachmentFolder = this.app.vault.getAbstractFileByPath(attachmentFolderPath);
				if (
					attachmentFolder instanceof TFolder &&
					folder.children.length <= threshold + 1
				) {
					addCSSClassToFileExplorerEl(folder.path, 'fn-empty-folder', false, this);
					addCSSClassToFileExplorerEl(
						folder.path, 'fn-has-attachment-folder',
						false, this,
					);
				}
				return folder.children.length <= threshold + 1;
			}
			return false;

		}
		return true;
	}

	async changeFolderNameInExplorer(
		folder: TFolder,
		newName: string | null | undefined,
		waitForCreate = false,
		count = 0,
	): Promise<void> {
		const MAX_RETRY_COUNT = 5;
		const RETRY_DELAY_MS = 500;
		if (!newName) newName = folder.name;
		let fileExplorerItem = getFileExplorerElement(folder.path, this);
		if (!fileExplorerItem) {
			if (waitForCreate && count < MAX_RETRY_COUNT) {
				await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
				void this.changeFolderNameInExplorer(folder, newName, waitForCreate, count + 1);
				return;
			}
			return;
		}

		fileExplorerItem = fileExplorerItem?.querySelector('div.nav-folder-title-content');
		if (!fileExplorerItem) { return; }
		if (this.settings.frontMatterTitle.explorer && this.settings.frontMatterTitle.enabled) {
			(fileExplorerItem as HTMLElement).innerText = newName;
			(fileExplorerItem as HTMLElement).setAttribute('old-name', folder.name);
		} else {
			(fileExplorerItem as HTMLElement).innerText = folder.name;
			(fileExplorerItem as HTMLElement).removeAttribute('old-name');
		}
	}

	async changeFolderNameInPath(
		folder: TFolder,
		newName: string | null | undefined,
		breadcrumb: HTMLElement,
	): Promise<void> {
		if (!newName) newName = folder.name;

		breadcrumb.textContent = folder.newName || folder.name;
		breadcrumb.setAttribute('old-name', folder.name);
		breadcrumb.setAttribute('data-path', folder.path);
	}

	/**
	 * Updates all folder names in the path above the note editor
	*/
	updateAllBreadcrumbs(remove?: boolean): void {
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

	onunload(): void {
		unregisterFileExplorerObserver();
		document.body.classList.remove('folder-notes-plugin');
		document.body.classList.remove('folder-note-underline');
		document.body.classList.remove('hide-folder-note');
		document.body.classList.remove('fn-whitespace-stop-collapsing');
		removeActiveFolder(this);
		if (this.fmtpHandler) {
			this.fmtpHandler.deleteEvent();
		}
	}

	async loadSettings(): Promise<void> {
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
		if (!this.settings.oldFolderNoteName) {
			this.settings.oldFolderNoteName = this.settings.folderNoteName;
		}

		if (!data) { return; }
		const overview = data.defaultOverview;
		if (!overview) { return; }
		this.settings.defaultOverview = Object.assign(
			{}, DEFAULT_SETTINGS.defaultOverview, overview,
		);
	}

	async saveSettings(reloadStyles?: boolean): Promise<void> {
		await this.saveData(this.settings);
		// cleanup any css if we need too
		if ((!this.settingsOpened || reloadStyles === true) && reloadStyles !== false) {
			refreshAllFolderStyles(true, this);
		}
	}

}

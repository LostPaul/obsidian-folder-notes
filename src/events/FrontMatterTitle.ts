import type FolderNotesPlugin from 'src/main';
import {
	type Listener,
	type Events,
	type ApiInterface,
	type DeferInterface,
	type ListenerRef,
	type EventDispatcherInterface,
	PluginNotEnabledError,
	getDefer,
} from 'front-matter-plugin-api-provider';
import { type App, TFile, TFolder } from 'obsidian';
import { getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';

interface UpdateData {
	id: string;
	result: boolean;
	path: string;
	pathOnly: boolean;
	breadcrumb?: HTMLElement;
}

interface WrappedUpdateData {
	data: UpdateData;
}

export class FrontMatterTitlePluginHandler {
	plugin: FolderNotesPlugin;
	app!: App;
	api: ApiInterface | null = null;
	deffer: DeferInterface | null = null;
	modifiedFolders: Map<string, TFolder> = new Map();
	eventRef: ListenerRef<'manager:update'> | null = null;
	dispatcher: EventDispatcherInterface<Events> | null = null;
	/**
	 * Resolves once the Front Matter Title API is available and the plugin
	 * has finished its own startup, or immediately when the plugin is
	 * unavailable. Every update method awaits this before resolving titles,
	 * so calls made while the integration is still starting up are delayed
	 * instead of being silently dropped.
	 */
	ready: Promise<void>;
	constructor(plugin: FolderNotesPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.ready = this.initialize();
	}

	private async initialize(): Promise<void> {
		try {
			this.deffer = getDefer(this.app);
			if (!this.deffer.isPluginReady()) {
				await this.deffer.awaitPlugin();
			}
			this.api = this.deffer.getApi();
		} catch (error) {
			if (!(error instanceof PluginNotEnabledError)) {
				console.error('[FolderNotes] Failed to initialize the Front Matter Title integration', error);
			}
			return;
		}
		if (this.plugin.settings.frontMatterTitle.enabled) {
			const dispatcher = this.api?.getEventDispatcher();
			if (dispatcher) {
				this.dispatcher = dispatcher;
			}
			const event: Listener<Events, 'manager:update'> = {
				name: 'manager:update',
				cb: (data): void => {
					this.fmptUpdateFileName(data as unknown as UpdateData, true);
				},
			};
			// Keep ref to remove listener
			const ref = dispatcher?.addListener(event);
			if (ref) {
				this.eventRef = ref;
			}
			this.plugin.updateAllBreadcrumbs();
		}
		// Wait for the Front Matter Title plugin to finish processing all files
		// (it initializes its features a few seconds after layout-ready).
		// Resolving titles earlier is unreliable: the metadata cache may not be
		// populated yet, so titles resolve to null and folder names would get
		// reset to their original name without any later retry.
		try {
			if (!this.deffer.isFeaturesReady()) {
				await this.deffer.awaitFeatures();
			}
		} catch (error) {
			console.warn('[FolderNotes] Failed to await Front Matter Title features', error);
		}
		if (this.plugin.settings.frontMatterTitle.enabled) {
			// The Front Matter Title plugin processes every file during its own
			// startup, before the listener above gets registered, so those
			// manager:update events are lost. Replay all files once the File
			// Explorer DOM exists so folder names are applied on startup and
			// after this plugin was reloaded.
			void this.updateAllFolderNames();
		}
	}

	deleteEvent(): void {
		if (this.eventRef && this.dispatcher) {
			this.dispatcher.removeListener(this.eventRef);
		}
	}
	async fmptUpdateFileName(data: UpdateData, isEvent: boolean): Promise<void> {
		await this.ready;
		const hasNestedData = 'data' in (data as unknown as Record<string, unknown>);
		const actualData: UpdateData = hasNestedData
			? (data as unknown as WrappedUpdateData).data
			: data;
		const file = this.app.vault.getAbstractFileByPath(actualData.path);
		if (!(file instanceof TFile)) { return; }

		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		let newName: string | null | undefined = resolver?.resolve(file?.path ?? '');
		const folder = getFolder(this.plugin, file);
		if (!(folder instanceof TFolder)) { return; }

		const folderNote = getFolderNote(this.plugin, folder.path);
		if (!folderNote) { return; }
		if (folderNote !== file) { return; }
		if (!newName && folder.newName && !actualData.pathOnly) {
			// The folder currently shows a resolved title, so this update is
			// about to reset it to the original name. A single failed resolve
			// can be transient (e.g. while the Front Matter Title plugin is
			// rebuilding its cache), and nothing re-triggers this update
			// afterwards, which would leave the folder stuck at its original
			// name. Retry briefly before accepting the reset.
			newName = await this.resolveWithRetry(file.path);
		}
		if (!actualData.pathOnly) {
			this.plugin.changeFolderNameInExplorer(folder, newName, true);
		}

		const { breadcrumb } = actualData;
		if (breadcrumb) {
			this.plugin.changeFolderNameInPath(folder, newName, breadcrumb);
		}

		if (isEvent) {
			this.plugin.updateAllBreadcrumbs();
		}

		if (newName) {
			folder.newName = newName;
			this.modifiedFolders.set(folder.path, folder);
		} else {
			folder.newName = null;
			this.modifiedFolders.delete(folder.path);
		}

	}

	async fmptUpdateFolderName(data: UpdateData, _replacePath: boolean): Promise<void> {
		await this.ready;
		const hasNestedData = 'data' in (data as unknown as Record<string, unknown>);
		const actualData: UpdateData = hasNestedData
			? (data as unknown as WrappedUpdateData).data
			: data;
		const folder = this.app.vault.getAbstractFileByPath(actualData.path);
		if (!(folder instanceof TFolder)) { return; }
		const folderNote = getFolderNote(this.plugin, folder.path);
		if (!folderNote) { return; }

		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		const newName = resolver?.resolve(folderNote?.path ?? '');
		if (!newName) return;

		if (!actualData.pathOnly) {
			this.plugin.changeFolderNameInExplorer(folder, newName, true);
		}

		const { breadcrumb } = actualData;
		if (breadcrumb) {
			this.plugin.changeFolderNameInPath(folder, newName, breadcrumb);
		}

		folder.newName = newName;
		this.modifiedFolders.set(folder.path, folder);
	}

	/**
	 * Replays the Front Matter Title update for every file in the vault.
	 *
	 * Used to catch up on updates that were dispatched before the event
	 * listener was registered (e.g. while the Front Matter Title plugin was
	 * still starting up) and after this plugin was reloaded while the File
	 * Explorer kept its already-initialized folder elements.
	 */
	async updateAllFolderNames(): Promise<void> {
		await this.waitForFileExplorer();
		await Promise.all(
			this.plugin.app.vault.getFiles().map((file) =>
				this.fmptUpdateFileName({ id: '', result: false, path: file.path, pathOnly: false }, false),
			),
		);
		this.plugin.updateAllBreadcrumbs();
	}

	private async waitForFileExplorer(timeoutMs = 10000): Promise<void> {
		const POLLING_DELAY_MS = 250;
		const deadline = Date.now() + timeoutMs;
		while (!activeDocument.querySelector('.nav-folder-title')) {
			if (Date.now() >= deadline) return;
			await new Promise<void>((resolve) => window.setTimeout(resolve, POLLING_DELAY_MS));
		}
	}

	/**
	 * Resolves the title for a path, retrying briefly in case the Front
	 * Matter Title plugin cannot resolve it at the moment (e.g. while its
	 * cache is being rebuilt).
	 */
	private async resolveWithRetry(
		path: string,
		retries = 3,
		retryDelayMs = 400,
	): Promise<string | null | undefined> {
		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		let resolved = resolver?.resolve(path);
		for (let attempt = 0; attempt < retries && !resolved; attempt++) {
			await new Promise<void>((resolve) => window.setTimeout(resolve, retryDelayMs));
			resolved = resolver?.resolve(path);
		}
		return resolved;
	}

	async getNewFolderName(folder: TFolder): Promise<string | null> {
		if (this.modifiedFolders.has(folder.path)) {
			const modifiedFolder = this.modifiedFolders.get(folder.path);
			if (modifiedFolder) {
				return modifiedFolder.newName;
			}
		}
		const folderNote = getFolderNote(this.plugin, folder.path);
		if (!folderNote) return null;
		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		return resolver?.resolve(folderNote?.path ?? '') ?? null;
	}

	async getNewFileName(file: TFile): Promise<string | null> {
		return this.resolveTitle(file?.path ?? '');
	}

	resolveTitle(path: string): string | null {
		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		return resolver?.resolve(path) ?? null;
	}
}

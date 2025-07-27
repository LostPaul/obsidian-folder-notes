import type FolderNotesPlugin from 'src/main';
import type { Listener, Events, ApiInterface, DeferInterface, ListenerRef, EventDispatcherInterface } from 'front-matter-plugin-api-provider';
import { getDefer } from 'front-matter-plugin-api-provider';
import type { App } from 'obsidian';
import { TFile, TFolder } from 'obsidian';
import { getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';
export class FrontMatterTitlePluginHandler {
	plugin: FolderNotesPlugin;
	app: App;
	api: ApiInterface | null = null;
	deffer: DeferInterface | null = null;
	modifiedFolders: Map<string, TFolder> = new Map();
	eventRef: ListenerRef<'manager:update'>;
	dispatcher: EventDispatcherInterface<Events>;
	constructor(plugin: FolderNotesPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;

		(async () => {
			this.deffer = getDefer(this.app);
			if (this.deffer.isPluginReady()) {
				this.api = this.deffer.getApi();
			} else {
				await this.deffer.awaitPlugin();
				this.api = this.deffer.getApi();
				// if you want to wait features you can use the following chain
				if (!this.deffer.isFeaturesReady()) {
					await this.deffer.awaitFeatures();
				}
			}
			if (plugin.settings.frontMatterTitle.enabled) {
				const dispatcher = this.api?.getEventDispatcher();
				if (dispatcher) {
					this.dispatcher = dispatcher;
				}
				const event: Listener<Events, 'manager:update'> = {
					name: 'manager:update',
					cb: (data) => {
						this.fmptUpdateFileName(data as any, true);
					},
				};
				// Keep ref to remove listener
				const ref = dispatcher?.addListener(event);
				if (ref) {
					this.eventRef = ref;
				}
				// this.plugin.app.vault.getFiles().forEach((file) => {
				// 	this.handleRename({ id: '', result: false, path: file.path }, false);
				// });
				this.plugin.updateAllBreadcrumbs();
			}
		})();
	}
	deleteEvent() {
		if (this.eventRef) {
			this.dispatcher.removeListener(this.eventRef);
		}
	}
	async fmptUpdateFileName(data: {
		id: string;
		result: boolean;
		path: string;
		pathOnly: boolean;
		breadcrumb?: HTMLElement;
	}, isEvent: boolean) {
		if ((data as any).data) data = (data as any).data;
		const file = this.app.vault.getAbstractFileByPath(data.path);
		if (!(file instanceof TFile)) { return; }

		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		const newName = resolver?.resolve(file?.path ?? '');
		const folder = getFolder(this.plugin, file);
		if (!(folder instanceof TFolder)) { return; }

		const folderNote = getFolderNote(this.plugin, folder.path);
		if (!folderNote) { return; }
		if (folderNote !== file) { return; }
		if (!data.pathOnly) {
			this.plugin.changeFolderNameInExplorer(folder, newName);
		}

		const { breadcrumb } = data;
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

	async fmptUpdateFolderName(data: {
		id: string;
		result: boolean;
		path: string;
		pathOnly: boolean;
		breadcrumb?: HTMLElement;
	}, replacePath: boolean) {
		if ((data as any).data) data = (data as any).data;
		const folder = this.app.vault.getAbstractFileByPath(data.path);
		if (!(folder instanceof TFolder)) { return; }
		const folderNote = getFolderNote(this.plugin, folder.path);
		if (!folderNote) { return; }

		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		const newName = resolver?.resolve(folderNote?.path ?? '');
		if (!newName) return;

		if (!data.pathOnly) {
			this.plugin.changeFolderNameInExplorer(folder, newName);
		}

		const { breadcrumb } = data;
		if (breadcrumb) {
			this.plugin.changeFolderNameInPath(folder, newName, breadcrumb);
		}

		folder.newName = newName;
		this.modifiedFolders.set(folder.path, folder);
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
		const resolver = this.api?.getResolverFactory()?.createResolver('#feature-id#');
		const changedName = resolver?.resolve(file?.path ?? '');
		return changedName ?? null;
	}
}

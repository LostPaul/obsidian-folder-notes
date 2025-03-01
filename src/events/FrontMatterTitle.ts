import FolderNotesPlugin from 'src/main';
import { getDefer, Listener, Events, ApiInterface, DeferInterface, ListenerRef, EventDispatcherInterface } from 'front-matter-plugin-api-provider';
import { App, TFile, TFolder } from 'obsidian';
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
			const dispatcher = this.api?.getEventDispatcher();
			if (dispatcher) {
				this.dispatcher = dispatcher;
			}
			const event: Listener<Events, 'manager:update'> = {
				name: 'manager:update',
				cb: (data) => {
					this.handleRename(data as any, true);
				},
			};
			// Keep ref to remove listener
			const ref = dispatcher?.addListener(event);
			if (ref) {
				this.eventRef = ref;
			}
			this.plugin.app.vault.getFiles().forEach((file) => {
				this.handleRename({ id: '', result: false, path: file.path }, false);
			});
			this.plugin.updateBreadcrumbs();
		})();
	}
	deleteEvent() {
		if (this.eventRef) {
			this.dispatcher.removeListener(this.eventRef);
		}
	}
	async handleRename(data: {
		id: string;
		result: boolean;
		path: string;
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

		if (isEvent) {
			this.plugin.changeName(folder, newName, true);
		} else {
			this.plugin.changeName(folder, newName, false);
		}
		if (newName) {
			folder.newName = newName;
			this.modifiedFolders.set(folder.path, folder);
		} else {
			folder.newName = null;
			this.modifiedFolders.delete(folder.path);
		}

	}
}

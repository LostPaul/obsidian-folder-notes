import { Plugin, TAbstractFile, View, WorkspaceLeaf } from 'obsidian';

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: {
				[pluginId: string]: Plugin & {
					[pluginImplementations: string]: unknown;
				};
			};
			enablePlugin: (id: string) => Promise<void>;
			disablePlugin: (id: string) => Promise<void>;
		};
	}
	interface Setting {
		createList: (list: ListComponent | ((list: ListComponent) => void)) => ListComponent;
	}
	interface TFolder {
		newName: string | null;
		collapsed: boolean;
	}
	interface MenuItem {
		dom: HTMLElement;
	}
	interface FileManager {
		promptForFolderDeletion: (folder: TFolder) => void;
	}

	class ListComponent {
		containerEl: HTMLElement;
		emptyStateEl: HTMLElement;
		listEl: HTMLElement;
		values: string[];
		constructor(containerEl: HTMLElement);
	}
}

interface FileExplorerWorkspaceLeaf extends WorkspaceLeaf {
	containerEl: HTMLElement;
	view: FileExplorerView;
}

interface FileExplorerViewFileItem extends TAbstractFile {
	titleEl: HTMLElement
	selfEl: HTMLElement
}

interface FileExplorerView extends View {
	fileItems: { [path: string]: FileExplorerViewFileItem };
}

declare global {
	interface Window {
		i18next: {
			t: (key: string, options?: { [key: string]: string }) => string;
		};
	}
}